import type { Framing, ShotDefinition } from '../engine/camera/camera-rig';
import type { Vec3 } from '../engine/math/vec3';
import { WORLD } from './world';

/** Centre de la France dans le monde (world.ts, calculé depuis les contours IGN). */
const FRANCE = WORLD.france.center;

/**
 * Plans caméra de CAR SERVICE 06, en mètres, dans un seul monde à l'échelle (world.ts) que la caméra traverse sans
 * coupe : on EST la caméra. Le voyage est tourné vers le nord, vers le cœur de la Voie lactée (skyYaw constant).
 *
 * Ouverture dans l'univers, au-dessus d'une mer de nuages → plongée par une trouée vers le 06 entier → descente vers la
 * balise → le monolithe (preuve vidéo, scan, passage de l'eau, reflets) → ascension verticale à travers les nuages
 * jusqu'aux étoiles → cap sur le cœur de la galaxie → descente verrouillée : le regard ne quitte jamais le nord, la
 * galaxie reste au même point de l'image, la route rouge monte à la rencontre de la caméra et son point de fuite tombe
 * sous la galaxie → la location, à vive allure → élévation finale.
 *
 * Bureau : texte à gauche (décalage optique vers la droite). Téléphone et tablette : légende en bas (décalage vers le
 * haut), focale plus ouverte. `flight` : l'enveloppe du vol qui mène au plan (focale, roulis, plongée, turbulence),
 * maximale au milieu du trajet.
 */
