import type { Framing, ShotDefinition } from '../engine/camera/camera-rig';
import type { Vec3 } from '../engine/math/vec3';
import { WORLD } from './world';

/** Centre de la France dans le monde (world.ts, calculé depuis les contours IGN). */
const FRANCE = WORLD.france.center;

/**
 * Les 24 unités cinématiques de CAR SERVICE 06 (docs/MOBILE_CINEMATIC_GRAMMAR.md) : un repos = un plan = une action.
 * Positions en mètres, dans un seul monde à l'échelle (world.ts) que la caméra traverse sans coupure : on EST la
 * caméra. Tout le voyage regarde le nord, vers le cœur de la Voie lactée (skyYaw constant).
 *
 * LA CHAÎNE : l'univers fourni (le héros) → le regard bascule et une trouée s'ouvre dans les nuages → on tombe dedans,
 * les crêtes sortent de la nuit en vraie profondeur → ce ciel couvre un pays → le pays devient le 06 → on se pose au
 * pied de la balise, entre les rochers → le véhicule, sale → la lumière le traverse → la laque rend l'univers entier →
 * l'habitacle → le métier → le 06 devient une route → on rattrape et on double le C-HR → il s'arrête → rendez-vous.
 *
 * CADRAGE EN PORTRAIT (rapport 0,46) : à 50° de focale, la largeur visible vaut ≈ 0,43 × distance. Une voiture de 5 m
 * n'entre dans le cadre qu'à partir de 13 m. En dessous, on fait une MACRO assumée (une aile, une optique, une arête
 * de capot), jamais un plan large rogné. Chaque cadre porte au moins trois couches : matière proche, véhicule,
 * atmosphère, ciel.
 *
 * Bureau : texte à gauche (décalage optique vers la droite). Téléphone et tablette : légende en bas (décalage vers le
 * haut), focale plus ouverte. `flight` : l'enveloppe du vol qui mène au plan (focale, roulis, plongée, turbulence),
 * maximale au milieu du trajet.
 */
type Portrait = Partial<Framing>;
const portrait = (framing: Portrait) => ({ tablet: framing, mobile: framing });
const N = WORLD.north;

/**
 * Repère de la route : `lane(x le long de la route, décalage latéral, hauteur d'œil)`. La route part de
 * WORLD.road.origin vers le nord ; la voie de la caméra est en x = 0 dans le monde, la voie de gauche vers x négatif.
 */
const lane = (along: number, side = 0, y = 1.28) => [side, y, WORLD.road.origin[1] - along] as Vec3;
/** Point visé sur le C-HR (il roule dans la voie, x = 0) à `along` mètres du début de la route. */
const chr = (along: number, y = 1.02) => [0, y, WORLD.road.origin[1] - along] as Vec3;
/** Le plan de la preuve : le véhicule propre entier, au ras du sol, le ciel dans sa laque. */
const PREUVE = { position: [9.2, 0.62, 6.8] as Vec3, target: [0.5, 0.92, 0] as Vec3 };

