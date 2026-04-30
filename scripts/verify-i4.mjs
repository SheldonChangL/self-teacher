#!/usr/bin/env node
import Database from "better-sqlite3";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const db = new Database(
  "/home/user/new_space/projects/self-teacher/data/self-teacher.sqlite",
);
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_activity (
    profile_id TEXT NOT NULL, date TEXT NOT NULL,
    lessons_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (profile_id, date)
  )
`);

const profileId = db.prepare("SELECT id FROM profiles LIMIT 1").get().id;
console.log(`profile: ${profileId}`);

// Seed: 連續 3 天 ending today
db.prepare("DELETE FROM daily_activity WHERE profile_id = ?").run(profileId);
const today = new Date();
today.setHours(0, 0, 0, 0);
const ins = db.prepare(
  "INSERT INTO daily_activity (profile_id, date, lessons_count) VALUES (?, ?, ?)",
);
for (let i = 0; i < 3; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  ins.run(profileId, d.toLocaleDateString("sv-SE"), 1 + i);
}
db.close();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/kid/${profileId}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/i4-streak.png", fullPage: true });

const text = await page.locator("body").innerText();
console.log("contains '連續 3 天':", text.includes("連續 3 天"));
console.log("contains '已經學了':", text.includes("已經學了"));
if (!text.includes("連續 3 天")) {
  console.error("✗ streak chip did not show 3 days");
  process.exit(1);
}
await browser.close();
console.log("\n✓ all good");
