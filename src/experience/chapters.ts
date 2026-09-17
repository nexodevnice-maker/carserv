import type { ExperienceDefinition } from '../engine/experience';
import type { Responsive } from '../engine/responsive/formats';
import type { NumberKey } from '../engine/timeline/keys';
import generated from './media.generated.json';
import { shots } from './shots';
import { WORLD } from './world';

/**
 * Registre des chapitres de CAR SERVICE 06 : la narration comme donnée. La page et le moteur lisent la même liste.
 *
 * Un voyage continu dans un seul monde (world.ts, shots.ts) : UNIVERS → le 06 vu du ciel → la balise → AVANT
 * (poussière réelle) → SCAN puis LE PASSAGE (ligne d'eau) → APRÈS (reflets) → PRESTATIONS → ascension dans l'univers
 * → descente verrouillée sur la route → LOCATION (la durée comme une route) → CONTACT.
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
  intent: string;
}

export const chapters: readonly Chapter[] = [
  {
    id: 'arrivee',
    universe: 'territory',
    span: { desktop: 110, mobile: 110 },
    rests: [0],
    panels: [{ id: 'marque', in: -1, out: 0.5 }],
    intent: 'Toujours le premier plan : dans l’univers, au-dessus d’une mer de nuages, face au cœur de la Voie lactée (le HDRI fourni).',
  },
  {
    id: 'zone',
    universe: 'territory',
    span: { desktop: 280, mobile: 260 },
    rests: [0.45, 0.88],
    panels: [{ id: 'deplacement', in: 0.66, out: 0.985 }],
    intent: 'La plongée par une trouée des nuages : le 06 entier, d’or, s’allume de la côte aux montagnes. Le service se déplace partout ; la carte le dit sans inventer de ville.',
  },
  {
    id: 'avant',
    universe: 'cleaning',
    span: { desktop: 240, mobile: 220 },
    rests: [0.42, 0.88],
    panels: [{ id: 'avant', in: 0.64, out: 0.985 }],
    intent: 'Descendre vers la balise, franchir la falaise, se poser devant le monolithe : la poussière réelle d’un vrai véhicule.',
  },
  {
    id: 'intervention',
    universe: 'cleaning',
    span: { desktop: 270, mobile: 250 },
    rests: [0.15, 0.5, 0.9],
    panels: [
      { id: 'lavage', in: 0.02, out: 0.64 },
      { id: 'meme', in: 0.74, out: 0.985 },
    ],
    intent: 'Une ligne d’or relève entièrement le véhicule, de haut en bas ; puis une ligne d’eau le franchit : sous elle, le même capot, propre.',
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
    intent: 'Les prestations comme conséquences de ce qui vient d’être vu ; l’offre comme un fait.',
  },
  {
    id: 'univers',
    universe: 'bridge',
    span: { desktop: 280, mobile: 260 },
    rests: [0.42, 0.85],
    panels: [],
    intent: 'L’ascension verticale à travers les nuages jusqu’aux étoiles, puis cap au nord sur le cœur de la galaxie.',
  },
  {
    id: 'bascule',
    universe: 'bridge',
    span: { desktop: 240, mobile: 220 },
    rests: [0.9],
    panels: [{ id: 'autre-route', in: 0.7, out: 0.985 }],
    intent: 'La descente verrouillée sur la galaxie : la route rouge se dessine sur le 06 et monte à la rencontre de la caméra, qui se pose dans la voie.',
  },
  {
    id: 'location',
    universe: 'rental',
    span: { desktop: 300, mobile: 280 },
    rests: [0.2, 0.55, 0.9],
    panels: [
      { id: 'jour', in: 0.05, out: 0.37 },
      { id: 'semaine', in: 0.42, out: 0.72 },
      { id: 'quinzaine', in: 0.77, out: 0.995 },
    ],
    intent: 'La durée comme une route, à vive allure : 1 jour, 7, 15 — le véhicule devant, réduit à ses feux, la galaxie au bout.',
  },
  {
    id: 'contact',
    universe: 'action',
    span: { desktop: 160, mobile: 160 },
    rests: [0.6],
    panels: [{ id: 'action', in: 0.3, out: 2 }],
    intent: 'S’élever au-dessus de la route, les feux s’éloignent vers la galaxie : un seul geste, vers le seul canal confirmé.',
  },
];

// — Canaux : tout ce que les scènes lisent, en fonction de la progression.
const linear = { window: [0, 1], ease: 'linear' } as const;
const smooth = { window: [0, 1], ease: 'inOut' } as const;
const passage = generated.passage;

/** Temps de la vidéo publiée (s). Arrêts et reprises sur les images exactes du passage (scripts/media-passage.mjs). */
const videoTime: NumberKey[] = [
  { chapter: 'avant', at: 0.5, value: 0 },
  { chapter: 'avant', at: 0.88, value: 4.1, pace: linear },
  { chapter: 'avant', at: 1, value: passage.before.time, pace: linear },
  { chapter: 'intervention', at: 0.6, value: passage.before.time },
  // Pendant que les images fixes sont à l'écran (scan, passage), la vidéo se place sur le capot propre.
  { chapter: 'intervention', at: 0.62, value: passage.after.time },
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
      { chapter: 'avant', at: 1, value: 0 },
      { chapter: 'intervention', at: 0, value: 1 },
      { chapter: 'intervention', at: 1, value: 1 },
      { chapter: 'transformation', at: 0, value: 0 },
    ],
    // Scan : la ligne d'or descend de 0 à 1 ; le relevé reste affiché jusqu'au passage de l'eau.
    scan: [
      { chapter: 'intervention', at: 0.17, value: 0 },
      { chapter: 'intervention', at: 0.5, value: 1, pace: { window: [0, 1], ease: 'linear' } },
    ],
    passage: [
      { chapter: 'intervention', at: 0.55, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
    ],
    // Jauge Avant / Après : la propreté suit exactement la ligne d'eau ; visible pendant toute la preuve.
    clean: [
      { chapter: 'intervention', at: 0.55, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
    ],
    gauge: [
      { chapter: 'avant', at: 0.55, value: 0 },
      { chapter: 'avant', at: 0.78, value: 1, pace: smooth },
      { chapter: 'transformation', at: 0.97, value: 1 },
      { chapter: 'prestations', at: 0.15, value: 0, pace: smooth },
    ],
    evidenceLight: [
      { chapter: 'avant', at: 0.15, value: 0 },
      { chapter: 'avant', at: 0.42, value: 0.75, pace: smooth },
      { chapter: 'avant', at: 0.7, value: 1, pace: smooth },
      { chapter: 'prestations', at: 1, value: 1 },
      { chapter: 'univers', at: 0.3, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    // La balise : visible du ciel, éteinte à l'arrivée au pied du monolithe.
    beacon: [
      { chapter: 'zone', at: 0.2, value: 0 },
      { chapter: 'zone', at: 0.45, value: 0.7, pace: smooth },
      { chapter: 'zone', at: 0.88, value: 1, pace: smooth },
      { chapter: 'avant', at: 0.42, value: 1 },
      { chapter: 'avant', at: 0.72, value: 0, pace: smooth },
    ],
    // — L'univers, présent d'un bout à l'autre ; tenu en retrait derrière la preuve (la vidéo reste le sujet).
    skyLight: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'avant', at: 0.42, value: 0.95 },
      { chapter: 'avant', at: 0.88, value: 0.62, pace: smooth },
      { chapter: 'intervention', at: 0.15, value: 0.45, pace: smooth },
      { chapter: 'transformation', at: 0.95, value: 0.45 },
      { chapter: 'prestations', at: 0.75, value: 0.7, pace: smooth },
      { chapter: 'univers', at: 0.42, value: 1, pace: smooth },
      { chapter: 'bascule', at: 0.5, value: 1 },
      { chapter: 'bascule', at: 0.9, value: 0.88, pace: smooth },
      { chapter: 'location', at: 0.9, value: 0.88 },
      { chapter: 'contact', at: 0.6, value: 1, pace: smooth },
    ],
    // Un seul ciel : même rotation d'un bout à l'autre (le nord regarde le cœur de la Voie lactée).
    skyYaw: [{ chapter: 'arrivee', at: 0, value: WORLD.skyYaw }],
    skySway: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'zone', at: 0.1, value: 0, pace: linear },
    ],
    // Noir au loin selon l'altitude : transparent dans le ciel, dense au sol (la nuit se referme autour de la preuve).
    fog: [
      { chapter: 'arrivee', at: 0, value: 0.00005 },
      { chapter: 'zone', at: 0.88, value: 0.00007 },
      { chapter: 'avant', at: 0.42, value: 0.0011, pace: smooth },
      { chapter: 'avant', at: 0.88, value: 0.0045, pace: smooth },
      { chapter: 'prestations', at: 0.75, value: 0.0035, pace: smooth },
      { chapter: 'univers', at: 0.42, value: 0.00005, pace: { window: [0, 0.6], ease: 'inOut' } },
      { chapter: 'bascule', at: 0.5, value: 0.0002 },
      { chapter: 'bascule', at: 0.9, value: 0.0075, pace: { window: [0.35, 1], ease: 'in' } },
      { chapter: 'location', at: 0.9, value: 0.0075 },
      { chapter: 'contact', at: 0.6, value: 0.0014, pace: smooth },
    ],
    clouds: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'zone', at: 0.88, value: 0.8, pace: smooth },
      { chapter: 'avant', at: 0.42, value: 1, pace: smooth },
    ],
    // La vague de lumière parcourt le 06 pendant la descente par la trouée.
    mapReveal: [
      { chapter: 'zone', at: 0.05, value: 0 },
      { chapter: 'zone', at: 0.45, value: 0.3, pace: smooth },
      { chapter: 'zone', at: 0.88, value: 1, pace: smooth },
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
      { chapter: 'contact', at: 0.2, value: 0 },
      { chapter: 'contact', at: 0.6, value: 0.45, pace: smooth },
    ],
    roadLight: [
      { chapter: 'bascule', at: 0.25, value: 0 },
      { chapter: 'bascule', at: 0.72, value: 1, pace: smooth },
      { chapter: 'contact', at: 0.35, value: 1 },
      { chapter: 'contact', at: 1, value: 0.5, pace: smooth },
    ],
    tailDistance: [
      { chapter: 'location', at: 0, value: 24 },
      { chapter: 'location', at: 0.9, value: 20, pace: smooth },
      { chapter: 'contact', at: 0.1, value: 20 },
      { chapter: 'contact', at: 0.6, value: 64, pace: smooth },
    ],
  },
};
