import { range01 } from '../math/scalar';
import { EASE, type EaseName } from './easing';

/**
 * Rythme d'un segment (repris de MECA RIVIERA, validé en production) : comment une valeur rejoint sa clé depuis la
 * précédente. `window` : part du segment pendant laquelle elle bouge — avant, elle tient la clé précédente ; après,
 * elle est arrivée (palier de lecture). `ease` : la courbe du mouvement.
 * Des fenêtres et des courbes différentes d'un segment à l'autre évitent le métronome.
 */
export interface Pace {
  window: readonly [number, number];
  ease?: EaseName;
}

/** Palier de lecture de part et d'autre, déplacement adouci. */
export const DEFAULT_PACE: Pace = { window: [0.18, 0.82] };

/** Avancement (0–1) dans un segment, selon son rythme. */
export function paced(fraction: number, pace: Pace = DEFAULT_PACE) {
  return EASE[pace.ease ?? 'inOut'](range01(pace.window[0], pace.window[1], fraction));
}
