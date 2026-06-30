import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

const TOKEN_ALIASES: Record<string, string> = {
  USDC: "USDC",
  EURC: "EURC",
  CIRBTC: "cirBTC",
};

export function normalizeToken(token: string): string {
  const alias = TOKEN_ALIASES[token.toUpperCase()];
  if (!alias) throw new Error(`Unsupported token: ${token}`);
  return alias;
}

export async function executeSwap(params: {
  walletAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
}): Promise<{ txHash: string; explorerUrl: string; estimatedOutput?: string }> {
  const adapter = createCircleWalletsAdapter({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  const swapParams = {
    from: {
      adapter,
      chain: "Arc_Testnet" as const,
      address: params.walletAddress,
    },
    tokenIn: normalizeToken(params.fromToken) as any,
    tokenOut: normalizeToken(params.toToken) as any,
    amountIn: String(params.amount),
    config: {
      kitKey: process.env.NEXT_PUBLIC_CIRCLE_KIT_KEY!,
      slippageBps: 5000, // 50% slippage for testnet instability
    },
  };

  let estimate: any;
  try {
    estimate = await kit.estimateSwap(swapParams);
    console.log("estimateSwap:", JSON.stringify(estimate));
  } catch (estErr: any) {
    console.error("estimateSwap failed:", estErr?.message ?? estErr);
  }

  const result = await kit.swap(swapParams) as any;
  console.log("swap result:", JSON.stringify(result));

  const txHash = result?.txHash ?? result?.transactionHash ?? "";
  return {
    txHash,
    explorerUrl: txHash ? `https://testnet.arcscan.app/tx/${txHash}` : "",
    estimatedOutput: estimate?.estimatedOutput,
  };
}
