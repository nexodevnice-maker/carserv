import type { CloudField } from '../scenes/clouds/cloud-layer';

/**
 * Composition du monde de CAR SERVICE 06, en mètres : un seul univers, à l'échelle, que la caméra traverse d'un bout à
 * l'autre du récit. Tout le voyage est tourné vers le nord, vers le cœur de la Voie lactée.
 * - le 06 : le contour IGN à l'échelle 1 m par unité de carte (≈ 1 km × 1,1 km), plateau affleurant à y = 0,
 *   falaises d'or de 40 m sur la mer de nuit ;
 * - le monolithe de preuve à l'origine, face au sud (la côte est à 120 m derrière la caméra), sur un point sans nom ;
 * - la route de la location part vers le nord derrière le monolithe : son point de fuite tombe sous la galaxie ;
 * - une mer de nuages à 1 500 m (percée d'une trouée pour la plongée vers le 06) et des bancs bas vers 400 m.
 */
const NORTH = -Math.PI / 2;

export const WORLD = {
  /** Rotation du ciel, constante sur tout le site : regarder au nord, c'est regarder le cœur de la Voie lactée. */
  skyYaw: 1.32,
  north: NORTH,
  map: {
    /** Point de la carte (viewBox de map-06.json) posé à l'origine du monde : l'emplacement du monolithe. */
    anchor: [400, 900] as const,
    scale: 1,
    depth: 40,
    bevel: 5,
    numberAt: [640, 470] as const,
    seaAt: [520, 1205] as const,
  },
  road: {
    /** Origine de la route (x, z) : la voie de la caméra passe en x = 0. */
    origin: [1.7, -300] as const,
    heading: NORTH,
  },
  cloudFar: 8000,
  clouds: {
    desktop: [
      { center: [0, 1500, 1400], size: [7000, 260, 7000], count: 130, scale: [900, 2000], hole: [50, 700, 560] },
      { center: [0, 420, 300], size: [2200, 200, 2400], count: 40, scale: [160, 380] },
    ],
    mobile: [
      { center: [0, 1500, 1400], size: [7000, 260, 7000], count: 70, scale: [1200, 2600], hole: [50, 700, 560] },
      { center: [0, 420, 300], size: [2200, 200, 2400], count: 22, scale: [200, 440] },
    ],
  } satisfies Record<'desktop' | 'mobile', CloudField[]>,
};
