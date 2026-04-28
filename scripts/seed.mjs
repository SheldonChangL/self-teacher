#!/usr/bin/env node
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA_DIR = path.join(ROOT, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "self-teacher.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT NOT NULL,
    age INTEGER NOT NULL, lang_pref TEXT NOT NULL DEFAULT 'zh-en',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, profile_id TEXT NOT NULL,
    image_paths TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'free',
    hint TEXT NOT NULL DEFAULT '',
    lesson_json TEXT, lesson_status TEXT NOT NULL DEFAULT 'pending',
    quiz_json TEXT, quiz_status TEXT NOT NULL DEFAULT 'pending',
    score INTEGER, created_at INTEGER NOT NULL
  );
`);
// align with runtime migrations
const cols = db.prepare("PRAGMA table_info(sessions)").all().map((c) => c.name);
if (!cols.includes("subject"))
  db.exec("ALTER TABLE sessions ADD COLUMN subject TEXT NOT NULL DEFAULT 'free'");
if (!cols.includes("hint"))
  db.exec("ALTER TABLE sessions ADD COLUMN hint TEXT NOT NULL DEFAULT ''");

const newId = (p) => `${p}_${randomBytes(8).toString("hex")}`;

const KIDS = [
  { name: "小華", age: 7, avatar: "🐰" },
  { name: "小明", age: 10, avatar: "🦊" },
];

const SUBJECTS = ["free", "chinese", "english", "math", "science", "social"];
const SAMPLE_TITLES = {
  free: ["美麗的向日葵", "認識小金魚", "公園裡的彩虹"],
  chinese: ["認識「春」這個字", "唐詩：靜夜思", "成語：守株待兔"],
  english: ["Happy Words 開心單字", "Animal Sounds", "Color Day 顏色日"],
  math: ["7 + 8 怎麼算", "三角形大發現", "一半是多少"],
  science: ["蝴蝶的翅膀", "彩虹怎麼來的", "葉子的脈絡"],
  social: ["紅綠燈的祕密", "我的家鄉地圖", "傳統市場走一走"],
};

const profileInsert = db.prepare(
  `INSERT OR REPLACE INTO profiles (id, name, avatar, age, lang_pref, created_at)
   VALUES (?, ?, ?, ?, 'zh-en', ?)`,
);
const sessionInsert = db.prepare(
  `INSERT INTO sessions (id, profile_id, image_paths, subject, hint,
    lesson_json, lesson_status, quiz_json, quiz_status, score, created_at)
   VALUES (?, ?, ?, ?, '', ?, 'done', ?, ?, ?, ?)`,
);

// wipe demo entries
db.exec(`DELETE FROM sessions WHERE profile_id IN (SELECT id FROM profiles WHERE id LIKE 'p_demo_%')`);
db.exec(`DELETE FROM profiles WHERE id LIKE 'p_demo_%'`);

const now = Date.now();
const day = 24 * 3600 * 1000;
let totalSessions = 0;

KIDS.forEach((k, idx) => {
  const id = `p_demo_${idx}_${randomBytes(4).toString("hex")}`;
  profileInsert.run(id, k.name, k.avatar, k.age, now - 30 * day);

  // 8-12 sessions per kid spread over last 21 days
  const count = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
    const titles = SAMPLE_TITLES[subject];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const created_at = now - Math.floor(Math.random() * 21 * day);
    const lesson_json = JSON.stringify({
      markdown: `# ${title}\n\n（範例教材）`,
      title,
    });
    const quiz_done = Math.random() > 0.2; // 80% have quiz
    const quiz_json = quiz_done
      ? JSON.stringify({
          questions: Array.from({ length: 5 }, (_, qi) => ({
            q_zh: `第 ${qi + 1} 題`,
            q_en: `Q${qi + 1}`,
            options: ["A", "B", "C", "D"],
            answer_index: qi % 4,
            explain_zh: "",
            explain_en: "",
          })),
        })
      : null;
    const score = quiz_done ? 2 + Math.floor(Math.random() * 4) : null; // 2-5
    sessionInsert.run(
      newId("s"),
      id,
      JSON.stringify([`uploads/${id}/demo/img${i}.png`]),
      subject,
      lesson_json,
      quiz_json,
      quiz_done ? "done" : "pending",
      score,
      created_at,
    );
    totalSessions++;
  }
  console.log(`✓ ${k.name} (${k.age}歲): ${count} sessions`);
});

console.log(`\n總共建立 ${KIDS.length} 位小朋友、${totalSessions} 個學習紀錄`);
console.log(`Run: npm run dev → http://localhost:3000/parent`);