export const shots: readonly ShotDefinition[] = [
  {
    id: 'univers',
    chapter: 'univers',
    at: 0,
    intent:
      'UNITÉ 1 — LE HÉROS : l’univers fourni, tel qu’il a été photographié. Face au cœur de la Voie lactée, au-dessus d’une mer de nuages. Rien d’autre n’existe encore.',
    framing: { position: [0, 2400, 2800], look: [N, 0.13], fov: 62, shift: [0.08, 0] },
    ...portrait({ position: [0, 2400, 2800], look: [N, 0.2], fov: 78, shift: [0, -0.04] }),
    pace: { window: [0, 1], ease: 'inOut' },
  },
  {
    id: 'nuages',
    chapter: 'univers',
    at: 0.55,
    intent:
      'UNITÉ 2 — Le regard bascule vers le bas : la mer de nuages n’est pas un fond, elle est SOUS nous, et une trouée s’y ouvre. Il y a un monde en dessous. Aucun texte.',
    framing: { position: [0, 2080, 2320], look: [N, -0.2], fov: 64, shift: [0.06, 0] },
    ...portrait({ position: [0, 2060, 2280], look: [N, -0.26], fov: 76, shift: [0, 0.04] }),
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 8, pitch: -0.1 },
  },
  {
    id: 'traversee',
    chapter: 'ciel',
    at: 0.55,
    intent:
      'UNITÉ 3 — Tomber dedans : la caméra traverse la couche de nuages et les crêtes sortent de la nuit l’une derrière l’autre. C’est là que le lieu cesse d’être une image et devient un volume.',
    framing: { position: [0, 430, 620], look: [N, -0.3], fov: 60, shift: [0.06, 0] },
    ...portrait({ position: [0, 420, 600], look: [N, -0.34], fov: 74, shift: [0, 0.06] }),
    via: [[0, 1560, 1780], [0, 900, 1150]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 16, pitch: -0.16, shake: 0.9 },
  },
  {
    id: 'france',
    chapter: 'territoire',
    at: 0.4,
    intent:
      'UNITÉ 4 — Le regard bascule vers le sol : la France entière, département par département, posée sur la mer de nuit. Un seul point est allumé, dans les Alpes-Maritimes.',
    framing: { position: [FRANCE[0] + 200, 13500, FRANCE[1] + 4000], target: [FRANCE[0] + 300, 0, FRANCE[1] - 800], fov: 52, shift: [0.14, 0] },
    ...portrait({ position: [FRANCE[0] + 600, 12600, FRANCE[1] + 7200], target: [FRANCE[0] + 1100, 0, FRANCE[1] - 900], fov: 78, shift: [0, 0.14] }),
    via: { desktop: [[-1200, 7000, 3400]] as Vec3[], tablet: [[-1400, 7600, 4400]] as Vec3[], mobile: [[-1400, 7600, 4400]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.2,
    flight: { fov: 10, roll: 0.1 },
  },
  {
    id: 'zone',
    chapter: 'territoire',
    at: 0.88,
    intent: 'UNITÉ 5 — La descente : les départements voisins s’effacent, le 06 s’allume de la côte aux montagnes, la balise au milieu.',
    framing: { position: [-160, 1150, 900], target: [60, 0, -380], fov: 46, shift: [0.2, 0] },
    ...portrait({ position: [70, 1900, 620], target: [100, 0, -330], fov: 62, shift: [0, 0.26] }),
    via: { desktop: [[-1600, 3000, 2000]] as Vec3[], tablet: [[-2400, 6000, 3800]] as Vec3[], mobile: [[-2400, 6000, 3800]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 10, roll: -0.1, shake: 0.8 },
  },
  {
    id: 'arrivee',
    chapter: 'avant',
    at: 0.42,
    intent:
      'UNITÉ 6 — Piquer sur la mer, franchir la falaise d’or au ras : au pied de la colonne de lumière, un véhicule attend. C’est le même — mais il ne renvoie plus rien.',
    framing: { position: [-11.5, 6.6, 21], target: [0, 1.3, 0], fov: 42, shift: [0.12, 0] },
    ...portrait({ position: [-9.4, 7.8, 23], target: [0, 1.4, 0], fov: 54, shift: [0, 0.1] }),
    via: [[-150, 600, 760], [-70, 150, 260], [-30, 30, 80]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 12, roll: 0.08, shake: 0.5 },
  },
  {
    id: 'poussiere',
    chapter: 'avant',
    at: 0.88,
    intent:
      'UNITÉ 7 — Au ras du sol, à hauteur de moyeu : la poussière sur l’aile arrière, la roue, et un reflet éteint. La même surface qu’à l’unité 1, mais morte.',
    framing: { position: [-4.4, 0.5, 3.2], target: [-1.05, 0.58, 0.28], fov: 40, shift: [0.14, 0] },
    ...portrait({ position: [-4.0, 0.52, 2.9], target: [-1.1, 0.6, 0.3], fov: 48, shift: [0, 0.05] }),
    via: [[-15, 3.6, 13], [-7.6, 1.2, 7]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 8, roll: -0.04 },
  },
  {
    id: 'capot',
    chapter: 'intervention',
    at: 0.18,
    intent: 'UNITÉ 8 — Devant l’optique, à hauteur de pare-chocs : ce que la ligne de lumière va traverser, de l’avant vers l’arrière.',
    framing: { position: [4.5, 0.54, 2.4], target: [1.5, 0.66, 0.2], fov: 40, shift: [0.13, 0] },
    ...portrait({ position: [4.2, 0.56, 2.2], target: [1.5, 0.68, 0.22], fov: 48, shift: [0, 0.05] }),
    via: { desktop: [[1.4, 0.7, 4.2]] as Vec3[], tablet: [[1.2, 0.72, 3.8]] as Vec3[], mobile: [[1.2, 0.72, 3.8]] as Vec3[] },
    pace: { window: [0.08, 0.95], ease: 'out' },
    flight: { fov: 6, roll: 0.05 },
  },
  {
    id: 'scan',
    chapter: 'intervention',
    at: 0.56,
    intent: 'UNITÉ 9 — Le relevé : une ligne d’or traverse la caisse. Derrière elle, la poussière n’est plus là. La caméra recule pour le voir entier.',
    framing: { position: [-8.6, 2.2, 9.8], target: [0, 1.0, 0], fov: 40, shift: [0.16, 0] },
    ...portrait({ position: [-7.8, 2.4, 9.4], target: [0, 1.05, 0], fov: 54, shift: [0, 0.08] }),
    pace: { window: [0, 1], ease: 'inOut' },
    flight: { fov: 5 },
  },
  {
    id: 'verni',
    chapter: 'intervention',
    at: 0.9,
    intent: 'UNITÉ 10 — Fin du passage, plan rasant le long du flanc : le noir est redevenu profond. Aucun texte.',
    framing: { position: [-1.6, 0.4, 5.8], target: [1.6, 0.78, -0.25], fov: 36, shift: [0.13, 0] },
    ...portrait({ position: [-1.4, 0.42, 5.2], target: [1.5, 0.8, -0.25], fov: 46, shift: [0, 0.06] }),
    pace: { window: [0, 1], ease: 'inOut' },
    flight: { fov: 6, roll: -0.03 },
  },
  {
    id: 'reflets',
    chapter: 'transformation',
    at: 0.35,
    intent:
      'UNITÉ 9 — LA PREUVE : la laque rend l’univers entier — le ciel de l’unité 1, cette fois dans la carrosserie. Trois quarts avant au ras du sol mouillé, rochers au premier plan.',
    framing: { position: [10.4, 0.66, 7.6], target: PREUVE.target, fov: 38, shift: [0.2, 0] },
    ...portrait({ position: PREUVE.position, target: PREUVE.target, fov: 46, shift: [0, 0.14] }),
    via: { desktop: [[4.6, 1.1, 3.4]] as Vec3[], tablet: [[3.8, 1.05, 3]] as Vec3[], mobile: [[3.8, 1.05, 3]] as Vec3[] },
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 8, roll: 0.04 },
  },
  {
    id: 'habitacle',
    chapter: 'transformation',
    at: 0.85,
    intent: 'UNITÉ 12 — Entrer : assis à la place du conducteur, tableau de bord et pare-brise. L’intérieur aussi a été fait.',
    framing: { position: [-0.3, 1.02, -0.36], target: [2.4, 0.74, 0.2], fov: 58, shift: [0.06, 0] },
    ...portrait({ position: [-0.32, 1.04, -0.34], target: [2.2, 0.72, 0.24], fov: 70, shift: [0, 0.04] }),
    via: { desktop: [[2.4, 1.4, 2.1]] as Vec3[], tablet: [[2.2, 1.4, 1.9]] as Vec3[], mobile: [[2.2, 1.4, 1.9]] as Vec3[] },
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 8 },
  },
  {
    id: 'prestations-1',
    chapter: 'prestations',
    at: 0.25,
    intent: 'UNITÉ 13 — Ressortir et prendre un peu de hauteur : le véhicule entier, et la première moitié du métier.',
    framing: { position: [-8.6, 2.9, 9.6], target: [0.4, 1.1, 0], fov: 38, shift: [0.22, 0] },
    ...portrait({ position: [-7.6, 3.0, 9.8], target: [0.3, 1.15, 0], fov: 48, shift: [0, 0.22] }),
    via: { desktop: [[-3.6, 1.6, 7.2]] as Vec3[], tablet: [[-3.2, 1.8, 7]] as Vec3[], mobile: [[-3.2, 1.8, 7]] as Vec3[] },
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    flight: { fov: 4 },
  },
  {
    id: 'prestations-2',
    chapter: 'prestations',
    at: 0.55,
    intent: 'UNITÉ 14 — Tourner autour : trois quarts avant, la carrosserie en fuite, la seconde moitié du métier.',
    framing: { position: [9.8, 2.2, 7.4], target: [0.6, 1.1, 0], fov: 40, shift: [0.2, 0] },
    ...portrait({ position: [8.8, 2.4, 7.6], target: [0.5, 1.1, 0], fov: 50, shift: [0, 0.2] }),
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 5, roll: 0.05 },
  },
  {
    id: 'offre',
    chapter: 'prestations',
    at: 0.85,
    intent: 'UNITÉ 15 — Reculer dans la nuit : le véhicule propre sous la Voie lactée, la place pour la formule et le déplacement.',
    framing: { position: [-16, 5.4, 22], target: [1, 1.4, 0], fov: 34, shift: [0.24, 0] },
    ...portrait({ position: [-12, 6.2, 20], target: [0.8, 1.5, 0], fov: 44, shift: [0, 0.24] }),
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    flight: { fov: 6, roll: 0.04 },
  },
  {
    id: 'route',
    chapter: 'bascule',
    at: 0.9,
    intent:
      'UNITÉ 16 — Le déplacement devient une route : le regard ne quitte pas le cœur de la galaxie, la caméra traverse les nuages, la chaussée se dessine sur le 06 et monte à sa rencontre jusqu’à se poser dans la voie.',
    framing: { position: lane(60), look: [N, -0.022], fov: 36, shift: [0.1, 0] },
    ...portrait({ position: lane(58, 0, 1.42), look: [N, -0.03], fov: 52, shift: [0, 0.12] }),
    via: [[0, 1350, 1150], [0, 520, 420], [0, 95, -40], [0, 14, -170], [0, 3, -250]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 22, pitch: -0.24, shake: 1 },
  },
  {
    id: 'poursuite',
    chapter: 'location',
    at: 0.18,
    intent: 'UNITÉ 17 — On roule derrière lui : ses feux allumés, « 1 JOUR » peint sous nos roues, la galaxie au bout de la route.',
    framing: { position: lane(78, 1.9), target: chr(104, 1.05), fov: 38, shift: [0.12, 0] },
    ...portrait({ position: lane(76, 1.8, 1.34), target: chr(104, 1.1), fov: 48, shift: [0, 0.12] }),
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 8, shake: 0.4 },
  },
  {
    id: 'doubler',
    chapter: 'location',
    at: 0.44,
    intent: 'UNITÉ 18 — Cent mètres avalés : on se déporte et on le double. Il entre dans le cadre de trois quarts, sa laque prend la galaxie. Aucun texte.',
    framing: { position: lane(176, -3.8, 1.14), target: chr(184, 0.95), fov: 44, shift: [0.1, 0] },
    ...portrait({ position: lane(174, -3.4, 1.18), target: chr(184, 1.0), fov: 56, shift: [0, 0.08] }),
    via: { desktop: [[-2.2, 1.3, WORLD.road.origin[1] - 130]] as Vec3[], tablet: [[-2, 1.34, WORLD.road.origin[1] - 128]] as Vec3[], mobile: [[-2, 1.34, WORLD.road.origin[1] - 128]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.14,
    flight: { fov: 14, roll: 0.05, shake: 0.9 },
  },
  {
    id: 'distance',
    chapter: 'location',
    at: 0.7,
    intent: 'UNITÉ 19 — Il reprend la tête et s’éloigne : la route converge vers la galaxie, ses feux deviennent deux points rouges.',
    framing: { position: lane(296, 0.8), target: chr(345, 1.25), fov: 36, shift: [0.1, 0] },
    ...portrait({ position: lane(294, 0.7, 1.32), target: chr(345, 1.3), fov: 48, shift: [0, 0.12] }),
    via: { desktop: [[-1.6, 1.22, WORLD.road.origin[1] - 240]] as Vec3[], tablet: [[-1.4, 1.26, WORLD.road.origin[1] - 238]] as Vec3[], mobile: [[-1.4, 1.26, WORLD.road.origin[1] - 238]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 12, shake: 0.8 },
  },
  {
    id: 'arret',
    chapter: 'location',
    at: 0.93,
    intent: 'UNITÉ 20 — Il s’arrête au bord du 06, nous derrière lui : la falaise d’or et la mer de nuit devant — la place pour les tarifs et les conditions.',
    framing: { position: lane(390, -3.3, 1.22), target: chr(398, 1.02), fov: 40, shift: [0.12, 0] },
    ...portrait({ position: lane(388, -3, 1.26), target: chr(398, 1.06), fov: 50, shift: [0, 0.22] }),
    pace: { window: [0.02, 0.96], ease: 'inOut' },
    flight: { fov: 10, shake: 0.5 },
  },
  {
    id: 'agenda',
    chapter: 'rendezvous',
    at: 0.5,
    intent: 'UNITÉ 21 — L’écran du rendez-vous : la caméra s’immobilise au-dessus du bord du 06 et la nuit s’éteint derrière la carte. Le seul écran sans 3D.',
    framing: { position: [0, 30, WORLD.road.origin[1] - WORLD.road.length + 15], look: [N, -0.07], fov: 48, shift: [0, 0] },
    ...portrait({ position: [0, 36, WORLD.road.origin[1] - WORLD.road.length + 20], look: [N, -0.09], fov: 62, shift: [0, 0] }),
    via: { desktop: [[-1.6, 8, WORLD.road.origin[1] - WORLD.road.length + 4]] as Vec3[], tablet: [[-1.4, 9, WORLD.road.origin[1] - WORLD.road.length + 6]] as Vec3[], mobile: [[-1.4, 9, WORLD.road.origin[1] - WORLD.road.length + 6]] as Vec3[] },
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 8 },
  },
  {
    id: 'horizon',
    chapter: 'contact',
    at: 0.6,
    intent: 'UNITÉ 22 — Au bout de la route, au bord du 06 : la mer de nuit et la galaxie devant. La place pour un seul geste.',
    framing: { position: [0, 13, -645], look: [N, -0.035], fov: 54, shift: [0, 0] },
    ...portrait({ position: [0, 17, -642], look: [N, -0.055], fov: 68, shift: [0, 0.16] }),
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 8 },
  },
];
