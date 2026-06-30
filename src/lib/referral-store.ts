import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const MAX_REF_POINTS = 1000;

interface UserData {
  userId: string;
  refCode: string;
  referredBy: string | null;
  points: number;
  refPoints: number;
  refCount: number;
}

const userKey = (userId: string) => `ref:user:${userId}`;
const codeKey = (code: string) => `ref:code:${code}`;

function genCode(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8).toUpperCase();
}

export async function getOrCreateUser(userId: string, referrerCode?: string): Promise<UserData> {
  const existing = await kv.get<UserData>(userKey(userId));
  if (existing) return existing;

  const refCode = genCode(userId);
  let referredBy: string | null = null;

  if (referrerCode) {
    const referrerId = await kv.get<string>(codeKey(referrerCode));
    if (referrerId && referrerId !== userId) {
      referredBy = referrerId;
      const referrer = await kv.get<UserData>(userKey(referrerId));
      if (referrer && referrer.refPoints < MAX_REF_POINTS) {
        referrer.refPoints += 1;
        referrer.points += 1;
        referrer.refCount += 1;
        await kv.set(userKey(referrerId), referrer);
      }
    }
  }

  const user: UserData = { userId, refCode, referredBy, points: 0, refPoints: 0, refCount: 0 };
  await kv.set(userKey(userId), user);
  await kv.set(codeKey(refCode), userId);
  return user;
}

export async function awardTransactionPoint(userId: string): Promise<void> {
  const user = await kv.get<UserData>(userKey(userId));
  if (!user) return;

  // +1 point for own transaction
  user.points += 1;
  await kv.set(userKey(userId), user);

  // +1 point to referrer (if under cap)
  if (user.referredBy) {
    const referrer = await kv.get<UserData>(userKey(user.referredBy));
    if (referrer && referrer.refPoints < MAX_REF_POINTS) {
      referrer.refPoints += 1;
      referrer.points += 1;
      await kv.set(userKey(user.referredBy), referrer);
    }
  }
}

export async function getUserInfo(userId: string): Promise<UserData | null> {
  return (await kv.get<UserData>(userKey(userId))) ?? null;
}
