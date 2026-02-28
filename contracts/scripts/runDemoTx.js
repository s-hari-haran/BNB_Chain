const hre = require("hardhat");
require("dotenv").config({ path: "../.env" });

async function main() {
  const vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
  const routerAddress = process.env.NEXT_PUBLIC_BORROW_ROUTER_ADDRESS;

  if (!vaultAddress || !routerAddress) {
    throw new Error("Set NEXT_PUBLIC_VAULT_ADDRESS and NEXT_PUBLIC_BORROW_ROUTER_ADDRESS in .env");
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Running demo tx with:", signer.address);

  const vault = await hre.ethers.getContractAt("CollateralVault", vaultAddress, signer);
  const router = await hre.ethers.getContractAt("BorrowRouter", routerAddress, signer);

  const depositTx = await vault.deposit({ value: hre.ethers.parseEther("0.05") });
  await depositTx.wait();
  console.log("Deposit tx:", depositTx.hash);
  console.log("https://testnet.bscscan.com/tx/" + depositTx.hash);

  const borrowTx = await router.borrow(hre.ethers.parseUnits("10", 18));
  await borrowTx.wait();
  console.log("Borrow tx:", borrowTx.hash);
  console.log("https://testnet.bscscan.com/tx/" + borrowTx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
