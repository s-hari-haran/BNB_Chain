# SpendShield Implementation Phases

Total phases: 4

## Phase 1 — Smart Collateral Core

Deliverables:
- `CollateralVault.sol`
- `BorrowRouter.sol`
- `RiskBufferReserve.sol`
- Hardhat deploy script

Acceptance:
- User can deposit collateral and borrow through router
- Safety mode and max liquidation probability are stored on-chain
- Vault can trigger emergency deleverage via automation

## Phase 2 — AI Risk Engine + Automation Loop

Deliverables:
- Express API (`/risk/live`, `/risk/predict`)
- Risk model with liquidation probability output
- Watcher agent that monitors risk and calls `notifyHealth`

Acceptance:
- API returns risk band and recommended LTV
- Watcher triggers on-chain health notification when threshold is exceeded

## Phase 3 — Retail-Friendly UX

Deliverables:
- Next.js dApp
- Wallet connect
- Borrow slider + safety mode selector
- Green/Yellow/Red risk meter
- Transaction history panel

Acceptance:
- User can complete full journey: connect → deposit → borrow
- UI prioritizes safety language over raw leverage language

## Phase 4 — Testnet Deployment + Submission Readiness

Deliverables:
- Testnet deployment commands
- `.env.example`
- Docker compose for backend + watcher
- Demo narrative and judging alignment docs

Acceptance:
- Contracts deploy on BNB testnet
- Frontend can point to deployed addresses
- Repo is submission-ready with architecture and runbook docs
