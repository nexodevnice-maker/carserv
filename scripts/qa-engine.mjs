// Validation du socle dans un vrai navigateur (Edge/Chrome locaux, GPU réel) — pas une compilation : des mesures.
// Piste de contrôle /lab/engine (bureau, tablette, mobile, mouvement réduit) et page d'accueil (structure, a11y).
// Nécessite un serveur : dev (4321, défaut) ou build servi (npm run preview → 4322).
// Usage : npm run qa:engine [-- http://localhost:4322]
// Sorties : qa-out/engine/*.png (captures) et qa-out/engine/report.json. Code de sortie 1 si un contrôle échoue.
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, VIEWPORTS } from './lib/browser.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const OUT = 'qa-out/engine';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (group, name, ok, detail = '') => {
  results.push({ group, name, ok: Boolean(ok), detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${group} · ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
};
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const browser = await launch();

async function open(profile, path, { reduced = false, hooks = true } = {}) {
  const context = await browser.newContext({ ...VIEWPORTS[profile], reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  // Une vidéo qui change de position annule ses requêtes en cours (ERR_ABORTED) : normal.
  page.on('requestfailed', (r) => {
    if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
  });
  await page.addInitScript(() => {
    let count = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      count++;
      return raf(cb);
    };
    window.__rafCount = () => count;
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  // Crochets de QA : développement et laboratoire seulement (absents de l'accueil publié).
  if (hooks) await page.waitForFunction(() => '__experience' in window, null, { timeout: 30000 });
  return { context, page, logs };
}

const info = (page) => page.evaluate(() => window.__experience.info());
const frames = (page, n = 2) =>
  page.evaluate(
    (k) =>
      new Promise((resolve) => {
        const step = (left) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
        step(k);
      }),
    n,
  );
const waitRest = (page, timeout = 10000) =>
  page.waitForFunction(() => {
    const i = window.__experience.info();
    return !i.moving && Math.abs(i.shown - i.target) < 1e-6;
  }, null, { timeout, polling: 50 });
/** Défile à une progression et pose l'affichage (captures déterministes). */
async function settleAt(page, p) {
  await page.evaluate((v) => {
    window.__experience.seek(v);
    window.__experience.settle();
  }, p);
  await frames(page, 3);
  return info(page);
}
const toGlobal = (chapters, id, local) => {
  const c = chapters.find((x) => x.id === id);
  return c.start + local * (c.end - c.start);
};

// ─────────────────────────────────────────── BUREAU : piste de contrôle
console.log(`\nBUREAU 1440×900 — ${BASE}/lab/engine`);
{
  const { context, page, logs } = await open('desktop', '/lab/engine');
  const G = 'bureau';
  let i = await info(page);
  check(G, 'format lu depuis la CSS', i.format === 'desktop', i.format);

  // Piste : chapitres contigus, au prorata des longueurs déclarées.
  const chapters = await page.evaluate(() => window.__experience.chapters());
  const contiguous = chapters.every((c, k) => (k === 0 ? c.start === 0 : near(c.start, chapters[k - 1].end, 1e-9)) && c.end > c.start) && chapters.at(-1).end === 1;
  check(G, 'chapitres contigus sur [0, 1]', contiguous, chapters.map((c) => `${c.id}:${c.start.toFixed(3)}`).join(' '));
  const spans = [120, 200, 260, 160, 220, 100];
  const total = spans.reduce((a, b) => a + b, 0);
  let acc = 0;
  const proportional = chapters.every((c, k) => {
    const expected = acc / total;
    acc += spans[k];
    return near(c.start, expected, 0.01);
  });
  check(G, 'rythme = longueurs des données (±1 %)', proportional);

  // Progression normalisée : linéaire en scroll.
  const length = await page.evaluate(() => window.__experience.length());
  let linear = true;
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    i = await settleAt(page, p);
    if (!near(i.target, p, 2 / length) || !near(i.shown, i.target, 1e-9)) linear = false;
  }
  check(G, 'progression normalisée exacte (0 → 1)', linear, `longueur ${Math.round(length)} px`);

  // Réversibilité : même progression → même pose, quel que soit le chemin.
  const probes = [0.07, 0.19, 0.33, 0.41, 0.58, 0.66, 0.83, 0.97];
  const forward = [];
  for (const p of probes) forward.push((await settleAt(page, p)).camera);
  await settleAt(page, 1);
  const backward = [];
  for (const p of [...probes].reverse()) backward.push((await settleAt(page, p)).camera);
  backward.reverse();
  const same = forward.every((a, k) => JSON.stringify(a) === JSON.stringify({ ...backward[k] }));
  check(G, 'état reconstructible depuis p (aller = retour)', same);
  const moved = new Set(forward.map((c) => c.position.join())).size;
  check(G, 'caméra : poses distinctes le long de la piste', moved >= 6, `${moved} poses`);

  // Plans : la caméra est exactement sur le plan à sa position de repos.
  const shotsOk = await page.evaluate(async () => {
    const out = [];
    for (const [chapter, local, expected] of [
      ['p-intro', 0.5, [6, 1.6, 7]],
      ['p-arc', 0.9, [3, 3.5, -4]],
    ]) {
      const c = window.__experience.chapters().find((x) => x.id === chapter);
      window.__experience.seek(c.start + local * (c.end - c.start));
      window.__experience.settle();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const pos = window.__experience.info().camera.position;
      out.push(pos.every((v, k) => Math.abs(v - expected[k]) < 0.02));
    }
    return out.every(Boolean);
  });
  check(G, 'caméra posée sur ses plans (±2 cm)', shotsOk);

  // Scène WebGL.
  await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 30000 }).catch(() => {});
  i = await info(page);
  check(G, 'scène WebGL prête', i.stageStatus === 'ready', i.stageStatus);
  const probe = await page.evaluate(() => window.__lab.probe?.());
  check(G, 'environnement pré-calculé chargé', probe?.envLoaded === true, probe);

  // Repos : plus aucune image demandée. Sur un vrai réseau, un média qui finit de se charger réveille légitimement la
  // boucle (mesuré sur le site publié : 3 et 2 images pendant le téléchargement de la vidéo, puis 0) — la mesure
  // attend la fin des chargements.
  await settleAt(page, 0.3);
  await waitRest(page);
  await page
    .waitForFunction(() => window.__experience.info().media.every((m) => m.status !== 'loading'), null, { timeout: 60000, polling: 250 })
    .catch(() => {});
  // Après un chargement, la vidéo émet encore quelques événements (canplay, premier seek) : chacun réveille la boucle
  // une fois. Critère : elle s'endort (≤ 2 rAF sur 1,5 s) en moins de 12 s — une boucle folle n'y arrive jamais.
  const windows = [];
  for (let k = 0; k < 8; k++) {
    const raf0 = await page.evaluate(() => window.__rafCount());
    await page.waitForTimeout(1500);
    windows.push((await page.evaluate(() => window.__rafCount())) - raf0);
    if (windows.at(-1) <= 2) break;
  }
  check(G, 'au repos : la boucle s’endort (≤ 2 rAF sur 1,5 s)', windows.at(-1) <= 2, `rAF par fenêtre : ${windows.join(', ')}`);
  const renders0 = (await info(page)).stage.renders;
  await page.waitForTimeout(800);
  check(G, 'au repos : aucun rendu WebGL', (await info(page)).stage.renders === renders0);

  // Molette : amorti, puis repos.
  await page.mouse.move(700, 450);
  const before = await info(page);
  await page.mouse.wheel(0, 600);
  // Le défilement doux du navigateur peut démarrer après quelques images (réseau réel) : attendre que la cible bouge.
  await page.waitForFunction((t) => window.__experience.info().target !== t, before.target, { timeout: 3000, polling: 16 }).catch(() => {});
  const during = await info(page);
  await waitRest(page, 40000);
  const after = await info(page);
  check(G, 'molette : l’affichage suit avec amorti puis se pose', during.moving && !after.moving && near(after.shown, after.target, 1e-9), `lag ${Math.abs(during.target - during.shown).toFixed(4)}`);

  // Défilement brutal : retard borné (maxLag du bureau, config.ts : 0,35 — la glissade anime le dernier morceau), convergence.
  const maxLag = await page.evaluate(async () => {
    let worst = 0;
    for (const t of [0, 1, 0.3, 0.9, 0.05, 0.6]) {
      scrollTo({ top: window.__experience.scrollFor(t), behavior: 'instant' });
      for (let k = 0; k < 4; k++) {
        await new Promise((r) => requestAnimationFrame(r));
        const s = window.__experience.info();
        worst = Math.max(worst, Math.abs(s.shown - s.target));
      }
    }
    return worst;
  });
  await waitRest(page);
  i = await info(page);
  check(G, 'défilement brutal : retard borné et convergence', maxLag <= 0.3501 && near(i.shown, 0.6, 2 / length), `pire retard ${maxLag.toFixed(4)}`);

  // Clavier : Fin, Début.
  // Glissade du bureau (jusqu'à 4,2 s de vol) : en navigateur sans écran, les images sont lentes — attente longue.
  await page.keyboard.press('End');
  await page.waitForFunction(() => window.__experience.info().target === 1, null, { timeout: 8000 }).catch(() => {});
  await waitRest(page, 40000).catch(() => {});
  const atEnd = await info(page);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.__experience.info().target === 0, null, { timeout: 8000 }).catch(() => {});
  await waitRest(page, 40000).catch(() => {});
  const atStart = await info(page);
  check(G, 'clavier : Fin → 1, Début → 0', atEnd.shown === 1 && atStart.shown === 0, `${atEnd.shown} / ${atStart.shown}`);

  // Captures.
  for (const [name, p] of [['intro', toGlobal(chapters, 'p-intro', 0.5)], ['orbit', toGlobal(chapters, 'p-orbit', 0.5)], ['scrub', toGlobal(chapters, 'p-scrub', 0.5)], ['arc', toGlobal(chapters, 'p-arc', 0.9)]]) {
    await settleAt(page, p);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/desktop-${name}.png` });
  }

  // Vidéo pilotée : Range, aller monotone, retour monotone, sauts.
  const scrubAt = (local) => toGlobal(chapters, 'p-scrub', local);
  await settleAt(page, scrubAt(0.02));
  await page.waitForFunction(() => (window.__experience.info().video?.readyState ?? 0) >= 2, null, { timeout: 30000 }).catch(() => {});
  const videoSettled = () =>
    page.waitForFunction(() => {
      const v = window.__experience.info().video;
      return v && !v.seeking && Math.abs(v.current - v.desired) <= 1 / 60 + 1e-3;
    }, null, { timeout: 8000, polling: 16 });
  const walk = async (locals) => {
    const times = [];
    for (const local of locals) {
      await settleAt(page, scrubAt(local));
      await videoSettled().catch(() => {});
      times.push((await info(page)).video?.current ?? NaN);
    }
    return times;
  };
  let v = (await info(page)).video;
  check(G, 'vidéo : entièrement seekable (seekable = durée), avec ou sans Range', v?.range === true, v?.seekable);
  const up = await walk([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
  const down = await walk([0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]);
  const monotone = (list, dir) => list.every((t, k) => k === 0 || (dir > 0 ? t > list[k - 1] : t < list[k - 1]));
  check(G, 'vidéo : aller monotone croissant', monotone(up, 1), up.map((t) => t.toFixed(2)).join(' '));
  check(G, 'vidéo : retour monotone décroissant', monotone(down, -1), down.map((t) => t.toFixed(2)).join(' '));
  const jumps = await walk([0.95, 0.05, 0.7, 0.15]);
  v = (await info(page)).video;
  check(G, 'vidéo : sauts brutaux rejoints (±1 image)', near(v.current, v.desired, 1 / 30), `${jumps.map((t) => t.toFixed(2)).join(' ')} ; seeks ${v.seeks}, dernier ${v.lastSeekMs.toFixed(0)} ms, pire ${v.maxSeekMs.toFixed(0)} ms`);

  // Séquence d'images : image exacte, mémoire bornée.
  const seqAt = (local) => toGlobal(chapters, 'p-sequence', local);
  await settleAt(page, seqAt(0.5));
  await page.waitForFunction(() => {
    const s = window.__experience.info().sequence;
    return s && s.shown === s.target;
  }, null, { timeout: 15000 }).catch(() => {});
  let s = (await info(page)).sequence;
  check(G, 'séquence : image exacte affichée', s && s.shown === s.target, s);
  for (const local of [0.1, 0.9, 0.3, 0.7, 0.2, 0.95]) await settleAt(page, seqAt(local));
  await page.waitForTimeout(1500);
  s = (await info(page)).sequence;
  check(G, 'séquence : images décodées ≤ budget (12)', s && s.bitmaps <= 12, s);
  await page.screenshot({ path: `${OUT}/desktop-sequence.png` });

  // Mémoire GPU : trois traversées complètes, compteurs stables.
  const traverse = async () => {
    for (let p = 0; p <= 1.0001; p += 0.05) await settleAt(page, p);
    await page.waitForTimeout(300);
    return (await info(page)).stage;
  };
  const t1 = await traverse();
  const t2 = await traverse();
  const t3 = await traverse();
  check(G, 'GPU : textures, géométries, programmes stables sur 3 traversées', t1.textures === t3.textures && t1.geometries === t3.geometries && t1.programs === t3.programs, { textures: [t1.textures, t2.textures, t3.textures], geometries: [t1.geometries, t3.geometries], programs: [t1.programs, t3.programs], calls: t3.calls, dpr: t3.pixelRatio });

  // Perte et rétablissement du contexte.
  await page.evaluate(() => window.__lab.loseContext());
  await page.waitForTimeout(500);
  const lost = (await info(page)).stage;
  await page.evaluate(() => window.__lab.restoreContext());
  await page.waitForTimeout(800);
  await settleAt(page, 0.12);
  await page.waitForTimeout(300);
  const restored = (await info(page)).stage;
  check(G, 'contexte WebGL perdu puis rétabli', lost.lost === true && restored.lost === false && restored.renders > lost.renders, `${lost.renders} → ${restored.renders} rendus`);
  await page.screenshot({ path: `${OUT}/desktop-restored.png` });

  // Redimensionnement vers un format mobile : nouveau format, piste re-mesurée, cadrages mobiles.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const chaptersMobile = await page.evaluate(() => window.__experience.chapters());
  i = await settleAt(page, toGlobal(chaptersMobile, 'p-intro', 0.5));
  check(G, 'redimensionnement → format mobile, cadrage mobile', i.format === 'mobile' && i.camera.fov === 40 && near(i.camera.position[0], 9, 0.02), { format: i.format, fov: i.camera.fov, position: i.camera.position });
  const contiguousMobile = chaptersMobile.every((c, k) => (k === 0 ? c.start === 0 : near(c.start, chaptersMobile[k - 1].end, 1e-9))) && chaptersMobile.at(-1).end === 1;
  check(G, 'redimensionnement → piste re-mesurée et contiguë', contiguousMobile && chaptersMobile[2].start !== chapters[2].start);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);

  // Libération : contexte rendu, plus aucune boucle.
  const lostAfterDispose = await page.evaluate(() => window.__lab.disposeStage());
  check(G, 'libération WebGL : contexte rendu au navigateur', lostAfterDispose === true);
  await page.evaluate(() => window.__lab.disposeAll());
  const rafA = await page.evaluate(() => window.__rafCount());
  await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' }));
  await page.waitForTimeout(1000);
  const rafB = await page.evaluate(() => window.__rafCount());
  check(G, 'libération totale : le scroll ne réveille plus rien', rafB - rafA <= 1, `${rafB - rafA} rAF`);

  check(G, 'console sans erreur', !logs.some((l) => /\[(error|pageerror|requestfailed|http)/.test(l)), logs.slice(0, 8));
  if (logs.length) console.log(logs.map((l) => `      ${l}`).join('\n'));
  await context.close();
}

// ─────────────────────────────────────────── MOBILE : piste de contrôle
console.log('\nMOBILE 390×844 @2x tactile');
{
  const { context, page, logs } = await open('mobile', '/lab/engine');
  const G = 'mobile';
  const chapters = await page.evaluate(() => window.__experience.chapters());
  let i = await info(page);
  check(G, 'format mobile, palier matériel', i.format === 'mobile', `tier ${i.tier}`);
  await page.waitForFunction(() => window.__experience.info().stageStatus === 'ready', null, { timeout: 45000 }).catch(() => {});
  i = await settleAt(page, toGlobal(chapters, 'p-intro', 0.5));
  check(G, 'WebGL prête, définition plafonnée (≤ 2)', i.stageStatus === 'ready' && i.stage.pixelRatio <= 2, i.stage);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/mobile-intro.png` });
  i = await settleAt(page, toGlobal(chapters, 'p-scrub', 0.5));
  await page.waitForFunction(() => (window.__experience.info().video?.readyState ?? 0) >= 2, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  i = await info(page);
  check(G, 'vidéo : déclinaison mobile servie', i.media.find((m) => m.id === 'probe-video')?.src?.includes('mobile'), i.media);
  await page.screenshot({ path: `${OUT}/mobile-scrub.png` });
  // Au doigt : un geste, ressort critique, repos.
  await page.evaluate(() => window.__experience.settle());
  const start = await info(page);
  await page.touchscreen.tap(195, 600);
  await page.evaluate(() => scrollBy({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(40);
  const mid = await info(page);
  await waitRest(page);
  const end = await info(page);
  check(G, 'ressort : départ doux, arrivée posée', mid.moving && Math.abs(mid.shown - start.shown) < Math.abs(end.shown - start.shown) && !end.moving);
  i = await settleAt(page, toGlobal(chapters, 'p-sequence', 0.5));
  await page.waitForFunction(() => {
    const s = window.__experience.info().sequence;
    return s && s.shown === s.target;
  }, null, { timeout: 20000 }).catch(() => {});
  i = await info(page);
  check(G, 'séquence : image exacte, budget mobile (6)', i.sequence?.shown === i.sequence?.target && i.sequence.bitmaps <= 6, i.sequence);
  await page.screenshot({ path: `${OUT}/mobile-sequence.png` });
  check(G, 'console sans erreur', !logs.some((l) => /\[(error|pageerror|requestfailed|http)/.test(l)), logs.slice(0, 8));
  if (logs.length) console.log(logs.map((l) => `      ${l}`).join('\n'));
  await context.close();
}

// ─────────────────────────────────────────── MOUVEMENT RÉDUIT
console.log('\nMOUVEMENT RÉDUIT (bureau)');
{
  const { context, page, logs } = await open('desktop', '/lab/engine', { reduced: true });
  const G = 'réduit';
  const chapters = await page.evaluate(() => window.__experience.chapters());
  const rest = toGlobal(chapters, 'p-orbit', 0.8);
  await page.evaluate((p) => scrollTo({ top: window.__experience.scrollFor(p), behavior: 'instant' }), rest + 0.012);
  await frames(page, 2);
  const i = await info(page);
  // info() arrondit à 5 décimales.
  check(G, 'affichage posé sur le repos le plus proche, sans interpolation', i.reducedMotion && near(i.shown, rest, 1e-5) && !i.moving, { shown: i.shown, rest });
  check(G, 'console sans erreur', !logs.some((l) => /\[(error|pageerror|requestfailed|http)/.test(l)), logs.slice(0, 8));
  await context.close();
}

// ─────────────────────────────────────────── TABLETTE
console.log('\nTABLETTE 834×1112');
{
  const { context, page } = await open('tablet', '/lab/engine');
  const i = await info(page);
  check('tablette', 'format tablette', i.format === 'tablet', i.format);
  await context.close();
}

// ─────────────────────────────────────────── ACCUEIL : structure, SEO, accessibilité
for (const profile of ['desktop', 'mobile']) {
  console.log(`\nACCUEIL — ${profile}`);
  const { context, page, logs } = await open(profile, '/', { hooks: false });
  const G = `accueil ${profile}`;
  // Le moteur est lu par le DOM qu'il écrit : valable en développement comme sur le build publié.
  const activeChapter = () => page.evaluate(() => document.querySelector('[data-track]')?.dataset.activeChapter ?? null);
  await page.waitForFunction(() => document.querySelector('[data-track]')?.dataset.activeChapter, null, { timeout: 15000 }).catch(() => {});
  const structure = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    headings: [...document.querySelectorAll('h1, h2, h3')].map((h) => h.tagName),
    chapters: [...document.querySelectorAll('[data-chapter]')].map((c) => c.id),
    trackAttribute: document.querySelector('[data-track]')?.hasAttribute('data-chapter'),
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content ?? '',
    robots: document.querySelector('meta[name="robots"]')?.content,
    lang: document.documentElement.lang,
    overflowX: document.documentElement.scrollWidth > innerWidth,
  }));
  check(G, 'un seul h1, hiérarchie sans saut', structure.h1 === 1 && structure.headings.every((h, k) => k === 0 || Number(h[1]) <= Number(structure.headings[k - 1][1]) + 1), structure.headings.join(' '));
  check(G, 'chapitres dans l’ordre du registre', structure.chapters.join() === 'univers,ciel,territoire,avant,intervention,transformation,prestations,bascule,location,rendezvous,contact', structure.chapters.join());
  check(G, 'titre, description, langue', structure.title.length > 20 && structure.description.length > 50 && structure.lang === 'fr');
  check(G, 'aucun débordement horizontal', !structure.overflowX);
  // Les éléments fixes (en-tête) n'agrandissent pas la page : chaque lien doit être vérifié dans la vue.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('header a')]
      .filter((a) => {
        const r = a.getBoundingClientRect();
        return r.left < 0 || r.right > innerWidth + 0.5;
      })
      .map((a) => a.textContent.trim()),
  );
  check(G, 'en-tête : aucun lien coupé par le bord', clipped.length === 0, clipped);
  check(G, 'la piste ne porte pas data-chapter', structure.trackAttribute === false);
  const trackState = await page.evaluate(() => {
    const track = document.querySelector('[data-track]');
    return { chapter: track?.dataset.activeChapter, p: track?.style.getPropertyValue('--p'), html: document.documentElement.className };
  });
  check(G, 'moteur actif sur la page', trackState.chapter === 'univers' && trackState.p !== '' && /has-experience/.test(trackState.html), trackState);
  const hooks = await page.evaluate(() => ({ dev: Boolean(document.querySelector('script[src*="@vite/client"]')), qa: '__experience' in window }));
  check(G, 'crochets de QA : présents en dev seulement', hooks.dev === hooks.qa, hooks);
  // Focus visible au clavier, depuis le haut d'une page fraîche (avant tout clic).
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { text: el.textContent.trim(), outline: style.outlineStyle, width: style.outlineWidth, visible: rect.top >= 0 && rect.bottom <= innerHeight };
  });
  check(G, 'Tab : lien d’évitement visible avec contour', /Aller au contenu/.test(focus.text) && focus.outline !== 'none' && focus.visible, focus);
  // Navigation par chapitres (saut direct).
  // Après l'entrée (elle tient la page en haut) ; lien de l'en-tête (masqué sur téléphone : déclenché directement).
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-intro'), null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('a[href="#location"]').click());
  // Le vol dure jusqu'à 4,2 s de temps moteur — bien plus en navigateur sans écran (images lentes).
  await page.waitForFunction(() => document.querySelector('[data-track]')?.dataset.activeChapter === 'location', null, { timeout: 45000 }).catch(() => {});
  check(G, 'lien de chapitre → chapitre atteint', (await activeChapter()) === 'location', await activeChapter());
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] });
    return result.violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length})`);
  });
  check(G, 'axe-core WCAG 2.1 AA : aucune violation', violations.length === 0, violations);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/home-${profile}.png` });
  check(G, 'console sans erreur', !logs.some((l) => /\[(error|pageerror|requestfailed|http)/.test(l)), logs.slice(0, 8));
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
writeFileSync(`${OUT}/report.json`, `${JSON.stringify({ base: BASE, date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2)}\n`);
console.log(`\n${results.length - failed.length}/${results.length} contrôles réussis — ${OUT}/report.json`);
if (failed.length) process.exit(1);
