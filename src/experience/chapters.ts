import type { ExperienceDefinition } from '../engine/experience';
import type { Responsive } from '../engine/responsive/formats';
import type { NumberKey } from '../engine/timeline/keys';
import generated from './media.generated.json';
import { shots } from './shots';

/**
 * Registre des chapitres de CAR SERVICE 06 : la narration comme donnée. La page et le moteur lisent la même liste.
 *
 * Grammaire (docs/EXPERIENCE_GRAMMAR.md) : la preuve avant l'adjectif, puis la même marque sur une autre route.
 * AVANT (poussière réelle) → LE PASSAGE (ligne d'eau) → APRÈS (reflets) → PRESTATIONS → ZONE (tout le 06)
 * → BASCULE → LOCATION (la durée comme une route) → CONTACT.
 *
 * Un chapitre a des repos (`rests`, positions locales) : un pas guidé mène à chacun, la caméra s'y pose et la légende
 * correspondante y est entièrement lisible. Les fenêtres des légendes (`panels`) encadrent ces repos.
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
  /** Longueur de scroll en centièmes de hauteur de vue, par format. */
  span: Responsive<number>;
  rests: readonly number[];
  panels: readonly PanelWindow[];
  media: readonly string[];
  intent: string;
}

export const chapters: readonly Chapter[] = [
  {
    id: 'arrivee',
    universe: 'cleaning',
    span: { desktop: 230, mobile: 210 },
    rests: [0, 0.45, 0.85],
    panels: [
      { id: 'marque', in: -1, out: 0.26 },
      { id: 'avant', in: 0.58, out: 0.985 },
    ],
    media: ['transformation-scrub', 'transformation-sequence', 'passage', 'sky'],
    intent: 'L’univers entier (le HDRI fourni) se referme en iris jusqu’au noir, où apparaît la poussière réelle d’un vrai véhicule.',
  },
  {
    id: 'intervention',
    universe: 'cleaning',
    span: { desktop: 190, mobile: 170 },
    rests: [0.2, 0.85],
    panels: [
      { id: 'lavage', in: 0.02, out: 0.46 },
      { id: 'meme', in: 0.64, out: 0.985 },
    ],
    media: ['transformation-scrub', 'transformation-sequence', 'passage'],
    intent: 'Une ligne d’eau franchit le capot : le passage du sale au propre comme une matière qui passe.',
  },
  {
    id: 'transformation',
    universe: 'cleaning',
    span: { desktop: 200, mobile: 180 },
    rests: [0.45, 0.95],
    panels: [
      { id: 'apres', in: 0.06, out: 0.66 },
      { id: 'reflets', in: 0.72, out: 0.985 },
    ],
    media: ['transformation-scrub', 'transformation-sequence', 'passage'],
    intent: 'Le même véhicule rend les arbres en reflet : capot, puis flanc, au ras du sol mouillé.',
  },
  {
    id: 'prestations',
    universe: 'cleaning',
    span: { desktop: 190, mobile: 200 },
    rests: [0.3, 0.75],
    panels: [
      { id: 'interieur-exterieur', in: 0.04, out: 0.52 },
      { id: 'finition-produits', in: 0.56, out: 0.985 },
    ],
    media: ['passage'],
    intent: 'Les prestations comme conséquences de ce qui vient d’être vu ; l’offre comme un fait.',
  },
  {
    id: 'zone',
    universe: 'territory',
    span: { desktop: 150, mobile: 150 },
    rests: [0.55],
    panels: [{ id: 'deplacement', in: 0.18, out: 0.985 }],
    media: [],
    intent: 'Le 06 entier se dessine : le service se déplace, la carte le dit sans inventer de ville.',
  },
  {
    id: 'univers',
    universe: 'bridge',
    span: { desktop: 240, mobile: 220 },
    rests: [0.35, 0.8],
    panels: [],
    media: ['sky'],
    intent: 'Du rien au tout : l’univers se rouvre au-dessus du 06 quitté, la Voie lactée passe, puis tout se referme sur la route.',
  },
  {
    id: 'bascule',
    universe: 'bridge',
    span: { desktop: 130, mobile: 120 },
    rests: [0.8],
    panels: [{ id: 'autre-route', in: 0.42, out: 0.985 }],
    media: [],
    intent: 'La lumière du panneau s’éteint, la route de nuit apparaît : même marque, autre univers.',
  },
  {
    id: 'location',
    universe: 'rental',
    span: { desktop: 270, mobile: 250 },
    rests: [0.2, 0.55, 0.9],
    panels: [
      { id: 'jour', in: 0.05, out: 0.37 },
      { id: 'semaine', in: 0.42, out: 0.72 },
      { id: 'quinzaine', in: 0.77, out: 0.995 },
    ],
    media: ['env-night'],
    intent: 'La durée comme une route : 1 jour, 7, 15 — le véhicule devant, réduit à ses feux.',
  },
  {
    id: 'contact',
    universe: 'action',
    span: { desktop: 130, mobile: 130 },
    rests: [0.55],
    panels: [{ id: 'action', in: 0.12, out: 2 }],
    media: ['env-night'],
    intent: 'La route s’ouvre, les feux s’éloignent : un seul geste, vers le seul canal confirmé.',
  },
];

