import type { Framing, ShotDefinition } from '../engine/camera/camera-rig';
import type { Vec3 } from '../engine/math/vec3';
import { WORLD } from './world';

/**
 * Les 24 unités cinématiques de CAR SERVICE 06 (docs/MOBILE_CINEMATIC_GRAMMAR.md) : un repos = un plan = une action.
 * Positions en mètres, dans un seul monde à l'échelle (world.ts) que la caméra traverse sans coupure : on EST la
 * caméra. Tout le voyage regarde le nord, vers le cœur de la Voie lactée (skyYaw constant).
 *
 * LA CHAÎNE : on est DANS la galaxie fournie (un vrai volume de 50 000 étoiles) → on la traverse → le regard bascule,
 * une lueur grandit en dessous → c'est une ville de nuit → on descend entre les tours → on se pose sur une place de
 * stationnement où un véhicule est garé, sale → la lumière le traverse → la laque rend l'univers entier → l'habitacle →
 * le métier → la ville devient une route → on rattrape et on double le C-HR → il s'arrête → rendez-vous.
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
    id: 'galaxie',
    chapter: 'galaxie',
    at: 0,
    intent:
      'UNITÉ 1 — LE HÉROS : on est DANS la galaxie. Pas devant une image : dedans. Le cœur est droit devant, les bras s’ouvrent de part et d’autre, et les étoiles proches passent à côté de nous.',
    framing: { position: [1500, 15100, 4300], target: [-200, 12000, -1400], fov: 58, shift: [0.08, 0] },
    ...portrait({ position: [1400, 15400, 4600], target: [-200, 12000, -1400], fov: 72, shift: [0, -0.04] }),
    pace: { window: [0, 1], ease: 'inOut' },
  },
  {
    id: 'traversee',
    chapter: 'galaxie',
    at: 0.5,
    intent:
      'UNITÉ 2 — On traverse : la caméra entre dans le bras, les étoiles défilent de part et d’autre, le cœur grandit. C’est ici qu’on comprend que ce ciel a une profondeur. Aucun texte.',
    framing: { position: [700, 13500, 900], target: [0, 12000, -4200], fov: 66, shift: [0.06, 0] },
    ...portrait({ position: [650, 13800, 1100], target: [0, 12000, -4200], fov: 80, shift: [0, 0.04] }),
    via: { desktop: [[1800, 16200, 4200]] as Vec3[], tablet: [[1700, 16600, 4600]] as Vec3[], mobile: [[1700, 16600, 4600]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 12, roll: 0.08, shake: 0.5 },
  },
  {
    id: 'lueur',
    chapter: 'descente',
    at: 0.5,
    intent:
      'UNITÉ 3 — Le regard bascule vers le bas et la caméra tombe : sous la galaxie, une lueur grandit. Ce n’est pas une étoile, c’est une ville. Aucun texte.',
    framing: { position: [120, 760, 520], target: [-1180, 210, -1080], fov: 62, shift: [0, 0] },
    ...portrait({ position: [140, 800, 560], target: [-1180, 210, -1080], fov: 76 }),
    via: [[-600, 8600, -2200], [-120, 3000, -600]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.14,
    flight: { fov: 20, pitch: -0.2, shake: 1 },
  },
  {
    id: 'ville',
    chapter: 'ville',
    at: 0.45,
    intent:
      'UNITÉ 4 — La ville de nuit : les tours allumées, les avenues, et la galaxie encore au-dessus. On descend entre les immeubles.',
    framing: { position: [80, 34, 66], target: [-1180, 150, -1080], fov: 46, shift: [0.12, 0] },
    ...portrait({ position: [92, 38, 74], target: [-1180, 160, -1080], fov: 58, shift: [0, 0.14] }),
    via: [[130, 260, 240]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 18, roll: -0.06, shake: 0.8 },
  },
  {
    id: 'place',
    chapter: 'arrivee',
    at: 0.45,
    intent:
      'UNITÉ 5 — Se poser SUR LA PLACE : une aire de stationnement de nuit, l’enrobé mouillé qui renvoie les candélabres, les places peintes en jaune — et le véhicule garé entre deux lignes. On est arrivé quelque part.',
    framing: { position: [15.5, 2.9, 11.5], target: [0.2, 1.75, 0.1], fov: 44, shift: [0.16, 0] },
    ...portrait({ position: [13.8, 3.1, 10.8], target: [0.1, 1.9, 0.1], fov: 56, shift: [0, 0.16] }),
    via: [[60, 40, 60], [30, 12, 24]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 14, roll: 0.06, shake: 0.6 },
  },
  {
    id: 'poussiere',
    chapter: 'arrivee',
    at: 0.9,
    intent:
      'UNITÉ 6 — Au ras du sol, à hauteur de moyeu : la poussière sur l’aile arrière, la roue, et un reflet éteint. La même surface qu’à l’unité 1, mais morte.',
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
    intent:
      'UNITÉ 7 — LE PLAN FIXE. La caméra se pose à trois mètres du flanc, trois quarts avant, et NE BOUGERA PLUS. C’est la matière qui change devant elle : d’abord la poussière, en gros plan.',
    framing: { position: [6.4, 1.15, 5.2], target: [0.2, 0.95, 0], fov: 40, shift: [0.14, 0] },
    ...portrait({ position: [5.9, 1.2, 4.9], target: [0.15, 1.0, 0], fov: 50, shift: [0, 0.08] }),
    via: { desktop: [[2.2, 0.8, 5.0]] as Vec3[], tablet: [[2, 0.85, 4.6]] as Vec3[], mobile: [[2, 0.85, 4.6]] as Vec3[] },
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 6 },
  },
  {
    id: 'scan',
    chapter: 'intervention',
    at: 0.56,
    intent:
      'UNITÉ 8 — EXACTEMENT LE MÊME PLAN : la caméra ne bouge pas d’un centimètre. La ligne d’or traverse la caisse sous nos yeux et, derrière elle, la poussière n’est plus là. On voit la différence se faire, de près, sans coupe.',
    framing: { position: [6.4, 1.15, 5.2], target: [0.2, 0.95, 0], fov: 40, shift: [0.14, 0] },
    ...portrait({ position: [5.9, 1.2, 4.9], target: [0.15, 1.0, 0], fov: 50, shift: [0, 0.08] }),
    pace: { window: [0, 1], ease: 'linear' },
  },
  {
    id: 'verni',
    chapter: 'intervention',
    at: 0.9,
    intent: 'UNITÉ 9 — Toujours le même plan, la ligne est passée : la laque est vernie et le noir est redevenu profond. Aucun texte.',
    framing: { position: [6.4, 1.15, 5.2], target: [0.2, 0.95, 0], fov: 40, shift: [0.14, 0] },
    ...portrait({ position: [5.9, 1.2, 4.9], target: [0.15, 1.0, 0], fov: 50, shift: [0, 0.08] }),
    pace: { window: [0, 1], ease: 'linear' },
  },
  {
    id: 'reflets',
    chapter: 'transformation',
    at: 0.35,
    intent:
      'UNITÉ 7 — LA PREUVE : la laque rend l’univers entier — le ciel de l’unité 1, cette fois dans la carrosserie. Trois quarts avant au ras du sol mouillé, rochers au premier plan.',
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
    intent: 'UNITÉ 11 — Entrer : assis à la place du conducteur, tableau de bord et pare-brise. L’intérieur aussi a été fait.',
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
    intent: 'UNITÉ 12 — Ressortir et prendre un peu de hauteur : le véhicule entier, et la première moitié du métier.',
    framing: { position: [-8.6, 2.0, 9.6], target: [0.4, 1.7, 0], fov: 38, shift: [0.22, 0] },
    ...portrait({ position: [-7.6, 2.1, 9.8], target: [0.3, 1.8, 0], fov: 48, shift: [0, 0.22] }),
    via: { desktop: [[-3.6, 1.6, 7.2]] as Vec3[], tablet: [[-3.2, 1.8, 7]] as Vec3[], mobile: [[-3.2, 1.8, 7]] as Vec3[] },
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    flight: { fov: 4 },
  },
  {
    id: 'prestations-2',
    chapter: 'prestations',
    at: 0.55,
    intent: 'UNITÉ 13 — Tourner autour : trois quarts avant, la carrosserie en fuite, la seconde moitié du métier.',
    framing: { position: [9.8, 1.7, 7.4], target: [0.6, 1.6, 0], fov: 40, shift: [0.2, 0] },
    ...portrait({ position: [8.8, 1.8, 7.6], target: [0.5, 1.7, 0], fov: 50, shift: [0, 0.2] }),
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 5, roll: 0.05 },
  },
  {
    id: 'offre',
    chapter: 'prestations',
    at: 0.85,
    intent: 'UNITÉ 14 — Reculer dans la nuit : le véhicule propre sous la Voie lactée, la place pour la formule et le déplacement.',
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
      'UNITÉ 15 — Le déplacement devient une route : le regard ne quitte pas le cœur de la galaxie, la caméra traverse les nuages, la chaussée se dessine sur le 06 et monte à sa rencontre jusqu’à se poser dans la voie.',
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
    intent: 'UNITÉ 16 — On roule derrière lui : ses feux allumés, « 1 JOUR » peint sous nos roues, la galaxie au bout de la route.',
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
    intent: 'UNITÉ 17 — Cent mètres avalés : on se déporte et on le double. Il entre dans le cadre de trois quarts, sa laque prend la galaxie. Aucun texte.',
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
    intent: 'UNITÉ 18 — Il reprend la tête et s’éloigne : la route converge vers la galaxie, ses feux deviennent deux points rouges.',
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
    intent: 'UNITÉ 19 — Il s’arrête au bord du 06, nous derrière lui : la falaise d’or et la mer de nuit devant — la place pour les tarifs et les conditions.',
    framing: { position: lane(390, -3.3, 1.22), target: chr(398, 1.02), fov: 40, shift: [0.12, 0] },
    ...portrait({ position: lane(388, -3, 1.26), target: chr(398, 1.06), fov: 50, shift: [0, 0.22] }),
    pace: { window: [0.02, 0.96], ease: 'inOut' },
    flight: { fov: 10, shake: 0.5 },
  },
  {
    id: 'agenda',
    chapter: 'rendezvous',
    at: 0.5,
    intent: 'UNITÉ 20 — L’écran du rendez-vous : la caméra s’immobilise au-dessus du bord du 06 et la nuit s’éteint derrière la carte. Le seul écran sans 3D.',
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
    intent: 'UNITÉ 21 — Au bout de la route, au bord du 06 : la mer de nuit et la galaxie devant. La place pour un seul geste.',
    framing: { position: [0, 13, -645], look: [N, -0.035], fov: 54, shift: [0, 0] },
    ...portrait({ position: [0, 17, -642], look: [N, -0.055], fov: 68, shift: [0, 0.16] }),
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 8 },
  },
];
