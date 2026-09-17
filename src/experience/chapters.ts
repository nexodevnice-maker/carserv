import type { ExperienceDefinition } from '../engine/experience';
import type { Responsive } from '../engine/responsive/formats';
import type { NumberKey } from '../engine/timeline/keys';
import { segments } from './media';

/**
 * Registre des chapitres de CAR SERVICE 06 : la narration comme donnée. La page (index.astro) et le moteur lisent la
 * même liste — l'ordre, les ancres, les longueurs de scroll et les médias ne peuvent pas diverger.
 *
 * GRAMMAIRE PROVISOIRE (docs/EXPERIENCE_GRAMMAR.md) : dérivée de l'inspection du corpus, à valider par le vertical
 * slice. Écarts assumés avec la séquence candidate des référentiels :
 * - pas de chapitre INTÉRIEUR : aucune image d'habitacle dans les sources (le nettoyage intérieur reste dit, dans
 *   « prestations ») ;
 * - pas de chapitre EAU / MOUSSE filmé : aucune image de lavage ; l'eau n'existe que comme matériau de transition
 *   (intervention), jamais comme preuve ;
 * - la location n'a aucune image réelle du véhicule loué : chapitre typographique et spatial tant qu'elles manquent.
 */
export type Universe = 'cleaning' | 'bridge' | 'rental' | 'action';

export interface Chapter {
  id: string;
  universe: Universe;
  /** Titre de section (h2) : indexable, lisible sans animation. */
  heading: string;
  /** Longueur de scroll en centièmes de hauteur de vue (100 = un écran) : le rythme, par format. */
  span: Responsive<number>;
  /** Médias du registre (media.ts) visibles dans ce chapitre. */
  media: readonly string[];
  /** Positions locales où le mouvement réduit pose l'affichage. */
  rests: readonly number[];
  /** Pourquoi ce chapitre existe. */
  intent: string;
  status: 'provisional' | 'validated';
}

export const chapters: readonly Chapter[] = [
  {
    id: 'arrivee',
    universe: 'cleaning',
    heading: 'Avant',
    span: { desktop: 140, mobile: 120 },
    media: ['transformation-scrub', 'transformation-sequence', 'still-before'],
    rests: [0.5],
    intent: 'Ne rien promettre : la poussière réelle d’un véhicule, dans le noir, avant tout discours. Curiosité, tension.',
    status: 'provisional',
  },
  {
    id: 'intervention',
    universe: 'cleaning',
    heading: 'Le passage',
    span: { desktop: 160, mobile: 140 },
    media: ['transformation-scrub', 'transformation-sequence'],
    rests: [0.5],
    intent: 'Une ligne d’eau franchit le panneau : le passage du sale au propre comme matière, jamais comme fondu.',
    status: 'provisional',
  },
  {
    id: 'transformation',
    universe: 'cleaning',
    heading: 'Après',
    span: { desktop: 220, mobile: 180 },
    media: ['transformation-scrub', 'transformation-sequence', 'still-after'],
    rests: [0.3, 0.8],
    intent: 'Même véhicule, mêmes panneaux : le capot puis le flanc rendent les arbres en reflet. La preuve, pas l’adjectif.',
    status: 'provisional',
  },
  {
    id: 'prestations',
    universe: 'cleaning',
    heading: 'Nettoyage intérieur et extérieur, dans tout le 06',
    span: { desktop: 160, mobile: 220 },
    media: ['still-after'],
    rests: [0.5],
    intent: 'Les prestations comme conséquences de ce qui vient d’être vu ; l’offre et le déplacement comme faits.',
    status: 'provisional',
  },
  {
    id: 'bascule',
    universe: 'bridge',
    heading: 'Une autre route',
    span: { desktop: 100, mobile: 90 },
    media: [],
    rests: [0.5],
    intent: 'Le véhicule propre quitte la lumière ; l’or s’éteint, le rouge de la route paraît. Changement d’univers, même langage.',
    status: 'provisional',
  },
  {
    id: 'location',
    universe: 'rental',
    heading: 'Location — Toyota C-HR hybride',
    span: { desktop: 200, mobile: 200 },
    media: [],
    rests: [0.2, 0.55, 0.9],
    intent: 'La mobilité : une durée qui s’allonge (1 jour, 7, 15) plutôt qu’une grille de prix ; les conditions comme des faits.',
    status: 'provisional',
  },
  {
    id: 'contact',
    universe: 'action',
    heading: 'Réserver ou demander un nettoyage',
    span: { desktop: 100, mobile: 110 },
    media: [],
    rests: [0.5],
    intent: 'Un seul geste, vers le seul canal confirmé (Instagram).',
    status: 'provisional',
  },
];

/**
 * Temps de la vidéo avant/après selon la progression (provisoire) : la poussière défile pendant l'arrivée, la fin du
 * plan « avant » tient pendant le passage, puis capot et flanc brillants pendant la transformation.
 */
const [beforeStart, beforeEnd] = segments.before;
const [hoodStart, hoodEnd] = segments['after-hood'];
const [flankStart, flankEnd] = segments['after-flank'];
const transformationTime: NumberKey[] = [
  { chapter: 'arrivee', at: 0, value: beforeStart },
  { chapter: 'arrivee', at: 1, value: beforeEnd - 1, pace: { window: [0, 1], ease: 'linear' } },
  { chapter: 'intervention', at: 1, value: beforeEnd - 1 / 30, pace: { window: [0, 1], ease: 'linear' } },
  { chapter: 'transformation', at: 0, value: hoodStart },
  { chapter: 'transformation', at: 0.55, value: hoodEnd - 1 / 30, pace: { window: [0.05, 1], ease: 'linear' } },
  { chapter: 'transformation', at: 0.6, value: flankStart },
  { chapter: 'transformation', at: 1, value: flankEnd - 1 / 30, pace: { window: [0.05, 0.9], ease: 'linear' } },
];

export const definition: ExperienceDefinition = {
  chapters: chapters.map(({ id, rests }) => ({ id, rests })),
  shots: [],
  channels: { transformationTime },
};
