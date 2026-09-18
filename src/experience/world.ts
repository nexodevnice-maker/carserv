import type { CloudField } from '../scenes/clouds/cloud-layer';

/**
 * Composition du monde de CAR SERVICE 06, en mètres : un seul univers, à l'échelle, que la caméra traverse d'un bout à
 * l'autre du récit. Tout le voyage est tourné vers le nord, vers le cœur de la Voie lactée.
 * - la place de stationnement à l'origine : enrobé mouillé, places peintes, trois candélabres ;
 * - le véhicule de la démonstration garé dans la place centrale, capot vers l'est ;
 * - la route de la location part vers le nord derrière lui : son point de fuite tombe sous la galaxie ;
 * - une mer de nuages à 1 500 m (percée d'une trouée pour la plongée vers le 06) et des bancs bas vers 400 m.
 */
const NORTH = -Math.PI / 2;

export const WORLD = {
  /** Rotation du ciel, constante sur tout le site : regarder au nord, c'est regarder le cœur de la Voie lactée. */
  skyYaw: 1.32,
  north: NORTH,
  /** Profondeur de la mer de nuit sous le sol du monde (m) : le sol de l'univers, hors de la place. */
  seaDepth: 40,
  /**
   * LA GALAXIE (modèle fourni, nuage de 50 000 points) : l'univers du site, et un vrai volume qu'on traverse.
   * Diamètre en mètres — c'est l'échelle du voyage ; la caméra part de l'intérieur et en sort par le bas.
   */
  galaxy: { diameter: 30000, at: [0, 12000, -4000] as const, starSize: 52, tilt: 0.42 },
  /** LA VILLE (modèle fourni) : posée à l'ouest de la place, elle ferme l'horizon derrière le véhicule. */
  city: { height: 270, at: [-430, -330] as const, heading: 0.25 },
  /**
   * LA PLACE : l'aire de stationnement où le véhicule est garé, centrée sur l'origine du monde. Le véhicule occupe la
   * place centrale du côté droit ; l'allée passe devant lui, c'est par là que la caméra arrive.
   */
  place: {
    size: [70, 48] as const,
    bay: { width: 2.6, length: 5.4, count: 5 },
    lamps: [
      [7.6, -9.1],
      [7.6, 9.1],
      [-4.2, 14.6],
    ] as const,
    lampHeight: 7.2,
  },
  /**
   * Les deux véhicules (modèles 3D fournis, tools/3d). Longueurs réelles des modèles concernés : le modèle est mis à
   * cette échelle, roues au sol. `heading` : azimut du capot. La location roule dans la voie de la caméra (x = 0).
   */
  vehicles: {
    cleaning: { length: 4.99, at: [0, 0] as const, heading: 0 },
    rental: { length: 4.36, at: [0, -240] as const, heading: NORTH },
  },
  /** Hauteur de la colonne de la balise (m) : visible depuis l'orbite de la France. */
  beaconHeight: 2600,
  road: {
    /** Origine de la route (x, z) : la voie de la caméra passe en x = 0. */
    origin: [1.7, -240] as const,
    heading: NORTH,
    /** Longueur de chaussée (m) : elle s'arrête au bord du plateau du 06. */
    length: 420,
  },
  /**
   * Le relief en volume autour du monde (scenes/relief). Quatre crêtes concentriques : c'est leur décalage les unes
   * par rapport aux autres qui crée la distance quand la caméra descend. Les rochers, eux, donnent le premier plan
   * qui manque aux plans bas — ils passent devant l'objectif.
   */
  relief: {
    ridges: [
      { radius: 1250, height: 190, segments: 220 },
      { radius: 3100, height: 430, segments: 200 },
      { radius: 7600, height: 900, segments: 180 },
      { radius: 17000, height: 1750, segments: 150 },
    ],
    rocks: { count: 54, inner: 46, outer: 140, small: 0.6, large: 3.2 },
    corridor: { lane: 0, width: 11, from: -230, to: -680 },
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
