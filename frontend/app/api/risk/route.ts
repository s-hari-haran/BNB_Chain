import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const BNB_PRICE = 400;

type AIAdvice = {
  verdict: "SAFE_TO_BORROW" | "HOLD" | "REDUCE_DEBT" | "DANGER";
  confidence: number;
  summary: string;
  marketOutlook: string;
  recommendation: string;
  reasoning: string[];
};

function getFallbackAdvice(utilizationPct: number): AIAdvice {
  if (utilizationPct > 80) {
    return {
      verdict: "DANGER",
      confidence: 0.9,
      summary: "Position is critically over-leveraged — reduce debt immediately.",
      marketOutlook:
        "With utilization above 80%, any price drop puts you at immediate liquidation risk.",
      recommendation:
        "Repay at least 30% of your borrowed amount or add more collateral urgently.",
      reasoning: [
        "Utilization exceeds safe threshold",
        "BNB volatility can trigger rapid liquidation",
        "No safety buffer remaining",
      ],
    };
  }
  if (utilizationPct > 50) {
    return {
      verdict: "REDUCE_DEBT",
      confidence: 0.75,
      summary: "Utilization is elevated — consider reducing exposure.",
      marketOutlook:
        "Position is approaching maximum LTV. Market volatility could push you into danger zone.",
      recommendation:
        "Consider repaying some debt or adding collateral to bring utilization below 50%.",
      reasoning: [
        "Above 50% utilization ratio",
        "Limited buffer for price swings",
        "Market conditions warrant caution",
      ],
    };
  }
  if (utilizationPct > 20) {
    return {
      verdict: "HOLD",
      confidence: 0.7,
      summary: "Position is healthy — maintain current levels.",
      marketOutlook:
        "Your position has adequate safety margin. Market conditions are stable.",
      recommendation:
        "Current position is well-managed. Monitor BNB price movements before increasing exposure.",
      reasoning: [
        "Utilization within acceptable range",
        "Sufficient collateral buffer",
        "Moderate market conditions",
      ],
    };
  }
  return {
    verdict: "SAFE_TO_BORROW",
    confidence: 0.65,
    summary: "Low utilization — room to borrow more if needed.",
    marketOutlook:
      "Position is well-collateralized with significant safety margin remaining.",
    recommendation:
      "You can safely increase your borrowed amount. Consider borrowing up to 30% utilization for optimal capital efficiency.",
    reasoning: [
      "Very low utilization ratio",
      "Large collateral buffer",
      "Position well within safety limits",
    ],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collateralBNB = Number(searchParams.get("collateral") || "0");
  const borrowedUSDT = Number(searchParams.get("borrow") || "0");
  const collateralUSD = collateralBNB * BNB_PRICE;
  const borrowLimit = collateralUSD * 0.5;
  const utilizationPct = borrowLimit > 0 ? (borrowedUSDT / borrowLimit) * 100 : 0;
  const liquidationProb = Math.min(utilizationPct / 100, 1);
  const riskBand =
    utilizationPct > 80
      ? "CRITICAL"
      : utilizationPct > 50
        ? "HIGH"
        : utilizationPct > 20
          ? "MEDIUM"
          : "LOW";

  // If no API key, return rule-based fallback
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ advice: getFallbackAdvice(utilizationPct) });
  }

  const prompt = `You are SpendShield's proprietary fine-tuned AI Risk Engine for DeFi lending on BNB Chain. You do NOT mention Claude, Anthropic, or any other AI provider. You are "SpendShield AI".

Analyze this user's lending position and current market conditions to advise whether they should take on more debt, hold, or reduce exposure.

CURRENT POSITION:
- Collateral: ${collateralBNB} BNB (~$${collateralUSD.toFixed(0)} USD)
- Borrowed: ${borrowedUSDT.toFixed(2)} USDT
- Utilization: ${utilizationPct.toFixed(1)}%
- Liquidation Probability: ${(liquidationProb * 100).toFixed(1)}%
- Risk Band: ${riskBand}
- Protocol LTV Rule: 50% max
- BNB Price: ~$${BNB_PRICE}

Consider these market factors in your analysis:
1. BNB recent price trend and volatility
2. General crypto market sentiment
3. DeFi lending market conditions
4. Smart money flow patterns
5. Risk of sudden liquidation cascade

Respond in this exact JSON format (no markdown, no code fences, just raw JSON):
{
  "verdict": "SAFE_TO_BORROW" | "HOLD" | "REDUCE_DEBT" | "DANGER",
  "confidence": 0.0 to 1.0,
  "summary": "One-line summary (max 15 words)",
  "marketOutlook": "2-3 sentence market analysis",
  "recommendation": "2-3 sentence specific advice for this position",
  "reasoning": ["reason 1", "reason 2", "reason 3"]
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text());
      return NextResponse.json({ advice: getFallbackAdvice(utilizationPct) });
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";
    const advice: AIAdvice = JSON.parse(text.trim());
    return NextResponse.json({ advice });
  } catch (err: any) {
    console.error("AI route error:", err.message);
    return NextResponse.json({ advice: getFallbackAdvice(utilizationPct) });
  }
}
