import { db } from "./db";
import { newId } from "./id";
import type { DailyLog, DailyLogStatus, TaskKind, TaskPreset } from "./db";

export const TASK_KINDS: TaskKind[] = ["homework", "chore", "exercise", "reading"];

export function localDate(ts: number = Date.now()): string {
  return new Date(ts).toLocaleDateString("sv-SE");
}

export function listPresets(opts?: { activeOnly?: boolean }): TaskPreset[] {
  const where = opts?.activeOnly ? "WHERE active = 1" : "";
  return db
    .prepare(
      `SELECT * FROM task_presets ${where}
       ORDER BY kind, sort_order, created_at`,
    )
    .all() as TaskPreset[];
}

export function getPreset(id: string): TaskPreset | null {
  return (
    (db
      .prepare("SELECT * FROM task_presets WHERE id = ?")
      .get(id) as TaskPreset | undefined) ?? null
  );
}

export function createPreset(input: {
  kind: TaskKind;
  label: string;
  emoji: string;
  minutes_award: number;
}): TaskPreset {
  const id = newId("pre");
  const now = Date.now();
  const max = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as m FROM task_presets WHERE kind = ?",
    )
    .get(input.kind) as { m: number };
  const sort_order = max.m + 1;
  db.prepare(
    `INSERT INTO task_presets
       (id, kind, label, emoji, minutes_award, active, sort_order, is_builtin, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?)`,
  ).run(id, input.kind, input.label, input.emoji, input.minutes_award, sort_order, now);
  return getPreset(id)!;
}

export function updatePreset(
  id: string,
  patch: { active?: number; minutes_award?: number; label?: string; emoji?: string },
): TaskPreset | null {
  const cur = getPreset(id);
  if (!cur) return null;
  const next = {
    active: patch.active ?? cur.active,
    minutes_award: patch.minutes_award ?? cur.minutes_award,
    label: patch.label ?? cur.label,
    emoji: patch.emoji ?? cur.emoji,
  };
  db.prepare(
    `UPDATE task_presets SET active = ?, minutes_award = ?, label = ?, emoji = ?
     WHERE id = ?`,
  ).run(next.active, next.minutes_award, next.label, next.emoji, id);
  return getPreset(id);
}

export function deletePreset(id: string): boolean {
  const cur = getPreset(id);
  if (!cur || cur.is_builtin) return false;
  db.prepare("DELETE FROM task_presets WHERE id = ?").run(id);
  return true;
}

export function listLogs(profileId: string, date: string): DailyLog[] {
  return db
    .prepare(
      "SELECT * FROM daily_logs WHERE profile_id = ? AND date = ? ORDER BY kind, created_at",
    )
    .all(profileId, date) as DailyLog[];
}

export function upsertLog(input: {
  profile_id: string;
  date: string;
  preset_id: string;
  status: DailyLogStatus;
}): DailyLog {
  const preset = getPreset(input.preset_id);
  if (!preset) throw new Error("preset_not_found");
  const minutes =
    input.status === "done" ? Math.max(0, preset.minutes_award) : 0;
  const existing = db
    .prepare(
      `SELECT id FROM daily_logs
       WHERE profile_id = ? AND date = ? AND kind = ? AND preset_id = ?`,
    )
    .get(input.profile_id, input.date, preset.kind, preset.id) as
    | { id: string }
    | undefined;

  if (existing) {
    db.prepare(
      `UPDATE daily_logs
       SET status = ?, minutes_awarded = ?, label = ?, emoji = ?
       WHERE id = ?`,
    ).run(input.status, minutes, preset.label, preset.emoji, existing.id);
    return db
      .prepare("SELECT * FROM daily_logs WHERE id = ?")
      .get(existing.id) as DailyLog;
  }
  const id = newId("log");
  db.prepare(
    `INSERT INTO daily_logs
       (id, profile_id, date, kind, preset_id, label, emoji, status, minutes_awarded, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.profile_id,
    input.date,
    preset.kind,
    preset.id,
    preset.label,
    preset.emoji,
    input.status,
    minutes,
    Date.now(),
  );
  return db.prepare("SELECT * FROM daily_logs WHERE id = ?").get(id) as DailyLog;
}

export function deleteLogByPreset(input: {
  profile_id: string;
  date: string;
  preset_id: string;
}): boolean {
  const r = db
    .prepare(
      "DELETE FROM daily_logs WHERE profile_id = ? AND date = ? AND preset_id = ?",
    )
    .run(input.profile_id, input.date, input.preset_id);
  return r.changes > 0;
}

export type TodayState = {
  date: string;
  presets: TaskPreset[];
  logs: DailyLog[];
  earned_minutes: number;
};

export function getTodayState(profileId: string, date = localDate()): TodayState {
  const presets = listPresets({ activeOnly: true });
  const logs = listLogs(profileId, date);
  const earned_minutes = logs.reduce((a, l) => a + l.minutes_awarded, 0);
  return { date, presets, logs, earned_minutes };
}
