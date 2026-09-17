import { dampFactor } from '../math/scalar';

/**
 * La valeur affichée suit sa cible (repris de MECA RIVIERA, `motion/follow.ts`, validé en production).
 * - `damp` : amorti exponentiel — la molette et le pavé avancent déjà par crans ;
 * - `spring` : ressort critique résolu exactement (stable quel que soit dt) — départ doux, arrivée sans rebond, quelle
 *   que soit la vitesse du doigt.
 * Ajout CAR SERVICE 06 : `maxLag`. Un saut (lien interne, touche Fin, défilement brutal) ne fait pas rejouer tout le
 * film en accéléré : l'écart au-delà de `maxLag` est franchi d'un coup, seul le dernier morceau est animé.
 */
export interface FollowParams {
  mode: 'damp' | 'spring';
  /** Taux (damp, 1/s) ou pulsation (spring, rad/s). */
  rate: number;
  /** Retard maximal toléré, en unités de la valeur suivie. */
  maxLag: number;
  /** Écart sous lequel la valeur est posée sur sa cible (plus aucun rendu). */
  epsilon: number;
}

export function createFollow() {
  let velocity = 0;
  return {
    /** Valeur affichée après `dt` secondes, en route vers `target`. */
    step(current: number, target: number, dt: number, params: FollowParams) {
      const lag = current - target;
      if (Math.abs(lag) > params.maxLag) {
        current = target + Math.sign(lag) * params.maxLag;
        velocity = 0;
      }
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
    /** Encore en mouvement : un écart à la cible, ou de l'élan. */
    moving(current: number, target: number, epsilon: number) {
      return Math.abs(target - current) >= epsilon || velocity !== 0;
    },
    reset() {
      velocity = 0;
    },
  };
}

export type Follow = ReturnType<typeof createFollow>;
