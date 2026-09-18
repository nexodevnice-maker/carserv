import type { ExperienceDefinition } from '../engine/experience';
import type { Responsive } from '../engine/responsive/formats';
import { shots } from './shots';
import { WORLD } from './world';

/**
 * Registre des chapitres de CAR SERVICE 06 : la narration comme donnée. La page et le moteur lisent la même liste.
 *
 * Un voyage continu dans un seul monde (world.ts, shots.ts) : UNIVERS → la France puis le 06 vus du ciel → la balise →
 * AVANT (un vrai véhicule 3D, sali volontairement) → LE SCAN (une ligne de lumière le nettoie et le vernit) → APRÈS
 * (reflets, puis l'habitacle) → PRESTATIONS → ascension dans l'univers → descente verrouillée sur la route →
 * LOCATION (le C-HR roule devant nous) → RENDEZ-VOUS (le seul écran sans 3D) → CONTACT.
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
    panels: [
      { id: 'france', in: 0.28, out: 0.58 },
      { id: 'deplacement', in: 0.66, out: 0.985 },
    ],
    intent: 'La France entière, département par département, puis la descente sur le 06 : le service se déplace partout dans le 06.',
  },
  {
    id: 'avant',
    universe: 'cleaning',
    span: { desktop: 250, mobile: 260 },
    rests: [0.42, 0.86],
    panels: [{ id: 'avant', in: 0.6, out: 0.985 }],
    intent: 'Se poser devant le véhicule : un vrai modèle 3D, volontairement sali — poussière sur la laque, reflets éteints.',
  },
  {
    id: 'intervention',
    universe: 'cleaning',
    span: { desktop: 300, mobile: 320 },
    rests: [0.18, 0.55, 0.9],
    panels: [
      { id: 'lavage', in: 0.02, out: 0.68 },
      { id: 'meme', in: 0.74, out: 0.985 },
    ],
    intent: 'Une ligne de lumière parcourt le véhicule de l’avant vers l’arrière : derrière elle, la poussière a disparu et la laque est vernie.',
  },
  {
    id: 'transformation',
    universe: 'cleaning',
    span: { desktop: 250, mobile: 270 },
    rests: [0.35, 0.85],
    panels: [
      { id: 'apres', in: 0.06, out: 0.62 },
      { id: 'interieur', in: 0.68, out: 0.985 },
    ],
    intent: 'Le véhicule propre rend l’univers en reflet, au ras du sol mouillé ; puis l’habitacle, vu de l’intérieur.',
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
    intent: 'Les quatre prestations du flyer autour du véhicule propre, puis la formule et le déplacement.',
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
    span: { desktop: 440, mobile: 460 },
    rests: [0.18, 0.44, 0.7, 0.93],
    panels: [
      { id: 'jour', in: 0.03, out: 0.3 },
      { id: 'semaine', in: 0.34, out: 0.56 },
      { id: 'quinzaine', in: 0.6, out: 0.8 },
      { id: 'conditions', in: 0.84, out: 0.995 },
    ],
    intent: 'Le C-HR roule devant nous sur la route du 06 : on le rattrape, on le double, il s’éloigne vers la galaxie, il s’arrête au bord du 06.',
  },
  {
    id: 'rendezvous',
    universe: 'action',
    span: { desktop: 240, mobile: 280 },
    rests: [0.5],
    panels: [{ id: 'agenda', in: 0.08, out: 0.985 }],
    intent: 'Le seul écran sans 3D : un calendrier, des créneaux, un formulaire — la demande arrive par courriel.',
  },
  {
    id: 'contact',
    universe: 'action',
    span: { desktop: 160, mobile: 170 },
    rests: [0.6],
    panels: [{ id: 'action', in: 0.3, out: 2 }],
    intent: 'Retour dans la nuit du 06, au bord du territoire : un seul geste, vers le seul canal confirmé.',
  },
];

// — Canaux : tout ce que les scènes lisent, en fonction de la progression.
const linear = { window: [0, 1], ease: 'linear' } as const;
const smooth = { window: [0, 1], ease: 'inOut' } as const;

export const definition: ExperienceDefinition = {
  chapters: chapters.map(({ id, rests }) => ({ id, rests })),
  shots,
  channels: {
    // — Le véhicule du nettoyage (modèle 3D fourni) : présent, sale, scanné, verni.
    carLight: [
      { chapter: 'avant', at: 0.2, value: 0 },
      { chapter: 'avant', at: 0.42, value: 1, pace: smooth },
      { chapter: 'prestations', at: 1, value: 1 },
      { chapter: 'univers', at: 0.25, value: 0, pace: { window: [0, 1], ease: 'in' } },
    ],
    dirt: [
      { chapter: 'avant', at: 0.42, value: 1 },
      { chapter: 'intervention', at: 1, value: 1 },
      { chapter: 'transformation', at: 0.1, value: 0, pace: linear },
    ],
    // La ligne de lumière traverse le véhicule pendant tout le chapitre du lavage.
    scan: [
      { chapter: 'intervention', at: 0.12, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
    ],
    polish: [
      { chapter: 'intervention', at: 0.12, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
      { chapter: 'prestations', at: 1, value: 1 },
    ],
    // Jauge Avant / Après : elle suit exactement la ligne de lumière.
    clean: [
      { chapter: 'intervention', at: 0.12, value: 0 },
      { chapter: 'intervention', at: 0.9, value: 1, pace: linear },
    ],
    gauge: [
      { chapter: 'avant', at: 0.6, value: 0 },
      { chapter: 'avant', at: 0.86, value: 1, pace: smooth },
      { chapter: 'transformation', at: 0.5, value: 1 },
      { chapter: 'transformation', at: 0.75, value: 0, pace: smooth },
    ],
    // — Le C-HR de la location : présent sur la route, et sa position le long de celle-ci (m depuis le début).
    chrLight: [
      { chapter: 'bascule', at: 0.55, value: 0 },
      { chapter: 'bascule', at: 0.9, value: 1, pace: smooth },
      { chapter: 'location', at: 1, value: 1 },
      { chapter: 'rendezvous', at: 0.2, value: 0, pace: smooth },
    ],
    // Avance du C-HR sur la route (m). La caméra, elle, passe par 60, 78, 180, 296 et 390 m (shots.ts) : on le
    // rattrape, on le double au ras, il reprend la tête et s'éloigne, puis on le rejoint arrêté au bord du 06.
    chrTravel: [
      { chapter: 'bascule', at: 0.9, value: 84 },
      { chapter: 'location', at: 0.18, value: 104, pace: smooth },
      { chapter: 'location', at: 0.44, value: 186, pace: linear },
      { chapter: 'location', at: 0.7, value: 345, pace: linear },
      { chapter: 'location', at: 0.93, value: 398, pace: smooth },
    ],
    // La balise : visible du ciel, éteinte à l'arrivée au pied du véhicule.
    beacon: [
      { chapter: 'zone', at: 0.15, value: 0 },
      { chapter: 'zone', at: 0.45, value: 1, pace: smooth },
      { chapter: 'avant', at: 0.42, value: 1 },
      { chapter: 'avant', at: 0.72, value: 0, pace: smooth },
    ],
    // — L'univers, présent d'un bout à l'autre ; tenu en retrait pendant que le véhicule est le sujet.
    skyLight: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'avant', at: 0.42, value: 0.95 },
      { chapter: 'avant', at: 0.86, value: 0.7, pace: smooth },
      { chapter: 'intervention', at: 0.18, value: 0.55, pace: smooth },
      { chapter: 'transformation', at: 0.35, value: 0.8, pace: smooth },
      { chapter: 'prestations', at: 0.85, value: 0.85, pace: smooth },
      { chapter: 'univers', at: 0.42, value: 1, pace: smooth },
      { chapter: 'bascule', at: 0.5, value: 1 },
      { chapter: 'bascule', at: 0.9, value: 0.9, pace: smooth },
      { chapter: 'location', at: 0.93, value: 0.9 },
      { chapter: 'contact', at: 0.6, value: 1, pace: smooth },
    ],
    // Un seul ciel : même rotation d'un bout à l'autre (le nord regarde le cœur de la Voie lactée).
    skyYaw: [{ chapter: 'arrivee', at: 0, value: WORLD.skyYaw }],
    skySway: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'zone', at: 0.1, value: 0, pace: linear },
    ],
    // Noir au loin selon l'altitude : transparent dans le ciel, dense au sol (la nuit se referme autour du véhicule).
    fog: [
      { chapter: 'arrivee', at: 0, value: 0.00005 },
      { chapter: 'zone', at: 0.45, value: 0.000006, pace: smooth },
      { chapter: 'zone', at: 0.88, value: 0.00007, pace: smooth },
      { chapter: 'avant', at: 0.42, value: 0.0011, pace: smooth },
      { chapter: 'avant', at: 0.86, value: 0.005, pace: smooth },
      { chapter: 'prestations', at: 0.85, value: 0.004, pace: smooth },
      { chapter: 'univers', at: 0.42, value: 0.00005, pace: { window: [0, 0.6], ease: 'inOut' } },
      { chapter: 'bascule', at: 0.5, value: 0.0002 },
      { chapter: 'bascule', at: 0.9, value: 0.0075, pace: { window: [0.35, 1], ease: 'in' } },
      { chapter: 'location', at: 0.93, value: 0.0075 },
      { chapter: 'contact', at: 0.6, value: 0.0014, pace: smooth },
    ],
    clouds: [
      { chapter: 'arrivee', at: 0, value: 1 },
      { chapter: 'zone', at: 0.45, value: 0.35, pace: smooth },
      { chapter: 'zone', at: 0.88, value: 0.8, pace: smooth },
      { chapter: 'avant', at: 0.42, value: 1, pace: smooth },
    ],
    // La vague de lumière parcourt le 06 pendant la descente.
    mapReveal: [
      { chapter: 'zone', at: 0.05, value: 0 },
      { chapter: 'zone', at: 0.45, value: 0.42, pace: smooth },
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
