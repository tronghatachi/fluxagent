import { NextResponse } from "next/server";
import { createPlan, getUserPlans, cancelActivePlans } from "@/lib/dca-store";
import { vaultCreatePlan, vaultCancelPlan } from "@/lib/contracts";

export async function POST(req: Request) {
  try {
    const { action, userId, walletId, walletAddress, toToken, totalAmount, days } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    if (action === "create") {
      if (!walletId || !walletAddress || !toToken || !totalAmount || !days) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const amount = parseFloat(totalAmount);
      const numDays = parseInt(days, 10);
      if (!(amount > 0) || !(numDays > 0)) {
        return NextResponse.json({ error: "Invalid amount or days" }, { status: 400 });
      }
      const plan = await createPlan({ userId, walletId, walletAddress, toToken, totalAmount: amount, days: numDays });

      // Lock USDC in Vault on-chain (non-blocking)
      vaultCreatePlan(plan.id, String(amount), numDays).catch((e) =>
        console.error("Vault createPlan error:", e?.message ?? e)
      );

      return NextResponse.json({ plan });
    }

    if (action === "list") {
      const plans = await getUserPlans(userId);
      return NextResponse.json({ plans });
    }

    if (action === "cancel") {
      const plans = await getUserPlans(userId);
      const cancelled = await cancelActivePlans(userId);

      // Cancel each active plan in Vault on-chain (non-blocking)
      for (const p of plans.filter((p: any) => p.status === "active")) {
        vaultCancelPlan(p.id).catch((e) =>
          console.error("Vault cancelPlan error:", e?.message ?? e)
        );
      }

      return NextResponse.json({ cancelled });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
