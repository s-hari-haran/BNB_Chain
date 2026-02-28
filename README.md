# SpendShield – Chain 97 Demo

SpendShield MVP is deployed on **BNB Smart Chain Testnet (Chain ID 97)** and demonstrates 2 required on-chain transactions:

1. Deposit collateral (`vault.deposit()`)
2. Borrow stablecoin (`borrowRouter.borrow(10e18)`)

## Contracts

- `MockUSDT.sol` (mintable BEP20 for demo borrowing)
- `CollateralVault.sol` (`deposit()`, `withdraw()`, `getUserCollateral()`)
- `BorrowRouter.sol` (`borrow(uint256)`, `repay(uint256)`, 50% collateral rule)

## BSC Testnet Network

- Network Name: `BSC Testnet`
- RPC: `https://data-seed-prebsc-1-s1.binance.org:8545`
- Chain ID: `97`
- Currency: `tBNB`
- Explorer: `https://testnet.bscscan.com`

## Setup

```bash
npm install
copy .env.example .env
```

Set in `.env`:
- `PRIVATE_KEY`
- `BSCSCAN_API_KEY`

## Deploy Contracts

```bash
npm run deploy:testnet -w contracts
```

Copy printed addresses to `.env`:
- `NEXT_PUBLIC_VAULT_ADDRESS`
- `NEXT_PUBLIC_BORROW_ROUTER_ADDRESS`
- `NEXT_PUBLIC_MOCK_USDT_ADDRESS`

## Verify on BscScan (Critical)

```bash
npx hardhat verify --network bsctest <MOCK_USDT_ADDRESS>
npx hardhat verify --network bsctest <VAULT_ADDRESS>
npx hardhat verify --network bsctest <ROUTER_ADDRESS> <VAULT_ADDRESS> <MOCK_USDT_ADDRESS>
```

## Run Frontend

```bash
npm run dev -w frontend
```

Buttons in UI:
- `Deposit 0.05 tBNB` (transaction #1)
- `Borrow 10 MockUSDT` (transaction #2)

Each button shows a BscScan tx link after confirmation.

## Live Testnet Proof (Chain 97)

Verified contracts:
- MockUSDT: https://testnet.bscscan.com/address/0xCA4c183f356012dEaB991B0e99dc6A70FC6a6d60#code
- CollateralVault: https://testnet.bscscan.com/address/0x1a7060de7326F382F336061CEDFDdeD85ffD70A6#code
- BorrowRouter: https://testnet.bscscan.com/address/0x6Bd89A062a16De900bC508E3eE4731dB0b5e4325#code

Required successful transactions:
- Transaction 1 (Deposit): https://testnet.bscscan.com/tx/0xc1e710238f70fc74548098bdc20f1741eda3880f4280c99f409c6e38efa4bbb4
- Transaction 2 (Borrow): https://testnet.bscscan.com/tx/0xfe842dc0407bd345b66945306d283bb390eedd8275f2940c2b7db35d015a73d8

## Optional AI API

Run backend:

```bash
npm run dev -w backend
```

Query:

`GET /risk?collateral=1.2&borrow=0.4`

## Diagrams

- Architecture + user flow: `docs/DIAGRAMS.md`