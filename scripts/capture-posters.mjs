// Affiches de la scène (technique MECA RIVIERA) : la première image réelle de l'expérience, capturée sur la page au
// premier repos, sans textes (?poster). Affichée immédiatement (avant la scène WebGL) et en repli permanent sans WebGL.
// Nécessite le serveur de dev (crochets window.__experience).
// Usage : node scripts/capture-posters.mjs [url]
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const url = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const OUT = 'public/media/stage';
mkdirSync(OUT, { recursive: true });
const browser = await launch();

for (const name of ['desktop', 'mobile']) {
  const context = await browser.newContext(VIEWPORTS[name]);
  const page = await context.newPage();
  await page.goto(`${url}/?poster`, { waitUntil: 'load' });
  await page.waitForFunction(() => '__experience' in window);
  await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 45000 });
  await page.evaluate(() => {
    window.__experience.seek(0);
    window.__experience.settle();
  });
  // Premier plan : l'univers (ciel HDRI, mer de nuages) — aucune vidéo à l'écran ; le ciel en pleine définition.
  await page.waitForFunction(() => !window.__experience.info().moving, null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  const png = await page.screenshot();
  const base = `${OUT}/poster-${name}`;
  const image = sharp(png);
  await image.clone().avif({ quality: 55 }).toFile(`${base}.avif`);
  await image.clone().webp({ quality: 78 }).toFile(`${base}.webp`);
  const { width, height } = await sharp(png).metadata();
  console.log(`${base}.{avif,webp}  ${width}×${height}`);
  await context.close();
}
await browser.close();
