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
    // Cadrage RELEVÉ, pas deviné (scripts/qa-frame.mjs) : d'ici, le cœur de la galaxie occupe le haut du cadre, les
    // étoiles se détachent une à une, et le tiers bas reste un ciel noir — c'est là que le titre se lit.
    framing: { position: [2050, 9400, 3900], target: [-180, 10190, -3850], fov: 56, shift: [0.08, 0] },
    ...portrait({ position: [1810, 9560, 3460], target: [-180, 10190, -3850], fov: 63, shift: [0, 0.10] }),
    pace: { window: [0, 1], ease: 'inOut' },
  },
  {
    id: 'montee',
    chapter: 'galaxie',
    at: 0.34,
    intent:
      'UNITÉ 2 — ON MONTE. La caméra s’élève au-dessus du disque : la galaxie bascule sous nous et on la voit ENFIN pour ce qu’elle est — un plan d’étoiles, pas un fond. Aucun texte.',
    framing: { position: [2400, 16800, 4800], target: [200, 12600, -2400], fov: 58, shift: [0.06, 0] },
    ...portrait({ position: [2600, 17600, 5200], target: [200, 12400, -2600], fov: 70, shift: [0, 0.06] }),
    via: { desktop: [[2100, 12400, 4200]] as Vec3[], tablet: [[2200, 12800, 4400]] as Vec3[], mobile: [[2200, 12800, 4400]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 10, roll: 0.05, shake: 0.4 },
  },
  {
    id: 'traversee',
    chapter: 'galaxie',
    at: 0.76,
    intent:
      'UNITÉ 2 — On traverse : la caméra entre dans le bras, les étoiles défilent de part et d’autre, le cœur grandit. C’est ici qu’on comprend que ce ciel a une profondeur. Aucun texte.',
    framing: { position: [800, 13100, -600], target: [-600, 11700, -7800], fov: 72, shift: [0.06, 0] },
    ...portrait({ position: [900, 13300, -800], target: [-600, 11600, -8000], fov: 84, shift: [0, 0.04] }),
    // Le point de passage plonge DANS le disque : c'est en le traversant que la parallaxe se voit.
    via: { desktop: [[1900, 15400, 3000]] as Vec3[], tablet: [[2000, 15800, 3200]] as Vec3[], mobile: [[2000, 15800, 3200]] as Vec3[] },
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
    // On regarde LE 06 et la colonne de la balise, pas l'ancien emplacement de la ville : ces deux plans visaient
    // encore [-1180, -1080], où il n'y a plus rien depuis que la ville est sortie du récit — d'où l'écran noir.
    framing: { position: [560, 880, 980], target: [20, 90, 40], fov: 62, shift: [0, 0] },
    ...portrait({ position: [620, 960, 1080], target: [20, 110, 40], fov: 76 }),
    via: [[900, 7200, 2600], [760, 2600, 1700]] as Vec3[],
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
    framing: { position: [78, 36, 62], target: [2, 6, 0], fov: 46, shift: [0.12, 0] },
    ...portrait({ position: [88, 40, 70], target: [2, 7, 0], fov: 58, shift: [0, 0.14] }),
    via: [[200, 300, 260]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 18, roll: -0.06, shake: 0.8 },
  },
  {
    id: 'place',
    chapter: 'arrivee',
    at: 0.14,
    intent:
      'UNITÉ 5 — Se poser SUR LA PLACE : l’enrobé mouillé qui renvoie les candélabres, les places peintes, le mur — et le véhicule garé entre deux lignes. On voit la voiture ENTIÈRE, tout de suite.',
    framing: { position: [12.6, 3.0, 9.4], target: [0.2, 1.1, 0], fov: 46, shift: [0.16, 0] },
    ...portrait({ position: [13.4, 3.2, 10.0], target: [0.2, 1.15, 0], fov: 56, shift: [0, 0.16] }),
    via: [[60, 40, 60], [30, 12, 24]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 14, roll: 0.06, shake: 0.6 },
  },
  // — L'INSPECTION. On fait le tour de ce qu'on va nettoyer, une pièce par défilement, dans l'ordre où un
  // professionnel regarde un véhicule : la face, puis une portière, puis une roue. Puis on revient devant, à
  // HAUTEUR DE PHARE — ni collé à la tôle, ni à dix mètres : la distance d'où l'on juge une voiture.
  {
    id: 'devant',
    chapter: 'arrivee',
    at: 0.34,
    intent: 'UNITÉ 6 — LE DEVANT : calandre, boucliers, optiques éteintes. Trois quarts avant, à hauteur de capot.',
    framing: { position: [7.4, 1.12, 3.6], target: [1.9, 0.78, 0], fov: 42, shift: [0.14, 0] },
    ...portrait({ position: [7.8, 1.15, 3.8], target: [1.9, 0.8, 0], fov: 52, shift: [0, 0.1] }),
    via: [[10.4, 2.0, 6.6]] as Vec3[],
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 6 },
  },
  {
    id: 'portiere',
    chapter: 'arrivee',
    at: 0.54,
    intent: 'UNITÉ 7 — LA PORTIÈRE : la poignée, le joint, le bas de caisse. C’est le « passage de portes » de la grille.',
    framing: { position: [0.9, 1.12, 4.6], target: [0.2, 0.86, 0.5], fov: 38, shift: [0.14, 0] },
    ...portrait({ position: [1.0, 1.15, 5.0], target: [0.2, 0.88, 0.5], fov: 48, shift: [0, 0.08] }),
    via: [[4.6, 1.2, 5.4]] as Vec3[],
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 5, roll: 0.02 },
  },
  {
    id: 'roue',
    chapter: 'arrivee',
    at: 0.74,
    intent: 'UNITÉ 8 — LA ROUE : jante, étrier, passage de roue. Au ras du sol, là où la poussière se voit le mieux.',
    framing: { position: [3.0, 0.6, 3.3], target: [1.5, 0.4, 0.82], fov: 36, shift: [0.14, 0] },
    ...portrait({ position: [3.2, 0.62, 3.5], target: [1.52, 0.42, 0.84], fov: 44, shift: [0, 0.04] }),
    via: [[2.0, 0.8, 4.8]] as Vec3[],
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 5 },
  },
  {
    id: 'avant',
    chapter: 'arrivee',
    at: 0.94,
    intent:
      'UNITÉ 9 — RETOUR DEVANT, À HAUTEUR DE PHARE. Ni trop près ni trop loin : la face entière du véhicule, et la laque éteinte par la poussière. C’est l’état dans lequel on le prend.',
    framing: { position: [7.9, 0.76, 1.5], target: [2.2, 0.72, 0], fov: 40, shift: [0.14, 0] },
    ...portrait({ position: [8.3, 0.78, 1.6], target: [2.2, 0.72, 0], fov: 50, shift: [0, 0.06] }),
    via: [[6.2, 0.7, 3.2]] as Vec3[],
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 5 },
  },
  // — LE RELEVÉ. La caméra se pose à douze mètres, LA VOITURE ENTIÈRE dans le cadre, et NE BOUGE PLUS : c'est la
  // matière qui change devant elle. Les trois repos partagent le cadrage au centimètre près — sans quoi on ne
  // comparerait pas deux états du même objet, mais deux plans différents.
  {
    id: 'capot',
    chapter: 'intervention',
    at: 0.18,
    intent: 'UNITÉ 10 — LE PLAN FIXE, la voiture entière : elle est sale, elle ne renvoie rien. La caméra ne bougera plus.',
    framing: { position: [10.2, 1.45, 7.8], target: [0.1, 0.95, 0], fov: 44, shift: [0.14, 0] },
    ...portrait({ position: [10.8, 1.5, 8.2], target: [0.1, 0.95, 0], fov: 54, shift: [0, 0.1] }),
    via: [[9.6, 1.1, 4.4]] as Vec3[],
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 6 },
  },
  {
    id: 'scan',
    chapter: 'intervention',
    at: 0.56,
    intent:
      'UNITÉ 11 — EXACTEMENT LE MÊME PLAN, au centimètre. La ligne d’or traverse la caisse de l’avant vers l’arrière et, derrière elle, la poussière n’est plus là. On voit la différence se faire sur TOUTE la voiture, sans coupe.',
    framing: { position: [10.2, 1.45, 7.8], target: [0.1, 0.95, 0], fov: 44, shift: [0.14, 0] },
    ...portrait({ position: [10.8, 1.5, 8.2], target: [0.1, 0.95, 0], fov: 54, shift: [0, 0.1] }),
    pace: { window: [0, 1], ease: 'linear' },
  },
  {
    id: 'verni',
    chapter: 'intervention',
    at: 0.9,
    intent: 'UNITÉ 12 — Toujours le même plan, la ligne est passée : la laque est vernie, le noir est profond, les optiques s’allument.',
    framing: { position: [10.2, 1.45, 7.8], target: [0.1, 0.95, 0], fov: 44, shift: [0.14, 0] },
    ...portrait({ position: [10.8, 1.5, 8.2], target: [0.1, 0.95, 0], fov: 54, shift: [0, 0.1] }),
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
    // DU CÔTÉ OUVERT DE LA PLACE. Ce plan reculait en x = -7,6, soit DERRIÈRE le mur d'enceinte (x = -5,2) : on
    // traversait le béton et on se retrouvait dans le noir pendant tout un défilement.
    framing: { position: [11.2, 2.2, 8.4], target: [0.4, 1.7, 0], fov: 38, shift: [0.22, 0] },
    ...portrait({ position: [12.0, 2.3, 9.2], target: [0.3, 1.8, 0], fov: 48, shift: [0, 0.22] }),
    via: { desktop: [[5.4, 1.7, 7.6]] as Vec3[], tablet: [[5.2, 1.8, 7.8]] as Vec3[], mobile: [[5.2, 1.8, 7.8]] as Vec3[] },
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
  // — LA GRILLE : quatre plans qui font le tour du véhicule propre, un par formule. La caméra monte en même temps
  // que la gamme : au ras du sol sur la formule la plus simple, au-dessus de l'épaule sur la plus complète.
  {
    id: 'tarif-basic',
    chapter: 'tarifs',
    at: 0.12,
    intent: 'PACK BASIC — trois quarts avant, à hauteur de phare : la voiture entière, propre, et rien d’autre.',
    framing: { position: [7.4, 1.05, 5.6], target: [0.2, 0.85, 0], fov: 42, shift: [0.16, 0] },
    ...portrait({ position: [8.2, 1.1, 6.2], target: [0.2, 0.9, 0], fov: 52, shift: [0, 0.2] }),
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 5 },
  },
  {
    id: 'tarif-standard',
    chapter: 'tarifs',
    at: 0.37,
    intent: 'PACK STANDARD — le flanc, la portière conducteur : c’est l’habitacle qu’on achète ici.',
    framing: { position: [1.2, 1.25, 8.4], target: [0.1, 0.95, 0], fov: 42, shift: [0.16, 0] },
    ...portrait({ position: [1.4, 1.3, 9.0], target: [0.1, 1.0, 0], fov: 52, shift: [0, 0.2] }),
    // Point de passage OBLIGATOIRE : sans lui, la courbe de la caméra coupe au plus court d'un plan à l'autre et
    // TRAVERSE la carrosserie. Le tour d'une voiture est un arc, jamais une corde.
    via: [[5.6, 1.2, 8.2]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 6, roll: 0.03 },
  },
  {
    id: 'tarif-full',
    chapter: 'tarifs',
    at: 0.62,
    intent: 'PACK FULL INTÉRIEUR — trois quarts arrière, portes et coffre dans le cadre : tout l’intérieur.',
    // Jamais au-delà de x = -4,6 : le mur d'enceinte est à -5,2, la caméra passerait à travers le béton.
    framing: { position: [-3.4, 1.5, 7.8], target: [-0.2, 1.0, 0], fov: 42, shift: [0.16, 0] },
    ...portrait({ position: [-3.8, 1.55, 8.6], target: [-0.2, 1.05, 0], fov: 52, shift: [0, 0.2] }),
    via: [[-1.2, 1.4, 9.4]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 6, roll: -0.03 },
  },
  {
    id: 'tarif-concession',
    chapter: 'tarifs',
    at: 0.88,
    intent: 'PACK CONCESSION — plan haut, la voiture entière et son reflet sur l’enrobé : l’état de sortie de concession.',
    framing: { position: [5.6, 3.9, -8.2], target: [0, 0.9, 0], fov: 40, shift: [0.16, 0] },
    ...portrait({ position: [6.2, 4.2, -9.0], target: [0, 0.95, 0], fov: 50, shift: [0, 0.18] }),
    // Le dernier quart passe DEVANT la voiture, côté allée : jamais derrière elle, où se trouve le mur.
    via: [[-1.0, 2.6, 10.6], [5.2, 3.6, 4.2]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 6, pitch: 0.04 },
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
