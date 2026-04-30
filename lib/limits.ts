import { db, getSetting } from "./db";

export const DEFAULTS = {
  daily_lessons_limit: 5, // per kid
  monthly_budget_usd: 5,
};

export type LimitCheck =
  | { allowed: true }
  | { allowed: false; reason: "daily" | "budget"; current: number; limit: number };

function getNum(key: string, fallback: number): number {
  const v = getSetting(key);
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function todayLessonsCount(profileId: string): number {
  const today = new Date().toLocaleDateString("sv-SE");
  const r = db
    .prepare(
      "SELECT lessons_count AS c FROM daily_activity WHERE profile_id = ? AND date = ?",
    )
    .get(profileId, today) as { c: number } | undefined;
  return r?.c ?? 0;
}

function thisMonthCost(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const r = db
    .prepare(
      "SELECT COALESCE(SUM(cost_usd), 0) AS s FROM cost_log WHERE created_at >= ?",
    )
    .get(start) as { s: number };
  return r.s;
}

export function canStart(profileId: string): LimitCheck {
  const dailyLimit = getNum("daily_lessons_limit", DEFAULTS.daily_lessons_limit);
  const monthlyBudget = getNum(
    "monthly_budget_usd",
    DEFAULTS.monthly_budget_usd,
  );

  const today = todayLessonsCount(profileId);
  if (today >= dailyLimit) {
    return { allowed: false, reason: "daily", current: today, limit: dailyLimit };
  }
  const cost = thisMonthCost();
  if (cost >= monthlyBudget) {
    return {
      allowed: false,
      reason: "budget",
      current: cost,
      limit: monthlyBudget,
    };
  }
  return { allowed: true };
}

export function getCostStats(): {
  month_usd: number;
  budget_usd: number;
  daily_limit: number;
} {
  return {
    month_usd: thisMonthCost(),
    budget_usd: getNum("monthly_budget_usd", DEFAULTS.monthly_budget_usd),
    daily_limit: getNum("daily_lessons_limit", DEFAULTS.daily_lessons_limit),
  };
}
