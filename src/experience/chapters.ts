import type { ExperienceDefinition } from '../engine/experience';
import type { Responsive } from '../engine/responsive/formats';
import { shots } from './shots';
import { WORLD } from './world';

/**
 * Registre des chapitres de CAR SERVICE 06 : la narration comme donnée. La page et le moteur lisent la même liste.
 *
 * UN SCROLL = UNE UNITÉ CINÉMATOGRAPHIQUE (docs/MOBILE_CINEMATIC_GRAMMAR.md) : un repos = une unité = un plan, qui
 * raconte UNE chose et prépare la suivante. Ce ne sont pas des sections : c'est une chaîne de transformations.
 *
 * L'UNIVERS FOURNI EST LE HÉROS. Le site ouvre dedans, face au cœur de la Voie lactée, au-dessus d'une mer de nuages.
 * Puis on tombe dedans : les nuages s'ouvrent, les montagnes prennent du volume (scenes/relief : de vraies crêtes, pas
 * une image), le pays apparaît, le 06 s'allume, et on se pose au pied de la balise devant le véhicule.
 *
 * UNIVERS → NUAGES → MONTAGNES → PAYS → 06 → LE VÉHICULE, SALE → LA LUMIÈRE LE TRAVERSE → LA LAQUE REND LE CIEL →
 * L'HABITACLE → LE MÉTIER → LA ROUTE → LE C-HR → LE PRIX → LE RENDEZ-VOUS.
 */
export type Universe = 'cleaning' | 'territory' | 'bridge' | 'rental' | 'action';

export interface PanelWindow {
  id: string;
  /** Position locale où la légende commence à apparaître (−1 : visible dès le départ). */
  in: number;
  /** Position locale où elle a disparu (2 : jusqu'au bout). */
  out: number;
}

export interface Chapter {
  id: string;
  universe: Universe;
  /** Longueur de scroll en centièmes de hauteur de vue, par format. Le contraste des durées EST le rythme. */
  span: Responsive<number>;
  rests: readonly number[];
  panels: readonly PanelWindow[];
  intent: string;
}

