import france from './map-france.json';
import type { CloudField } from '../scenes/clouds/cloud-layer';

/**
 * Composition du monde de CAR SERVICE 06, en mètres : un seul univers, à l'échelle, que la caméra traverse d'un bout à
 * l'autre du récit. Tout le voyage est tourné vers le nord, vers le cœur de la Voie lactée.
 * - le 06 : le contour IGN à l'échelle 1 m par unité de carte (≈ 1 km × 1,1 km), plateau affleurant à y = 0,
 *   falaises d'or de 40 m sur la mer de nuit ;
 * - le véhicule de la démonstration à l'origine, capot vers l'est, sur un point sans nom ;
 * - la route de la location part vers le nord derrière lui : son point de fuite tombe sous la galaxie ;
 * - une mer de nuages à 1 500 m (percée d'une trouée pour la plongée vers le 06) et des bancs bas vers 400 m.
 */
const NORTH = -Math.PI / 2;

const anchor = [400, 900] as const;
/** Boîte de la France dans le monde (mêmes unités que la carte : 1 unité = 1 m ; 1 m ≈ 90 m réels). */
const box = france.box.map((v, k) => v - anchor[k % 2]);

export const WORLD = {
  /** La France : centre et taille dans le monde, calculés depuis les contours (map-france.json). */
  france: {
    center: [(box[0]! + box[2]!) / 2, (box[1]! + box[3]!) / 2] as const,
    size: [box[2]! - box[0]!, box[3]! - box[1]!] as const,
  },
  /** Rotation du ciel, constante sur tout le site : regarder au nord, c'est regarder le cœur de la Voie lactée. */
  skyYaw: 1.32,
  north: NORTH,
  map: {
    /** Point de la carte (viewBox de map-06.json) posé à l'origine du monde : l'emplacement du véhicule. */
    anchor,
    scale: 1,
    depth: 40,
    bevel: 5,
    numberAt: [640, 470] as const,
    seaAt: [520, 1205] as const,
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
    rocks: { count: 54, inner: 9, outer: 74, small: 0.5, large: 2.4 },
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
