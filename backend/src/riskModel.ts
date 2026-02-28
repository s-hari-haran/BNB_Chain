export type RiskInput = {
  volatility24h: number;
  volatility7d: number;
  liquidityDepth: number;
  drawdownVelocity: number;
  correlation: number;
  oracleDeviation: number;
};

export type RiskOutput = {
  liquidationProbability: number;
  recommendedLtv: number;
  requiredBufferPercent: number;
  riskBand: "green" | "yellow" | "red";
};

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value));

export function predictRisk(input: RiskInput): RiskOutput {
  const normalizedVol = Math.min(1, (input.volatility24h * 0.6 + input.volatility7d * 0.4) / 1.5);
  const normalizedLiquidityStress = 1 - Math.min(1, input.liquidityDepth);
  const normalizedMomentum = Math.min(1, Math.max(0, input.drawdownVelocity));
  const normalizedCorrelation = Math.abs(input.correlation);
  const normalizedOracleDeviation = Math.min(1, input.oracleDeviation);

  const linear =
    -1.35 +
    normalizedVol * 2.1 +
    normalizedLiquidityStress * 1.4 +
    normalizedMomentum * 1.6 +
    normalizedCorrelation * 0.9 +
    normalizedOracleDeviation * 1.1;

  const liquidationProbability = Math.min(0.99, Math.max(0.01, sigmoid(linear)));

  const ltvFloor = 0.3;
  const ltvCeiling = 0.75;
  const dynamicLtv = ltvCeiling - liquidationProbability * 0.35;
  const recommendedLtv = Math.max(ltvFloor, Math.min(ltvCeiling, dynamicLtv));
  const requiredBufferPercent = Math.max(0.05, liquidationProbability * 0.4);

  const riskBand = liquidationProbability < 0.18 ? "green" : liquidationProbability < 0.35 ? "yellow" : "red";

  return {
    liquidationProbability,
    recommendedLtv,
    requiredBufferPercent,
    riskBand
  };
}
