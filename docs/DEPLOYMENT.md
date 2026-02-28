# Deployment Guide (BNB Testnet)

## 1) Environment

Copy `.env.example` to `.env` and set:
- `PRIVATE_KEY`
- `BNB_CHAIN_RPC_URL`
- `CHAIN_ID=97`

## 2) Install dependencies

```bash
npm install
```

## 3) Deploy contracts

```bash
npm run deploy:testnet -w contracts
```

Take the printed addresses and update `.env`:
- `NEXT_PUBLIC_VAULT_ADDRESS`
- `NEXT_PUBLIC_BORROW_ROUTER_ADDRESS`

## 4) Start backend services

```bash
docker compose up --build
```

## 5) Start frontend

```bash
npm run dev -w frontend
```

## 6) Verify contracts on BscScan

Use Hardhat verify plugin or BscScan UI once addresses are deployed.

## 7) Demo checklist

- Connect wallet
- Deposit collateral and buffer
- Borrow in protected mode
- Hit `/risk/live` to show dynamic model output
- Run watcher with `WATCH_USER_ADDRESS` and demonstrate auto-protection trigger
