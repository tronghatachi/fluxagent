import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circle-client";

export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Check if wallet already exists for this user
    const list = await circleClient.listWallets({ pageSize: 50 });
    const existing = list.data?.wallets?.find((w: any) => w.refId === userId);
    if (existing) {
      return NextResponse.json({ walletId: existing.id, address: existing.address, exists: true });
    }

    if (action === "check") {
      return NextResponse.json({ exists: false, walletId: null, address: null });
    }

    const walletSetId = process.env.CIRCLE_WALLET_SET_ID!;

    const result = await circleClient.createWallets({
      blockchains: ["ARC-TESTNET" as any],
      count: 1,
      walletSetId,
      idempotencyKey: crypto.randomUUID(),
      metadata: [{ name: `arcpilot:${userId}`, refId: userId }],
    });

    const wallet = result.data?.wallets?.[0];
    if (!wallet) throw new Error("Wallet creation failed — no wallet returned");

    return NextResponse.json({ walletId: wallet.id, address: wallet.address, exists: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("wallet/create error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
