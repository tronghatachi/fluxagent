const MAX_REF_POINTS = 1000;

interface UserData {
  userId: string;
  refCode: string;
  referredBy: string | null;
  points: number;
  refPoints: number;
  refCount: number;
}

const store = new Map<string, UserData>();
const codeToUser = new Map<string, string>();

function genCode(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8).toUpperCase();
}

export function getOrCreateUser(userId: string, referrerCode?: string): UserData {
  let user = store.get(userId);
  if (user) return user;

  const refCode = genCode(userId);
  let referredBy: string | null = null;

  if (referrerCode && codeToUser.has(referrerCode)) {
    const referrerId = codeToUser.get(referrerCode)!;
    if (referrerId !== userId) {
      referredBy = referrerId;
      const referrer = store.get(referrerId);
      if (referrer && referrer.refPoints < MAX_REF_POINTS) {
        referrer.refPoints += 1;
        referrer.points += 1;
        referrer.refCount += 1;
      }
    }
  }

  user = { userId, refCode, referredBy, points: 0, refPoints: 0, refCount: 0 };
  store.set(userId, user);
  codeToUser.set(refCode, userId);
  return user;
}

export function awardTransactionPoint(userId: string): void {
  const user = store.get(userId);
  if (!user) return;

  // +1 point for own transaction
  user.points += 1;

  // +1 point to referrer (if under cap)
  if (user.referredBy) {
    const referrer = store.get(user.referredBy);
    if (referrer && referrer.refPoints < MAX_REF_POINTS) {
      referrer.refPoints += 1;
      referrer.points += 1;
    }
  }
}

export function getUserInfo(userId: string): UserData | null {
  return store.get(userId) ?? null;
}