export const chapters: readonly Chapter[] = [
  {
    id: 'galaxie',
    universe: 'territory',
    span: { desktop: 240, mobile: 250 },
    rests: [0, 0.5],
    panels: [{ id: 'marque', in: -1, out: 0.32 }],
    intent:
      'LE HÉROS : on est DANS la galaxie fournie — un vrai volume de 50 000 étoiles. On avance vers le cœur, les étoiles proches défilent, les lointaines tiennent : la distance existe.',
  },
  {
    id: 'descente',
    universe: 'bridge',
    span: { desktop: 220, mobile: 230 },
    rests: [0.5],
    panels: [],
    intent: 'Le regard bascule : sous la galaxie, une lueur. Ce n’est pas une étoile — c’est une ville. Aucun texte.',
  },
  {
    id: 'ville',
    universe: 'territory',
    span: { desktop: 240, mobile: 250 },
    rests: [0.45],
    panels: [{ id: 'ville', in: 0.18, out: 0.985 }],
    intent: 'La ville de nuit, ses tours allumées, et la galaxie encore au-dessus. On descend entre les immeubles.',
  },
  {
    id: 'arrivee',
    universe: 'cleaning',
    span: { desktop: 280, mobile: 300 },
    rests: [0.45, 0.9],
    panels: [
      { id: 'deplacement', in: 0.18, out: 0.62 },
      { id: 'avant', in: 0.66, out: 0.985 },
    ],
    intent:
      'Se poser SUR LA PLACE : une aire de stationnement de nuit, mouillée, éclairée par ses candélabres — et le véhicule garé entre deux lignes. Puis au ras du sol : sa laque ne renvoie plus rien.',
  },
  {
    id: 'intervention',
    universe: 'cleaning',
    span: { desktop: 300, mobile: 310 },
    rests: [0.18, 0.56, 0.9],
    panels: [
      { id: 'lavage', in: 0.04, out: 0.7 },
      { id: 'meme', in: 0.76, out: 0.985 },
    ],
    intent: 'Une ligne de lumière traverse la caisse de l’avant vers l’arrière : derrière elle, la poussière n’est plus là et la laque est vernie.',
  },
  {
    id: 'transformation',
    universe: 'cleaning',
    span: { desktop: 250, mobile: 260 },
    rests: [0.35, 0.85],
    panels: [
      { id: 'apres', in: 0.08, out: 0.62 },
      { id: 'interieur', in: 0.68, out: 0.985 },
    ],
    intent: 'La preuve : la laque rend l’univers entier — le même ciel qu’à l’ouverture, cette fois dans la carrosserie. Puis l’habitacle, vu de l’intérieur.',
  },
  {
    id: 'prestations',
    universe: 'cleaning',
    span: { desktop: 260, mobile: 280 },
    rests: [0.25, 0.55, 0.85],
    panels: [
      { id: 'interieur-exterieur', in: 0.02, out: 0.4 },
      { id: 'finition-produits', in: 0.44, out: 0.7 },
      { id: 'offre', in: 0.74, out: 0.985 },
    ],
    intent: 'Le tour du véhicule propre : tout ce que fait l’entreprise, puis la formule et le déplacement.',
  },
  {
    id: 'bascule',
    universe: 'bridge',
    span: { desktop: 220, mobile: 220 },
    rests: [0.9],
    panels: [{ id: 'autre-route', in: 0.72, out: 0.985 }],
    intent: 'Le déplacement devient une route : chute verrouillée sur la galaxie, la chaussée monte à la rencontre de la caméra.',
  },
  {
    id: 'location',
    universe: 'rental',
    span: { desktop: 440, mobile: 460 },
    rests: [0.18, 0.44, 0.7, 0.93],
    panels: [
      { id: 'jour', in: 0.03, out: 0.3 },
      { id: 'semaine', in: 0.34, out: 0.56 },
      { id: 'quinzaine', in: 0.6, out: 0.8 },
      { id: 'conditions', in: 0.84, out: 0.995 },
    ],
    intent: 'Un véhicule roule devant nous : on le rattrape, on le double au ras, il s’éloigne vers la galaxie, il s’arrête au bord du 06.',
  },
  {
    id: 'rendezvous',
    universe: 'action',
    span: { desktop: 240, mobile: 280 },
    rests: [0.5],
    panels: [{ id: 'agenda', in: 0.08, out: 0.985 }],
    intent: 'Le seul écran sans 3D : la nuit s’éteint, un calendrier prend l’écran, la demande part par courriel.',
  },
  {
    id: 'contact',
    universe: 'action',
    span: { desktop: 160, mobile: 170 },
    rests: [0.6],
    panels: [{ id: 'action', in: 0.3, out: 2 }],
    intent: 'Le bord du territoire, la galaxie devant : un seul geste, vers le seul canal confirmé.',
  },
];

// — Canaux : tout ce que les scènes lisent, en fonction de la progression.
const linear = { window: [0, 1], ease: 'linear' } as const;
const smooth = { window: [0, 1], ease: 'inOut' } as const;

