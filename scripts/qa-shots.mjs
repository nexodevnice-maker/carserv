// Captures de chaque repos de l'expérience (un plan par pas guidé), bureau et téléphone, avec les erreurs console.
// Technique MECA RIVIERA (scripts/qa-shots.mjs) : état posé (settle), médias attendus, puis capture.
// Nécessite le serveur de dev (crochets window.__experience).
// Usage : node scripts/qa-shots.mjs [dossier] [url]   QA_ONLY=desktop|mobile
import { mkdirSync } from 'node:fs';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const out = process.argv[2] ?? 'qa-out/shots';
const url = (process.argv[3] ?? 'http://localhost:4321').replace(/\/$/, '');
const only = process.env.QA_ONLY?.split(',');
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
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
  });
  const t0 = Date.now();
  await page.goto(`${url}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
  await page
    .waitForFunction(() => {
      const i = window.__experience.info();
      return i.stageStatus === 'ready' && !i.intro;
    }, null, { timeout: 45000 })
    .catch(() => logs.push('[qa] scène non prête ou entrée non levée'));
  const ready = Date.now() - t0;
  // Pas guidés neutralisés : un scrollTo entre deux points serait ramené au point le plus proche (MECA RIVIERA).
  await page.addStyleTag({ content: 'html,html.is-guided{scroll-snap-type:none!important}' });
  await page.screenshot({ path: `${out}/${name}-00-arrivee-entree.png` });
  const restList = await page.evaluate(() => window.__experience.rests());
  // Repos et, avec QA_MID=1, le milieu de chaque trajet (les transitions elles-mêmes).
  const rests = process.env.QA_MID ? restList.flatMap((p, k) => (k < restList.length - 1 ? [p, (p + restList[k + 1]) / 2] : [p])) : restList;
  for (const [k, p] of rests.entries()) {
    await page.evaluate((v) => {
      window.__experience.seek(v);
      window.__experience.settle();
    }, p);
    await page.waitForTimeout(250);
    await page
      .waitForFunction(() => {
        const i = window.__experience.info();
        const v = i.video;
        const s = i.sequence;
        const videoOk = !v || (!v.seeking && Math.abs(v.current - v.desired) <= 0.05);
        const seqOk = !s || s.shown === s.target;
        return !i.moving && videoOk && seqOk;
      }, null, { timeout: 15000, polling: 100 })
      .catch(() => logs.push(`[qa] repos ${k} : médias non posés`));
    await page.waitForTimeout(350);
    const chapter = await page.evaluate(() => window.__experience.info().chapter);
    await page.screenshot({ path: `${out}/${name}-${String(k + 1).padStart(2, '0')}-${chapter}.png` });
  }
  const info = await page.evaluate(() => {
    const i = window.__experience.info();
    return { stage: i.stage, media: i.media, guide: i.guide };
  });
  console.log(`${name} : ${rests.length} repos, scène prête en ${ready} ms`, JSON.stringify(info));
  for (const line of logs) console.log(`  ${line}`);
  await context.close();
}
await browser.close();
