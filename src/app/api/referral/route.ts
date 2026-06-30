import { NextResponse } from "next/server";
import { getOrCreateUser, awardTransactionPoint, getUserInfo } from "@/lib/referral-store";

export async function POST(req: Request) {
  try {
    const { action, userId, referrerCode } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (action === "register") {
      const user = await getOrCreateUser(userId, referrerCode);
      return NextResponse.json(user);
    }

    if (action === "info") {
      const user = await getOrCreateUser(userId);
      return NextResponse.json(user);
    }

    if (action === "award") {
      await awardTransactionPoint(userId);
      const user = await getUserInfo(userId);
      return NextResponse.json(user);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
