import { NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

export async function POST(req: Request) {
  try {
    const { walletId, walletAddress, fromToken, toToken, amount } = await req.json();
    if (!walletId || !walletAddress || !fromToken || !toToken || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    const params = {
      from: {
        adapter,
        chain: "Arc_Testnet" as const,
        address: walletAddress,
      },
      tokenIn: fromToken.toUpperCase() as "USDC" | "EURC",
      tokenOut: toToken.toUpperCase() as "USDC" | "EURC",
      amountIn: String(amount),
      config: {
        kitKey: process.env.NEXT_PUBLIC_CIRCLE_KIT_KEY!,
        slippageBps: 5000, // 50% slippage for testnet instability
      },
    };

    // Estimate first to catch pool issues early
    let estimate: any;
    try {
      estimate = await kit.estimateSwap(params);
      console.log("estimateSwap:", JSON.stringify(estimate));
    } catch (estErr: any) {
      console.error("estimateSwap failed:", estErr?.message ?? estErr);
      // Continue anyway — estimate is optional
    }

    const result = await kit.swap(params) as any;
    console.log("swap result:", JSON.stringify(result));

    const txHash = result?.txHash ?? result?.transactionHash ?? "";
    return NextResponse.json({
      txHash,
      explorerUrl: txHash ? `https://testnet.arcscan.app/tx/${txHash}` : "",
      estimatedOutput: estimate?.estimatedOutput,
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    // Log full error for debugging
    console.error("swap error full:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
