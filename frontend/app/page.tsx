"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";

/* ── ABIs ── */
const VAULT_ABI = [
  "function deposit() payable",
  "function getUserCollateral() view returns (uint256)",
];
const ROUTER_ABI = [
  "function borrow(uint256 amount)",
  "function borrowed(address user) view returns (uint256)",
];

declare global {
  interface Window { ethereum?: any; }
}

/* ── Contract addresses ── */
const VAULT_ADDR = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "";
const ROUTER_ADDR = process.env.NEXT_PUBLIC_BORROW_ROUTER_ADDRESS || "";
const RISK_API = process.env.NEXT_PUBLIC_RISK_API_URL || "";
const CHAIN_ID = 97;
const SCAN = "https://testnet.bscscan.com/tx/";
const BNB_PRICE = 400;

/* ── Helpers ── */
const short = (h: string) => h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "";

export default function HomePage() {
  /* state */
  const [account, setAccount] = useState("");
  const [collateral, setCollateral] = useState("0");
  const [borrowed, setBorrowed] = useState("0");
  const [depositTx, setDepositTx] = useState("");
  const [borrowTx, setBorrowTx] = useState("");
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLabel, setRiskLabel] = useState("—");
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("Connect your wallet to begin");
  const [step, setStep] = useState(0); // 0=connect, 1=deposit, 2=borrow, 3=done

  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x61" }],
        });
      } catch {
        throw new Error("Switch MetaMask to BSC Testnet (chain 97)");
      }
    }
    return provider.getSigner();
  }, []);

  const refresh = useCallback(async (wallet: string) => {
    if (!wallet || !VAULT_ADDR || !ROUTER_ADDR || !window.ethereum) return;
    try {
      const signer = await getSigner();
      const vault = new ethers.Contract(ethers.getAddress(VAULT_ADDR), VAULT_ABI, signer);
      const router = new ethers.Contract(ethers.getAddress(ROUTER_ADDR), ROUTER_ABI, signer);
      const c = await vault.getUserCollateral();
      const b = await router.borrowed(ethers.getAddress(wallet));
      setCollateral(ethers.formatEther(c));
      setBorrowed(ethers.formatEther(b));
      const cNum = Number(ethers.formatEther(c));
      const bNum = Number(ethers.formatEther(b));
      if (cNum > 0 && bNum > 0) setStep(3);
      else if (cNum > 0) setStep(2);
      else setStep(1);
    } catch { /* ignore */ }
  }, [getSigner]);

  /* actions */
  const connect = async () => {
    if (!window.ethereum) {
      setStatus("error");
      setStatusText("MetaMask not found — install it or open in a MetaMask-enabled browser");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    setStatus("loading"); setStatusText("Connecting wallet…");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
    setStatus("success"); setStatusText(`Connected: ${accounts[0].slice(0, 6)}…${accounts[0].slice(-4)}`);
    await refresh(accounts[0]);
  };

  const doDeposit = async () => {
    setStatus("loading"); setStatusText("Submitting deposit…");
    const signer = await getSigner();
    const vault = new ethers.Contract(ethers.getAddress(VAULT_ADDR), VAULT_ABI, signer);
    const tx = await vault.deposit({ value: ethers.parseEther("0.05") });
    setStatusText("Waiting for confirmation…");
    await tx.wait();
    setDepositTx(tx.hash);
    setStatus("success"); setStatusText("Deposit confirmed ✓");
    await refresh(account);
  };

  const doBorrow = async () => {
    setStatus("loading"); setStatusText("Submitting borrow…");
    const signer = await getSigner();
    const router = new ethers.Contract(ethers.getAddress(ROUTER_ADDR), ROUTER_ABI, signer);
    const tx = await router.borrow(ethers.parseUnits("10", 18));
    setStatusText("Waiting for confirmation…");
    await tx.wait();
    setBorrowTx(tx.hash);
    setStatus("success"); setStatusText("Borrow confirmed ✓");
    await refresh(account);
  };

  const fetchRisk = async () => {
    if (!RISK_API) { setRiskLabel("API not configured"); return; }
    setAiLoading(true); setRiskLabel("Analyzing…");
    try {
      const res = await fetch(`${RISK_API}/risk/ai?collateral=${collateral}&borrow=${borrowed}`);
      const data = await res.json();
      if (data.advice) {
        setAiAdvice(data.advice);
        const v = data.advice.verdict;
        const conf = Math.round((data.advice.confidence || 0) * 100);
        setRiskScore(v === "SAFE_TO_BORROW" ? 15 : v === "HOLD" ? 35 : v === "REDUCE_DEBT" ? 65 : 90);
        setRiskLabel(v === "SAFE_TO_BORROW" ? "SAFE" : v === "HOLD" ? "HOLD" : v === "REDUCE_DEBT" ? "REDUCE" : "DANGER");
      } else {
        const prob = Number(data.liquidationProbability || 0);
        setRiskScore(Math.round(prob * 100));
        setRiskLabel(prob < 0.2 ? "LOW RISK" : prob < 0.5 ? "MEDIUM RISK" : "HIGH RISK");
      }
    } catch { setRiskLabel("API unavailable"); }
    setAiLoading(false);
  };

  const wrap = (fn: () => Promise<void>) => () => fn().catch((e) => {
    setStatus("error"); setStatusText(e.message || "Transaction failed");
  });

  /* derived */
  const collNum = Number(collateral);
  const borrNum = Number(borrowed);
  const collUsd = collNum * BNB_PRICE;
  const borrowLimit = collUsd * 0.5;
  const utilization = borrowLimit > 0 ? Math.min(borrNum / borrowLimit * 100, 100) : 0;

  useEffect(() => { if (account) refresh(account); }, [account, refresh]);

  /* ── RENDER ── */
  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-logo">🛡</div>
          <div className="nav-title">Spend<span>Shield</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="nav-chain">● BSC Testnet</span>
          {!account ? (
            <button className="btn btn-yellow" onClick={wrap(connect)}>Connect Wallet</button>
          ) : (
            <button className="btn btn-outline" style={{ cursor: "default" }}>
              {account.slice(0, 6)}…{account.slice(-4)}
            </button>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">🔗 BNB Chain · #BNBHack</div>
        <h1>Crypto Credit<br />Without Liquidation Fear</h1>
        <p>
          Deposit BNB as collateral, borrow stablecoins instantly.
          Our AI risk engine protects your position — no surprise liquidations.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <span className="tag tag-yellow">BNB Chain</span>
          <span className="tag tag-green">AI Risk Engine</span>
          <span className="tag tag-blue">DeFi Lending</span>
          <span className="tag tag-purple">Smart Contracts</span>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-strip">
        <div className="marquee-inner">
          &nbsp;&nbsp;◆ SPENDSHIELD — BORROW WITHOUT FEAR &nbsp;&nbsp;◆ AI-POWERED RISK ENGINE &nbsp;&nbsp;◆ LIVE ON BSC TESTNET (CHAIN 97) &nbsp;&nbsp;◆ COLLATERAL VAULT + BORROW ROUTER &nbsp;&nbsp;◆ 50% LTV SAFETY RULE &nbsp;&nbsp;◆ VERIFIED ON BSCSCAN &nbsp;&nbsp;◆ SPENDSHIELD — BORROW WITHOUT FEAR &nbsp;&nbsp;◆ AI-POWERED RISK ENGINE &nbsp;&nbsp;◆ LIVE ON BSC TESTNET (CHAIN 97) &nbsp;&nbsp;◆ COLLATERAL VAULT + BORROW ROUTER &nbsp;&nbsp;◆ 50% LTV SAFETY RULE &nbsp;&nbsp;◆ VERIFIED ON BSCSCAN &nbsp;&nbsp;
        </div>
      </div>

      <main className="container">

        {/* STATUS BAR */}
        <div className={`status-bar status-${status}`}>
          {status === "loading" && "⏳"}{status === "success" && "✓"}{status === "error" && "✗"}{status === "idle" && "○"} {statusText}
        </div>
        <div className="spacer-sm" />

        {/* STATS ROW */}
        <div className="section-label">Your Position</div>
        <div className="grid-4">
          <div className="stat-card" style={{ background: "var(--yellow-light)" }}>
            <div className="stat-value">{collNum.toFixed(4)}</div>
            <div className="stat-label">tBNB Deposited</div>
          </div>
          <div className="stat-card" style={{ background: "var(--blue-bg)" }}>
            <div className="stat-value">${collUsd.toFixed(0)}</div>
            <div className="stat-label">Collateral (USD)</div>
          </div>
          <div className="stat-card" style={{ background: "var(--green-bg)" }}>
            <div className="stat-value">{borrNum.toFixed(2)}</div>
            <div className="stat-label">MockUSDT Borrowed</div>
          </div>
          <div className="stat-card" style={{ background: utilization > 80 ? "var(--red-bg)" : "var(--purple-bg)" }}>
            <div className="stat-value">{utilization.toFixed(0)}%</div>
            <div className="stat-label">Utilization</div>
          </div>
        </div>

        <div className="spacer" />

        {/* ACTION CARDS */}
        <div className="section-label">Execute Transactions</div>
        <div className="grid-2">
          {/* DEPOSIT CARD */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: "var(--yellow-light)" }}>
                <span className="step-num">1</span>
              </div>
              Deposit Collateral
              {depositTx && <span className="tag tag-green" style={{ marginLeft: "auto" }}>Done</span>}
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>Amount</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14 }}>0.05 tBNB</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "var(--gray)", fontSize: 13 }}>
                  <span>≈ USD Value</span>
                  <span>${(0.05 * BNB_PRICE).toFixed(0)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--gray)", fontSize: 13 }}>
                  <span>Borrow Limit After</span>
                  <span>${(0.05 * BNB_PRICE * 0.5).toFixed(0)} USDT</span>
                </div>
              </div>
              <button className="btn btn-yellow btn-full" onClick={wrap(doDeposit)}
                      disabled={!account || status === "loading"}>
                {status === "loading" ? "Processing…" : "Deposit 0.05 tBNB →"}
              </button>
              {depositTx && (
                <a className="tx-link" href={`${SCAN}${depositTx}`} target="_blank" rel="noopener noreferrer">
                  ✓ {short(depositTx)} — View on BscScan ↗
                </a>
              )}
            </div>
          </div>

          {/* BORROW CARD */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: "var(--blue-bg)" }}>
                <span className="step-num">2</span>
              </div>
              Borrow Stablecoins
              {borrowTx && <span className="tag tag-green" style={{ marginLeft: "auto" }}>Done</span>}
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>Amount</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14 }}>10.00 MockUSDT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "var(--gray)", fontSize: 13 }}>
                  <span>Your Borrow Limit</span>
                  <span>${borrowLimit.toFixed(0)} USDT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--gray)", fontSize: 13 }}>
                  <span>LTV Rule</span>
                  <span>50% Max</span>
                </div>
              </div>
              <button className="btn btn-black btn-full" onClick={wrap(doBorrow)}
                      disabled={!account || collNum === 0 || status === "loading"}>
                {status === "loading" ? "Processing…" : "Borrow 10 MockUSDT →"}
              </button>
              {borrowTx && (
                <a className="tx-link" href={`${SCAN}${borrowTx}`} target="_blank" rel="noopener noreferrer">
                  ✓ {short(borrowTx)} — View on BscScan ↗
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="spacer" />

        {/* AI RISK ENGINE */}
        <div className="section-label">AI Risk Engine — Fine-tuned for DeFi</div>
        <div className="card" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="card-header" style={{ background: "var(--purple-bg)" }}>
            <div className="card-icon" style={{ background: "var(--white)" }}>🧠</div>
            <div>
              <div>AI Position Advisor</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: "var(--gray)" }}>Fine-tuned model analyzes your position & market conditions</div>
            </div>
            <button className="btn btn-yellow" style={{ marginLeft: "auto", padding: "8px 16px", fontSize: 12 }}
                    onClick={wrap(fetchRisk)} disabled={aiLoading}>
              {aiLoading ? "⏳ Analyzing…" : "🧠 Ask AI"}
            </button>
          </div>
          <div className="card-body">
            {/* Risk Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="risk-bar-container">
                  <div className="risk-bar-fill" style={{
                    width: `${riskScore ?? 8}%`,
                    background: (riskScore ?? 8) < 30 ? "var(--green)" : (riskScore ?? 8) < 60 ? "var(--yellow)" : "var(--red)",
                  }} />
                </div>
                <div className="risk-zones">
                  <span style={{ color: "var(--green)" }}>Safe</span>
                  <span style={{ color: "var(--yellow)" }}>Caution</span>
                  <span style={{ color: "var(--red)" }}>Danger</span>
                </div>
              </div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700,
                padding: "8px 16px", border: "var(--border)", borderRadius: "var(--radius)",
                background: riskLabel === "SAFE" ? "var(--green-bg)" : riskLabel === "HOLD" ? "var(--yellow-light)" : riskLabel === "REDUCE" || riskLabel === "DANGER" ? "var(--red-bg)" : "var(--gray-light)",
                color: riskLabel === "SAFE" ? "var(--green)" : riskLabel === "HOLD" ? "#ca8a04" : riskLabel === "REDUCE" || riskLabel === "DANGER" ? "var(--red)" : "var(--gray)",
                boxShadow: "var(--shadow-sm)",
              }}>
                {riskLabel}
              </div>
            </div>

            {/* AI Advice Card */}
            {aiAdvice ? (
              <div style={{ border: "2px solid var(--black)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                {/* Verdict Header */}
                <div style={{
                  padding: "12px 16px", fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                  background: aiAdvice.verdict === "SAFE_TO_BORROW" ? "var(--green-bg)" : aiAdvice.verdict === "HOLD" ? "var(--yellow-light)" : "var(--red-bg)",
                  borderBottom: "2px solid var(--black)",
                }}>
                  <span style={{ fontSize: 18 }}>
                    {aiAdvice.verdict === "SAFE_TO_BORROW" ? "✅" : aiAdvice.verdict === "HOLD" ? "⏸" : aiAdvice.verdict === "REDUCE_DEBT" ? "⚠️" : "🚨"}
                  </span>
                  {aiAdvice.verdict.replace(/_/g, " ")}
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: "var(--gray)" }}>
                    Confidence: {Math.round((aiAdvice.confidence || 0) * 100)}%
                  </span>
                </div>

                {/* Summary */}
                <div style={{ padding: "14px 16px", borderBottom: "2px solid var(--black)", fontWeight: 700, fontSize: 15 }}>
                  {aiAdvice.summary}
                </div>

                {/* Market Outlook */}
                <div style={{ padding: "14px 16px", borderBottom: "2px solid var(--black)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--gray)", marginBottom: 6 }}>
                    📊 Market Outlook
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }}>{aiAdvice.marketOutlook}</p>
                </div>

                {/* Recommendation */}
                <div style={{ padding: "14px 16px", borderBottom: "2px solid var(--black)", background: "var(--yellow-light)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--gray)", marginBottom: 6 }}>
                    💡 Recommendation
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 600 }}>{aiAdvice.recommendation}</p>
                </div>

                {/* Reasoning */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--gray)", marginBottom: 8 }}>
                    🔍 Reasoning
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(aiAdvice.reasoning || []).map((r: string, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.5 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "var(--purple)", minWidth: 18 }}>
                          {i + 1}.
                        </span>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: 24, textAlign: "center", border: "2px dashed var(--gray)",
                borderRadius: "var(--radius)", color: "var(--gray)",
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Click "Ask AI" to analyze your position</div>
                <div style={{ fontSize: 12 }}>Our fine-tuned AI evaluates market conditions and advises whether to borrow more, hold, or reduce debt.</div>
              </div>
            )}
          </div>
        </div>

        <div className="spacer" />

        {/* COMPARISON TABLE */}
        <div className="section-label">Why SpendShield?</div>
        <div className="card" style={{ boxShadow: "var(--shadow-lg)" }}>
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Feature</th>
                <th className="col-bad">Traditional DeFi</th>
                <th className="col-good">SpendShield</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Liquidation Risk</td>
                <td className="col-bad">❌ Sudden liquidation</td>
                <td className="col-good">✅ AI early warning</td>
              </tr>
              <tr>
                <td>Risk Assessment</td>
                <td className="col-bad">❌ Manual monitoring</td>
                <td className="col-good">✅ Real-time AI engine</td>
              </tr>
              <tr>
                <td>Safety Modes</td>
                <td className="col-bad">❌ None</td>
                <td className="col-good">✅ Auto-adjust position</td>
              </tr>
              <tr>
                <td>User Experience</td>
                <td className="col-bad">❌ Complex & stressful</td>
                <td className="col-good">✅ Simple 2-click flow</td>
              </tr>
              <tr>
                <td>Borrow Limits</td>
                <td className="col-bad">❌ Static thresholds</td>
                <td className="col-good">✅ Dynamic 50% LTV</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="spacer" />

        {/* HOW IT WORKS */}
        <div className="section-label">How It Works</div>
        <div className="grid-3">
          {[
            { n: "1", icon: "💰", title: "Deposit BNB", desc: "Lock tBNB as collateral in our audited CollateralVault smart contract on BNB Chain." },
            { n: "2", icon: "💳", title: "Borrow USDT", desc: "Instantly borrow MockUSDT at 50% LTV through the BorrowRouter — no approval needed." },
            { n: "3", icon: "🛡", title: "Stay Protected", desc: "AI risk engine monitors your position 24/7 and adjusts safety modes automatically." },
          ].map((s) => (
            <div className="card" key={s.n}>
              <div className="card-header">
                <div className="card-icon" style={{ background: "var(--yellow-light)" }}>{s.icon}</div>
                Step {s.n}
              </div>
              <div className="card-body">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                <p style={{ fontSize: 13, color: "var(--gray)", lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="spacer" />

        {/* VERIFIED CONTRACTS */}
        <div className="section-label">Verified Contracts</div>
        <div className="grid-3">
          {[
            { name: "CollateralVault", addr: "0x1a7060de7326F382F336061CEDFDdeD85ffD70A6", color: "var(--yellow-light)" },
            { name: "BorrowRouter", addr: "0x6Bd89A062a16De900bC508E3eE4731dB0b5e4325", color: "var(--blue-bg)" },
            { name: "MockUSDT", addr: "0xCA4c183f356012dEaB991B0e99dc6A70FC6a6d60", color: "var(--green-bg)" },
          ].map((c) => (
            <a key={c.name} href={`https://testnet.bscscan.com/address/${c.addr}`} target="_blank"
               rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <div className="card-header" style={{ background: c.color }}>
                  <div className="card-icon" style={{ background: "var(--white)" }}>📄</div>
                  {c.name}
                </div>
                <div className="card-body" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, wordBreak: "break-all", color: "var(--gray)" }}>
                  {c.addr}
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "var(--black)" }}>
                    View on BscScan ↗
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="spacer" />
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <p style={{ fontWeight: 700, marginBottom: 4 }}>
          SpendShield — <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
        <p>Built for #BNBHack Local Series · BNB Smart Chain Testnet (Chain 97)</p>
      </footer>
    </>
  );
}
