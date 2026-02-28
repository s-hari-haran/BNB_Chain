import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

const client = new Anthropic({ apiKey: config.anthropicKey });

export type PositionData = {
  collateralBNB: number;
  collateralUSD: number;
  borrowedUSDT: number;
  utilizationPct: number;
  liquidationProbability: number;
  riskBand: string;
};

export type AIAdvice = {
  verdict: "SAFE_TO_BORROW" | "HOLD" | "REDUCE_DEBT" | "DANGER";
  confidence: number;
  summary: string;
  marketOutlook: string;
  recommendation: string;
  reasoning: string[];
};

export async function getAIAdvice(position: PositionData): Promise<AIAdvice> {
  const prompt = `You are SpendShield's proprietary fine-tuned AI Risk Engine for DeFi lending on BNB Chain. You do NOT mention Claude, Anthropic, or any other AI provider. You are "SpendShield AI".

Analyze this user's lending position and current market conditions to advise whether they should take on more debt, hold, or reduce exposure.

CURRENT POSITION:
- Collateral: ${position.collateralBNB} BNB (~$${position.collateralUSD.toFixed(0)} USD)
- Borrowed: ${position.borrowedUSDT.toFixed(2)} USDT
- Utilization: ${position.utilizationPct.toFixed(1)}%
- Liquidation Probability: ${(position.liquidationProbability * 100).toFixed(1)}%
- Risk Band: ${position.riskBand}
- Protocol LTV Rule: 50% max
- BNB Price: ~$400

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
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed: AIAdvice = JSON.parse(text.trim());
    return parsed;
  } catch (err: any) {
    console.error("Anthropic API error:", err.message);
    // Fallback to rule-based advice
    return getFallbackAdvice(position);
  }
}

function getFallbackAdvice(position: PositionData): AIAdvice {
  if (position.utilizationPct > 80) {
    return {
      verdict: "DANGER",
      confidence: 0.9,
      summary: "Position is critically over-leveraged — reduce debt immediately.",
      marketOutlook: "With utilization above 80%, any price drop puts you at immediate liquidation risk.",
      recommendation: "Repay at least 30% of your borrowed amount or add more collateral urgently.",
      reasoning: [
        "Utilization exceeds safe threshold",
        "BNB volatility can trigger rapid liquidation",
        "No safety buffer remaining"
      ],
    };
  }
  if (position.utilizationPct > 50) {
    return {
      verdict: "REDUCE_DEBT",
      confidence: 0.75,
      summary: "Utilization is elevated — consider reducing exposure.",
      marketOutlook: "Position is approaching maximum LTV. Market volatility could push you into danger zone.",
      recommendation: "Consider repaying some debt or adding collateral to bring utilization below 50%.",
      reasoning: [
        "Above 50% utilization ratio",
        "Limited buffer for price swings",
        "Market conditions warrant caution"
      ],
    };
  }
  if (position.utilizationPct > 20) {
    return {
      verdict: "HOLD",
      confidence: 0.7,
      summary: "Position is healthy — maintain current levels.",
      marketOutlook: "Your position has adequate safety margin. Market conditions are stable.",
      recommendation: "Current position is well-managed. Monitor BNB price movements before increasing exposure.",
      reasoning: [
        "Utilization within acceptable range",
        "Sufficient collateral buffer",
        "Moderate market conditions"
      ],
    };
  }
  return {
    verdict: "SAFE_TO_BORROW",
    confidence: 0.65,
    summary: "Low utilization — room to borrow more if needed.",
    marketOutlook: "Position is well-collateralized with significant safety margin remaining.",
    recommendation: "You can safely increase your borrowed amount. Consider borrowing up to 30% utilization for optimal capital efficiency.",
    reasoning: [
      "Very low utilization ratio",
      "Large collateral buffer",
      "Position well within safety limits"
    ],
  };
}
