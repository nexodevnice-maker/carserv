// Vols filmés image par image : les transitions elles-mêmes, pas seulement les repos. Chaque vol est découpé en
// images à progression fixe (settle), assemblées en planche contact par vol.
// Nécessite le serveur de dev (crochets window.__experience).
// Usage : node scripts/qa-flights.mjs [dossier] [url]   QA_ONLY=desktop|mobile   QA_FRAMES=8
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const out = process.argv[2] ?? 'qa-out/flights';
const url = (process.argv[3] ?? 'http://localhost:4321').replace(/\/$/, '');
const only = process.env.QA_ONLY?.split(',');
const frames = Number(process.env.QA_FRAMES ?? 8);
// Vols entre deux repos (chapitre, position locale).
const FLIGHTS = [
  ['plongee', ['arrivee', 0], ['arrivee', 0.45]],
  ['carte', ['prestations', 0.75], ['zone', 0.55]],
  ['ciel', ['zone', 0.55], ['univers', 0.35]],
  ['voie-lactee', ['univers', 0.35], ['univers', 0.8]],
  ['pique', ['univers', 0.8], ['bascule', 0.8]],
  ['horizon', ['location', 0.9], ['contact', 0.55]],
];
mkdirSync(out, { recursive: true });
const browser = await launch();

for (const name of ['desktop', 'mobile']) {
  if (only && !only.includes(name)) continue;
  const context = await browser.newContext(VIEWPORTS[name]);
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 240)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`${url}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready' && !window.__experience.info().intro, null, { timeout: 45000 });
  await page.addStyleTag({ content: 'html,html.is-guided{scroll-snap-type:none!important}' });
  const view = VIEWPORTS[name].viewport;
  const W = name === 'desktop' ? 480 : 200;
  const H = Math.round((view.height / view.width) * W);
  for (const [id, from, to] of FLIGHTS) {
    const [a, b] = await page.evaluate(([f, t]) => [window.__experience.toGlobal(f[0], f[1]), window.__experience.toGlobal(t[0], t[1])], [from, to]);
    const tiles = [];
    for (let k = 0; k <= frames; k++) {
      await page.evaluate((v) => {
        window.__experience.seek(v);
        window.__experience.settle();
      }, a + ((b - a) * k) / frames);
      await page.waitForTimeout(220);
      await page.waitForFunction(() => !window.__experience.info().moving, null, { timeout: 8000, polling: 50 }).catch(() => {});
      await page.waitForTimeout(120);
      tiles.push(await sharp(await page.screenshot()).resize(W, H).toBuffer());
    }
    const cols = name === 'desktop' ? 3 : 5;
    const rows = Math.ceil(tiles.length / cols);
    await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#222' } })
      .composite(tiles.map((input, k) => ({ input, left: (k % cols) * W, top: Math.floor(k / cols) * H })))
      .jpeg({ quality: 80 })
      .toFile(`${out}/${name}-${id}.jpg`);
  }
  console.log(`${name} : ${FLIGHTS.length} vols × ${frames + 1} images`);
  for (const line of logs) console.log(`  ${line}`);
  await context.close();
}
await browser.close();
