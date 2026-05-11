import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, "self-teacher.sqlite");

declare global {
  var __selfTeacherDb: Database.Database | undefined;
}

function open() {
  const db = new Database(dbPath);
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      age INTEGER NOT NULL,
      lang_pref TEXT NOT NULL DEFAULT 'zh-en',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      image_paths TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'free',
      hint TEXT NOT NULL DEFAULT '',
      lesson_json TEXT,
      lesson_status TEXT NOT NULL DEFAULT 'pending',
      quiz_json TEXT,
      quiz_status TEXT NOT NULL DEFAULT 'pending',
      score INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_activity (
      profile_id TEXT NOT NULL,
      date TEXT NOT NULL,
      lessons_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (profile_id, date)
    );

    CREATE TABLE IF NOT EXISTS vocab_cards (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      source_session_id TEXT,
      ease INTEGER NOT NULL DEFAULT 0,
      next_review_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vocab_due
      ON vocab_cards(profile_id, next_review_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_uniq
      ON vocab_cards(profile_id, front);

    CREATE TABLE IF NOT EXISTS cost_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT,
      kind TEXT NOT NULL,
      cost_usd REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cost_created
      ON cost_log(created_at DESC);

    CREATE TABLE IF NOT EXISTS task_presets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('homework','chore','exercise','reading')),
      label TEXT NOT NULL,
      emoji TEXT NOT NULL,
      minutes_award INTEGER NOT NULL DEFAULT 5,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_builtin INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_presets_kind ON task_presets(kind, sort_order);

    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      preset_id TEXT NOT NULL REFERENCES task_presets(id),
      label TEXT NOT NULL,
      emoji TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('done','undone','forgot')),
      minutes_awarded INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE (profile_id, date, kind, preset_id)
    );
    CREATE INDEX IF NOT EXISTS idx_logs_kid_date ON daily_logs(profile_id, date);

    CREATE TABLE IF NOT EXISTS game_time_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      date TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_kid_date ON game_time_usage(profile_id, date);

    -- Phonics: AI-generated lesson content keyed by (stage, lesson) slugs from
    -- lib/phonics-curriculum.ts. Populated once via scripts/seed-phonics.mjs;
    -- the runtime reads from here and never calls AI.
    CREATE TABLE IF NOT EXISTS phonics_lessons (
      stage_slug   TEXT NOT NULL,
      lesson_slug  TEXT NOT NULL,
      content_json TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      provider     TEXT,
      cost_usd     REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (stage_slug, lesson_slug)
    );

    -- Phonics: per-kid completion log. "Completed" just means the kid pressed
    -- the "我學會了" button on that lesson at least once.
    CREATE TABLE IF NOT EXISTS phonics_progress (
      profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      stage_slug   TEXT NOT NULL,
      lesson_slug  TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      PRIMARY KEY (profile_id, stage_slug, lesson_slug)
    );
    CREATE INDEX IF NOT EXISTS idx_phonics_progress_profile
      ON phonics_progress(profile_id);
  `);

  // Backfill columns if migrating from an older schema.
  const cols = db
    .prepare("PRAGMA table_info(sessions)")
    .all() as { name: string }[];
  const has = (n: string) => cols.some((c) => c.name === n);
  if (!has("subject")) {
    db.exec("ALTER TABLE sessions ADD COLUMN subject TEXT NOT NULL DEFAULT 'free'");
  }
  if (!has("hint")) {
    db.exec("ALTER TABLE sessions ADD COLUMN hint TEXT NOT NULL DEFAULT ''");
  }
  if (!has("feedback")) {
    db.exec("ALTER TABLE sessions ADD COLUMN feedback TEXT");
  }
  if (!has("prev_lesson_id")) {
    db.exec("ALTER TABLE sessions ADD COLUMN prev_lesson_id TEXT");
  }

  seedTaskPresetsIfEmpty(db);
  return db;
}

const DEFAULT_PRESETS: Array<{
  kind: "homework" | "chore" | "exercise" | "reading";
  emoji: string;
  label: string;
  minutes: number;
}> = [
  { kind: "homework", emoji: "📖", label: "國語", minutes: 15 },
  { kind: "homework", emoji: "🔢", label: "數學", minutes: 15 },
  { kind: "homework", emoji: "🅰️", label: "英文", minutes: 15 },
  { kind: "homework", emoji: "🌿", label: "自然", minutes: 10 },
  { kind: "homework", emoji: "🌏", label: "社會", minutes: 10 },
  { kind: "homework", emoji: "✏️", label: "寫字練習", minutes: 5 },
  { kind: "homework", emoji: "📝", label: "訂正", minutes: 5 },
  { kind: "chore", emoji: "🗑️", label: "倒垃圾", minutes: 5 },
  { kind: "chore", emoji: "🍽️", label: "洗碗", minutes: 5 },
  { kind: "chore", emoji: "🧹", label: "掃地", minutes: 5 },
  { kind: "chore", emoji: "🪟", label: "擦桌子", minutes: 3 },
  { kind: "chore", emoji: "👕", label: "摺衣服", minutes: 5 },
  { kind: "chore", emoji: "🎒", label: "整理書包", minutes: 3 },
  { kind: "chore", emoji: "🛏️", label: "鋪床", minutes: 3 },
  { kind: "chore", emoji: "🍵", label: "倒茶水", minutes: 2 },
  { kind: "exercise", emoji: "🏃", label: "跑步", minutes: 10 },
  { kind: "exercise", emoji: "🚴", label: "騎腳踏車", minutes: 10 },
  { kind: "exercise", emoji: "🪢", label: "跳繩", minutes: 10 },
  { kind: "exercise", emoji: "🏀", label: "打球", minutes: 10 },
  { kind: "exercise", emoji: "🏊", label: "游泳", minutes: 15 },
  { kind: "exercise", emoji: "🚶", label: "散步", minutes: 5 },
  { kind: "exercise", emoji: "🤸", label: "拉筋體操", minutes: 5 },
  { kind: "reading", emoji: "📖", label: "課外讀物 30 分鐘", minutes: 15 },
  { kind: "reading", emoji: "📚", label: "課外讀物 15 分鐘", minutes: 8 },
];

function seedTaskPresetsIfEmpty(db: Database.Database) {
  const row = db
    .prepare("SELECT COUNT(*) as n FROM task_presets")
    .get() as { n: number };
  if (row.n > 0) return;
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO task_presets
       (id, kind, label, emoji, minutes_award, active, sort_order, is_builtin, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, 1, ?)`,
  );
  const insertAll = db.transaction(() => {
    DEFAULT_PRESETS.forEach((p, i) => {
      const id = `pre_${p.kind}_${i}_${now.toString(36)}`;
      stmt.run(id, p.kind, p.label, p.emoji, p.minutes, i, now);
    });
  });
  insertAll();
}

