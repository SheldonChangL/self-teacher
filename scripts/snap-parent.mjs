import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
const page = await ctx.newPage();
// Set PIN
await ctx.request.post("http://localhost:3000/api/parent/auth", {
  data: { action: "set", pin: "1234" },
});
await page.goto("http://localhost:3000/parent", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/i7-aipicker.png", fullPage: true });
await browser.close();
console.log("saved");
