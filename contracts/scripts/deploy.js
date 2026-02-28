const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer found. Set PRIVATE_KEY in .env for bsctest deployment.");
  }

  console.log("Deploying with:", deployer.address);

  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();

  const CollateralVault = await hre.ethers.getContractFactory("CollateralVault");
  const vault = await CollateralVault.deploy();
  await vault.waitForDeployment();

  const BorrowRouter = await hre.ethers.getContractFactory("BorrowRouter");
  const router = await BorrowRouter.deploy(await vault.getAddress(), await mockUSDT.getAddress());
  await router.waitForDeployment();

  const setRouterTx = await vault.setBorrowRouter(await router.getAddress());
  await setRouterTx.wait();

  const setMinterTx = await mockUSDT.setMinter(await router.getAddress(), true);
  await setMinterTx.wait();

  const mockUSDTAddress = await mockUSDT.getAddress();
  const vaultAddress = await vault.getAddress();
  const routerAddress = await router.getAddress();

  console.log("MockUSDT:", mockUSDTAddress);
  console.log("CollateralVault:", vaultAddress);
  console.log("BorrowRouter:", routerAddress);

  console.log("BscScan Links:");
  console.log("https://testnet.bscscan.com/address/" + mockUSDTAddress);
  console.log("https://testnet.bscscan.com/address/" + vaultAddress);
  console.log("https://testnet.bscscan.com/address/" + routerAddress);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});