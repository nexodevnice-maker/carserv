/**
 * Composition du monde de CAR SERVICE 06, en mètres, dans le repère des plans (shots.ts) : un seul univers que la
 * caméra traverse d'un bout à l'autre.
 * - le panneau de preuve en x = 0, z = 0 ; la route de la location vers +x (road-layer) ;
 * - le 06 en volume derrière le panneau, au nord (z = −60) : on le survole en quittant les prestations ;
 * - des bancs de nuages sur les trajets de la caméra : sous le regard à l'ouverture, au-dessus du panneau (montée vers
 *   la carte), au-dessus de la carte (montée dans la Voie lactée, puis piqué vers la route), à l'horizon de la route.
 */
export const WORLD = {
  map: {
    center: [0, -60] as const,
    /** 1 000 unités de la carte (largeur du département) → 34 m. */
    scale: 0.034,
    depth: 0.9,
    /** Positions dans le repère de la carte (viewBox de map-06.json). */
    numberAt: [640, 470] as const,
    seaAt: [520, 1205] as const,
  },
  clouds: [
    { center: [0, 17, 26], size: [80, 7, 56], count: 22 },
    { center: [4, 19, -8], size: [90, 8, 64], count: 26 },
    { center: [0, 50, -62], size: [90, 8, 70], count: 22 },
    { center: [140, 30, -6], size: [100, 14, 80], count: 12 },
  ] satisfies { center: [number, number, number]; size: [number, number, number]; count: number }[],
};
