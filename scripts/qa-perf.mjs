// Sonde de fluidité au format téléphone : ce que coûte réellement une image, unité par unité.
// La netteté EST la qualité sur mobile (docs/MOBILE_CINEMATIC_GRAMMAR.md § 10) : si la définition adaptative retombe,
// tout le site devient flou. Cette sonde mesure les deux à la fois.
// Nécessite le serveur de DÉVELOPPEMENT (les crochets QA n'existent pas dans le build publié).
// Usage : node scripts/qa-perf.mjs [url]   QA_ONLY=desktop
import { launch, VIEWPORTS } from './lib/browser.mjs';

const url = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const format = process.env.QA_ONLY ?? 'mobile';
/** Nombre d'images mesurées par sonde, et avance de progression par image (un balayage rapide). */
const FRAMES = 70;
const STEP = 0.0009;

const browser = await launch();
const context = await browser.newContext(VIEWPORTS[format]);
const page = await context.newPage();
await page.goto(`${url}/`, { waitUntil: 'load' });
await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 45000 });

const rests = await page.evaluate(() => window.__experience.rests());
const chapters = await page.evaluate(() => window.__experience.chapters());
const nameAt = (p) => chapters.find((c) => p >= c.start && p <= c.end)?.id ?? '?';

console.log(`${format} — ${VIEWPORTS[format].viewport.width}×${VIEWPORTS[format].viewport.height} @${VIEWPORTS[format].deviceScaleFactor}`);
let worstMedian = 0;
let worstDpr = Infinity;
for (const [k, p] of rests.entries()) {
  const r = await page.evaluate(
    async ([p, frames, step]) => {
      window.__experience.seek(p);
      window.__experience.settle();
      await new Promise((r) => setTimeout(r, 350));
      const deltas = [];
      let last = performance.now();
      let q = p;
      return await new Promise((resolve) => {
        const tick = () => {
          const now = performance.now();
          deltas.push(now - last);
          last = now;
          q += step;
          window.__experience.seek(q);
          if (deltas.length >= frames) {
            const s = deltas.slice(10).sort((a, b) => a - b);
            const info = window.__experience.info();
            resolve({
              median: +s[Math.floor(s.length / 2)].toFixed(1),
              p90: +s[Math.floor(s.length * 0.9)].toFixed(1),
              dpr: info.stage.pixelRatio,
              calls: info.stage.calls,
              tris: info.stage.triangles,
            });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    [p, FRAMES, STEP],
  );
  worstMedian = Math.max(worstMedian, r.median);
  worstDpr = Math.min(worstDpr, r.dpr);
  const fps = Math.round(1000 / r.median);
  const flag = r.median > 17.5 || r.dpr < 1.75 ? ' ←' : '';
  console.log(
    `${String(k).padStart(2)} ${nameAt(p).padEnd(15)} ${String(fps).padStart(3)} i/s   médiane ${String(r.median).padStart(5)} ms   p90 ${String(r.p90).padStart(5)} ms   ` +
      `DPR ${r.dpr}   ${String(r.calls).padStart(4)} appels   ${r.tris.toLocaleString('fr').padStart(9)} triangles${flag}`,
  );
}
console.log(`\npire médiane ${worstMedian} ms (${Math.round(1000 / worstMedian)} i/s) — définition la plus basse ${worstDpr}`);
await browser.close();
