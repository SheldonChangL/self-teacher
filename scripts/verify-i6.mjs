#!/usr/bin/env node
import Database from "better-sqlite3";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
// Trigger db migrations
await fetch(`${BASE}/api/parent/auth`).catch(() => {});

const db = new Database(
  "/home/user/new_space/projects/self-teacher/data/self-teacher.sqlite",
);

const profileId = db.prepare("SELECT id FROM profiles LIMIT 1").get().id;
console.log(`profile: ${profileId}`);

// 1. Set daily limit to 1 via API
let r = await fetch(`${BASE}/api/parent/settings`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ daily_lessons_limit: 1, monthly_budget_usd: 5 }),
});
console.log(`set settings → ${r.status}`);

// 2. Insert today's daily_activity = 1 to simulate a kid already at limit
const today = new Date().toLocaleDateString("sv-SE");
db.prepare(
  `INSERT INTO daily_activity (profile_id, date, lessons_count) VALUES (?, ?, 1)
   ON CONFLICT(profile_id, date) DO UPDATE SET lessons_count = 1`,
).run(profileId, today);

// 3. Try to upload — should be 429 with daily reason
const fd = new FormData();
fd.append("profile_id", profileId);
fd.append("subject", "free");
fd.append("images", new Blob(["x"], { type: "image/png" }), "test.png");
r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
const j = await r.json();
console.log(`upload at limit → ${r.status}: ${j.error}`);
if (r.status !== 429 || j.reason !== "daily") {
  console.error("✗ daily limit not enforced");
  process.exit(1);
}

// 4. Lift the limit, retry
r = await fetch(`${BASE}/api/parent/settings`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ daily_lessons_limit: 99 }),
});
console.log(`raised limit → ${r.status}`);

// 5. Insert fake cost rows to simulate budget exceeded
db.prepare("DELETE FROM cost_log").run();
const start = new Date();
start.setDate(1);
db.prepare(
  `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at) VALUES (?, 'lesson', 6, ?)`,
).run(profileId, start.getTime());

// Reset daily count back to 0 so we test budget gate next
db.prepare(
  "UPDATE daily_activity SET lessons_count = 0 WHERE profile_id = ? AND date = ?",
).run(profileId, today);

const fd2 = new FormData();
fd2.append("profile_id", profileId);
fd2.append("subject", "free");
fd2.append("images", new Blob(["x"], { type: "image/png" }), "test.png");
r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd2 });
const j2 = await r.json();
console.log(`upload at budget → ${r.status}: ${j2.error}`);
if (r.status !== 429 || j2.reason !== "budget") {
  console.error("✗ budget limit not enforced");
  process.exit(1);
}

// 6. Cleanup — restore demo state and screenshot dashboard
db.prepare("DELETE FROM cost_log").run();
db.prepare(
  "UPDATE daily_activity SET lessons_count = 0 WHERE profile_id = ? AND date = ?",
).run(profileId, today);

// Re-seed a small cost so we see the hero with non-zero
db.prepare(
  `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at) VALUES (?, 'lesson', 0.85, ?)`,
).run(profileId, Date.now());
db.prepare(
  `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at) VALUES (?, 'quiz', 0.10, ?)`,
).run(profileId, Date.now());

// Auth + screenshot
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
// Set PIN if needed
const has = await fetch(`${BASE}/api/parent/auth`).then((r) => r.json());
if (!has.has_pin) {
  await ctx.request.post(`${BASE}/api/parent/auth`, {
    data: { action: "set", pin: "1234" },
  });
} else {
  await ctx.request.post(`${BASE}/api/parent/auth`, {
    data: { action: "verify", pin: "1234" },
  });
}
await page.goto(`${BASE}/parent`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/i6-cost.png", fullPage: true });

const text = await page.locator("body").innerText();
console.log("contains '本月 AI 花費':", text.includes("本月 AI 花費"));
console.log("contains '$0.95':", text.includes("$0.95"));
if (!text.includes("本月 AI 花費")) {
  console.error("✗ cost hero missing");
  process.exit(1);
}

await browser.close();
db.close();
console.log("\n✓ all good");
