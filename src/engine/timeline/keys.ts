import { lerp } from '../math/scalar';
import { paced, type Pace } from '../motion/pace';
import type { Timeline } from './timeline';

/**
 * Clés posées dans un chapitre, en position locale (0–1) : elles restent justes quand la hauteur des chapitres change
 * (texte plus long sur mobile, redimensionnement) — aucune clé en pixels ni en unités monde.
 * Résolues en progression globale à chaque mesure.
 */
export interface KeyPlacement {
  chapter: string;
  at: number;
}

export interface Segment {
  /** Clé de départ. */
  index: number;
  /** Part du segment parcourue (0–1), avant rythme. */
  fraction: number;
}

/** Positions globales triées de clés locales ; signale en développement une clé qui recule. */
export function resolveKeys(keys: readonly KeyPlacement[], timeline: Timeline): Float64Array<ArrayBuffer> {
  const out = new Float64Array(keys.length);
  keys.forEach((key, k) => {
    out[k] = timeline.toGlobal(key.chapter, key.at);
    if (import.meta.env.DEV && k > 0 && (out[k] ?? 0) < (out[k - 1] ?? 0))
      console.warn(`[keys] clé hors d'ordre : ${key.chapter}@${key.at}`);
  });
  return out;
}

/** Segment contenant `p` parmi des positions croissantes. Avant la première clé : 0 ; après la dernière : la dernière. */
export function segmentAt(positions: Float64Array, p: number, out: Segment = { index: 0, fraction: 0 }): Segment {
  const n = positions.length;
  if (n < 2 || p <= (positions[0] ?? 0)) {
    out.index = 0;
    out.fraction = 0;
    return out;
  }
  if (p >= (positions[n - 1] ?? 0)) {
    out.index = n - 1;
    out.fraction = 0;
    return out;
  }
  let k = 0;
  while (k < n - 2 && p >= (positions[k + 1] ?? 0)) k++;
  const a = positions[k] ?? 0;
  const b = positions[k + 1] ?? a;
  out.index = k;
  out.fraction = b > a ? (p - a) / (b - a) : 1;
  return out;
}

/** Canal numérique (temps vidéo, uniforme, opacité…) : chaque clé est rejointe selon son propre rythme. */
export interface NumberKey extends KeyPlacement {
  value: number;
  pace?: Pace;
}

export function createChannel(keys: readonly NumberKey[]) {
  let positions = new Float64Array(0);
  const segment: Segment = { index: 0, fraction: 0 };
  return {
    resolve(timeline: Timeline) {
      positions = resolveKeys(keys, timeline);
    },
    value(p: number) {
      if (!keys.length) return 0;
      segmentAt(positions, p, segment);
      const from = keys[segment.index] as NumberKey;
      const to = keys[segment.index + 1];
      if (!to || segment.fraction === 0) return from.value;
      return lerp(from.value, to.value, paced(segment.fraction, to.pace ?? { window: [0, 1], ease: 'linear' }));
    },
    get positions() {
      return positions;
    },
  };
}

export type Channel = ReturnType<typeof createChannel>;
