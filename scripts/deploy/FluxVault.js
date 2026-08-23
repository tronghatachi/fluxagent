const hre = require("hardhat");

// USDC ERC-20 address on Arc Testnet
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "USDC");

  const Vault = await hre.ethers.getContractFactory("FluxVault");
  const vault = await Vault.deploy(USDC_ADDRESS, deployer.address);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("FluxVault deployed to:", address);
  console.log("Explorer:", `https://testnet.arcscan.app/address/${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
