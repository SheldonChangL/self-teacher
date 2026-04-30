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
  return db;
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