// — Canaux : tout ce que les scènes lisent, en fonction de la progression.
const linear = { window: [0, 1], ease: 'linear' } as const;
const smooth = { window: [0, 1], ease: 'inOut' } as const;
const passage = generated.passage;

/** Temps de la vidéo publiée (s). Arrêts et reprises sur les images exactes du passage (scripts/media-passage.mjs). */
const videoTime: NumberKey[] = [
  { chapter: 'arrivee', at: 0.45, value: 0 },
  { chapter: 'arrivee', at: 0.85, value: 4.1, pace: linear },
  { chapter: 'arrivee', at: 1, value: passage.before.time, pace: linear },
  { chapter: 'intervention', at: 0.5, value: passage.before.time },
  // Pendant que les images fixes sont à l'écran, la vidéo se place sur le capot propre.
  { chapter: 'intervention', at: 0.55, value: passage.after.time },
  { chapter: 'transformation', at: 0, value: passage.after.time },
  { chapter: 'transformation', at: 0.45, value: 10.2, pace: linear },
  { chapter: 'transformation', at: 0.62, value: 10.63, pace: linear },
  { chapter: 'transformation', at: 0.68, value: 10.7, pace: linear },
  { chapter: 'transformation', at: 0.95, value: 12.1, pace: linear },
];

export const definition: ExperienceDefinition = {
  chapters: chapters.map(({ id, rests }) => ({ id, rests })),
  shots,
  channels: {
    videoTime,
    evidenceMode: [
      { chapter: 'arrivee', at: 1, value: 0 },
      { chapter: 'intervention', at: 0, value: 1 },
      { chapter: 'intervention', at: 1, value: 1 },
      { chapter: 'transformation', at: 0, value: 0 },
    ],
    passage: [
      { chapter: 'intervention', at: 0.2, value: 0 },
      { chapter: 'intervention', at: 0.85, value: 1, pace: linear },
    ],
    // Jauge Avant / Après : la propreté suit exactement la ligne d'eau ; visible pendant toute la preuve.
    clean: [
      { chapter: 'intervention', at: 0.2, value: 0 },
      { chapter: 'intervention', at: 0.85, value: 1, pace: linear },
    ],
    gauge: [
      { chapter: 'arrivee', at: 0.5, value: 0 },
      { chapter: 'arrivee', at: 0.72, value: 1, pace: smooth },
      { chapter: 'transformation', at: 0.97, value: 1 },
      { chapter: 'prestations', at: 0.15, value: 0, pace: smooth },
    ],
    evidenceLight: [
      { chapter: 'arrivee', at: 0.2, value: 0 },
      { chapter: 'arrivee', at: 0.45, value: 0.55, pace: smooth },
      { chapter: 'arrivee', at: 0.75, value: 1, pace: smooth },
      { chapter: 'prestations', at: 1, value: 1 },
      { chapter: 'zone', at: 0.35, value: 0.08, pace: smooth },
      { chapter: 'univers', at: 0.25, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    // L'univers : ouvert au départ, refermé jusqu'au noir sur le véhicule ; rouvert après la carte, refermé sur la route.
    skyIris: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'arrivee', at: 0.42, value: 0, pace: { window: [0.02, 1], ease: 'inOut' } },
      { chapter: 'zone', at: 0.85, value: 0 },
      { chapter: 'univers', at: 0.32, value: 1, pace: { window: [0, 1], ease: 'out' } },
      { chapter: 'univers', at: 0.82, value: 1 },
      { chapter: 'bascule', at: 0.62, value: 0, pace: { window: [0, 1], ease: 'inOut' } },
    ],
    skyYaw: [
      { chapter: 'arrivee', at: 0, value: 1.17 },
      { chapter: 'arrivee', at: 0.42, value: 1.45, pace: linear },
      { chapter: 'univers', at: 0, value: 1.2 },
      { chapter: 'univers', at: 0.82, value: 1.78, pace: linear },
      { chapter: 'bascule', at: 0.62, value: 1.95, pace: linear },
    ],
    roadLight: [
      { chapter: 'bascule', at: 0.3, value: 0 },
      { chapter: 'bascule', at: 1, value: 1, pace: smooth },
      { chapter: 'contact', at: 0.35, value: 1 },
      { chapter: 'contact', at: 1, value: 0.45, pace: smooth },
    ],
    tailDistance: [
      { chapter: 'location', at: 0, value: 24 },
      { chapter: 'location', at: 0.9, value: 17, pace: smooth },
      { chapter: 'contact', at: 0.15, value: 17 },
      { chapter: 'contact', at: 1, value: 90, pace: { window: [0, 1], ease: 'in' } },
    ],
  },
};
