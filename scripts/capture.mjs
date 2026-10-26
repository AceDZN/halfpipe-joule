// Real-input gameplay captures for docs/VISUAL_REVIEW.md.
// Usage: node scripts/capture.mjs [baseUrl] [outDir]
// Drives the game with keyboard input and the deterministic window.advanceTime hook.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5199/';
const out = process.argv[3] ?? 'docs/captures';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];

async function open(level, viewport = { width: 1600, height: 900 }, extra = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, ...extra });
  page.on('pageerror', (e) => errors.push(`${level}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${level}: ${m.text()}`));
  await page.goto(`${base}?level=${level}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => typeof window.advanceTime === 'function', null, { timeout: 180000 });
  // Let the GLB models load.
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.advanceTime(100));
  return page;
}
const adv = (page, ms) => page.evaluate((m) => window.advanceTime(m), ms);
const state = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function shot(page, name) {
  await adv(page, 16);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
  console.log('captured', name, JSON.stringify((await state(page)).skater));
}
async function until(page, pred, maxMs = 20000, step = 50) {
  for (let t = 0; t < maxMs; t += step) {
    await adv(page, step);
    if (pred(await state(page))) return true;
  }
  return false;
}

// 01 — first drop: on the way down the left wall, then the first fall-short.
{
  const p = await open(1);
  await shot(p, '01a-first-drop-ready');
  await p.keyboard.press('ArrowDown');
  await adv(p, 450);
  await shot(p, '01-first-drop');
  await until(p, (s) => s.skater.x > 2 && s.skater.speed < 0.6);
  await shot(p, '01b-first-drop-short');
  await until(p, (s) => s.skater.pumpAvailable);
  await shot(p, '01c-first-drop-pump-zone');
  await p.close();
}
// 02 — line level mid-run on the rough asphalt lane.
{
  const p = await open(3);
  await adv(p, 3400);
  await p.keyboard.press('ArrowDown');
  await until(p, (s) => s.skater.x > 12);
  await shot(p, '02-core-line');
  await p.close();
}
// 03 — a miss: replay path + "where did the joules go" card.
{
  const p = await open(3);
  await adv(p, 3400);
  await p.keyboard.press('ArrowDown');
  await until(p, (s) => s.phase !== 'riding', 30000);
  await p.waitForTimeout(900);
  await adv(p, 1500);
  await shot(p, '03-bail-replay');
  await p.close();
}
// 04 — grade-9 tower choice with formulas (after the forced first drop).
{
  const p = await open(5);
  await p.keyboard.press('ArrowDown');
  await until(p, (s) => s.phase !== 'riding');
  await p.waitForTimeout(900);
  await adv(p, 200);
  await shot(p, '04a-gap-pit');
  await p.keyboard.press('r');
  await adv(p, 100);
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
  await adv(p, 1200);
  await shot(p, '04-hud-closeup');
  await p.close();
}
// 06 — mass level: heavy run ready with the backpack (after the light run + prediction).
{
  const p = await open(2);
  await p.keyboard.press('Space');
  await until(p, (s) => s.phase !== 'riding');
  await p.waitForTimeout(800);
  await adv(p, 100);
  await p.click('[data-p=same]');
  await adv(p, 600);
  await shot(p, '06-mass-backpack-ready');
  await p.keyboard.press('Space');
  await adv(p, 900);
  await shot(p, '06b-mass-backpack-riding');
  await p.close();
}
// 07 — lane choice before the drop (bad surfaces).
{
  const p = await open(3);
  await adv(p, 3400);
  await p.keyboard.press('ArrowRight');
  await adv(p, 300);
  await shot(p, '07-lane-choice');
  await p.close();
}
// Phone width.
{
  const p = await open(1, { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  await p.tap('.t-go').catch(() => {});
  await adv(p, 500);
  await shot(p, '05-mobile');
  await p.close();
}
await browser.close();
console.log('errors:', errors.length ? errors.join('\n') : 'none');
