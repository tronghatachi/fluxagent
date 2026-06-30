import { NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { circleClient } from "@/lib/circle-client";
import { normalizeToken } from "@/lib/circle-swap";

export async function POST(req: Request) {
  try {
    const { fromToken = "USDC", toToken = "EURC" } = await req.json();

    // Get any available wallet address to use for estimation
    const walletList = await circleClient.listWallets({ pageSize: 1 });
    const wallet = walletList.data?.wallets?.[0];
    if (!wallet) return NextResponse.json({ error: "No wallet found for rate estimation" }, { status: 400 });

    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    const kit = new AppKit();
    const estimate = await kit.estimateSwap({
      from: { adapter, chain: "Arc_Testnet", address: wallet.address },
      tokenIn: normalizeToken(fromToken) as any,
      tokenOut: normalizeToken(toToken) as any,
      amountIn: "1",
      config: { kitKey: process.env.NEXT_PUBLIC_CIRCLE_KIT_KEY! },
    });

    return NextResponse.json({
      fromToken: estimate.tokenIn,
      toToken: estimate.tokenOut,
      rate: estimate.estimatedOutput?.amount,
      fees: estimate.fees,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("rate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