type Portrait = Partial<Framing>;
const portrait = (framing: Portrait) => ({ tablet: framing, mobile: framing });
const N = WORLD.north;
/** Repos le long de la route : la voie est en x = 0, la route part de z = −300 vers le nord. */
const lane = (z: number) => [0, 1.3, z] as Vec3;

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
    intent: 'Piquer sur la mer, franchir la falaise d’or au ras : devant, un monolithe de lumière sous sa colonne, reflété dans le sol mouillé.',
    framing: { position: [-20, 36, 72], target: [0, 11, 0], fov: 40, shift: [0.12, 0] },
    ...portrait({ position: [-14, 44, 84], target: [0, 16, 0], fov: 54, shift: [0, 0.12] }),
    via: [[-150, 600, 760], [-100, 190, 330]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    lead: 0.12,
    flight: { fov: 12, roll: 0.08, shake: 0.5 },
  },
  {
    id: 'poussiere',
    chapter: 'avant',
    at: 0.88,
    intent: 'Se poser au pied du monolithe, rasant le sol : la vidéo réelle remplit le cadre, la poussière d’un vrai véhicule.',
    framing: { position: [0.6, 4.56, 21.6], target: [0.15, 4.56, 0], fov: 24, shift: [0.15, 0] },
    ...portrait({ position: [0.3, 4.92, 12.6], target: [0.1, 4.8, 0], fov: 40, shift: [0, 0.06] }),
    via: [[-9, 18, 48], [-2, 7, 32]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 8, roll: -0.04 },
  },
  {
    id: 'capot',
    chapter: 'intervention',
    at: 0.15,
    intent: 'Au plus près du capot poussiéreux et de l’optique : le panneau que le scan puis l’eau vont traverser.',
    framing: { position: [0.54, 4.86, 12.9], target: [0, 4.86, 0], fov: 25, shift: [0.13, 0] },
    ...portrait({ position: [0.3, 5.1, 10.4], target: [0, 5, 0], fov: 40, shift: [0, 0.05] }),
    pace: { window: [0.08, 0.95], ease: 'out' },
  },
  {
    id: 'scan',
    chapter: 'intervention',
    at: 0.5,
    intent: 'Le relevé : une ligne d’or descend sur le monolithe et dépasse dans la nuit ; derrière elle, tout le véhicule est relevé. La caméra recule d’un souffle pour le voir entier.',
    framing: { position: [0.3, 4.9, 15.4], target: [0.05, 4.84, 0], fov: 30, shift: [0.13, 0] },
    ...portrait({ position: [0.2, 5.0, 13.6], target: [0.03, 4.9, 0], fov: 42, shift: [0, 0.06] }),
    pace: { window: [0, 1], ease: 'inOut' },
  },
  {
    id: 'passage',
    chapter: 'intervention',
    at: 0.9,
    intent: 'Relevé complet, le nettoyage : la ligne d’eau passe et rend le véhicule propre, en couleurs ; la caméra revient au capot.',
    framing: { position: [-0.84, 5.28, 11.7], target: [0.15, 5.22, 0], fov: 25, shift: [0.13, 0] },
    ...portrait({ position: [-0.55, 5.2, 11.2], target: [0.06, 5.05, 0], fov: 40, shift: [0, 0.05] }),
    pace: { window: [0, 1], ease: 'inOut' },
  },
  {
    id: 'reflets-capot',
    chapter: 'transformation',
    at: 0.45,
    intent: 'Contourner par la gauche en descendant : le monolithe devient un objet dans l’espace, les reflets vivent.',
    framing: { position: [-5.4, 3.15, 13.2], target: [0.45, 4.5, 0], fov: 27, shift: [0.14, 0] },
    ...portrait({ position: [-4.2, 3.9, 12.8], target: [0.3, 4.7, 0], fov: 40, shift: [0, 0.06] }),
    via: { desktop: [[-3, 3.96, 13.8]] as Vec3[], mobile: [[-2.7, 4.35, 16.8]] as Vec3[], tablet: [[-2.7, 4.35, 16.8]] as Vec3[] },
    pace: { window: [0.08, 0.9], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 4, roll: 0.03 },
  },
  {
    id: 'flanc',
    chapter: 'transformation',
    at: 0.95,
    intent: 'Passer au ras du sol mouillé vers la droite : le flanc brillant et son reflet ensemble.',
    framing: { position: [4.8, 1.86, 15], target: [-0.3, 3.45, 0], fov: 28, shift: [0.14, 0] },
    ...portrait({ position: [3.6, 2.6, 13.4], target: [-0.3, 3.8, 0], fov: 40, shift: [0, 0.06] }),
    via: { desktop: [[0.3, 2.1, 16.8]] as Vec3[], mobile: [[0.3, 2.64, 19.2]] as Vec3[], tablet: [[0.3, 2.64, 19.2]] as Vec3[] },
    pace: { window: [0.1, 0.95], ease: 'inOut' },
    flight: { fov: 4, roll: -0.03 },
  },
  {
    id: 'recul',
    chapter: 'prestations',
    at: 0.25,
    intent: 'Reculer et se décaler : le monolithe cède la gauche de l’écran aux prestations.',
    framing: { position: [7.2, 5.7, 24.6], target: [0.9, 4.65, 0], fov: 28, shift: [0.22, 0] },
    ...portrait({ position: [4.2, 7.2, 26.4], target: [0.6, 5.85, 0], fov: 42, shift: [0, 0.22] }),
    pace: { window: [0.1, 0.9], ease: 'inOut' },
    flight: { fov: 3 },
  },
  {
    id: 'trois-quarts',
    chapter: 'prestations',
    at: 0.55,
    intent: 'Tourner autour du monolithe : le véhicule de trois quarts, la deuxième moitié de la liste à gauche.',
    framing: { position: [17.5, 6.6, 16], target: [1.5, 5, 0], fov: 34, shift: [0.2, 0] },
    ...portrait({ position: [12, 8.4, 21], target: [1, 6.2, 0], fov: 46, shift: [0, 0.22] }),
    pace: { window: [0.08, 0.92], ease: 'inOut' },
    lead: 0.1,
    flight: { fov: 5, roll: 0.05 },
  },
  {
    id: 'offre',
    chapter: 'prestations',
    at: 0.85,
    intent: 'Reculer dans la nuit : le monolithe entier sous la Voie lactée, la place pour la formule et le prix.',
    framing: { position: [26, 11, 70], target: [2, 7, 0], fov: 30, shift: [0.24, 0] },
    ...portrait({ position: [12, 14, 72], target: [1, 9, 0], fov: 44, shift: [0, 0.24] }),
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
      'La descente verrouillée : le regard ne quitte pas le cœur de la galaxie ; la caméra traverse les nuages, la route rouge se dessine sur le 06 et monte à sa rencontre, jusqu’à se poser dans la voie — son point de fuite exactement sous la galaxie. Les feux s’allument devant.',
    framing: { position: lane(-300), look: [N, -0.022], fov: 36, shift: [0.1, 0] },
    ...portrait({ position: [0, 1.45, -302], look: [N, -0.03], fov: 52, shift: [0, 0.12] }),
    via: [[0, 1350, 1150], [0, 520, 420], [0, 95, -40], [0, 14, -170], [0, 3, -250]] as Vec3[],
    pace: { window: [0.02, 0.98], ease: 'inOut' },
    flight: { fov: 22, pitch: -0.24, shake: 1 },
  },
  {
    id: 'un-jour',
    chapter: 'location',
    at: 0.15,
    intent: 'Rouler : « 1 JOUR » peint devant, les feux du véhicule plus loin, la galaxie au bout de la route.',
    framing: { position: lane(-331.5), look: [N, -0.017], fov: 36, shift: [0.1, 0] },
    ...portrait({ position: [0, 1.45, -329.5], look: [N, -0.025], fov: 54, shift: [0, 0.12] }),
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 7 },
  },
  {
    id: 'sept-jours',
    chapter: 'location',
    at: 0.42,
    intent: 'Cent mètres plus loin, à vive allure : la durée s’allonge comme la route.',
    framing: { position: lane(-431.5), look: [N, -0.017], fov: 36, shift: [0.1, 0] },
    ...portrait({ position: [0, 1.45, -429.5], look: [N, -0.025], fov: 54, shift: [0, 0.12] }),
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 9, shake: 0.3 },
  },
  {
    id: 'quinze-jours',
    chapter: 'location',
    at: 0.68,
    intent: 'Encore cent mètres : 15 jours, et les conditions de location.',
    framing: { position: lane(-531.5), look: [N, -0.017], fov: 36, shift: [0.1, 0] },
    ...portrait({ position: [0, 1.45, -529.5], look: [N, -0.025], fov: 54, shift: [0, 0.12] }),
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 9, shake: 0.3 },
  },
  {
    id: 'conditions',
    chapter: 'location',
    at: 0.92,
    intent: 'Rouler encore, le regard au bout de la route : la place pour les tarifs et les conditions du flyer.',
    framing: { position: lane(-600), look: [N, -0.015], fov: 38, shift: [0.1, 0] },
    ...portrait({ position: [0, 1.45, -598], look: [N, -0.022], fov: 56, shift: [0, 0.24] }),
    pace: { window: [0.04, 0.96], ease: 'inOut' },
    flight: { fov: 8, shake: 0.25 },
  },
  {
    id: 'horizon',
    chapter: 'contact',
    at: 0.6,
    intent: 'Au bout de la route, au bord du 06 : les feux s’arrêtent au pied de la falaise d’or, la mer de nuit et la galaxie devant. La place pour un seul geste.',
    framing: { position: [0, 13, -645], look: [N, -0.035], fov: 54, shift: [0, 0] },
    ...portrait({ position: [0, 17, -642], look: [N, -0.055], fov: 68, shift: [0, 0.16] }),
    pace: { window: [0.06, 0.94], ease: 'inOut' },
    flight: { fov: 8 },
  },
];
