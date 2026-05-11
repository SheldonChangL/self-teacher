#!/usr/bin/env node
// One-shot seed script: walks the phonics curriculum and asks Gemini to
// produce engaging JSON content for every (stage, lesson) pair that isn't
// already cached in the phonics_lessons table.
//
// Run via: `npm run seed:phonics` (requires Node >=22.6 for --experimental-strip-types).
// Re-runnable: only fills in missing rows. Safe to Ctrl-C and resume.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import Database from "better-sqlite3";

import { PHONICS_STAGES } from "../lib/phonics-curriculum.ts";
import { buildPhonicsLessonPrompt } from "../lib/prompts.ts";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA_DIR = path.join(ROOT, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "self-teacher.sqlite"));
db.pragma("journal_mode = WAL");

// Ensure tables exist even if `next dev` hasn't run yet to create them.
db.exec(`
  CREATE TABLE IF NOT EXISTS phonics_lessons (
    stage_slug   TEXT NOT NULL,
    lesson_slug  TEXT NOT NULL,
    content_json TEXT NOT NULL,
    generated_at INTEGER NOT NULL,
    provider     TEXT,
    cost_usd     REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (stage_slug, lesson_slug)
  );
  CREATE TABLE IF NOT EXISTS cost_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT,
    kind TEXT NOT NULL,
    cost_usd REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const GEMINI_BIN = process.env.GEMINI_BIN || "gemini";
const MODEL = process.env.SELF_TEACHER_GEMINI_MODEL || "gemini-3-pro-preview";

// Spawn the gemini CLI in stream-json mode and concatenate the assistant
// deltas — mirrors lib/gemini.ts but inlined so we don't depend on TS module
// resolution for runtime helpers.
async function runGemini(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--prompt",
      prompt,
      "--output-format",
      "stream-json",
      "--yolo",
      "--model",
      MODEL,
    ];
    const devnull = fs.openSync("/dev/null", "r");
    const child = spawn(GEMINI_BIN, args, {
      stdio: [devnull, "pipe", "pipe"],
      env: process.env,
    });
    child.once("close", () => {
      try {
        fs.closeSync(devnull);
      } catch {}
    });
    const stderrChunks: string[] = [];
    child.stderr!.on("data", (b: Buffer) => stderrChunks.push(b.toString()));

    let full = "";
    const rl = readline.createInterface({ input: child.stdout! });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      let evt: unknown;
      try {
        evt = JSON.parse(line);
      } catch {
        return;
      }
      if (!evt || typeof evt !== "object") return;
      const e = evt as {
        type?: string;
        role?: string;
        content?: string;
        delta?: boolean;
      };
      if (
        e.type === "message" &&
        e.role === "assistant" &&
        typeof e.content === "string" &&
        e.delta === true
      ) {
        full += e.content;
      }
    });

    child.once("close", (code) => {
      if (code === 0) resolve(full);
      else
        reject(
          new Error(
            `gemini exited ${code}: ${stderrChunks.join("").slice(-400)}`,
          ),
        );
    });
  });
}

// Gemini sometimes wraps JSON in ```json fences despite instructions — strip them.
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Otherwise find first { … last }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function isValidContent(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.intro_zh === "string" &&
    Array.isArray(o.graphemes) &&
    typeof o.story_en === "string" &&
    typeof o.story_zh === "string" &&
    Array.isArray(o.mini_quiz)
  );
}

const existsStmt = db.prepare(
  "SELECT 1 FROM phonics_lessons WHERE stage_slug = ? AND lesson_slug = ?",
);
const insertStmt = db.prepare(
  `INSERT INTO phonics_lessons
     (stage_slug, lesson_slug, content_json, generated_at, provider, cost_usd)
   VALUES (?, ?, ?, ?, ?, ?)`,
);
const costStmt = db.prepare(
  `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at)
   VALUES (NULL, ?, ?, ?)`,
);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const stage of PHONICS_STAGES) {
  for (const lesson of stage.lessons) {
    if (existsStmt.get(stage.slug, lesson.slug)) {
      skipped++;
      console.log(`· ${stage.slug}/${lesson.slug} — already seeded, skip`);
      continue;
    }

    const prompt = buildPhonicsLessonPrompt({ stage, lesson });
    console.log(`→ ${stage.slug}/${lesson.slug} — calling gemini …`);
    const started = Date.now();

    let content: unknown = null;
    let attempt = 0;
    while (attempt < 2 && content === null) {
      attempt++;
      try {
        const raw = await runGemini(prompt);
        const jsonStr = extractJson(raw);
        const parsed = JSON.parse(jsonStr);
        if (!isValidContent(parsed)) {
          throw new Error("JSON missing required fields");
        }
        content = parsed;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  attempt ${attempt} failed: ${msg}`);
      }
    }

    if (content === null) {
      failed++;
      console.error(`✗ ${stage.slug}/${lesson.slug} — gave up after 2 tries`);
      continue;
    }

    const now = Date.now();
    insertStmt.run(
      stage.slug,
      lesson.slug,
      JSON.stringify(content),
      now,
      "gemini",
      0, // gemini CLI doesn't report USD
    );
    costStmt.run("phonics_seed", 0, now);
    generated++;
    const dur = ((now - started) / 1000).toFixed(1);
    console.log(`✓ ${stage.slug}/${lesson.slug} — ${dur}s`);
  }
}

console.log("");
console.log(`Done. generated=${generated} skipped=${skipped} failed=${failed}`);
if (failed > 0) process.exit(1);