export const definition: ExperienceDefinition = {
  chapters: chapters.map(({ id, rests }) => ({ id, rests })),
  shots,
  channels: {
    // — Le relief en volume (crêtes et rochers). Éteint là-haut, où il n'y a rien sous nos pieds ; absent pendant que
    // la France occupe le monde (même échelle, il la traverserait) ; entier dès qu'on descend sur le 06.
    relief: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'galaxie', at: 0.5, value: 0.25, pace: smooth },
      { chapter: 'ville', at: 0.2, value: 0.75, pace: smooth },

      { chapter: 'arrivee', at: 0.45, value: 1, pace: smooth },
    ],
    // — L'UNIVERS : le nuage de points fourni. Il ouvre le site, on le traverse, puis il reste au-dessus de nous —
    // c'est le même ciel, vu d'en dessous, une fois arrivé en ville.
    galaxy: [
      { chapter: 'galaxie', at: 0, value: 1 },
      { chapter: 'ville', at: 0.45, value: 0.75, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0.5, pace: smooth },
      { chapter: 'contact', at: 0.6, value: 0.5 },
    ],
    // Une galaxie n'est jamais figée : elle tourne, très lentement, pendant tout le récit.
    galaxySpin: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'contact', at: 1, value: 0.55, pace: linear },
    ],
    // — LE MONDE D'EN BAS : il n'existe pas tant qu'on est dans l'espace (ni sol, ni horizon, ni collines).
    world: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'galaxie', at: 0.5, value: 0 },
      { chapter: 'descente', at: 0.5, value: 0.35, pace: smooth },
      { chapter: 'ville', at: 0.45, value: 1, pace: smooth },
    ],
    // — La place : elle apparaît quand on descend sous les nuages et ne repart qu'avec la bascule vers la route.
    place: [
      { chapter: 'descente', at: 0.2, value: 0 },
      { chapter: 'ville', at: 0.3, value: 1, pace: smooth },
      { chapter: 'prestations', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.35, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    // Les candélabres s'allument juste avant qu'on arrive : c'est eux qui font exister le lieu.
    placeLamp: [
      { chapter: 'descente', at: 0.4, value: 0 },
      { chapter: 'arrivee', at: 0.45, value: 1, pace: smooth },
      { chapter: 'prestations', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.3, value: 0, pace: smooth },
    ],
    // — Le véhicule de la démonstration : il nous attend en bas, sale.
    carLight: [
      { chapter: 'descente', at: 0.3, value: 0 },
      { chapter: 'arrivee', at: 0.45, value: 1, pace: smooth },
      { chapter: 'prestations', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.3, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    dirt: [
      { chapter: 'galaxie', at: 0, value: 1 },
      { chapter: 'intervention', at: 1, value: 1 },
      { chapter: 'transformation', at: 0.1, value: 0, pace: linear },
    ],
    // La ligne de lumière traverse le véhicule pendant tout le chapitre du lavage.
    scan: [
      { chapter: 'intervention', at: 0.12, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
    ],
    polish: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'intervention', at: 0.12, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
      { chapter: 'prestations', at: 1, value: 1 },
    ],
    // Niveau de reflet des véhicules : sale, une carrosserie ne renvoie rien ; vernie, elle rend le ciel entier.
    gloss: [
      { chapter: 'arrivee', at: 0.45, value: 0.72 },
      { chapter: 'intervention', at: 0.12, value: 0.72 },
      { chapter: 'intervention', at: 0.9, value: 1.2, pace: linear },
      { chapter: 'transformation', at: 0.35, value: 1.3, pace: smooth },
      { chapter: 'prestations', at: 0.25, value: 1, pace: smooth },
    ],
    // Jauge Avant / Après : elle suit exactement la ligne de lumière.
    clean: [
      { chapter: 'intervention', at: 0.12, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
    ],
    gauge: [
      { chapter: 'arrivee', at: 0.66, value: 0 },
      { chapter: 'arrivee', at: 0.9, value: 1, pace: smooth },
      { chapter: 'transformation', at: 0.5, value: 1 },
      { chapter: 'transformation', at: 0.75, value: 0, pace: smooth },
    ],
    // — Le véhicule de location : présent sur la route, et son avance en mètres depuis le début de la chaussée.
    chrLight: [
      { chapter: 'bascule', at: 0.55, value: 0 },
      { chapter: 'bascule', at: 0.9, value: 1, pace: smooth },
      { chapter: 'location', at: 1, value: 1 },
      { chapter: 'rendezvous', at: 0.2, value: 0, pace: smooth },
    ],
    // La caméra, elle, passe par 60, 78, 180, 296 et 390 m (shots.ts) : on le rattrape, on le double au ras, il
    // reprend la tête et s'éloigne, puis on le rejoint arrêté au bord du 06.
    chrTravel: [
      { chapter: 'bascule', at: 0.9, value: 84 },
      { chapter: 'location', at: 0.18, value: 104, pace: smooth },
      { chapter: 'location', at: 0.44, value: 186, pace: linear },
      { chapter: 'location', at: 0.7, value: 345, pace: linear },
      { chapter: 'location', at: 0.93, value: 398, pace: smooth },
    ],
    // La balise : une adresse. Elle s'allume quand le pays apparaît, s'éteint quand on est arrivé.
    beacon: [
      { chapter: 'galaxie', at: 0.5, value: 0 },
      { chapter: 'ville', at: 0.2, value: 1, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0.3, pace: smooth },
      { chapter: 'arrivee', at: 0.7, value: 0, pace: smooth },
    ],
    // — L'univers, présent d'un bout à l'autre ; tenu en retrait quand la matière est le sujet.
    skyLight: [
      { chapter: 'galaxie', at: 0, value: 0.16 },
      { chapter: 'galaxie', at: 0.5, value: 0.12, pace: smooth },
      { chapter: 'descente', at: 0.5, value: 0.5, pace: smooth },
      { chapter: 'ville', at: 0.45, value: 1, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0.95, pace: smooth },
      { chapter: 'arrivee', at: 0.9, value: 0.7, pace: smooth },
      { chapter: 'intervention', at: 0.18, value: 0.55, pace: smooth },
      { chapter: 'transformation', at: 0.35, value: 0.9, pace: smooth },
      { chapter: 'prestations', at: 0.85, value: 0.85 },
      { chapter: 'bascule', at: 0.5, value: 1, pace: smooth },
      { chapter: 'bascule', at: 0.9, value: 0.9, pace: smooth },
      { chapter: 'location', at: 0.93, value: 0.9 },
      { chapter: 'contact', at: 0.6, value: 1, pace: smooth },
    ],
    // Un seul ciel : même rotation d'un bout à l'autre (le nord regarde le cœur de la Voie lactée).
    skyYaw: [{ chapter: 'galaxie', at: 0, value: WORLD.skyYaw }],
    // Un lent balancement, seulement là-haut : dans l'univers, rien n'est jamais parfaitement immobile.
    skySway: [
      { chapter: 'galaxie', at: 0, value: 1 },
      { chapter: 'descente', at: 0.3, value: 0, pace: linear },
    ],
    // Noir au loin selon l'altitude : transparent dans le ciel, dense au sol (la nuit se referme autour du véhicule).
    fog: [
      { chapter: 'galaxie', at: 0, value: 0.00005 },
      { chapter: 'descente', at: 0.5, value: 0.00022, pace: smooth },
      { chapter: 'ville', at: 0.45, value: 0.0004, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0.00032, pace: smooth },
      { chapter: 'arrivee', at: 0.9, value: 0.0005, pace: smooth },
      { chapter: 'prestations', at: 0.85, value: 0.0005 },
      { chapter: 'bascule', at: 0.5, value: 0.0002, pace: smooth },
      { chapter: 'bascule', at: 0.9, value: 0.0075, pace: { window: [0.35, 1], ease: 'in' } },
      { chapter: 'location', at: 0.93, value: 0.0075 },
      { chapter: 'contact', at: 0.6, value: 0.0014, pace: smooth },
    ],
    // Les nuages n'ont rien à faire dans l'espace : ils reviennent en arrivant sur la ville, très bas.
    clouds: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'descente', at: 0.5, value: 0, pace: smooth },
      { chapter: 'ville', at: 0.45, value: 0.45, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0.8, pace: smooth },
    ],
    // — La route : le tracé rouge se dessine vu du ciel, la chaussée et les feux s'allument à l'arrivée.
    roadDraw: [
      { chapter: 'bascule', at: 0.2, value: 0 },
      { chapter: 'bascule', at: 0.72, value: 1, pace: smooth },
    ],
    roadTrail: [
      { chapter: 'bascule', at: 0.12, value: 0 },
      { chapter: 'bascule', at: 0.42, value: 1, pace: smooth },
      { chapter: 'bascule', at: 0.86, value: 0, pace: smooth },
      { chapter: 'location', at: 0.93, value: 0 },
      { chapter: 'contact', at: 0.6, value: 0.45, pace: smooth },
    ],
    roadLight: [
      { chapter: 'bascule', at: 0.25, value: 0 },
      { chapter: 'bascule', at: 0.72, value: 1, pace: smooth },
      { chapter: 'contact', at: 0.35, value: 1 },
      { chapter: 'contact', at: 1, value: 0.5, pace: smooth },
    ],
  },
};
