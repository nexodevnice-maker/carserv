// Dérivés publiables de la vidéo avant/après (story Snapchat enregistrée à l'écran, voir docs/MEDIA_INVENTORY.md).
// 1. Recadrage : interface Snapchat retirée (barre d'état, en-tête du compte, champ « Répondre », coins arrondis).
// 2. Segments : uniquement des plages sans plaque d'immatriculation lisible (celle du véhicule 8,2–9,5 s, celle d'un
//    utilitaire tiers dès 19,7 s) et sans le centre de contrôle iOS (21,9 s →). Rien d'autre n'est publié.
// 3. Scrub (bureau/tablette, et mobile pour comparaison) : H.264, 30 i/s constants, GOP 5, sans B-frames, faststart,
//    sans audio (pattern 02 Agenceeimoo ; sans -tune fastdecode, mesure ci-dessous).
// 4. Séquence d'images WebP (mobile) : repli déterministe du scrub. Regroupée en UN fichier (images concaténées,
//    table des positions dans le manifeste), lu image par image par requêtes Range : un seul fichier à publier au lieu
//    de 146 (l'envoi web GitHub refuse plus de 100 fichiers à la fois), une seule entrée de cache.
// 5. Affiches AVIF + WebP : la preuve « avant » et « après » en image fixe (attente, repli, mouvement réduit).
// Écrit src/experience/media.generated.json (durées, plages, poids) lu par src/experience/media.ts.
// Usage : npm run media:video
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { mediaTools } from './lib/media-tools.mjs';

const SOURCE = 'tools/3d/ScreenRecording_09-16-2026 22-57-08_1.mp4';
const OUT = 'public/media/transformation';
const TMP = 'qa-out/video-tmp';
const FPS = 30;
/** Zone utile de l'enregistrement (px source 1170 × 2532) : sous l'en-tête du compte, au-dessus des coins arrondis. */
const CROP = { x: 0, y: 320, w: 1170, h: 1850 };

/**
 * Plages publiables, en secondes de la source. Relevés image par image le 17/09/2026.
 * Logos constructeur visibles (décision en attente, docs/DECISIONS.md) : calandre 6,4–7,0 s, capot 16,4–17,2 s.
 */
const SEGMENTS = [
  { id: 'before', from: 0.0, to: 7.55, note: 'poussière : portière, aile, capot, optique, calandre' },
  { id: 'after-hood', from: 14.6, to: 17.7, note: 'capot brillant, reflets des arbres' },
  { id: 'after-flank', from: 18.1, to: 19.6, note: 'flanc et marchepied brillants (avant l’utilitaire tiers)' },
];

/** Affiches : l'instant (secondes source) qui prouve le mieux chaque état. */
const POSTERS = [
  { id: 'before', at: 5.5 },
  { id: 'after', at: 15.6 },
];

/**
 * CRF mesuré le 17/09/2026 sur la plage « avant » (900 px) : la recette Agenceeimoo avec `-tune fastdecode` (CRF 22)
 * pèse 8,9 Mo ; sans fastdecode (CABAC et filtre de déblocage conservés), CRF 27 : 4,1 Mo, SSIM 0,977 contre la
 * référence, identique à l'œil (la source, recompressée par Snapchat, est déjà douce). Le décodage CABAC d'un GOP de 5
 * images en 900 px est négligeable — latence des seeks contrôlée par npm run qa:engine.
 */
const RENDITIONS = [
  { id: 'desktop', width: 900, crf: 27 },
  { id: 'mobile', width: 720, crf: 28 },
];
const SEQUENCE = { fps: 12, width: 540, quality: 68 };

