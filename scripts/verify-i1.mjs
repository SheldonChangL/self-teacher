#!/usr/bin/env node
// Iteration 1 verify: profile edit + session delete via UI.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// 1. /parent: ⚙️ button visible on each kid card
await page.goto(`${BASE}/parent`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const gearCount = await page.locator('button[title="設定"]').count();
console.log(`gear buttons on /parent: ${gearCount}`);

await page.screenshot({ path: "/tmp/i1-parent.png", fullPage: true });

// 2. Open settings modal, change name, save
const before = await page.request.get(`${BASE}/api/parent/stats`).then((r) => r.json());
const targetKid = before.kids[0];
console.log(`renaming ${targetKid.name} (${targetKid.id})...`);

await page.locator('button[title="設定"]').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/i1-modal.png", fullPage: true });

const nameInput = page.locator('input[maxlength="12"]');
await nameInput.fill(targetKid.name + "★");
await page.waitForTimeout(200);
const reqWait = page.waitForResponse((r) =>
  r.url().includes(`/api/profiles/${targetKid.id}`) && r.request().method() === "PATCH",
);
await page.locator('button:has-text("儲存"):not(:has-text("儲存中"))').click();
const resp = await reqWait;
console.log(`PATCH status: ${resp.status()}`);
await page.waitForTimeout(800);

const after = await page.request.get(`${BASE}/api/parent/stats`).then((r) => r.json());
const renamed = after.kids.find((k) => k.id === targetKid.id);
console.log(`after rename: ${renamed.name}`);
if (renamed.name !== targetKid.name + "★") {
  console.error("✗ rename did not persist");
  process.exit(1);
}

// 3. Restore name
await page.request.fetch(`${BASE}/api/profiles/${targetKid.id}`, {
  method: "PATCH",
  data: { name: targetKid.name, age: targetKid.age, avatar: targetKid.avatar, lang_pref: "zh-en" },
});

// 4. Session delete: pick a session with ✕ button
await page.goto(`${BASE}/parent/${targetKid.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/i1-detail.png", fullPage: true });

const xCount = await page.locator('button:has-text("✕")').count();
console.log(`✕ buttons on detail page: ${xCount}`);
if (xCount === 0) {
  console.error("✗ no delete buttons found");
  process.exit(1);
}

async function sessionCount() {
  const r = await page.request.get(`${BASE}/api/parent/stats`).then((r) => r.json());
  const k = r.kids.find((k) => k.id === targetKid.id);
  return k.lessons_total;
}
const beforeCount = await sessionCount();

// First click → confirm; second click → delete (wait for the DELETE response)
await page.locator('button:has-text("✕")').first().click();
await page.waitForTimeout(300);
const delWait = page.waitForResponse(
  (r) => /\/api\/sessions\//.test(r.url()) && r.request().method() === "DELETE",
);
await page.locator('button:has-text("確認刪除")').first().click();
const delResp = await delWait;
console.log(`DELETE status: ${delResp.status()}`);
await page.waitForTimeout(800);

const afterCount = await sessionCount();

console.log(`sessions: ${beforeCount} → ${afterCount}`);
if (afterCount !== beforeCount - 1) {
  console.error("✗ delete did not remove a row");
  process.exit(1);
}

await browser.close();
console.log("\n✓ all good");
