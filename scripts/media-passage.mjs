// Images du « passage » (chapitre intervention) : les images EXACTES de la vidéo publiée où le scrub s'arrête et
// reprend — capot poussiéreux (5,5 s) et capot brillant (8,5667 s, source 15,6 s). La ligne d'eau passe de l'une à
// l'autre sans saut, ni en entrant ni en sortant de la vidéo.
// Usage : node scripts/media-passage.mjs (après npm run media:video)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { alignImages } from './lib/align.mjs';
import { mediaTools } from './lib/media-tools.mjs';

const { ffmpeg } = mediaTools();
const OUT = 'public/media/transformation';
const TMP = 'qa-out/passage-tmp';
const FPS = 30;
export const PASSAGE = { before: 5.5, after: 8.5667 };

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const generatedPath = 'src/experience/media.generated.json';
const generated = JSON.parse(readFileSync(generatedPath, 'utf8'));
const passage = {};
for (const rendition of generated.renditions) {
  const file = join('public', rendition.src);
  for (const [id, time] of Object.entries(PASSAGE)) {
    const frame = Math.round(time * FPS);
    const png = join(TMP, `${id}-${rendition.id}.png`);
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', file, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', png]);
    const target = join(OUT, `passage-${id}-${rendition.id}.webp`);
    await sharp(png).webp({ quality: 86 }).toFile(target);
    passage[id] ??= { time: Number((frame / FPS).toFixed(4)) };
    passage[id][rendition.id] = { src: `/${target.replaceAll('\\', '/').replace(/^public\//, '')}`, width: rendition.width, height: rendition.height };
    console.log(`${target}  image ${frame}  ${Math.round(statSync(target).size / 1024)} Ko`);
  }
}
// Recalage : le capot propre doit apparaître EXACTEMENT là où était le capot poussiéreux (la main a bougé entre les
// deux images). Mesuré sur les contours de la déclinaison bureau, en unités normalisées : la scène l'applique aux deux.
const align = await alignImages(join(TMP, 'before-desktop.png'), join(TMP, 'after-desktop.png'));
passage.align = align;
console.log('recalage après → avant :', JSON.stringify(align));

generated.passage = passage;
writeFileSync(generatedPath, `${JSON.stringify(generated, null, 2)}\n`);
rmSync(TMP, { recursive: true, force: true });
console.log('→ media.generated.json (passage)');
