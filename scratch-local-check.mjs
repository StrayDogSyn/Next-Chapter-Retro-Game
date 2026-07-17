import { chromium } from "playwright";

const URL = "http://localhost:3000";
const OUT = "C:\\Users\\Petro\\AppData\\Local\\Temp\\claude\\c--Users-Petro-repos-Next-Chapter\\7fc6e90e-7ee8-4fa7-853b-a2c4480e5314\\scratchpad\\";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const failed = [];
page.on("requestfailed", (req) => failed.push({ url: req.url(), failure: req.failure()?.errorText }));
page.on("response", (res) => { if (res.status() >= 400) failed.push({ url: res.url(), status: res.status() }); });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("[pageerror] " + err.message + "\n" + (err.stack || "")));

console.log("--- loading local dev server ---");
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);

console.log("--- failed/4xx/5xx requests ---");
for (const f of failed) console.log(JSON.stringify(f));

console.log("--- console/page errors ---");
for (const e of errors) console.log(e);

await page.screenshot({ path: OUT + "local-initial.png" });

console.log("--- attempting new run + movement ---");
await page.keyboard.press("Enter");
await page.waitForTimeout(1500);
await page.keyboard.down("KeyD");
await page.waitForTimeout(1000);
await page.keyboard.up("KeyD");
await page.waitForTimeout(300);

await page.screenshot({ path: OUT + "local-after-input.png" });

console.log("--- errors after gameplay attempt ---");
for (const e of errors) console.log(e);

await browser.close();
console.log("--- done ---");
