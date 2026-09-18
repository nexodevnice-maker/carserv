// Sonde de CADRAGE : saute à des progressions précises, relève la caméra réelle et capture l'image.
//
// Pourquoi cet outil : un plan se règle en position/cible/focale dans un monde de 30 km. Deviner ces nombres coûte une
// capture complète (21 images, 2 minutes) par essai, et fait tourner en rond. Ici, on demande trois progressions, on
// obtient trois images ET les trois caméras exactes — y compris celle d'un point de TRAJET, qu'aucun plan ne décrit
// mais qui est souvent le plus beau cadrage du trajet. Il n'y a plus qu'à le recopier dans shots.ts.
//
// Nécessite le serveur de dev (crochets window.__experience).
// Usage : node scripts/qa-frame.mjs qa-out/cadre 0,0.02,0.05   [url]   QA_VIEW=mobile|desktop
import { mkdirSync } from 'node:fs';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const out = process.argv[2] ?? 'qa-out/cadre';
const list = (process.argv[3] ?? '0').split(',').map(Number);
const url = (process.argv[4] ?? 'http://localhost:4321').replace(/\/$/, '');
const view = process.env.QA_VIEW ?? 'mobile';
mkdirSync(out, { recursive: true });

const browser = await launch();
const context = await browser.newContext(VIEWPORTS[view]);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 200));
});

await page.goto(`${url}/`, { waitUntil: 'load' });
await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
await page
  .waitForFunction(() => window.__experience.info().stageStatus === 'ready' && !window.__experience.info().intro, null, { timeout: 45000 })
  .catch(() => errors.push('[cadre] scène non prête'));
await page.addStyleTag({ content: 'html,html.is-guided{scroll-snap-type:none!important}' });

for (const [k, p] of list.entries()) {
  const info = await page.evaluate(async (v) => {
    window.__experience.seek(v);
    window.__experience.settle();
    await new Promise((r) => setTimeout(r, 260));
    window.__experience.settle();
    return window.__experience.info();
  }, p);
  const name = `${view}-${String(k).padStart(2, '0')}-p${String(p).replace('.', '_')}`;
  await page.screenshot({ path: `${out}/${name}.png` });
  const c = info.camera;
  const round = (a) => `[${a.map((v) => Math.round(v)).join(', ')}]`;
  console.log(
    `p=${p}  ${info.chapter}@${info.local}  plan=${c?.shot ?? '?'}\n` +
      `   position: ${round(c.position)}, target: ${round(c.target)}, fov: ${c.fov.toFixed(1)}\n` +
      // Les canaux non nuls : c'est ce qui dit si un effet est éteint par la narration ou cassé dans le nuanceur.
      `   canaux: ${Object.entries(info.channels ?? {})
        .filter(([, v]) => Math.abs(v) > 0.001)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`,
  );
}
if (errors.length) console.log('\nERREURS :', [...new Set(errors)].slice(0, 6).join(' | '));
await browser.close();
