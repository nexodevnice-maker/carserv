import type { Framing, ShotDefinition } from '../engine/camera/camera-rig';
import type { Vec3 } from '../engine/math/vec3';
import { ROAD } from '../scenes/road/road-layer';
import { WORLD } from './world';

/** Centre de la France dans le monde (world.ts, calculé depuis les contours IGN). */
const FRANCE = WORLD.france.center;

/**
 * Plans caméra de CAR SERVICE 06, en mètres, dans un seul monde à l'échelle (world.ts) que la caméra traverse sans
 * coupe : on EST la caméra. Le voyage est tourné vers le nord, vers le cœur de la Voie lactée (skyYaw constant).
 *
 * Univers au-dessus d'une mer de nuages → la France entière → descente sur le 06 → la balise → le véhicule 3D fourni,
 * sali, parcouru par la ligne de lumière, verni, puis son habitacle → prestations → ascension verticale jusqu'aux
 * étoiles → cap au nord → descente verrouillée sur la route → la location : le C-HR devant nous, qu'on rattrape, qu'on
 * double au ras, qui s'éloigne vers la galaxie, qui s'arrête au bord du 06 → rendez-vous → un seul geste.
 *
 * Profondeur (au téléphone surtout) : aucun sujet plat au centre du cadre. Les plans sont bas et de trois quarts, la
 * carrosserie fuit en diagonale, il y a toujours du proche (le sol mouillé, une aile, le marquage sous nos roues) et du
 * lointain (les falaises, la route qui converge, la galaxie).
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

export const shots: readonly ShotDefinition[] = [
  {
    id: 'univers',
    chapter: 'arrivee',
    at: 0,
    intent: 'Tout : dans l’univers, au-dessus d’une mer de nuages, face au cœur de la Voie lactée. Rien d’autre n’existe encore.',
    framing: { position: [0, 2400, 2800], look: [N, 0.13], fov: 62, shift: [0.08, 0] },
    ...portrait({ look: [N, 0.2], fov: 78, shift: [0, -0.04] }),
  },
  {
    id: 'france',
    chapter: 'zone',
    at: 0.45,
    intent:
      'Quitter l’atmosphère : le regard bascule vers le sol et la France entière apparaît, département par département, posée sur la mer de nuit — un seul point est allumé, une colonne de lumière dans les Alpes-Maritimes.',
    framing: { position: [FRANCE[0] + 200, 13500, FRANCE[1] + 4000], target: [FRANCE[0] + 300, 0, FRANCE[1] - 800], fov: 52, shift: [0.14, 0] },
    ...portrait({ position: [FRANCE[0] + 600, 12600, FRANCE[1] + 7200], target: [FRANCE[0] + 1100, 0, FRANCE[1] - 900], fov: 78, shift: [0, 0.14] }),
    via: { desktop: [[-1200, 7000, 3400]] as Vec3[], tablet: [[-1400, 7600, 4400]] as Vec3[], mobile: [[-1400, 7600, 4400]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.2,
    flight: { fov: 10, roll: 0.1 },
  },
  {
    id: 'territoire',
    chapter: 'zone',
    at: 0.88,
    intent: 'La descente : les départements voisins s’effacent, le 06 s’allume de la côte aux montagnes, la balise au milieu.',
    framing: { position: [-160, 1150, 900], target: [60, 0, -380], fov: 46, shift: [0.2, 0] },
    ...portrait({ position: [70, 1900, 620], target: [100, 0, -330], fov: 62, shift: [0, 0.26] }),
    via: { desktop: [[-1600, 3000, 2000]] as Vec3[], tablet: [[-2400, 6000, 3800]] as Vec3[], mobile: [[-2400, 6000, 3800]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 10, roll: -0.1, shake: 0.8 },
  },
  {
    id: 'balise',
    chapter: 'avant',
    at: 0.42,
    intent:
      'Piquer sur la mer, franchir la falaise d’or au ras : au pied de la colonne de lumière, un véhicule attend, seul sur le sol mouillé, et son reflet avec lui.',
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
    at: 0.86,
    intent: 'Se poser au ras du sol : l’aile arrière et la roue en gros plan, la poussière mate sur la laque, le flanc qui fuit vers l’avant.',
    framing: { position: [-4.6, 0.68, 3.4], target: [-1.1, 0.72, 0.35], fov: 36, shift: [0.14, 0] },
    ...portrait({ position: [-4.2, 0.72, 3.1], target: [-1.2, 0.76, 0.4], fov: 46, shift: [0, 0.06] }),
    via: [[-16, 4.2, 15], [-8.4, 1.7, 8]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 8, roll: -0.04 },
  },
  {
    id: 'capot',
    chapter: 'intervention',
    at: 0.18,
    intent: 'Devant le capot poussiéreux, à hauteur d’optique : ce que la ligne de lumière va traverser, de l’avant vers l’arrière.',
    framing: { position: [4.6, 0.78, 2.5], target: [1.6, 0.78, 0.2], fov: 36, shift: [0.13, 0] },
    ...portrait({ position: [4.3, 0.8, 2.3], target: [1.5, 0.8, 0.25], fov: 46, shift: [0, 0.05] }),
    via: { desktop: [[1.2, 0.8, 5.4]] as Vec3[], tablet: [[1, 0.86, 4.8]] as Vec3[], mobile: [[1, 0.86, 4.8]] as Vec3[] },
    pace: { window: [0.08, 0.95], ease: 'out' },
    flight: { fov: 6, roll: 0.05 },
  },
  {
    id: 'scan',
    chapter: 'intervention',
    at: 0.55,
    intent: 'Le relevé : une ligne d’or traverse le véhicule ; derrière elle la poussière a disparu. La caméra recule d’un souffle pour le voir entier.',
    framing: { position: [-8.6, 2.2, 9.8], target: [0, 1.0, 0], fov: 40, shift: [0.16, 0] },
    ...portrait({ position: [-7.8, 2.5, 9.6], target: [0, 1.05, 0], fov: 54, shift: [0, 0.08] }),
    pace: { window: [0, 1], ease: 'inOut' },
    flight: { fov: 5 },
  },
  {
    id: 'verni',
    chapter: 'intervention',
    at: 0.9,
    intent: 'Fin du passage : la laque est vernie et l’univers revient dedans. Plan rasant le long du flanc, la galaxie au-dessus.',
    framing: { position: [-1.8, 0.6, 6.2], target: [1.6, 0.9, -0.2], fov: 34, shift: [0.13, 0] },
    ...portrait({ position: [-1.6, 0.68, 5.6], target: [1.4, 0.95, -0.2], fov: 46, shift: [0, 0.07] }),
    pace: { window: [0, 1], ease: 'inOut' },
    flight: { fov: 6, roll: -0.03 },
  },
  {
    id: 'reflets',
    chapter: 'transformation',
    at: 0.35,
    intent: 'Trois quarts avant, au ras du sol mouillé : les reflets sont revenus sur le capot, la Voie lactée s’y lit.',
    framing: { position: [10.6, 0.78, 7.8], target: [0.5, 1.0, 0], fov: 36, shift: [0.14, 0] },
    ...portrait({ position: [9.8, 0.88, 7.4], target: [0.4, 1.05, 0], fov: 48, shift: [0, 0.1] }),
    via: { desktop: [[3.2, 0.6, 6.5]] as Vec3[], tablet: [[2.7, 0.64, 6.1]] as Vec3[], mobile: [[2.7, 0.64, 6.1]] as Vec3[] },
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 6, roll: 0.04 },
  },
  {
    id: 'habitacle',
    chapter: 'transformation',
    at: 0.85,
    intent: 'Entrer : assis à la place du conducteur, le tableau de bord et les sièges nets — le nettoyage intérieur, vu de l’intérieur.',
    framing: { position: [-0.3, 1.02, -0.36], target: [2.4, 0.74, 0.2], fov: 58, shift: [0.06, 0] },
    ...portrait({ position: [-0.32, 1.04, -0.34], target: [2.2, 0.72, 0.24], fov: 70, shift: [0, 0.04] }),
    via: { desktop: [[2.4, 1.4, 2.1]] as Vec3[], tablet: [[2.2, 1.4, 1.9]] as Vec3[], mobile: [[2.2, 1.4, 1.9]] as Vec3[] },
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 8 },
  },
  {
    id: 'recul',
    chapter: 'prestations',
    at: 0.25,
    intent: 'Ressortir et prendre un peu de hauteur : le véhicule propre entier, la place aux prestations.',
    framing: { position: [-8.6, 2.9, 9.6], target: [0.4, 1.1, 0], fov: 38, shift: [0.22, 0] },
    ...portrait({ position: [-7.4, 3.3, 10], target: [0.3, 1.2, 0], fov: 48, shift: [0, 0.22] }),
    via: { desktop: [[-3.6, 1.6, 7.2]] as Vec3[], tablet: [[-3.2, 1.8, 7]] as Vec3[], mobile: [[-3.2, 1.8, 7]] as Vec3[] },
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    flight: { fov: 4 },
  },
  {
    id: 'trois-quarts',
    chapter: 'prestations',
    at: 0.55,
    intent: 'Tourner autour : trois quarts avant, la carrosserie en fuite, la suite de la liste à gauche.',
    framing: { position: [9.8, 2.2, 7.4], target: [0.6, 1.1, 0], fov: 40, shift: [0.2, 0] },
    ...portrait({ position: [8.6, 2.5, 7.8], target: [0.5, 1.2, 0], fov: 50, shift: [0, 0.2] }),
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 5, roll: 0.05 },
  },
  {
    id: 'offre',
    chapter: 'prestations',
    at: 0.85,
    intent: 'Reculer dans la nuit : le véhicule propre sous la Voie lactée, la place pour la formule et le déplacement.',
    framing: { position: [-16, 5.4, 22], target: [1, 1.4, 0], fov: 34, shift: [0.24, 0] },
    ...portrait({ position: [-12, 6.4, 20], target: [0.8, 1.6, 0], fov: 44, shift: [0, 0.24] }),
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    flight: { fov: 6, roll: 0.04 },
  },
  {
    id: 'ascension',
    chapter: 'univers',
    at: 0.42,
    intent: 'L’ascension : le regard se lève, la caméra monte à la verticale, traverse les bancs bas puis la mer de nuages, jusqu’aux étoiles.',
    framing: { position: [0, 2050, 2500], look: [N, 0.8], fov: 70, shift: [0, 0] },
    ...portrait({ look: [N, 0.62], fov: 80 }),
    via: [[18, 160, 220], [8, 900, 1100]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 18, shake: 1.2 },
  },
  {
    id: 'cap',
    chapter: 'univers',
    at: 0.85,
    intent: 'Cap au nord au-dessus de la mer de nuages : le regard redescend des étoiles vers le cœur de la galaxie, droit devant.',
    framing: { position: [0, 1980, 1900], look: [N, 0.12], fov: 60, shift: [0, 0] },
    ...portrait({ look: [N, 0.18], fov: 76 }),
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 10 },
  },
  {
    id: 'route',
    chapter: 'bascule',
    at: 0.9,
    intent:
      'La descente verrouillée : le regard ne quitte pas le cœur de la galaxie ; la caméra traverse les nuages, la route rouge se dessine sur le 06 et monte à sa rencontre, jusqu’à se poser dans la voie — et le véhicule de location roule déjà devant nous.',
    framing: { position: lane(60), look: [N, -0.022], fov: 36, shift: [0.1, 0] },
    ...portrait({ position: lane(58, 0, 1.42), look: [N, -0.03], fov: 52, shift: [0, 0.12] }),
    via: [[0, 1350, 1150], [0, 520, 420], [0, 95, -40], [0, 14, -170], [0, 3, -250]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 22, pitch: -0.24, shake: 1 },
  },
  {
    id: 'un-jour',
    chapter: 'location',
    at: 0.18,
    intent: 'On roule derrière lui : le C-HR passe sur « 1 JOUR » peint dans la chaussée, ses feux allumés, la galaxie au bout de la route.',
    framing: { position: lane(78, 1.9), target: chr(104, 1.05), fov: 38, shift: [0.12, 0] },
    ...portrait({ position: lane(76, 1.8, 1.34), target: chr(104, 1.1), fov: 48, shift: [0, 0.12] }),
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 8, shake: 0.4 },
  },
  {
    id: 'sept-jours',
    chapter: 'location',
    at: 0.44,
    intent: 'Cent mètres avalés, on se déporte et on le double : il passe à portée de main, trois quarts arrière, la laque prend la galaxie.',
    framing: { position: lane(176, -3.8, 1.14), target: chr(184, 0.95), fov: 44, shift: [0.1, 0] },
    ...portrait({ position: lane(174, -3.4, 1.18), target: chr(184, 1.0), fov: 56, shift: [0, 0.08] }),
    via: { desktop: [[-2.2, 1.3, WORLD.road.origin[1] - 130]] as Vec3[], tablet: [[-2, 1.34, WORLD.road.origin[1] - 128]] as Vec3[], mobile: [[-2, 1.34, WORLD.road.origin[1] - 128]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.14,
    flight: { fov: 14, roll: 0.05, shake: 0.9 },
  },
  {
    id: 'quinze-jours',
    chapter: 'location',
    at: 0.7,
    intent: 'Il reprend la tête et s’éloigne : la route converge vers la galaxie, ses feux deviennent deux points rouges au loin.',
    framing: { position: lane(296, 0.8), target: chr(345, 1.25), fov: 36, shift: [0.1, 0] },
    ...portrait({ position: lane(294, 0.7, 1.32), target: chr(345, 1.3), fov: 48, shift: [0, 0.12] }),
    via: { desktop: [[-1.6, 1.22, WORLD.road.origin[1] - 240]] as Vec3[], tablet: [[-1.4, 1.26, WORLD.road.origin[1] - 238]] as Vec3[], mobile: [[-1.4, 1.26, WORLD.road.origin[1] - 238]] as Vec3[] },
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 12, shake: 0.8 },
  },
  {
    id: 'conditions',
    chapter: 'location',
    at: 0.93,
    intent: 'Il s’arrête au bord du 06, nous derrière lui : trois quarts arrière, la falaise d’or et la mer de nuit devant — la place pour les tarifs et les conditions.',
    framing: { position: lane(390, -3.3, 1.22), target: chr(398, 1.02), fov: 40, shift: [0.12, 0] },
    ...portrait({ position: lane(388, -3, 1.26), target: chr(398, 1.06), fov: 50, shift: [0, 0.22] }),
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 10, shake: 0.5 },
  },
  {
    id: 'agenda',
    chapter: 'rendezvous',
    at: 0.5,
    intent: 'L’écran du rendez-vous : la caméra s’immobilise au-dessus du bord du 06, la nuit passe derrière le calendrier.',
    framing: { position: [0, 30, WORLD.road.origin[1] - ROAD.length + 15], look: [N, -0.07], fov: 48, shift: [0, 0] },
    ...portrait({ position: [0, 36, WORLD.road.origin[1] - ROAD.length + 20], look: [N, -0.09], fov: 62, shift: [0, 0] }),
    via: { desktop: [[-1.6, 8, WORLD.road.origin[1] - ROAD.length + 4]] as Vec3[], tablet: [[-1.4, 9, WORLD.road.origin[1] - ROAD.length + 6]] as Vec3[], mobile: [[-1.4, 9, WORLD.road.origin[1] - ROAD.length + 6]] as Vec3[] },
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 8 },
  },
  {
    id: 'horizon',
    chapter: 'contact',
    at: 0.6,
    intent: 'Au bout de la route, au bord du 06 : la mer de nuit et la galaxie devant. La place pour un seul geste.',
    framing: { position: [0, 13, -645], look: [N, -0.035], fov: 54, shift: [0, 0] },
    ...portrait({ position: [0, 17, -642], look: [N, -0.055], fov: 68, shift: [0, 0.16] }),
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 8 },
  },
];
