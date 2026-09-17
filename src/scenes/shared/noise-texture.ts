import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RedFormat, RepeatWrapping, UnsignedByteType } from 'three';

/**
 * Bruit fractal tuilable (5 octaves de bruit de valeur), calculé une fois sur le processeur et partagé : flaques du sol
 * mouillé, corps des nuages. Échantillonné avec mipmaps : au loin, le motif s'adoucit au lieu de scintiller, et aucun
 * seuil ne dessine la grille (un bruit de grille calculé par pixel, seuillé, trace des rectangles).
 */
export function createNoiseTexture(size = 256): DataTexture {
  const data = new Uint8Array(size * size);
  const lattice = (period: number, seed: number) => {
    const grid = new Float32Array(period * period);
    let s = seed;
    for (let i = 0; i < grid.length; i++) {
      s = (s * 16807) % 2147483647;
      grid[i] = s / 2147483647;
    }
    const at = (i: number, j: number) => grid[(j % period) * period + (i % period)] ?? 0;
    return (x: number, y: number) => {
      const fx = (x / size) * period;
      const fy = (y / size) * period;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
      const sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      return a + (b - a) * sy;
    };
  };
  const octaves = [4, 8, 16, 32, 64].map((period, k) => ({ f: lattice(period, 97 + k * 131), w: 0.5 ** k }));
  const total = octaves.reduce((sum, o) => sum + o.w, 0);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const o of octaves) v += o.f(x, y) * o.w;
      data[y * size + x] = Math.round((v / total) * 255);
    }
  const texture = new DataTexture(data, size, size, RedFormat, UnsignedByteType);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
