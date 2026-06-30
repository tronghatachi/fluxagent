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

interface SwapLegResult {
  txHash: string;
  explorerUrl: string;
  amountOut?: string;
  estimatedOutput?: string;
}

async function singleSwap(params: {
  walletAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
}): Promise<SwapLegResult> {
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
    amountOut: result?.amountOut,
    estimatedOutput: estimate?.estimatedOutput?.amount,
  };
}

export async function executeSwap(params: {
  walletAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
}): Promise<{ txHash: string; explorerUrl: string; estimatedOutput?: string }> {
  const from = normalizeToken(params.fromToken);
  const to = normalizeToken(params.toToken);

  // No direct liquidity pool exists between EURC and cirBTC on Arc Testnet —
  // route through USDC automatically (EURC -> USDC -> cirBTC, or reverse).
  if (from !== "USDC" && to !== "USDC") {
    const leg1 = await singleSwap({ ...params, toToken: "USDC" });
    if (!leg1.amountOut) throw new Error(`${from} → USDC leg failed: no output amount returned`);
    const leg2 = await singleSwap({
      walletAddress: params.walletAddress,
      fromToken: "USDC",
      toToken: params.toToken,
      amount: leg1.amountOut,
    });
    return { txHash: leg2.txHash, explorerUrl: leg2.explorerUrl, estimatedOutput: leg2.estimatedOutput };
  }

  return singleSwap(params);
}
