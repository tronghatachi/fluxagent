import { ethers } from "ethers";

const RPC = "https://rpc.testnet.arc.network";
const TREASURY_ADDRESS = "0xEaf078f8dd603aF7f9C68C22BB1DE923f0B47A82";
const VAULT_ADDRESS = "0x85509899EF0f0f6de89240D9d3d2389834D5a028";
// USDC ERC-20 on Arc Testnet (6 decimals)
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const FEE_BPS = 10; // 0.1%

const TREASURY_ABI = [
  "function depositFee(address token, uint256 amount) external",
  "function nativeBalance() external view returns (uint256)",
  "function tokenBalance(address token) external view returns (uint256)",
];

const VAULT_ABI = [
  "function createPlan(bytes32 planId, uint256 totalAmount, uint256 numDays) external",
  "function executeDay(bytes32 planId) external returns (uint256 amount)",
  "function cancelPlan(bytes32 planId) external",
  "function getPlan(bytes32 planId) external view returns (tuple(address user, uint256 totalAmount, uint256 remaining, uint256 days_, uint256 daysExecuted, bool active))",
  "function dailyAmount(bytes32 planId) external view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

function getWallet() {
  const provider = new ethers.JsonRpcProvider(RPC);
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
}

// ─── Treasury ────────────────────────────────────────────────────────────────

/**
 * Collect 0.1% fee from a swap and send to Treasury contract.
 * amountIn: the raw swap input amount as a string (in token's native units)
 * token: "USDC" | "EURC" | "cirBTC"
 */
export async function collectSwapFee(amountIn: string, token: string): Promise<void> {
  // Only collect USDC fees (native token on Arc)
  if (token.toUpperCase() !== "USDC") return;

  const amount = parseFloat(amountIn);
  if (!amount || amount <= 0) return;

  const fee = (amount * FEE_BPS) / 10000; // e.g. 1 USDC → 0.001 USDC fee
  // Arc native USDC = 18 decimals — send directly to Treasury via receive()
  const feeWei = ethers.parseEther(fee.toFixed(18));

  const wallet = getWallet();
  const tx = await wallet.sendTransaction({ to: TREASURY_ADDRESS, value: feeWei });
  await tx.wait();
  console.log(`Fee collected: ${fee} USDC → Treasury`);
}

// ─── Vault ───────────────────────────────────────────────────────────────────

function planIdBytes(planId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(planId));
}

/**
 * Lock USDC into Vault when a DCA plan is created.
 * totalAmount: human-readable USDC (e.g. "100")
 */
export async function vaultCreatePlan(planId: string, totalAmount: string, days: number): Promise<void> {
  const wallet = getWallet();
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);

  const amount = ethers.parseUnits(totalAmount, 6); // USDC = 6 decimals

  // Approve vault
  const allowance = await usdc.allowance(wallet.address, VAULT_ADDRESS);
  if (allowance < amount) {
    const approveTx = await usdc.approve(VAULT_ADDRESS, ethers.MaxUint256);
    await approveTx.wait();
  }

  const tx = await vault.createPlan(planIdBytes(planId), amount, days);
  await tx.wait();
  console.log(`Vault: plan ${planId} created — locked ${totalAmount} USDC`);
}

/**
 * Execute one day of a DCA plan from the Vault.
 * Returns the USDC amount withdrawn (in 6-decimal units as string).
 */
export async function vaultExecuteDay(planId: string): Promise<string> {
  const wallet = getWallet();
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);
  const tx = await vault.executeDay(planIdBytes(planId));
  const receipt = await tx.wait();
  // Parse DayExecuted event to get amount
  const iface = new ethers.Interface(VAULT_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "DayExecuted") {
        return parsed.args.amount.toString();
      }
    } catch {}
  }
  return "0";
}

/**
 * Cancel a DCA plan and refund remaining USDC to user.
 */
export async function vaultCancelPlan(planId: string): Promise<void> {
  const wallet = getWallet();
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);
  const tx = await vault.cancelPlan(planIdBytes(planId));
  await tx.wait();
  console.log(`Vault: plan ${planId} cancelled`);
}

/**
 * Get on-chain plan info.
 */
export async function vaultGetPlan(planId: string) {
  const provider = new ethers.JsonRpcProvider(RPC);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
  const plan = await vault.getPlan(planIdBytes(planId));
  return {
    user: plan.user,
    totalAmount: ethers.formatUnits(plan.totalAmount, 6),
    remaining: ethers.formatUnits(plan.remaining, 6),
    days: Number(plan.days_),
    daysExecuted: Number(plan.daysExecuted),
    active: plan.active,
  };
}
