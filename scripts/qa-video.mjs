// Enregistrement VIDÉO du parcours, unité par unité, comme un vrai doigt qui fait défiler.
// Une image fixe ne dit rien du mouvement : ni le rythme, ni la continuité, ni les accrocs. On enregistre donc le
// rendu réel (CDP screencast, horodaté), puis on encode au vrai tempo. C'est le seul contrôle qui compte pour juger
// une mise en scène (docs/MOBILE_CINEMATIC_GRAMMAR.md § 12).
//
// Nécessite le serveur de DÉVELOPPEMENT (crochets QA) et ffmpeg (npm run media:setup).
// Usage : node scripts/qa-video.mjs [sortie.mp4] [url]
//   QA_ONLY=desktop|mobile   QA_HOLD=ms (pause à chaque repos)   QA_FROM / QA_TO (indices d'unités)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const out = process.argv[2] ?? 'qa-out/video/parcours-mobile.mp4';
const url = (process.argv[3] ?? 'http://localhost:4321').replace(/\/$/, '');
const format = process.env.QA_ONLY ?? 'mobile';
const hold = Number(process.env.QA_HOLD ?? 900);
const ffmpeg = join('scripts', 'media-tools', 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const frames = 'qa-out/video/frames';

rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
mkdirSync(out.replace(/[^/\\]+$/, ''), { recursive: true });

const browser = await launch();
// `isMobile` est volontairement désactivé : en émulation mobile, le screencast CDP recompose les éléments
// `position: fixed` à leurs coordonnées de document — la vidéo montrerait des légendes qui défilent alors qu'elles
// sont épinglées. Même taille, même densité, même format détecté : seule l'émulation tactile change.
const context = await browser.newContext({ ...VIEWPORTS[format], isMobile: false });
const page = await context.newPage();
await page.goto(`${url}/`, { waitUntil: 'load' });
await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 45000 });
await page.waitForFunction(() => !document.documentElement.classList.contains('is-intro'), null, { timeout: 20000 }).catch(() => undefined);
await page.waitForTimeout(600);

// Les pas guidés ramènent tout scrollTo au repos le plus proche : on les neutralise et on fait le mouvement nous-mêmes.
await page.addStyleTag({ content: 'html,html.is-guided{scroll-snap-type:none!important}' });
const rests = await page.evaluate(() => window.__experience.rests().map((p) => window.__experience.scrollFor(p)));
const from = Number(process.env.QA_FROM ?? 0);
const to = Math.min(Number(process.env.QA_TO ?? rests.length - 1), rests.length - 1);

const session = await context.newCDPSession(page);
let index = 0;
const times = [];
session.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  writeFileSync(join(frames, `f${String(index).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
  times.push(metadata.timestamp);
  index += 1;
  await session.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
});
await session.send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1 });

// Un geste par unité : la page va au repos suivant en défilement lissé, la caméra le rejoint avec son propre ressort.
const t0 = Date.now();
await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), rests[from]);
await page.waitForTimeout(hold);
for (let k = from + 1; k <= to; k += 1) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), rests[k]);
  await page
    .waitForFunction(() => !window.__experience.info().moving, null, { timeout: 12000, polling: 100 })
    .catch(() => undefined);
  await page.waitForTimeout(hold);
}
const seconds = (Date.now() - t0) / 1000;
await session.send('Page.stopScreencast');
await page.waitForTimeout(300);
await browser.close();

if (index < 2) {
  console.error('aucune image capturée');
  process.exit(1);
}
const fps = Math.max(1, Math.round(index / seconds));
execFileSync(
  ffmpeg,
  ['-y', '-framerate', String(fps), '-i', join(frames, 'f%05d.jpg'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
console.log(`${out} — ${index} images, ${seconds.toFixed(1)} s, ${fps} i/s (${format}, unités ${from} → ${to})`);
