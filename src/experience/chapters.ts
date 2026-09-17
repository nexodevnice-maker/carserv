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
    intent: 'Au-dessus d’une mer de nuages, sous la Voie lactée (le HDRI fourni) : on plonge à travers les nuages jusqu’à un panneau posé sur le sol mouillé — la poussière réelle d’un vrai véhicule.',
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
    intent: 'On s’élève au-dessus du panneau : le 06 sort du sol mouillé en volume, de la côte vers les montagnes. Le service se déplace, la carte le dit sans inventer de ville.',
  },
  {
    id: 'univers',
    universe: 'bridge',
    span: { desktop: 240, mobile: 220 },
    rests: [0.35, 0.8],
    panels: [],
    media: ['sky'],
    intent: 'Du 06 au tout : on traverse les nuages au-dessus de la carte, la Voie lactée défile autour du regard.',
  },
  {
    id: 'bascule',
    universe: 'bridge',
    span: { desktop: 130, mobile: 120 },
    rests: [0.8],
    panels: [{ id: 'autre-route', in: 0.42, out: 0.985 }],
    media: [],
    intent: 'Le piqué depuis l’univers, en virage, à travers les nuages : la route s’allume, les feux s’amorcent à l’arrivée.',
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
      { chapter: 'zone', at: 0.4, value: 0.12, pace: smooth },
      { chapter: 'univers', at: 0.25, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    // — L'univers, présent d'un bout à l'autre : plein à l'ouverture, sur la carte et dans la Voie lactée ; tenu en
    // retrait derrière la preuve (la vidéo reste le sujet) et sur la route.
    skyLight: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'arrivee', at: 0.45, value: 0.62, pace: smooth },
      { chapter: 'intervention', at: 0.2, value: 0.42, pace: smooth },
      { chapter: 'transformation', at: 0.95, value: 0.42 },
      { chapter: 'prestations', at: 0.75, value: 0.6, pace: smooth },
      { chapter: 'zone', at: 0.55, value: 1, pace: { window: [0.2, 1], ease: 'inOut' } },
      { chapter: 'univers', at: 0.8, value: 1 },
      { chapter: 'bascule', at: 0.8, value: 0.78, pace: smooth },
      { chapter: 'location', at: 0.9, value: 0.78 },
      { chapter: 'contact', at: 0.55, value: 1, pace: smooth },
    ],
    // Rotation de l'univers : fixe pendant chaque lecture, elle tourne pendant les vols (le ciel passe autour du regard).
    // Au sol, le regard est tourné vers le cœur de la Voie lactée, au-dessus des collines basses du HDRI : derrière le
    // panneau (u ≈ 0,46) comme au bout de la route (−0,31 : la route mène dans la galaxie). Le piqué vers la route
    // fait donc tourner le ciel d'un quart de tour : une descente en spirale.
    skyYaw: [
      { chapter: 'arrivee', at: 0, value: 1.17 },
      { chapter: 'arrivee', at: 0.45, value: 1.3, pace: smooth },
      { chapter: 'zone', at: 0.55, value: 1.3 },
      { chapter: 'univers', at: 0.35, value: 1.45, pace: smooth },
      { chapter: 'univers', at: 0.8, value: 1.76, pace: smooth },
      { chapter: 'bascule', at: 0.8, value: -0.31, pace: { window: [0.05, 1], ease: 'inOut' } },
      { chapter: 'contact', at: 0.55, value: -0.25, pace: smooth },
    ],
    // Dérive lente des étoiles (seule animation hors scroll) : à l'ouverture et dans la Voie lactée seulement.
    skyDrift: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'arrivee', at: 0.12, value: 0, pace: linear },
      { chapter: 'univers', at: 0.2, value: 0 },
      { chapter: 'univers', at: 0.3, value: 1, pace: linear },
      { chapter: 'univers', at: 0.85, value: 1 },
      { chapter: 'bascule', at: 0.05, value: 0, pace: linear },
    ],
    // Nuages : pleins pendant les vols, retirés sur la carte (le territoire se lit sans voile).
    clouds: [
      { chapter: 'arrivee', at: 0, value: 0.95 },
      { chapter: 'zone', at: 0, value: 0.95 },
      { chapter: 'zone', at: 0.55, value: 0.3, pace: { window: [0.45, 1], ease: 'inOut' } },
      { chapter: 'univers', at: 0.2, value: 1, pace: smooth },
      { chapter: 'contact', at: 0.55, value: 0.85, pace: smooth },
    ],
    // Le 06 sort du sol pendant l'arrivée au-dessus de la carte.
    mapReveal: [
      { chapter: 'zone', at: 0.05, value: 0 },
      { chapter: 'zone', at: 0.55, value: 1, pace: { window: [0.3, 1], ease: 'inOut' } },
    ],
    // — Objectif : coup de focale au milieu de chaque vol, roulis dans les virages, turbulence dans les nuages.
    lensFov: [
      { chapter: 'arrivee', at: 0, value: 0 },
      { chapter: 'arrivee', at: 0.22, value: 16, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0, pace: smooth },
      { chapter: 'prestations', at: 0.75, value: 0 },
      { chapter: 'zone', at: 0.22, value: 12, pace: smooth },
      { chapter: 'zone', at: 0.55, value: 0, pace: smooth },
      { chapter: 'univers', at: 0.08, value: 12, pace: smooth },
      { chapter: 'univers', at: 0.35, value: 0, pace: smooth },
      { chapter: 'univers', at: 0.57, value: 8, pace: smooth },
      { chapter: 'univers', at: 0.8, value: 0, pace: smooth },
      { chapter: 'bascule', at: 0.36, value: 22, pace: smooth },
      { chapter: 'bascule', at: 0.8, value: 0, pace: smooth },
      { chapter: 'location', at: 0.375, value: 5, pace: smooth },
      { chapter: 'location', at: 0.55, value: 0, pace: smooth },
      { chapter: 'location', at: 0.725, value: 5, pace: smooth },
      { chapter: 'location', at: 0.9, value: 0, pace: smooth },
      { chapter: 'contact', at: 0.25, value: 7, pace: smooth },
      { chapter: 'contact', at: 0.55, value: 0, pace: smooth },
    ],
    lensRoll: [
      { chapter: 'arrivee', at: 0, value: 0 },
      { chapter: 'arrivee', at: 0.22, value: 0.05, pace: smooth },
      { chapter: 'arrivee', at: 0.45, value: 0, pace: smooth },
      { chapter: 'zone', at: 0, value: 0 },
      { chapter: 'zone', at: 0.26, value: -0.07, pace: smooth },
      { chapter: 'zone', at: 0.55, value: 0, pace: smooth },
      { chapter: 'univers', at: 0.35, value: 0 },
      { chapter: 'univers', at: 0.57, value: 0.08, pace: smooth },
      { chapter: 'univers', at: 0.8, value: 0, pace: smooth },
      { chapter: 'bascule', at: 0.4, value: -0.17, pace: smooth },
      { chapter: 'bascule', at: 0.8, value: 0, pace: smooth },
    ],
    shake: [
      { chapter: 'arrivee', at: 0.08, value: 0 },
      { chapter: 'arrivee', at: 0.24, value: 1, pace: smooth },
      { chapter: 'arrivee', at: 0.4, value: 0, pace: smooth },
      { chapter: 'bascule', at: 0.12, value: 0 },
      { chapter: 'bascule', at: 0.42, value: 1.2, pace: smooth },
      { chapter: 'bascule', at: 0.7, value: 0, pace: smooth },
    ],
    // La route s'allume sous la caméra pendant le piqué : vue d'en haut d'abord, les feux s'amorcent à l'arrivée.
    roadLight: [
      { chapter: 'bascule', at: 0.12, value: 0 },
      { chapter: 'bascule', at: 0.66, value: 1, pace: smooth },
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
