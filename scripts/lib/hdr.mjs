// Radiance HDR (RGBE, RLE « nouveau format ») : écriture. Repris de MECA RIVIERA (scripts/bake-env.mjs).

/** Float32 RGBA → octets RGBE (mantisse 8 bits par canal, exposant partagé). */
export function floatToRgbe(data, width, height) {
  const rgbe = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[4 * i];
    const g = data[4 * i + 1];
    const b = data[4 * i + 2];
    const v = Math.max(r, g, b);
    if (v < 1e-32) continue;
    const e = Math.floor(Math.log2(v)) + 1;
    const scale = 256 / 2 ** e;
    rgbe[4 * i] = Math.min(255, Math.floor(r * scale));
    rgbe[4 * i + 1] = Math.min(255, Math.floor(g * scale));
    rgbe[4 * i + 2] = Math.min(255, Math.floor(b * scale));
    rgbe[4 * i + 3] = e + 128;
  }
  return rgbe;
}

function rleChannel(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    let run = 1;
    while (i + run < bytes.length && run < 127 && bytes[i + run] === bytes[i]) run++;
    if (run >= 3) {
      out.push(128 + run, bytes[i]);
      i += run;
      continue;
    }
    const start = i;
    let count = 0;
    while (i < bytes.length && count < 128) {
      let r = 1;
      while (i + r < bytes.length && r < 3 && bytes[i + r] === bytes[i]) r++;
      if (r >= 3) break;
      i++;
      count++;
    }
    out.push(count, ...bytes.subarray(start, start + count));
  }
  return out;
}

/** Lignes écrites dans l'ordre fourni (l'appelant choisit haut → bas ou ordre GL). */
export function encodeHdr(width, height, rgbe) {
  const chunks = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, 'ascii')];
  const channel = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const line = [2, 2, width >> 8, width & 255];
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < width; x++) channel[x] = rgbe[4 * (y * width + x) + c];
      line.push(...rleChannel(channel));
    }
    chunks.push(Buffer.from(line));
  }
  return Buffer.concat(chunks);
}
