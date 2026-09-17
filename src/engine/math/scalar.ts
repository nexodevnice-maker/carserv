/** Outils scalaires purs, sans allocation. */

export const clamp = (x: number, min: number, max: number) => (x < min ? min : x > max ? max : x);

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Position de `x` entre `a` et `b` (0 en a, 1 en b), non bornée. */
export const invLerp = (a: number, b: number, x: number) => (a === b ? 0 : (x - a) / (b - a));

/** Position de `x` entre `a` et `b`, bornée à [0, 1]. */
export const range01 = (a: number, b: number, x: number) => clamp01(invLerp(a, b, x));

export const smoothstep = (a: number, b: number, x: number) => {
  const t = range01(a, b, x);
  return t * t * (3 - 2 * t);
};

/** Part du chemin parcourue en `dt` secondes par un amorti exponentiel de taux `rate` (indépendant de la cadence). */
export const dampFactor = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Arrondi pour les écritures DOM : évite de réécrire un style pour une différence invisible. */
export const fixed = (x: number, digits = 4) => (Number.isFinite(x) ? x.toFixed(digits) : '0');
