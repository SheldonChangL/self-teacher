#!/usr/bin/env node
import Database from "better-sqlite3";
import { chromium } from "playwright";
import { randomBytes } from "node:crypto";

const BASE = "http://localhost:3000";
const db = new Database(
  "/home/user/new_space/projects/self-teacher/data/self-teacher.sqlite",
);

// 0. Touch /api/parent/auth so migrations run
await fetch(`${BASE}/api/parent/auth`).catch(() => {});

const profileId = db.prepare("SELECT id FROM profiles LIMIT 1").get().id;
console.log(`profile: ${profileId}`);

// 1. Test extractVocab via the lesson stream cache: insert a fake "done" lesson
//    with a vocab block, then trigger the addCardsForLesson by hitting the
//    library function directly through a small node script. Easier: just
//    insert vocab cards directly to test the review flow UI.
db.prepare("DELETE FROM vocab_cards WHERE profile_id = ?").run(profileId);
const ins = db.prepare(
  `INSERT INTO vocab_cards (id, profile_id, front, back, source_session_id, ease, next_review_at, created_at)
   VALUES (?, ?, ?, ?, NULL, 0, 0, ?)`,
);
const now = Date.now();
const items = [
  { f: "**happy** /ˈhæpi/", b: "開心的、高興的" },
  { f: "**petal** /ˈpɛtəl/", b: "花瓣" },
  { f: "向日葵 ㄒㄧㄤˋ ㄖˋ ㄎㄨㄟˊ", b: "夏天的黃色大花" },
];
for (const it of items) {
  ins.run("v_" + randomBytes(4).toString("hex"), profileId, it.f, it.b, now);
}
console.log(`seeded ${items.length} cards`);

// 2. Browser: kid home should show "今日複習 (3 個)" button
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/kid/${profileId}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/i5-kidhome.png", fullPage: true });
const text1 = await page.locator("body").innerText();
if (!text1.includes("今日複習") || !text1.includes("3 個")) {
  console.error(`✗ review button missing — body: ${text1.slice(0, 200)}`);
  process.exit(1);
}
console.log("✓ kid home shows 今日複習 (3 個)");

// 3. Click into review, answer the cards
await page.locator("a:has-text('今日複習')").click();
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/i5-review-front.png", fullPage: true });

for (let i = 0; i < items.length; i++) {
  // Tap the card to flip
  await page
    .locator('button:has-text("點一下看答案")')
    .click({ timeout: 3000 });
  await page.waitForTimeout(200);
  // First two: 會, last: 不會
  const recall = i < 2 ? "會" : "不會";
  await page
    .locator(`button:has-text("${recall === "會" ? "✓ 會" : "✗ 不會"}")`)
    .click();
  await page.waitForTimeout(400);
}

await page.screenshot({ path: "/tmp/i5-review-done.png", fullPage: true });
const text2 = await page.locator("body").innerText();
if (!text2.includes("複習完成")) {
  console.error("✗ done page missing");
  process.exit(1);
}

// 4. DB check: 2 cards advanced ease, 1 reset
const after = db
  .prepare(
    "SELECT front, ease, next_review_at FROM vocab_cards WHERE profile_id = ? ORDER BY ease DESC",
  )
  .all(profileId);
console.log(after);
const advanced = after.filter((c) => c.ease >= 1).length;
const reset = after.filter((c) => c.ease === 0).length;
console.log(`advanced: ${advanced}, reset: ${reset}`);
if (advanced !== 2 || reset !== 1) {
  console.error("✗ ease updates wrong");
  process.exit(1);
}

await browser.close();
db.close();
console.log("\n✓ all good");
