// Sonde de DÉMARRAGE : recharge la page N fois et dit, à chaque fois, si la scène est vraiment partie.
//
// Pourquoi cet outil : « ça crash » ne se voit pas sur une capture réussie. Un démarrage qui échoue une fois sur cinq
// (module qui n'arrive pas, contexte 3D perdu, média en échec) laisse le visiteur devant le repli statique — toutes
// les sections empilées, aucune 3D — et c'est exactement ce qu'on nous décrit. On mesure donc le TAUX de réussite,
// pas un cas.
//
// Nécessite le serveur de dev (crochets window.__experience).
// Usage : node scripts/qa-boot.mjs [nombre] [url]   QA_VIEW=mobile|desktop
import { launch, VIEWPORTS } from './lib/browser.mjs';

const runs = Number(process.argv[2] ?? 5);
const url = (process.argv[3] ?? 'http://localhost:4321').replace(/\/$/, '');
const view = process.env.QA_VIEW ?? 'mobile';

const browser = await launch();
let ok = 0;
for (let run = 1; run <= runs; run += 1) {
  const context = await browser.newContext(VIEWPORTS[view]);
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 200)}`));
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
  });
  const t0 = Date.now();
  await page.goto(`${url}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 }).catch(() => logs.push('[boot] aucun crochet'));
  const ready = await page
    .waitForFunction(() => {
      const i = window.__experience.info();
      return i.stageStatus === 'ready' && !i.intro;
    }, null, { timeout: 40000 })
    .then(() => true)
    .catch(() => false);
  const info = await page.evaluate(() => {
    const i = window.__experience.info();
    return { statut: i.stageStatus, intro: i.intro, html: document.documentElement.className, stage: i.stage, media: i.media };
  });
  if (ready) ok += 1;
  console.log(`— essai ${run} : ${ready ? 'OK' : 'ÉCHEC'} en ${Date.now() - t0} ms · statut ${info.statut} · intro ${info.intro}`);
  console.log(`  html  ${info.html}`);
  if (info.stage) console.log(`  scène ${JSON.stringify(info.stage)}`);
  if (info.media) console.log(`  médias ${JSON.stringify(info.media)}`);
  if (logs.length) console.log(`  journal\n    ${[...new Set(logs)].join('\n    ')}`);
  await context.close();
}
console.log(`\n${ok}/${runs} démarrages réussis`);
await browser.close();
