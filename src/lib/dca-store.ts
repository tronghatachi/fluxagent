import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface DCAPlan {
  id: string;
  userId: string;
  walletId: string;
  walletAddress: string;
  toToken: string; // "cirBTC"
  totalAmount: number;
  days: number;
  dailyAmount: number;
  daysExecuted: number;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  lastExecutedAt: string | null;
  history: { day: number; txHash: string; date: string }[];
}

const planKey = (id: string) => `dca:plan:${id}`;
const userPlansKey = (userId: string) => `dca:user:${userId}`;
const ACTIVE_SET = "dca:active";

export async function createPlan(input: {
  userId: string;
  walletId: string;
  walletAddress: string;
  toToken: string;
  totalAmount: number;
  days: number;
}): Promise<DCAPlan> {
  const id = crypto.randomUUID();
  const plan: DCAPlan = {
    id,
    userId: input.userId,
    walletId: input.walletId,
    walletAddress: input.walletAddress,
    toToken: input.toToken,
    totalAmount: input.totalAmount,
    days: input.days,
    dailyAmount: input.totalAmount / input.days,
    daysExecuted: 0,
    status: "active",
    createdAt: new Date().toISOString(),
    lastExecutedAt: null,
    history: [],
  };
  await kv.set(planKey(id), plan);
  await kv.sadd(userPlansKey(input.userId), id);
  await kv.sadd(ACTIVE_SET, id);
  return plan;
}

export async function getUserPlans(userId: string): Promise<DCAPlan[]> {
  const ids = (await kv.smembers(userPlansKey(userId))) as string[];
  if (!ids.length) return [];
  const plans = await Promise.all(ids.map((id) => kv.get<DCAPlan>(planKey(id))));
  return plans.filter((p): p is DCAPlan => !!p).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function cancelActivePlans(userId: string): Promise<number> {
  const plans = await getUserPlans(userId);
  const active = plans.filter((p) => p.status === "active");
  for (const p of active) {
    p.status = "cancelled";
    await kv.set(planKey(p.id), p);
    await kv.srem(ACTIVE_SET, p.id);
  }
  return active.length;
}

export async function getActivePlanIds(): Promise<string[]> {
  return (await kv.smembers(ACTIVE_SET)) as string[];
}

export async function getPlan(id: string): Promise<DCAPlan | null> {
  return (await kv.get<DCAPlan>(planKey(id))) ?? null;
}

export async function recordExecution(id: string, txHash: string): Promise<DCAPlan | null> {
  const plan = await getPlan(id);
  if (!plan) return null;
  plan.daysExecuted += 1;
  plan.lastExecutedAt = new Date().toISOString();
  plan.history.push({ day: plan.daysExecuted, txHash, date: plan.lastExecutedAt });
  if (plan.daysExecuted >= plan.days) {
    plan.status = "completed";
    await kv.srem(ACTIVE_SET, id);
  }
  await kv.set(planKey(id), plan);
  return plan;
}
