import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circle-client";

export async function POST(req: Request) {
  try {
    const { walletId } = await req.json();
    if (!walletId) return NextResponse.json({ error: "walletId required" }, { status: 400 });

    const result = await circleClient.listTransactions({
      walletIds: [walletId],
      pageSize: 5,
    } as any);

    const txs = (result.data?.transactions ?? []).map((tx: any) => ({
      id: tx.id,
      state: tx.state,
      type: tx.transactionType,
      amounts: tx.amounts,
      destinationAddress: tx.destinationAddress,
      sourceAddress: tx.sourceAddress,
      txHash: tx.txHash,
      createDate: tx.createDate,
    }));

    return NextResponse.json({ transactions: txs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("history error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
