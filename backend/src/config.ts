import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const parseNum = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: parseNum(process.env.PORT, 8080),
  pollMs: parseNum(process.env.RISK_SERVICE_POLL_MS, 15000),
  probabilityThreshold: parseNum(process.env.RISK_PROBABILITY_THRESHOLD, 0.35),
  rpcUrl: process.env.BNB_CHAIN_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  privateKey: process.env.PRIVATE_KEY || "",
  vaultAddress: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  weights: {
    volatility: parseNum(process.env.DEFAULT_VOLATILITY_WEIGHT, 0.35),
    liquidity: parseNum(process.env.DEFAULT_LIQUIDITY_WEIGHT, 0.25),
    momentum: parseNum(process.env.DEFAULT_MOMENTUM_WEIGHT, 0.2),
    correlation: parseNum(process.env.DEFAULT_CORRELATION_WEIGHT, 0.2)
  }
};
