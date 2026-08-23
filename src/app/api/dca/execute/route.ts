import { NextResponse } from "next/server";
import { getActivePlanIds, getPlan, recordExecution } from "@/lib/dca-store";
import { executeSwap } from "@/lib/circle-swap";
import { vaultExecuteDay } from "@/lib/contracts";

export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron sends this header; reject manual calls in production without it.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = await getActivePlanIds();
  const results: any[] = [];

  for (const id of ids) {
    const plan = await getPlan(id);
    if (!plan || plan.status !== "active") continue;

    try {
      // Withdraw daily amount from Vault on-chain
      vaultExecuteDay(id).catch((e) =>
        console.error("Vault executeDay error:", e?.message ?? e)
      );

      const { txHash } = await executeSwap({
        walletAddress: plan.walletAddress,
        fromToken: "USDC",
        toToken: plan.toToken,
        amount: String(plan.dailyAmount),
      });
      const updated = await recordExecution(id, txHash);
      results.push({ id, ok: true, txHash, daysExecuted: updated?.daysExecuted });
    } catch (err) {
      results.push({ id, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ executed: results.length, results });
}
