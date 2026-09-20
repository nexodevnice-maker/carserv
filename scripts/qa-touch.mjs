// UN GESTE AU DOIGT = UN PLAN ? La question du porteur, mesurée avec de VRAIS événements tactiles.
// La molette et le doigt ne suivent pas le même chemin : tout ce qui se vérifie à la molette ne prouve rien ici.
// Usage : node scripts/qa-touch.mjs [url]
import { launch, VIEWPORTS } from './lib/browser.mjs';

const url = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const browser = await launch();
const context = await browser.newContext(VIEWPORTS.mobile);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await page.goto(`${url}/`, { waitUntil: 'load' });
await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 90000 });

const rests = await page.evaluate(() => window.__experience.rests());
const etat = () => page.evaluate(() => {
  const i = window.__experience.info();
  return { page: i.target, camera: i.shown, y: Math.round(window.scrollY), chapitre: i.chapter };
});
const unite = (p) => rests.filter((r) => r <= p + 1e-4).length;

/** Un balayage du doigt : `pas` positions intermédiaires en `ms` au total. Plus c'est court, plus c'est violent. */
const balayage = async (dy, pas, ms) => {
  const x = 195;
  const y0 = 600;
  const envoyer = (type, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
  await envoyer('touchStart', y0);
  for (let k = 1; k <= pas; k++) {
    await envoyer('touchMove', y0 - (dy * k) / pas);
    if (ms) await page.waitForTimeout(ms / pas);
  }
  await envoyer('touchEnd', y0 - dy);
};

const essais = [
  ['DOUX      (120 px en 400 ms)', 120, 6, 400],
  ['NORMAL    (300 px en 250 ms)', 300, 6, 250],
  ['VIF       (600 px en 90 ms) ', 600, 4, 90],
  ['TRÈS VIF  (900 px en 30 ms) ', 900, 3, 30],
  ['BRUTAL    (1400 px en 0 ms) ', 1400, 2, 0],
];

console.log(`${rests.length} unités`);
for (const [nom, dy, pas, ms] of essais) {
  const avant = await etat();
  await balayage(dy, pas, ms);
  await page.waitForTimeout(2200);
  const apres = await etat();
  const d = unite(apres.page) - unite(avant.page);
  const verdict = d === 1 ? 'OK' : d === 0 ? '— rien' : `!! ${d} unités`;
  console.log(`  ${nom} → ${verdict}   (unité ${unite(avant.page)} → ${unite(apres.page)}, scrollY ${avant.y} → ${apres.y})`);
}
// — LE PARCOURS ENTIER, au geste BRUTAL : c'est le cas qui cassait. Chaque balayage doit valoir une unité, et une
// seule, jusqu'au bout du récit.
console.log('');
console.log('Parcours complet, balayages brutaux (1200 px instantanés) :');
let anomalies = 0;
let precedent = unite((await etat()).page);
for (let k = 0; k < rests.length + 2; k++) {
  await balayage(1200, 2, 0);
  await page.waitForTimeout(1300);
  const u = unite((await etat()).page);
  const d = u - precedent;
  if (d !== 1) {
    anomalies++;
    const dbg = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      max: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      guide: document.documentElement.classList.contains('is-guided'),
      ta: getComputedStyle(document.documentElement).touchAction,
    }));
    console.log(`  !! unité ${precedent} → ${u} (${d}) — scrollY ${dbg.y}/${dbg.max}, is-guided=${dbg.guide}, touch-action=${dbg.ta}`);
  }
  precedent = u;
  if (u >= rests.length) break;
}
console.log(anomalies === 0 ? `  tous les balayages valent UNE unité, jusqu'à la fin (${precedent}/${rests.length})` : `  ${anomalies} anomalie(s)`);

// — Le formulaire reste utilisable : la bande de dates garde son défilement propre.
const bande = await page.evaluate(() => {
  const el = document.querySelector('.rdv__days');
  return el ? getComputedStyle(el).touchAction : 'absente';
});
console.log('');
console.log(`Bande de dates du rendez-vous : touch-action = ${bande}`);

// — LE RETOUR EN ARRIÈRE, au doigt : même exigence.
console.log('');
console.log('Retour en arrière, balayages brutaux :');
let retours = 0;
let avantRetour = unite((await etat()).page);
for (let k = 0; k < 6; k++) {
  await balayage(-1200, 2, 0);
  await page.waitForTimeout(1300);
  const u = unite((await etat()).page);
  if (u - avantRetour !== -1) retours++;
  avantRetour = u;
}
console.log(retours === 0 ? `  six balayages, six unités en arrière (revenu à ${avantRetour})` : `  ${retours} anomalie(s)`);

// — LE FORMULAIRE RÉPOND-IL ENCORE ? Une tape doit poser le curseur dans un champ.
await page.evaluate((v) => { window.__experience.seek(v); window.__experience.settle(); }, rests[rests.length - 2]);
await page.waitForTimeout(1600);
const champ = await page.evaluate(() => {
  const el = document.querySelector('.rdv input[type="text"], .rdv input[type="tel"], input[name], .rdv__form input');
  if (!el) return 'aucun champ trouvé';
  el.focus();
  return document.activeElement === el ? 'le champ prend le focus' : 'le champ NE prend PAS le focus';
});
console.log('');
console.log(`Formulaire de rendez-vous : ${champ}`);

// — UN BALAYAGE PARTI SUR UN LIEN. C'est le bug qui renvoyait brutalement en arrière : le bandeau est fixe en haut
// de l'écran, son logo est un lien, et depuis qu'on coupe le panoramique natif plus aucun défilement ne vient
// annuler le clic. Un balayage doit AVANCER ; seule une tape doit activer le lien.
console.log('');
console.log('Balayage parti sur un lien du bandeau :');
const liens = await page.evaluate(() => {
  const o = {};
  for (const s of ['.site-header__brand', '.tab--cleaning', '.tab--rental']) {
    const el = document.querySelector(s);
    if (el) { const r = el.getBoundingClientRect(); o[s] = { x: Math.round(r.x + r.width / 2), y: Math.round(Math.max(r.y + r.height / 2, 6)), href: el.getAttribute('href') }; }
  }
  return o;
});
let pieges = 0;
for (const [sel, z] of Object.entries(liens)) {
  await page.evaluate((v) => { window.__experience.seek(v); window.__experience.settle(); }, rests[20]);
  await page.waitForTimeout(1400);
  const avant = (await etat()).y;
  const env = (t, yy) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x: z.x, y: yy, id: 1 }] });
  await env('touchStart', z.y);
  await env('touchMove', z.y - 150);
  await env('touchMove', z.y - 300);
  await env('touchEnd', z.y - 300);
  await page.waitForTimeout(2000);
  const apres = (await etat()).y;
  if (apres < avant) { pieges++; console.log(`  !! ${sel} [${z.href}] renvoie en arrière : ${avant} → ${apres}`); }
}
console.log(pieges === 0 ? '  aucun lien ne vole le geste : tous avancent d un plan' : `  ${pieges} lien(s) volent le geste`);

await browser.close();
