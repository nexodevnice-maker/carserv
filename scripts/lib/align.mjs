import sharp from 'sharp';

/**
 * Recalage de deux images de la même scène filmées à trois secondes d'écart (la main a bougé, la focale a respiré) :
 * on cherche le déplacement et l'échelle qui superposent la SECONDE sur la PREMIÈRE. La comparaison porte sur les
 * contours (gradient) et non sur les couleurs : entre le capot poussiéreux et le capot propre, la matière change, la
 * géométrie non.
 * Retourne { dx, dy, scale } en unités normalisées (part de la largeur / de la hauteur), à appliquer aux coordonnées
 * de lecture de la seconde image.
 */
async function edges(file, width) {
  const { data, info } = await sharp(file).resize({ width }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = data[i - 1] - data[i + 1];
      const gy = data[i - w] - data[i + w];
      out[i] = Math.hypot(gx, gy);
    }
  // Normalisation : la comparaison ne dépend pas du contraste général.
  let sum = 0;
  for (const v of out) sum += v;
  const mean = sum / out.length || 1;
  for (let i = 0; i < out.length; i++) out[i] /= mean;
  return { data: out, w, h };
}

/** Écart moyen entre A et B transformée (échelle + déplacement), sur la partie centrale commune. */
function cost(a, b, scale, dx, dy) {
  const { w, h } = a;
  const margin = 0.12;
  const x0 = Math.round(w * margin);
  const x1 = Math.round(w * (1 - margin));
  const y0 = Math.round(h * margin);
  const y1 = Math.round(h * (1 - margin));
  let total = 0;
  let count = 0;
  const cx = w / 2;
  const cy = h / 2;
  for (let y = y0; y < y1; y += 2)
    for (let x = x0; x < x1; x += 2) {
      const sx = Math.round(cx + (x - cx - dx) / scale);
      const sy = Math.round(cy + (y - cy - dy) / scale);
      if (sx < 1 || sy < 1 || sx >= w - 1 || sy >= h - 1) continue;
      total += Math.abs(a.data[y * w + x] - b.data[sy * w + sx]);
      count++;
    }
  return count ? total / count : Infinity;
}

function search(a, b, scales, shifts, step) {
  let best = { cost: Infinity, scale: 1, dx: 0, dy: 0 };
  for (const scale of scales)
    for (let dx = shifts.x0; dx <= shifts.x1; dx += step)
      for (let dy = shifts.y0; dy <= shifts.y1; dy += step) {
        const c = cost(a, b, scale, dx, dy);
        if (c < best.cost) best = { cost: c, scale, dx, dy };
      }
  return best;
}

const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Number(v.toFixed(4)));
  return out;
};

export async function alignImages(fileA, fileB) {
  // Grossier : petite image, large fenêtre.
  const coarse = 72;
  const [a1, b1] = await Promise.all([edges(fileA, coarse), edges(fileB, coarse)]);
  const first = search(a1, b1, range(0.88, 1.16, 0.01), { x0: -10, x1: 10, y0: -10, y1: 10 }, 1);
  // Fin : image plus grande, fenêtre resserrée autour du premier résultat.
  const fine = 240;
  const k = fine / coarse;
  const [a2, b2] = await Promise.all([edges(fileA, fine), edges(fileB, fine)]);
  const second = search(
    a2,
    b2,
    range(first.scale - 0.02, first.scale + 0.02, 0.0025),
    { x0: first.dx * k - 6, x1: first.dx * k + 6, y0: first.dy * k - 6, y1: first.dy * k + 6 },
    1,
  );
  return {
    scale: Number(second.scale.toFixed(4)),
    dx: Number((second.dx / a2.w).toFixed(5)),
    dy: Number((second.dy / a2.h).toFixed(5)),
    cost: Number(second.cost.toFixed(4)),
    baseline: Number(cost(a2, b2, 1, 0, 0).toFixed(4)),
  };
}
