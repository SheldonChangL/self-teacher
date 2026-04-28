#!/usr/bin/env node
// Full UX walkthrough — visits every page a kid might land on,
// captures screenshots, lists buttons and main text for review.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "/tmp/walkthrough";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 }, // TV-ish
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
const phoneCtx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14 Pro
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const phone = await phoneCtx.newPage();

const issues = [];

async function visit(p, url, name) {
  console.log(`\n=== ${name} (${url}) ===`);
  const resp = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("load").catch(() => {});
  await p.waitForTimeout(800);
  console.log(`HTTP ${resp.status()}`);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  // tappable elements
  const buttons = await p.locator("button, a, input[type=submit]").all();
  console.log(`Tappable elements: ${buttons.length}`);
  for (const b of buttons.slice(0, 12)) {
    const t = (await b.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 50);
    const box = await b.boundingBox().catch(() => null);
    if (box && (box.width < 32 || box.height < 32) && t) {
      issues.push(`[${name}] small target: "${t}" ${box.width.toFixed(0)}×${box.height.toFixed(0)}`);
    }
  }
  return p;
}

// 1. TV home
await visit(page, `${BASE}/`, "01-home-tv");

// 2. New profile form
await visit(page, `${BASE}/profile/new`, "02-profile-new");

// 3. Pick a kid (use seeded profile)
const statsRes = await page.request.get(`${BASE}/api/parent/stats`);
const stats = await statsRes.json();
if (stats.kids.length === 0) {
  console.log("No kids found — please run npm run seed first");
  process.exit(1);
}
const kidId = stats.kids[0].id;
const recentSession = stats.kids[0].recent[0];

await visit(page, `${BASE}/kid/${kidId}`, "03-kid-home-tv");
await visit(page, `${BASE}/kid/${kidId}/capture`, "04-capture-direct");
await visit(phone, `${BASE}/kid/${kidId}/capture?from=phone`, "05-capture-phone");

// Lesson page (uses existing demo session, won't actually call claude)
await visit(page, `${BASE}/kid/${kidId}/lesson/${recentSession.id}`, "06-lesson-tv");
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/06b-lesson-tv-after-2s.png`, fullPage: true });

await visit(page, `${BASE}/kid/${kidId}/quiz/${recentSession.id}`, "07-quiz-tv");

// Parent dashboard
await visit(page, `${BASE}/parent`, "08-parent-overview");
await visit(page, `${BASE}/parent/${kidId}`, "09-parent-kid-detail");

await browser.close();

console.log(`\n=== Screenshots: ${OUT} ===`);
if (issues.length === 0) {
  console.log("No obvious tap-size issues.");
} else {
  console.log(`\nIssues to consider (${issues.length}):`);
  for (const i of issues) console.log(`  - ${i}`);
}
