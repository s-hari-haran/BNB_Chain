import express from "express";
import cors from "cors";
import { z } from "zod";
import { predictRisk } from "./riskModel";
import { getMarketFeatures } from "./marketData";
import { getAIAdvice, PositionData } from "./aiAdvisor";
import { config } from "./config";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "spendshield-risk-engine" });
});

app.get("/risk/live", async (_req, res) => {
  const features = await getMarketFeatures();
  const risk = predictRisk(features);
  res.json({ features, risk, at: new Date().toISOString() });
});

app.get("/risk", (req, res) => {
  const collateral = Number(req.query.collateral || 0);
  const borrow = Number(req.query.borrow || 0);

  if (!Number.isFinite(collateral) || !Number.isFinite(borrow) || collateral < 0 || borrow < 0) {
    return res.status(400).json({ error: "Invalid collateral or borrow value" });
  }

  const safeBorrowLimit = Math.max(0, collateral * 0.5);
  const utilization = safeBorrowLimit === 0 ? 0 : borrow / safeBorrowLimit;
  const liquidationProbability = Math.min(0.99, Math.max(0.01, utilization * 0.45));

  return res.json({
    safeBorrowLimit: Number(safeBorrowLimit.toFixed(6)),
    liquidationProbability: Number(liquidationProbability.toFixed(6))
  });
});

const riskRequest = z.object({
  volatility24h: z.number().min(0).max(2),
  volatility7d: z.number().min(0).max(2),
  liquidityDepth: z.number().min(0).max(1),
  drawdownVelocity: z.number().min(0).max(1),
  correlation: z.number().min(-1).max(1),
  oracleDeviation: z.number().min(0).max(1)
});

app.post("/risk/predict", (req, res) => {
  const parsed = riskRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const risk = predictRisk(parsed.data);
  return res.json({ input: parsed.data, risk, at: new Date().toISOString() });
});

app.get("/risk/ai", async (req, res) => {
  const collateral = Number(req.query.collateral || 0);
  const borrow = Number(req.query.borrow || 0);
  const bnbPrice = 400;

  if (!Number.isFinite(collateral) || !Number.isFinite(borrow)) {
    return res.status(400).json({ error: "Invalid collateral or borrow" });
  }

  const collUsd = collateral * bnbPrice;
  const borrowLimit = collUsd * 0.5;
  const utilization = borrowLimit > 0 ? (borrow / borrowLimit) * 100 : 0;
  const liqProb = Math.min(0.99, Math.max(0.01, (utilization / 100) * 0.45));

  const position: PositionData = {
    collateralBNB: collateral,
    collateralUSD: collUsd,
    borrowedUSDT: borrow,
    utilizationPct: utilization,
    liquidationProbability: liqProb,
    riskBand: liqProb < 0.18 ? "green" : liqProb < 0.35 ? "yellow" : "red",
  };

  try {
    const advice = await getAIAdvice(position);
    return res.json({ position, advice, at: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(config.port, () => {
  console.log(`SpendShield risk service listening on port ${config.port}`);
});
