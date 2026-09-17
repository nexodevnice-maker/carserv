import { dampFactor } from '../math/scalar';
import { EASE } from './easing';

/**
 * La valeur affichée suit sa cible (repris de MECA RIVIERA, `motion/follow.ts`, validé en production).
 * - `damp` : amorti exponentiel ;
 * - `spring` : ressort critique résolu exactement (stable quel que soit dt) — au doigt : départ doux, arrivée sans
 *   rebond, quelle que soit la vitesse du geste ;
 * - `glide` : un plan par geste, à la façon d'un mouvement de caméra réglé. Quand la cible saute (pas guidé, lien,
 *   touche), la valeur part de là où elle est, à la vitesse qu'elle avait, et rejoint la cible en une courbe quintique
 *   (arrivée à vitesse et accélération nulles) de durée maîtrisée — proportionnelle à la distance, bornée. Une cible qui glisse (barre de défilement,
 *   petits pas) est suivie par amorti : jamais de glissade qui redémarre à chaque image.
 * `maxLag` : un saut plus grand que ce retard est franchi d'un coup, seul le dernier morceau est animé.
 */
export interface FollowParams {
  mode: 'damp' | 'spring' | 'glide';
  /** Taux (damp, 1/s), pulsation (spring, rad/s) ; glide : taux de l'amorti de suivi fin. */
  rate: number;
  /** Retard maximal toléré, en unités de la valeur suivie. */
  maxLag: number;
  /** Écart sous lequel la valeur est posée sur sa cible (plus aucun rendu). */
  epsilon: number;
  /** glide : durée (s) d'une glissade par unité de distance, et bornes. */
  glide?: { perUnit: number; min: number; max: number; jump: number };
}

// Hermite quintique : H part de 0 et arrive à 1, V porte la vitesse initiale ; vitesses et accélérations nulles à
// l'arrivée. Un nouveau geste pendant une glissade repart de la vitesse en cours : aucun arrêt net.
const hermite = (t: number) => EASE.inOut(t);
const hermiteSlope = (t: number) => 30 * t * t * (1 - t) * (1 - t);
const launch = (t: number) => t - 6 * t ** 3 + 8 * t ** 4 - 3 * t ** 5;
const launchSlope = (t: number) => 1 - 18 * t * t + 32 * t ** 3 - 15 * t ** 4;

export function createFollow() {
  let velocity = 0;
  let glide: { from: number; to: number; v0: number; start: number; duration: number } | null = null;
  let clock = 0;
  let lastTarget = NaN;
  const glideVelocity = (g: NonNullable<typeof glide>) => {
    const t = Math.min((clock - g.start) / g.duration, 1);
    return ((g.to - g.from) * hermiteSlope(t)) / g.duration + g.v0 * launchSlope(t);
  };
  return {
    /** Valeur affichée après `dt` secondes, en route vers `target`. */
    step(current: number, target: number, dt: number, params: FollowParams) {
      clock += dt;
      const lag = current - target;
      if (Math.abs(lag) > params.maxLag) {
        current = target + Math.sign(lag) * params.maxLag;
        velocity = 0;
        glide = null;
      }
      if (params.mode === 'glide' && params.glide) {
        const g = params.glide;
        // Après une remise à zéro (repos, entrée), la référence est la valeur affichée elle-même.
        const reference = Number.isFinite(lastTarget) ? lastTarget : current;
        const jumped = Math.abs(target - reference) > g.jump;
        lastTarget = target;
        if (jumped || (glide && Math.abs(target - glide.to) > g.jump)) {
          const v0 = glide ? glideVelocity(glide) : 0;
          const distance = Math.abs(target - current);
          const duration = Math.min(g.max, Math.max(g.min, distance * g.perUnit));
          glide = { from: current, to: target, v0, start: clock, duration };
        }
        if (glide) {
          glide.to = target;
          const t = Math.min((clock - glide.start) / glide.duration, 1);
          const next = glide.from + (glide.to - glide.from) * hermite(t) + glide.v0 * glide.duration * launch(t);
          if (t >= 1) {
            glide = null;
            return target;
          }
          return next;
        }
        const next = current + (target - current) * dampFactor(params.rate, dt);
        return Math.abs(next - target) < params.epsilon ? target : next;
      }
      lastTarget = target;
      glide = null;
      if (params.mode === 'damp') {
        velocity = 0;
        const next = current + (target - current) * dampFactor(params.rate, dt);
        return Math.abs(next - target) < params.epsilon ? target : next;
      }
      const omega = params.rate;
      const decay = Math.exp(-omega * dt);
      const offset = current - target;
      const drift = (velocity + omega * offset) * dt;
      velocity = (velocity - omega * drift) * decay;
      const next = target + (offset + drift) * decay;
      if (Math.abs(next - target) < params.epsilon && Math.abs(velocity) < params.epsilon * 10) {
        velocity = 0;
        return target;
      }
      return next;
    },
    /** Encore en mouvement : un écart à la cible, de l'élan, ou une glissade en cours. */
    moving(current: number, target: number, epsilon: number) {
      return glide !== null || Math.abs(target - current) >= epsilon || velocity !== 0;
    },
    reset() {
      velocity = 0;
      glide = null;
      lastTarget = NaN;
    },
  };
}

export type Follow = ReturnType<typeof createFollow>;
