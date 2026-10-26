// Close-ups of the rider on the board (for checking the rig/board fit).
// Usage: node scripts/closeup.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5199/';
const out = process.argv[3] ?? 'output/closeups';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function open(level) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${base}?level=${level}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof window.advanceTime === 'function', null, { timeout: 180000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.advanceTime(100));
  return page;
}
async function shot(page, name) {
  await page.evaluate(() => window.advanceTime(16));
  const c = await page.evaluate(() => window.__game.skaterScreen());
  const clip = { x: Math.max(0, c.x - 160), y: Math.max(0, c.y - 170), width: 320, height: 300 };
  await page.screenshot({ path: `${out}/${name}.png`, clip, timeout: 180000 });
  console.log('closeup', name);
}
const adv = (p, ms) => p.evaluate((m) => window.advanceTime(m), ms);

const p = await open(1);
await shot(p, 'a-ready');
await p.keyboard.press('Space');
await adv(p, 450);
await shot(p, 'b-dropping');
await adv(p, 450);
await shot(p, 'c-bottom');
await adv(p, 700);
await shot(p, 'd-far-wall');
await p.close();
const q = await open(3);
await adv(q, 3400);
await shot(q, 'e-chase-ready');
await q.keyboard.press('Space');
await adv(q, 1600);
await shot(q, 'f-chase-flat');
await browser.close();
