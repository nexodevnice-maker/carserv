// Sonde de COMPORTEMENT DU DÉFILEMENT — les cas que le porteur décrit.
// 1. au chargement, la page est-elle bien tout en haut, et rien de visible avant l'heure ?
// 2. un geste VIF fait-il sauter plusieurs cinématiques ?
// 3. un geste POSÉ avance-t-il d'une unité ?
// 4. le retour en arrière retombe-t-il sur les mêmes unités ?
import { launch, VIEWPORTS } from './lib/browser.mjs';

const url = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const browser = await launch();
const context = await browser.newContext(VIEWPORTS.mobile);
const page = await context.newPage();
await page.goto(`${url}/`, { waitUntil: 'load' });
await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 90000 });

const info = () => page.evaluate(() => {
  const i = window.__experience.info();
  // `target` est la position de PAGE ; `shown` est la caméra, qui glisse encore. C'est la page qui dit
  // combien d'unités un geste a franchies — la caméra la rejoint ensuite.
  return { y: Math.round(window.scrollY), p: i.target, camera: i.shown, chapitre: i.chapter, carLight: i.channels.carLight, chrLight: i.channels.chrLight };
});

const depart = await info();
console.log('1. AU CHARGEMENT  scrollY=' + depart.y + '  progression=' + depart.p + '  chapitre=' + depart.chapitre);
console.log('   véhicule nettoyage visible ? ' + (depart.carLight > 0.01 ? 'OUI — ANORMAL' : 'non'));
console.log('   véhicule location visible ?  ' + (depart.chrLight > 0.01 ? 'OUI — ANORMAL' : 'non'));

const rests = await page.evaluate(() => window.__experience.rests());
const unite = (p) => rests.filter((r) => r <= p + 1e-4).length;

// 2. geste VIF : une grosse impulsion de molette d'un coup
await page.mouse.move(200, 400);
for (let k = 0; k < 6; k++) await page.mouse.wheel(0, 900);
await page.waitForTimeout(2500);
const vif = await info();
console.log('2. GESTE VIF (6 crans de 900 px)  → unité ' + unite(depart.p) + ' → ' + unite(vif.p) + '  (chapitre ' + vif.chapitre + ')');

// 3. geste POSÉ
const avant = await info();
await page.mouse.wheel(0, 120);
await page.waitForTimeout(2200);
const pose = await info();
console.log('3. GESTE POSÉ (1 cran de 120 px) → unité ' + unite(avant.p) + ' → ' + unite(pose.p));

// 4. retour arrière
for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(700); }
await page.waitForTimeout(1500);
const retour = await info();
console.log('4. RETOUR ARRIÈRE → unité ' + unite(retour.p) + '  chapitre ' + retour.chapitre);

await browser.close();
