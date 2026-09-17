// Parcours du site publié, comme un visiteur : entrée, puis chaque pas guidé (points d'accroche réels de la page),
// bureau et téléphone. Sans crochets de QA (absents du build) : état lu dans le DOM (is-3d, data-active-chapter).
// Usage : node scripts/qa-live.mjs [url] [dossier]
import { mkdirSync } from 'node:fs';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const url = (process.argv[2] ?? 'https://carservice.nexodevnice.workers.dev').replace(/\/$/, '');
const out = process.argv[3] ?? 'qa-out/live';
mkdirSync(out, { recursive: true });
const browser = await launch();

for (const name of ['desktop', 'mobile']) {
  const context = await browser.newContext(VIEWPORTS[name]);
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
  });
  const t0 = Date.now();
  await page.goto(`${url}/`, { waitUntil: 'load' });
  const ready = await page
    .waitForFunction(() => document.documentElement.classList.contains('is-3d') && !document.documentElement.classList.contains('is-intro'), null, { timeout: 60000 })
    .then(() => Date.now() - t0)
    .catch(() => null);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-00.png` });
  const points = await page.$$eval('.guide-point', (els) => els.map((el) => Math.round(el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop || '0'))));
  for (const [k, y] of points.entries()) {
    await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(2600);
    const chapter = await page.evaluate(() => document.querySelector('[data-track]')?.dataset.activeChapter);
    await page.screenshot({ path: `${out}/${name}-${String(k + 1).padStart(2, '0')}-${chapter}.png` });
  }
  const state = await page.evaluate(() => ({
    html: document.documentElement.className,
    canvasReady: document.querySelector('[data-stage-canvas]')?.classList.contains('is-ready'),
  }));
  console.log(`${name} : WebGL prêt en ${ready} ms, ${points.length} pas`, JSON.stringify(state));
  for (const line of logs) console.log(`  ${line}`);
  await context.close();
}
await browser.close();
