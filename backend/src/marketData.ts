import { RiskInput } from "./riskModel";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export async function getMarketFeatures(): Promise<RiskInput> {
  const baseVol = 0.18 + Math.random() * 0.22;
  const shock = Math.random() > 0.8 ? 0.2 : 0;
  const volatility24h = clamp(baseVol + shock, 0.05, 0.9);
  const volatility7d = clamp(baseVol * 0.85, 0.05, 0.8);
  const liquidityDepth = clamp(0.55 + Math.random() * 0.4 - shock * 0.5, 0.05, 1);
  const drawdownVelocity = clamp(Math.random() * 0.7 + shock, 0, 1);
  const correlation = clamp(0.25 + Math.random() * 0.65, -1, 1);
  const oracleDeviation = clamp(Math.random() * 0.15 + shock * 0.4, 0, 1);

  return {
    volatility24h,
    volatility7d,
    liquidityDepth,
    drawdownVelocity,
    correlation,
    oracleDeviation
  };
}
