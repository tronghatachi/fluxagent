const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "USDC");

  const Treasury = await hre.ethers.getContractFactory("FluxTreasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();

  const address = await treasury.getAddress();
  console.log("FluxTreasury deployed to:", address);
  console.log("Explorer:", `https://testnet.arcscan.app/address/${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
