import { ethers } from "ethers";
import { config } from "./config";
import { getMarketFeatures } from "./marketData";
import { predictRisk } from "./riskModel";
import { vaultAbi } from "./abi";

async function tick(contract: ethers.Contract) {
  const user = process.env.WATCH_USER_ADDRESS;
  if (!user) {
    console.log("WATCH_USER_ADDRESS not set. Skipping watcher tick.");
    return;
  }

  const features = await getMarketFeatures();
  const risk = predictRisk(features);
  const probabilityBps = Math.round(risk.liquidationProbability * 10000);

  console.log(
    `[watcher] user=${user} prob=${risk.liquidationProbability.toFixed(4)} band=${risk.riskBand} ltv=${risk.recommendedLtv.toFixed(3)}`
  );

  if (risk.liquidationProbability < config.probabilityThreshold) {
    return;
  }

  const tx = await contract.notifyHealth(user, probabilityBps);
  await tx.wait();
  console.log(`[watcher] notifyHealth submitted: ${tx.hash}`);
}

async function main() {
  if (!config.vaultAddress || !config.privateKey) {
    console.log("Missing NEXT_PUBLIC_VAULT_ADDRESS or PRIVATE_KEY. Watcher idle.");
    return;
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const signer = new ethers.Wallet(config.privateKey, provider);
  const contract = new ethers.Contract(config.vaultAddress, vaultAbi, signer);

  console.log("SpendShield watcher started.");
  await tick(contract);
  setInterval(async () => {
    try {
      await tick(contract);
    } catch (error) {
      console.error("Watcher tick error", error);
    }
  }, config.pollMs);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});