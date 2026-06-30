import { NextResponse } from "next/server";
import { executeSwap } from "@/lib/circle-swap";

export async function POST(req: Request) {
  try {
    const { walletAddress, fromToken, toToken, amount } = await req.json();
    if (!walletAddress || !fromToken || !toToken || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await executeSwap({ walletAddress, fromToken, toToken, amount: String(amount) });
    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error("swap error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
