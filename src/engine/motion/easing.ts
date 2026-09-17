/**
 * Courbes de mouvement. Chacune a une intention :
 * - `inOut` (quintique) : part et se pose sans à-coup — vitesse et accélération nulles aux deux bouts ;
 * - `out` : part tout de suite, se pose longuement (arriver) ;
 * - `in` : s'éloigne en accélérant (quitter) ;
 * - `linear` : vitesse constante (balayage, travelling mécanique) ;
 * - `outExpo` : arrêt net et précis (une main qui se pose) ;
 * - `inOutSine` : respiration, sans intention forte ;
 * - `anticipate` : un recul d'environ 3 % avant de partir, arrivée posée (un opérateur qui prend son élan).
 */
export type EaseName = 'linear' | 'inOut' | 'out' | 'in' | 'outExpo' | 'inOutSine' | 'anticipate';

const inOut = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

export const EASE: Record<EaseName, (x: number) => number> = {
  linear: (x) => x,
  inOut,
  out: (x) => 1 - (1 - x) ** 3,
  in: (x) => x * x * x,
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  // x²(1 − x)³ : nul et à pente nulle aux deux bouts — le départ reste doux, l'arrivée intacte.
  anticipate: (x) => inOut(x) - 4 * x * x * (1 - x) ** 3,
};
