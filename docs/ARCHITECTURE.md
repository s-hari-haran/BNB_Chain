# SpendShield Architecture

## UX + Design Direction

The attached references emphasize:
- BNB Chain visual identity (black + yellow)
- Clarity-first communication
- Build for users (not only judges)

This MVP follows that by using simple risk modes, a single primary flow, and a visible safety meter.

## Components

1. Frontend (`frontend/`)
- Next.js app
- Wallet connection via injected provider
- Borrow and safety controls
- Risk visualization with `green/yellow/red` bands

2. On-chain contracts (`contracts/`)
- `CollateralVault`: user state, protected mode, automation hook
- `BorrowRouter`: lending adapter abstraction with borrow/repay actions
- `RiskBufferReserve`: per-user reserve for auto-protection

3. Backend (`backend/`)
- Risk API computes liquidation probability and safe LTV
- Watcher invokes `notifyHealth` when probability crosses threshold

## Safety Modes

- Conservative: 12% max liquidation probability
- Balanced: 25% max liquidation probability
- Aggressive: 40% max liquidation probability

Modes map to protection thresholds in the vault and can be tuned over time.

## AI Model (MVP)

Input features:
- 24h / 7d volatility
- liquidity depth proxy
- drawdown velocity
- collateral-borrow correlation
- oracle deviation proxy

Output:
- liquidation probability
- recommended LTV ceiling
- required protection buffer

Current implementation uses a logistic-style scoring model with calibrated coefficients for fast inference.
