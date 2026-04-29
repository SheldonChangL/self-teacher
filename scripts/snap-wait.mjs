import { chromium } from "playwright";
const url = process.argv[2];
const out = process.argv[3];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
// stop SSE from completing by aborting the stream request
await page.route("**/api/lessons/**/stream", () => {});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`saved ${out}`);
