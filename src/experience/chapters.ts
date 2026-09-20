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
    // DEUX UNITÉS. Il y en avait trois au départ, dont deux sans aucun texte et un plongeon dans le cœur qui
    // faisait virer l'amas au blanc. On les a supprimées ; le porteur veut retrouver le VOYAGE, mais loin de la
    // zone dense : une dérive latérale où les étoiles proches sortent du cadre, et le cœur tenu au bord de l'image.
    span: { desktop: 120, mobile: 130 },
    rests: [0, 0.58],
    panels: [{ id: 'marque', in: -1, out: 0.2 }],
    intent:
      'LE HÉROS : on est DANS la galaxie fournie — un vrai volume de 50 000 étoiles, vu en bande dans le haut du cadre. Le titre se lit sur le noir. Un seul défilement, puis on descend vers le 06.',
  },
  {
    id: 'descente',
    // On descend vers le NETTOYAGE, pas vers la location : l'univers « bascule » allumait l'onglet LOCATION en rouge
    // pendant toute la descente, et l'en-tête racontait l'inverse de la scène.
    universe: 'territory',
    span: { desktop: 110, mobile: 120 },
    rests: [0.5],
    panels: [],
    intent: 'Le regard bascule : sous la galaxie, une lueur. Ce n’est pas une étoile — c’est une ville. Aucun texte.',
  },
  {
    id: 'ville',
    universe: 'territory',
    span: { desktop: 110, mobile: 120 },
    rests: [0.45],
    panels: [{ id: 'ville', in: 0.18, out: 0.985 }],
    intent: 'La ville de nuit, ses tours allumées, et la galaxie encore au-dessus. On descend entre les immeubles.',
  },
  {
    id: 'arrivee',
    universe: 'cleaning',
    span: { desktop: 400, mobile: 440 },
    rests: [0.14, 0.34, 0.54, 0.74, 0.94],
    panels: [
      { id: 'deplacement', in: 0.02, out: 0.22 },
      { id: 'devant', in: 0.26, out: 0.44 },
      { id: 'portiere', in: 0.46, out: 0.64 },
      { id: 'roue', in: 0.66, out: 0.84 },
      { id: 'avant', in: 0.86, out: 0.985 },
    ],
    intent:
      'Se poser sur la place, le véhicule ENTIER dans le cadre — puis l’inspecter pièce par pièce, une par défilement : le devant, une portière, une roue. Et revenir devant, à hauteur de phare : c’est l’état dans lequel on le prend.',
  },
  {
    id: 'intervention',
    universe: 'cleaning',
    span: { desktop: 220, mobile: 240 },
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
    span: { desktop: 230, mobile: 250 },
    rests: [0.16, 0.52, 0.85],
    panels: [
      { id: 'face', in: 0.02, out: 0.3 },
      { id: 'apres', in: 0.34, out: 0.64 },
      { id: 'interieur', in: 0.68, out: 0.985 },
    ],
    intent: 'La preuve : la laque rend l’univers entier — le même ciel qu’à l’ouverture, cette fois dans la carrosserie. Puis l’habitacle, vu de l’intérieur.',
  },
  {
    id: 'prestations',
    universe: 'cleaning',
    // Deux unités, pas trois : la troisième affichait une formule à 50 € NON CONFIRMÉE, que la vraie grille
    // tarifaire remplace. Un défilement de moins, et plus aucun prix incertain à côté des prix réels.
    span: { desktop: 165, mobile: 180 },
    rests: [0.3, 0.72],
    panels: [
      { id: 'interieur-exterieur', in: 0.02, out: 0.46 },
      { id: 'finition-produits', in: 0.5, out: 0.985 },
    ],
    intent: 'Le tour du véhicule propre : tout ce que fait l’entreprise, des deux côtés de la place.',
  },
  {
    id: 'tarifs',
    universe: 'cleaning',
    span: { desktop: 320, mobile: 350 },
    rests: [0.12, 0.37, 0.62, 0.88],
    panels: [
      { id: 'basic', in: 0.02, out: 0.24 },
      { id: 'standard', in: 0.27, out: 0.49 },
      { id: 'full-interieur', in: 0.52, out: 0.74 },
      { id: 'concession', in: 0.77, out: 0.99 },
    ],
    intent:
      'LA GRILLE — une formule par défilement, et la caméra tourne d’un quart autour du véhicule à chaque palier : on monte en gamme et on fait le tour de la voiture en même temps. Jamais quatre cartes côte à côte.',
  },
  {
    id: 'bascule',
    universe: 'bridge',
    span: { desktop: 110, mobile: 120 },
    rests: [0.9],
    panels: [{ id: 'autre-route', in: 0.72, out: 0.985 }],
    intent: 'Le déplacement devient une route : chute verrouillée sur la galaxie, la chaussée monte à la rencontre de la caméra.',
  },
  {
    id: 'location',
    universe: 'rental',
    span: { desktop: 330, mobile: 360 },
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
    span: { desktop: 155, mobile: 170 },
    rests: [0.5],
    panels: [{ id: 'agenda', in: 0.08, out: 0.985 }],
    intent: 'Le seul écran sans 3D : la nuit s’éteint, un calendrier prend l’écran, la demande part par courriel.',
  },
  {
    id: 'contact',
    universe: 'action',
    span: { desktop: 110, mobile: 120 },
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
    // — L'ÉTOILE FILANTE : elle traverse pendant le PREMIER défilement, et elle est déjà partie ensuite. Le canal
    // court vite (course terminée à 35 % du premier chapitre) parce qu'une étoile filante qu'on a le temps de
    // regarder n'en est pas une.
    meteor: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'galaxie', at: 0.35, value: 1, pace: { window: [0, 1], ease: 'out' } },
    ],
    // Une galaxie n'est jamais figée : elle tourne, très lentement, pendant tout le récit.
    galaxySpin: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'contact', at: 1, value: 0.55, pace: linear },
    ],
    // — LE 06 : la vague de lumière parcourt le département pendant qu'on le traverse. À l'arrivée sur la place, il
    // est entièrement allumé — et on est dessus.
    mapReveal: [
      { chapter: 'galaxie', at: 0.62, value: 0 },
      { chapter: 'galaxie', at: 0.95, value: 0.3, pace: smooth },
      { chapter: 'descente', at: 0.3, value: 0.7, pace: smooth },
      { chapter: 'descente', at: 0.85, value: 1, pace: smooth },
    ],
    // — LE MONDE D'EN BAS : il n'existe pas tant qu'on est dans l'espace (ni sol, ni horizon, ni collines).
    world: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'galaxie', at: 0.62, value: 0 },
      { chapter: 'galaxie', at: 0.95, value: 0.22, pace: smooth },
      { chapter: 'descente', at: 0.5, value: 0.55, pace: smooth },
      { chapter: 'ville', at: 0.45, value: 1, pace: smooth },
    ],
    // — La place : elle apparaît quand on descend sous les nuages et ne repart qu'avec la bascule vers la route.
    place: [
      { chapter: 'descente', at: 0.2, value: 0 },
      { chapter: 'ville', at: 0.3, value: 1, pace: smooth },
      { chapter: 'tarifs', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.35, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    // Les candélabres s'allument juste avant qu'on arrive : c'est eux qui font exister le lieu.
    placeLamp: [
      { chapter: 'descente', at: 0.4, value: 0 },
      { chapter: 'arrivee', at: 0.45, value: 1, pace: smooth },
      { chapter: 'tarifs', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.3, value: 0, pace: smooth },
    ],
    // — Le véhicule de la démonstration : il nous attend en bas, sale.
    carLight: [
      { chapter: 'descente', at: 0.3, value: 0 },
      { chapter: 'arrivee', at: 0.45, value: 1, pace: smooth },
      { chapter: 'tarifs', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.3, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    dirt: [
      { chapter: 'galaxie', at: 0, value: 1 },
      { chapter: 'intervention', at: 1, value: 1 },
      { chapter: 'transformation', at: 0.1, value: 0, pace: linear },
    ],
    // La ligne de lumière traverse le véhicule pendant tout le chapitre du lavage.
    // LE RELEVÉ PASSE EN UN SEUL GESTE : d'un repos au suivant. Étalé sur trois défilements, on ne voyait jamais la
    // ligne traverser — on voyait trois états figés, et il fallait scroller trois fois pour une seule action.
    scan: [
      { chapter: 'intervention', at: 0.2, value: 0 },
      { chapter: 'intervention', at: 0.56, value: 1, pace: linear },
    ],
    polish: [
      { chapter: 'galaxie', at: 0, value: 0 },
      { chapter: 'intervention', at: 0.2, value: 0 },
      { chapter: 'intervention', at: 0.56, value: 1, pace: linear },
      { chapter: 'tarifs', at: 1, value: 1 },
    ],
    // Niveau de reflet des véhicules : sale, une carrosserie ne renvoie rien ; vernie, elle rend le ciel entier.
    gloss: [
      { chapter: 'arrivee', at: 0.45, value: 0.72 },
      { chapter: 'intervention', at: 0.2, value: 0.72 },
      { chapter: 'intervention', at: 0.56, value: 1.2, pace: linear },
      { chapter: 'transformation', at: 0.35, value: 1.3, pace: smooth },
      { chapter: 'prestations', at: 0.25, value: 1, pace: smooth },
    ],
    // — LES PHARES. Ils s'allument quand le relevé a fini de passer : la voiture est propre, elle est prête, elle
    // s'allume. Avant, rien — une carrosserie sale aux phares allumés ne raconte rien.
    headlight: [
      { chapter: 'intervention', at: 0.22, value: 0 },
      // La ligne de lumière descend de l'AVANT vers l'arrière : les optiques s'allument quand elle vient de les
      // traverser, pas une fois tout terminé. C'est le relevé qui rallume la voiture, sous nos yeux.
      { chapter: 'intervention', at: 0.4, value: 1, pace: { window: [0, 1], ease: 'out' } },
      { chapter: 'tarifs', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.3, value: 0, pace: smooth },
    ],
    // — L'HABITACLE S'ALLUME quand on entre dedans. Une voiture dont on visite l'intérieur, la nuit, portes fermées,
    // a forcément son éclairage d'ambiance allumé : sans lui on filme une grotte.
    cabin: [
      { chapter: 'transformation', at: 0.5, value: 0 },
      { chapter: 'transformation', at: 0.72, value: 1, pace: smooth },
      { chapter: 'tarifs', at: 1, value: 1 },
      { chapter: 'bascule', at: 0.3, value: 0, pace: smooth },
    ],
    // Jauge Avant / Après : elle suit exactement la ligne de lumière.
    clean: [
      { chapter: 'intervention', at: 0.2, value: 0 },
      { chapter: 'intervention', at: 0.56, value: 1, pace: linear },
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
    // — LE CIRCUIT : il apparaît avec la bascule vers la route et s'éteint au rendez-vous.
    circuit: [
      { chapter: 'bascule', at: 0.15, value: 0 },
      { chapter: 'bascule', at: 0.75, value: 1, pace: smooth },
      { chapter: 'location', at: 0.95, value: 1 },
      { chapter: 'rendezvous', at: 0.25, value: 0, pace: smooth },
    ],
    chrTravel: [
      { chapter: 'bascule', at: 0.9, value: 84 },
      { chapter: 'location', at: 0.18, value: 104, pace: smooth },
      { chapter: 'location', at: 0.44, value: 186, pace: linear },
      { chapter: 'location', at: 0.7, value: 345, pace: linear },
      { chapter: 'location', at: 0.93, value: 398, pace: smooth },
    ],
    // — L'univers, présent d'un bout à l'autre ; tenu en retrait quand la matière est le sujet.
    skyLight: [
      { chapter: 'galaxie', at: 0, value: 0.16 },
      { chapter: 'galaxie', at: 0.62, value: 0.12, pace: smooth },
      { chapter: 'galaxie', at: 0.95, value: 0.42, pace: smooth },
      { chapter: 'descente', at: 0.28, value: 0.68, pace: smooth },
      { chapter: 'descente', at: 0.75, value: 0.9, pace: smooth },
      { chapter: 'ville', at: 0.45, value: 1, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0.95, pace: smooth },
      { chapter: 'arrivee', at: 0.9, value: 0.7, pace: smooth },
      { chapter: 'intervention', at: 0.18, value: 0.55, pace: smooth },
      { chapter: 'transformation', at: 0.35, value: 0.9, pace: smooth },
      { chapter: 'tarifs', at: 0.85, value: 0.85 },
      { chapter: 'bascule', at: 0.5, value: 1, pace: smooth },
      { chapter: 'bascule', at: 0.9, value: 0.9, pace: smooth },
      { chapter: 'location', at: 0.93, value: 0.9 },
      { chapter: 'contact', at: 0.6, value: 1, pace: smooth },
    ],
    /**
     * — LE DÉBORDEMENT DES SOURCES (passe d'image, config.ts → STAGE.post). Multiplicateur du halo.
     *
     * Partout, il vaut 1 : une lampe, un phare, la ligne d'or, le liseré des tarifs débordent, et c'est ce qui fait
     * la nuit. DANS la galaxie, non — et c'est mesuré : à pleine intensité, la traversée du cœur perdait ses étoiles
     * une à une, fondues en une seule tache blanche. Or cette unité ne raconte QUE ça : des étoiles détachées, qui
     * défilent à des vitesses différentes. Plus on entre dans l'amas, moins les sources débordent.
     */
    bloom: [
      { chapter: 'galaxie', at: 0, value: 0.85 },
      { chapter: 'galaxie', at: 0.34, value: 0.6, pace: smooth },
      { chapter: 'galaxie', at: 0.76, value: 0.32, pace: smooth },
      { chapter: 'descente', at: 0.35, value: 1, pace: smooth },
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
      { chapter: 'tarifs', at: 0.85, value: 0.0005 },
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
