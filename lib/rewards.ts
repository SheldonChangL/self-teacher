import { db, getSetting } from "./db";

export const BONUS_KEYS = {
  pct: "weekend_bonus_pct",
  min: "weekend_bonus_min",
  max: "weekend_bonus_max",
};

export const BONUS_DEFAULTS = { pct: 25, min: 0, max: 60 };

export function getBonusConfig(): { pct: number; min: number; max: number } {
  const pct = Number(getSetting(BONUS_KEYS.pct) ?? BONUS_DEFAULTS.pct);
  const min = Number(getSetting(BONUS_KEYS.min) ?? BONUS_DEFAULTS.min);
  const max = Number(getSetting(BONUS_KEYS.max) ?? BONUS_DEFAULTS.max);
  return {
    pct: Number.isFinite(pct) ? pct : BONUS_DEFAULTS.pct,
    min: Number.isFinite(min) ? min : BONUS_DEFAULTS.min,
    max: Number.isFinite(max) ? max : BONUS_DEFAULTS.max,
  };
}

export function earnedMinutes(profileId: string, date: string): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(minutes_awarded),0) as m FROM daily_logs WHERE profile_id = ? AND date = ?",
    )
    .get(profileId, date) as { m: number };
  return row.m | 0;
}

export function usedMinutes(profileId: string, date: string): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(minutes),0) as m FROM game_time_usage WHERE profile_id = ? AND date = ?",
    )
    .get(profileId, date) as { m: number };
  return row.m | 0;
}

export function recordUsage(profileId: string, date: string, minutes: number): void {
  if (!Number.isFinite(minutes) || minutes === 0) return;
  db.prepare(
    `INSERT INTO game_time_usage (profile_id, date, minutes, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(profileId, date, Math.round(minutes), Date.now());
}

export function weekendBonus(weekdayTotal: number): number {
  const { pct, min, max } = getBonusConfig();
  const raw = Math.round((weekdayTotal * pct) / 100);
  return Math.min(Math.max(raw, min), max);
}
