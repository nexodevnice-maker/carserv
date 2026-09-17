// L'univers visible : le HDRI fourni (tools/3d/rogland_clear_night_4k.hdr), converti en ciel de nuit affichable.
// Tone mapping filmique fixé une fois (la Voie lactée et les étoiles ressortent, le sol devient une silhouette), puis
// deux équirectangulaires WebP : 4096 × 2048 (bureau) et 2048 × 1024 (téléphone, et premier affichage au bureau).
// La lumière des reflets reste l'environnement pré-calculé (media-env.mjs).
// Usage : node scripts/media-sky.mjs [exposition] [contraste]
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { FloatType } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const EXPOSURE = Number(process.argv[2] ?? 0.55);
const CONTRAST = Number(process.argv[3] ?? 1.55);
const OUT = 'public/env';
mkdirSync(OUT, { recursive: true });

const buffer = readFileSync('tools/3d/rogland_clear_night_4k.hdr');
const hdr = new HDRLoader().setDataType(FloatType).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const { width, height, data } = hdr;
const rgb = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y++) {
  // Sous l'horizon : le paysage devient une silhouette sombre (l'univers, pas le désert).
  const elevation = 0.5 - (y + 0.5) / height; // +0,5 zénith, −0,5 nadir
  const ground = elevation < 0 ? 0.12 + 0.88 * Math.max(0, 1 + elevation * 14) : 1;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const o = (y * width + x) * 3;
    for (let c = 0; c < 3; c++) {
      const v = data[i + c] * EXPOSURE * ground;
      const mapped = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14);
      const graded = Math.min(1, Math.max(0, mapped)) ** CONTRAST;
      rgb[o + c] = Math.round(255 * graded ** (1 / 2.2));
    }
  }
}
for (const [w, name] of [
  [4096, 'sky-4096.webp'],
  [2048, 'sky-2048.webp'],
]) {
  const path = `${OUT}/${name}`;
  await sharp(rgb, { raw: { width, height, channels: 3 } })
    .resize(w, w / 2, { kernel: 'lanczos3' })
    .webp({ quality: w > 2048 ? 80 : 78, effort: 5 })
    .toFile(path);
  console.log(`${path}  ${w}×${w / 2}  ${Math.round(statSync(path).size / 1024)} Ko`);
}
await sharp(rgb, { raw: { width, height, channels: 3 } }).resize(1600, 800).jpeg({ quality: 80 }).toFile('qa-out/sky-preview.jpg');