const { ffmpeg: ffmpegPath, ffprobe: ffprobePath } = mediaTools();
const run = (args) => execFileSync(ffmpegPath, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const probe = (args) => execFileSync(ffprobePath, ['-v', 'error', ...args]).toString().trim();
const even = (n) => Math.round(n / 2) * 2;
const kb = (path) => Math.round(statSync(path).size / 1024);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

// Graphe commun : chaque plage recadrée, remise à zéro, cadencée à 30 i/s avec un nombre d'images exact, puis concaténée.
const frames = SEGMENTS.map((s) => Math.round((s.to - s.from) * FPS));
const crop = `crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y}`;
const graph = (scale) =>
  SEGMENTS.map(
    (s, k) =>
      `[0:v]trim=start=${s.from}:end=${(s.to + 0.2).toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS},trim=end_frame=${frames[k]},${crop},${scale}[s${k}]`,
  ).join(';') + `;${SEGMENTS.map((_, k) => `[s${k}]`).join('')}concat=n=${SEGMENTS.length}:v=1:a=0[out]`;

const renditions = [];
for (const r of RENDITIONS) {
  const height = even((CROP.h * r.width) / CROP.w);
  const scale = `scale=${r.width}:${height}:flags=lanczos:in_range=full:out_range=limited,format=yuv420p`;
  const file = join(OUT, `scrub-${r.id}.mp4`);
  run([
    '-i', SOURCE,
    '-filter_complex', graph(scale),
    '-map', '[out]',
    '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(r.crf), '-profile:v', 'high',
    '-g', '5', '-keyint_min', '5', '-sc_threshold', '0', '-bf', '0',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart',
    file,
  ]);
  const duration = Number(probe(['-show_entries', 'format=duration', '-of', 'csv=p=0', file]));
  const count = Number(probe(['-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file]));
  renditions.push({ id: r.id, src: `/${file.replaceAll('\\', '/').replace(/^public\//, '')}`, width: r.width, height, bytes: statSync(file).size, duration, frames: count });
  console.log(`${file}  ${r.width}×${height}  ${count} images  ${duration.toFixed(3)} s  ${kb(file)} Ko`);
}

// Séquence mobile : images WebP concaténées dans un seul fichier ; `offsets[i]..offsets[i+1]` = image i.
rmSync(join(OUT, 'seq'), { recursive: true, force: true });
const seqHeight = even((CROP.h * SEQUENCE.width) / CROP.w);
const seqFrames = SEGMENTS.map((s) => Math.round((s.to - s.from) * SEQUENCE.fps));
const seqGraph =
  SEGMENTS.map(
    (s, k) =>
      `[0:v]trim=start=${s.from}:end=${(s.to + 0.2).toFixed(3)},setpts=PTS-STARTPTS,fps=${SEQUENCE.fps},trim=end_frame=${seqFrames[k]},${crop},scale=${SEQUENCE.width}:${seqHeight}:flags=lanczos:in_range=full:out_range=full,format=rgb24[s${k}]`,
  ).join(';') + `;${SEGMENTS.map((_, k) => `[s${k}]`).join('')}concat=n=${SEGMENTS.length}:v=1:a=0[out]`;
run(['-i', SOURCE, '-filter_complex', seqGraph, '-map', '[out]', '-start_number', '0', join(TMP, '%04d.png')]);
const pngs = readdirSync(TMP).filter((f) => f.endsWith('.png')).sort();
const frameBuffers = [];
const offsets = [0];
for (const png of pngs) {
  const webp = await sharp(join(TMP, png)).webp({ quality: SEQUENCE.quality, effort: 5 }).toBuffer();
  frameBuffers.push(webp);
  offsets.push(offsets[offsets.length - 1] + webp.length);
}
const packFile = join(OUT, `sequence-${SEQUENCE.width}.bin`);
writeFileSync(packFile, Buffer.concat(frameBuffers));
const seqBytes = statSync(packFile).size;
console.log(`${packFile}  ${pngs.length} images ${SEQUENCE.width}×${seqHeight}  ${Math.round(seqBytes / 1024)} Ko (moyenne ${Math.round(seqBytes / pngs.length / 1024)} Ko)`);

// Affiches.
const posters = {};
for (const poster of POSTERS) {
  const png = join(TMP, `poster-${poster.id}.png`);
  run(['-ss', String(poster.at), '-i', SOURCE, '-frames:v', '1', '-vf', `${crop},format=rgb24`, png]);
  posters[poster.id] = {};
  for (const r of RENDITIONS) {
    const height = even((CROP.h * r.width) / CROP.w);
    const base = join(OUT, `${poster.id}-${r.id}`);
    const image = sharp(png).resize(r.width, height);
    await image.clone().avif({ quality: 58 }).toFile(`${base}.avif`);
    await image.clone().webp({ quality: 80 }).toFile(`${base}.webp`);
    posters[poster.id][r.id] = { src: `/${base.replaceAll('\\', '/').replace(/^public\//, '')}.webp`, avif: `/${base.replaceAll('\\', '/').replace(/^public\//, '')}.avif`, width: r.width, height };
    console.log(`${base}.{avif,webp}  ${kb(`${base}.avif`)} / ${kb(`${base}.webp`)} Ko`);
  }
}

// Plages dans le fichier publié.
let cursor = 0;
const segments = Object.fromEntries(
  SEGMENTS.map((s, k) => {
    const from = cursor / FPS;
    cursor += frames[k];
    return [s.id, [Number(from.toFixed(4)), Number((cursor / FPS).toFixed(4))]];
  }),
);

writeFileSync(
  'src/experience/media.generated.json',
  `${JSON.stringify(
    {
      generatedBy: 'scripts/media-video.mjs',
      source: SOURCE,
      crop: CROP,
      sourceSegments: SEGMENTS,
      fps: FPS,
      duration: cursor / FPS,
      segments,
      renditions,
      sequence: {
        src: `/${packFile.replaceAll('\\', '/').replace(/^public\//, '')}`,
        type: 'image/webp',
        count: pngs.length,
        fps: SEQUENCE.fps,
        width: SEQUENCE.width,
        height: seqHeight,
        bytes: seqBytes,
        offsets,
      },
      posters,
    },
    null,
    2,
  )}\n`,
);
rmSync(TMP, { recursive: true, force: true });
console.log('→ src/experience/media.generated.json');
