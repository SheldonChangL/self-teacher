#!/usr/bin/env node
import { chromium } from "playwright";
import Database from "better-sqlite3";

const BASE = "http://localhost:3000";

// Touch the auth API once so the dev server runs migrations and the
// `settings` table exists, then wipe any pre-existing PIN.
await fetch(`${BASE}/api/parent/auth`).catch(() => {});
const db = new Database(
  "/home/user/new_space/projects/self-teacher/data/self-teacher.sqlite",
);
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
db.prepare("DELETE FROM settings WHERE key IN ('parent_pin_hash')").run();
db.close();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// 1. /parent without cookie → should redirect to /parent/unlock
const r1 = await page.goto(`${BASE}/parent`, { waitUntil: "domcontentloaded" });
console.log(`/parent → ${page.url()} (status ${r1.status()})`);
if (!page.url().includes("/parent/unlock")) {
  console.error("✗ no redirect to unlock");
  process.exit(1);
}
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/i2-unlock.png", fullPage: true });

// 2. DELETE without cookie → 401
const r2 = await ctx.request.fetch(`${BASE}/api/sessions/anything`, {
  method: "DELETE",
});
console.log(`DELETE without cookie → ${r2.status()}`);
if (r2.status() !== 401) {
  console.error("✗ DELETE not gated");
  process.exit(1);
}

// 3. Set PIN via UI (1234, twice)
await page.waitForSelector('button:has-text("1")');
for (const d of "1234") await page.locator(`button:has-text("${d}")`).first().click();
await page.locator('button:has-text("OK")').click();
await page.waitForTimeout(400);
// Confirm phase
for (const d of "1234") await page.locator(`button:has-text("${d}")`).first().click();
await page.locator('button:has-text("OK")').click();
await page.waitForTimeout(800);

console.log(`after set PIN → ${page.url()}`);
if (!page.url().includes("/parent") || page.url().includes("/unlock")) {
  console.error("✗ did not navigate to /parent after set");
  process.exit(1);
}
await page.screenshot({ path: "/tmp/i2-parent.png", fullPage: true });

// 4. Cookie should now allow DELETE (404 for fake id is fine; not 401)
const r3 = await ctx.request.fetch(`${BASE}/api/sessions/anything`, {
  method: "DELETE",
});
console.log(`DELETE with cookie → ${r3.status()}`);
if (r3.status() === 401) {
  console.error("✗ still gated after set");
  process.exit(1);
}

// 5. New context (no cookie) → /parent should redirect, and verify with PIN works
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/parent`, { waitUntil: "domcontentloaded" });
console.log(`fresh ctx → ${p2.url()}`);
if (!p2.url().includes("/parent/unlock")) {
  console.error("✗ fresh ctx not redirected");
  process.exit(1);
}
await p2.waitForSelector('button:has-text("1")');
for (const d of "1234") await p2.locator(`button:has-text("${d}")`).first().click();
await p2.locator('button:has-text("OK")').click();
await p2.waitForTimeout(800);
console.log(`fresh ctx after verify → ${p2.url()}`);
if (p2.url().includes("/unlock")) {
  console.error("✗ verify did not let through");
  process.exit(1);
}

// 6. Wrong PIN
const ctx3 = await browser.newContext();
const p3 = await ctx3.newPage();
await p3.goto(`${BASE}/parent/unlock`, { waitUntil: "domcontentloaded" });
await p3.waitForSelector('button:has-text("1")');
for (const d of "9999") await p3.locator(`button:has-text("${d}")`).first().click();
await p3.locator('button:has-text("OK")').click();
await p3.waitForTimeout(500);
const errVisible = await p3.locator("text=PIN 錯誤").isVisible();
console.log(`wrong PIN error visible: ${errVisible}`);
if (!errVisible) {
  console.error("✗ wrong-PIN error not shown");
  process.exit(1);
}

await browser.close();
console.log("\n✓ all good");
