#!/usr/bin/env node
// Headless browser smoke test for the parent dashboard.
// Usage: node scripts/verify.mjs <url>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:3000/parent";
const screenshotPath = process.argv[3] ?? "/tmp/parent-dashboard.png";
const errors = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

console.log(`Visiting ${url} ...`);
const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
console.log(`HTTP ${response.status()}`);

await page.screenshot({ path: screenshotPath, fullPage: true });
console.log(`Screenshot: ${screenshotPath} (${(fs.statSync(screenshotPath).size / 1024).toFixed(1)} KB)`);

const title = await page.title();
console.log(`Title: ${title}`);

const headings = await page.locator("h1, h2, h3").allInnerTexts();
console.log(`Headings (${headings.length}):`);
for (const h of headings) console.log(`  - ${h}`);

const cards = await page.locator('[data-testid^="kid-card-"]').count();
console.log(`Kid cards: ${cards}`);

const allText = await page.locator("body").innerText();
const expectedKeywords = process.argv.slice(4);
for (const kw of expectedKeywords) {
  if (!allText.includes(kw)) errors.push(`missing keyword: "${kw}"`);
  else console.log(`✓ found "${kw}"`);
}

await browser.close();

if (errors.length > 0) {
  console.error("\n❌ Errors:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\n✓ all good");
