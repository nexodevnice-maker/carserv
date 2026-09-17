import type { ExperienceDefinition } from '../engine/experience';
import type { MediaDescriptor } from '../engine/media/media-types';
import generated from '../experience/media.generated.json';

/**
 * LABORATOIRE DU MOTEUR — pas une scène du site.
 * Une piste de contrôle qui exerce chaque capacité du socle : chapitres de longueurs différentes, plans caméra avec
 * fenêtres, courbes, arcs, regard en avance, décalage optique et variante mobile ; canaux de temps pour la vidéo et la
 * séquence. Instrument de docs/ARCHITECTURE.md § Validation (scripts/qa-engine.mjs).
 */
export const PROBE_CHAPTERS = [
  { id: 'p-intro', span: { desktop: 120, mobile: 110 }, label: 'Plan d’ensemble' },
  { id: 'p-orbit', span: { desktop: 200, mobile: 160 }, label: 'Arc et regard en avance' },
  { id: 'p-scrub', span: { desktop: 260, mobile: 220 }, label: 'Vidéo pilotée (scrub)' },
  { id: 'p-arc', span: { desktop: 160, mobile: 140 }, label: 'Prise de hauteur' },
  { id: 'p-sequence', span: { desktop: 220, mobile: 200 }, label: 'Séquence d’images' },
  { id: 'p-end', span: { desktop: 100, mobile: 100 }, label: 'Retour' },
] as const;

export const probeDefinition: ExperienceDefinition = {
  chapters: PROBE_CHAPTERS.map(({ id }) => ({ id, rests: [0.5] })),
  shots: [
    {
      id: 'ensemble',
      chapter: 'p-intro',
      at: 0.5,
      intent: 'Plan d’ensemble de référence : le volume entier, trois quarts avant.',
      framing: { position: [6, 1.6, 7], target: [0, 0.6, 0], fov: 35 },
      mobile: { position: [9, 2.4, 10.5], fov: 40 },
    },
    {
      id: 'arc-avant',
      chapter: 'p-orbit',
      at: 0.8,
      intent: 'Contourner l’avant en arc ; le regard précède le déplacement.',
      framing: { position: [-5, 1.2, 5], target: [0, 0.7, 0.5], fov: 35 },
      mobile: { position: [-7.5, 1.8, 7.5], fov: 40 },
      pace: { window: [0.1, 0.9], ease: 'inOut' },
      via: [[0.5, 2.2, 8]],
      lead: 0.12,
    },
    {
      id: 'approche',
      chapter: 'p-scrub',
      at: 0.5,
      intent: 'Rapprochement avec élan ; image décalée pour libérer une zone de texte.',
      framing: { position: [-2.5, 0.8, 1.9], target: [0, 0.5, 1.8], fov: 28, shift: [0.2, 0] },
      mobile: { position: [-4, 1.4, 3], shift: [0, 0.15], fov: 36 },
      pace: { window: [0.2, 0.8], ease: 'anticipate' },
    },
    {
      id: 'hauteur',
      chapter: 'p-arc',
      at: 0.9,
      intent: 'Prise de hauteur par l’arrière, arrivée longuement posée.',
      framing: { position: [3, 3.5, -4], target: [0, 0.4, 0], fov: 40 },
      pace: { window: [0, 1], ease: 'out' },
      via: [[-1, 2, -5]],
    },
    {
      id: 'retour',
      chapter: 'p-end',
      at: 0.5,
      intent: 'Retour au plan d’ensemble : la réversibilité doit être parfaite.',
      framing: { position: [6, 1.6, 7], target: [0, 0.6, 0], fov: 35 },
      mobile: { position: [9, 2.4, 10.5], fov: 40 },
      pace: { window: [0.2, 0.8], ease: 'in' },
    },
  ],
  channels: {
    videoTime: [
      { chapter: 'p-scrub', at: 0, value: 0 },
      { chapter: 'p-scrub', at: 1, value: generated.duration, pace: { window: [0, 1], ease: 'linear' } },
    ],
    sequenceTime: [
      { chapter: 'p-sequence', at: 0, value: 0 },
      { chapter: 'p-sequence', at: 1, value: generated.duration, pace: { window: [0, 1], ease: 'linear' } },
    ],
  },
};

const desktop = generated.renditions.find((r) => r.id === 'desktop')!;
const mobile = generated.renditions.find((r) => r.id === 'mobile')!;

/** Médias du laboratoire : vidéo sur tous les formats (comparaison mobile), séquence sur tous les formats. */
export const probeMedia: readonly MediaDescriptor[] = [
  {
    id: 'probe-video',
    kind: 'video',
    role: 'Contrôle du scrub vidéo',
    chapters: ['p-scrub'],
    priority: 'proximity',
    renditions: [
      { formats: ['desktop', 'tablet'], src: desktop.src, type: 'video/mp4', width: desktop.width, height: desktop.height },
      { formats: ['mobile'], src: mobile.src, type: 'video/mp4', width: mobile.width, height: mobile.height },
    ],
    alt: '',
    scrub: { fps: generated.fps, duration: generated.duration },
    source: 'laboratoire',
    license: 'laboratoire',
  },
  {
    id: 'probe-sequence',
    kind: 'sequence',
    role: 'Contrôle de la séquence d’images',
    chapters: ['p-sequence'],
    priority: 'proximity',
    renditions: [
      {
        formats: ['desktop', 'tablet', 'mobile'],
        src: generated.sequence.src,
        type: generated.sequence.type,
        width: generated.sequence.width,
        height: generated.sequence.height,
      },
    ],
    alt: '',
    sequence: {
      count: generated.sequence.count,
      fps: generated.sequence.fps,
      width: generated.sequence.width,
      height: generated.sequence.height,
      type: generated.sequence.type,
      offsets: generated.sequence.offsets,
    },
    source: 'laboratoire',
    license: 'laboratoire',
  },
];
