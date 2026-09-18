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

/** Point de la carte du 06 (repère de map-06.json) posé à l'origine du monde : l'emplacement du véhicule. */
const ANCHOR = [400, 900] as const;

export const WORLD = {
  /** Rotation du ciel, constante sur tout le site : regarder au nord, c'est regarder le cœur de la Voie lactée. */
  skyYaw: 1.32,
  north: NORTH,
  /**
   * Hauteur des falaises du 06 au-dessus de la mer de nuit. Le plateau affleure à y = 0 : la place, la route et le
   * véhicule sont DESSUS, la mer est 30 m plus bas. C'est ce qui fait qu'on se pose sur un territoire, et pas sur
   * une dalle posée dans le vide.
   */
  seaDepth: 30,
  /**
   * LE 06 — le contour officiel du département (relevé IGN, scripts/content-map.mjs), extrudé à l'échelle du monde.
   * On le traverse en descendant de la galaxie : il est le dernier palier avant la place, et c'est lui qui dit
   * « ici, c'est les Alpes-Maritimes » sans qu'aucun texte n'ait à le dire.
   */
  map: {
    anchor: ANCHOR,
    scale: 1,
    depth: 30,
    bevel: 5,
    numberAt: [640, 470] as const,
    seaAt: [520, 1205] as const,
  },
  /**
   * LA GALAXIE (modèle fourni, nuage de 50 000 points) : l'univers du site, et un vrai volume qu'on traverse.
   * Diamètre en mètres — c'est l'échelle du voyage ; la caméra part de l'intérieur et en sort par le bas.
   */
  galaxy: {
    diameter: 30000,
    at: [0, 12000, -4000] as const,
    starSize: 66,
    tilt: 0.42,
    /** L'étoile filante du premier défilement : elle traverse le cadre du héros en diagonale, et vite. */
    meteor: { from: [-9000, 11500, 7000] as const, to: [11000, 1200, -2000] as const, length: 3400, width: 34 },
  },
  /**
   * LA PLACE : l'aire de stationnement où le véhicule est garé, centrée sur l'origine du monde. Le véhicule occupe la
   * place centrale du côté droit ; l'allée passe devant lui, c'est par là que la caméra arrive.
   */
  place: {
    size: [70, 48] as const,
    /**
     * Le mur d'enceinte, juste derrière la rangée où le véhicule est garé : c'est le FOND de tous les plans du
     * nettoyage. Sans lui la voiture se découpait sur du vide, et aucun décor lointain ne remplaçait ça.
     */
    wall: { at: -5.2, height: 3.0, length: 46 },
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
    // Les crêtes commencent APRÈS le quartier (3,2 km) : un massif qui traverserait les immeubles se voit
    // immédiatement. Elles ferment le fond de la vallée, la ville occupe le premier et le deuxième plan.
    ridges: [
      { radius: 4200, height: 520, segments: 200 },
      { radius: 8200, height: 980, segments: 180 },
      { radius: 17000, height: 1750, segments: 150 },
    ],
    // Les rochers commencent LOIN de la place (150 m) : à 46 m ils tombaient dans le champ des plans du parking, sur
    // un sol trop sombre pour qu'on voie leur contact — ils avaient l'air de flotter en l'air.
    rocks: { count: 54, inner: 150, outer: 520, small: 1.4, large: 6.5 },
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
