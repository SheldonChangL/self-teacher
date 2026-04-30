#!/usr/bin/env node
// E2E: switch provider to Gemini, run a real lesson, confirm streaming works
// and cost_log records `lesson:gemini`.
import Database from "better-sqlite3";
import fs from "node:fs";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";

const db = new Database(
  "/home/user/new_space/projects/self-teacher/data/self-teacher.sqlite",
);
const profileId = db.prepare("SELECT id FROM profiles LIMIT 1").get().id;
console.log(`profile: ${profileId}`);

// Switch to Gemini
let r = await fetch(`${BASE}/api/parent/settings`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ai_provider: "gemini", ai_model_gemini: "auto-gemini-3" }),
});
console.log(`set gemini → ${r.status}`);

// Generate a small image
execSync(
  `convert -size 600x300 -background "#fffbe6" -fill "#92400e" -gravity center -font DejaVu-Sans -pointsize 56 label:"五月雪 桐花" /tmp/tonghua.png`,
);

// Upload via API
const fd = new FormData();
fd.append("profile_id", profileId);
fd.append("subject", "free");
fd.append(
  "images",
  new Blob([fs.readFileSync("/tmp/tonghua.png")], { type: "image/png" }),
  "tonghua.png",
);
r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
const { session_id } = await r.json();
console.log(`upload → ${r.status}, sid: ${session_id}`);

// Stream the lesson and count text deltas
const t0 = Date.now();
const sse = await fetch(`${BASE}/api/lessons/${session_id}/stream`);
const reader = sse.body.getReader();
const decoder = new TextDecoder();
let buf = "";
let textCount = 0;
let firstText = null;
let body = "";
let done = false;
while (!done) {
  const { value, done: d } = await reader.read();
  if (d) break;
  buf += decoder.decode(value, { stream: true });
  const events = buf.split("\n\n");
  buf = events.pop() ?? "";
  for (const ev of events) {
    const line = ev.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = JSON.parse(line.slice(5).trim());
    if (payload.delta) {
      if (textCount === 0) firstText = Date.now() - t0;
      textCount++;
      body += payload.delta;
    }
    if (payload.done) done = true;
    if (payload.error) {
      console.error("stream error:", payload.error);
      process.exit(1);
    }
  }
}
console.log(
  `streamed ${textCount} chunks, total ${body.length} chars, first delta @ ${firstText}ms, total ${Date.now() - t0}ms`,
);
console.log(`PREVIEW: ${body.slice(0, 200).replace(/\n/g, " ⏎ ")}...`);

// cost_log should have a `lesson:gemini` entry
const row = db
  .prepare(
    "SELECT kind, cost_usd FROM cost_log WHERE created_at > ? ORDER BY id DESC LIMIT 1",
  )
  .get(t0 - 5000);
console.log(`cost_log latest: ${JSON.stringify(row)}`);
if (!row || row.kind !== "lesson:gemini") {
  console.error("✗ cost_log not tagged with lesson:gemini");
  process.exit(1);
}

// Restore provider to claude for default
await fetch(`${BASE}/api/parent/settings`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ai_provider: "claude" }),
});
console.log("restored provider → claude");

console.log("\n✓ Gemini provider works end-to-end");
