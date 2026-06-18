import { NextResponse } from "next/server";
import { circleClient } from "@/lib/circle-client";

const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
const FEE = { type: "LEVEL", config: { feeLevel: "MEDIUM" } } as any;

export async function POST(req: Request) {
  try {
    const { walletId, token, amount, toAddress } = await req.json();
    if (!walletId || !token || !amount || !toAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) {
      return NextResponse.json({ error: "Invalid destination address" }, { status: 400 });
    }

    let tx;

    if (token.toUpperCase() === "USDC") {
      // USDC is the native token on Arc — use createTransaction
      tx = await circleClient.createTransaction({
        walletId,
        blockchain: "ARC-TESTNET" as any,
        destinationAddress: toAddress,
        amount: [amount],
        fee: FEE,
        idempotencyKey: crypto.randomUUID(),
      } as any);
    } else if (token.toUpperCase() === "EURC") {
      // EURC is ERC-20 (6 decimals) — use contractExecution
      const amountInWei = BigInt(Math.round(parseFloat(amount) * 1_000_000)).toString();
      tx = await circleClient.createContractExecutionTransaction({
        walletId,
        contractAddress: EURC_ADDRESS,
        abiFunctionSignature: "transfer(address,uint256)",
        abiParameters: [toAddress, amountInWei],
        fee: FEE,
        idempotencyKey: crypto.randomUUID(),
      } as any);
    } else {
      return NextResponse.json({ error: `Unsupported token: ${token}` }, { status: 400 });
    }

    const raw = tx.data as any;
    const txId = raw?.id ?? raw?.transaction?.id;

    // Poll until txHash is available (tx mined on-chain)
    let txHash = "";
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const s = await circleClient.getTransaction({ id: txId });
      const t = (s.data as any)?.transaction;
      if (t?.txHash) { txHash = t.txHash; break; }
      if (t?.state === "FAILED" || t?.state === "CANCELLED") break;
    }

    return NextResponse.json({
      txId,
      txHash,
      state: "confirmed",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("transfer error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