export const db = globalThis.__selfTeacherDb ?? (globalThis.__selfTeacherDb = open());

export type Profile = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  lang_pref: string;
  created_at: number;
};

export type { Subject } from "./subjects";
export { SUBJECTS } from "./subjects";

import type { Subject } from "./subjects";

export function getSetting(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

export type TaskKind = "homework" | "chore" | "exercise" | "reading";

export type TaskPreset = {
  id: string;
  kind: TaskKind;
  label: string;
  emoji: string;
  minutes_award: number;
  active: number;
  sort_order: number;
  is_builtin: number;
  created_at: number;
};

export type DailyLogStatus = "done" | "undone" | "forgot";

export type DailyLog = {
  id: string;
  profile_id: string;
  date: string;
  kind: TaskKind;
  preset_id: string;
  label: string;
  emoji: string;
  status: DailyLogStatus;
  minutes_awarded: number;
  created_at: number;
};

export type PhonicsLessonRow = {
  stage_slug: string;
  lesson_slug: string;
  content_json: string;
  generated_at: number;
  provider: string | null;
  cost_usd: number;
};

export type PhonicsProgressRow = {
  profile_id: string;
  stage_slug: string;
  lesson_slug: string;
  completed_at: number;
};

export type Session = {
  id: string;
  profile_id: string;
  image_paths: string;
  subject: Subject;
  hint: string;
  lesson_json: string | null;
  lesson_status: "pending" | "running" | "done" | "error";
  quiz_json: string | null;
  quiz_status: "pending" | "running" | "done" | "error";
  score: number | null;
  feedback: "up" | "down" | null;
  prev_lesson_id: string | null;
  created_at: number;
};

