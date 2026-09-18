// Planche-contact : toutes les captures d'un dossier en une seule image (juger la CHAÎNE, pas un plan isolé).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const [dir, out, colsArg, wArg] = process.argv.slice(2);
const cols = Number(colsArg ?? 6);
const w = Number(wArg ?? 250);
const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const h = Math.round((w * 844) / 390);
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(
  files.map(async (f, i) => ({
    input: await sharp(`${dir}/${f}`).resize(w, h, { fit: 'cover' }).toBuffer(),
    left: (i % cols) * w,
    top: Math.floor(i / cols) * h,
  })),
);
await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: '#000' } }).composite(tiles).jpeg({ quality: 80 }).toFile(out);
console.log(`${out} — ${files.length} plans (${cols}×${rows})`);
