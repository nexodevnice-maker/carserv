import type { MediaDescriptor } from '../engine/media/media-types';
import generated from './media.generated.json';

/**
 * Registre média de CAR SERVICE 06. Les dimensions, durées et plages viennent du pipeline (scripts/media-video.mjs →
 * media.generated.json) : rien n'est recopié à la main. Provenance détaillée : docs/MEDIA_INVENTORY.md.
 *
 * Politique par format (docs/DECISIONS.md) :
 * - bureau, tablette : vidéo pilotée par le scroll (scrub H.264 GOP 5) ;
 * - mobile : séquence d'images (aucun seek décodeur ; Safari iOS et mode économie d'énergie) ;
 * - sans WebGL, économie de données, mouvement réduit : affiches « avant » et « après ».
 */
export const segments = generated.segments as unknown as Record<'before' | 'after-hood' | 'after-flank', readonly [number, number]>;

const story = 'Story Snapchat « Car-service06 », enregistrement d’écran fourni (tools/3d), recadrée et découpée';
const storyRights = 'TO_CONFIRM — images publiées par l’entreprise ; accord du propriétaire du véhicule filmé à confirmer';
const desktop = generated.renditions.find((r) => r.id === 'desktop');
const posters = generated.posters;

export const media: readonly MediaDescriptor[] = [
  {
    id: 'transformation-scrub',
    kind: 'video',
    role: 'Preuve de la transformation : un même véhicule, poussiéreux puis brillant, piloté par le scroll.',
    chapters: ['arrivee', 'intervention', 'transformation'],
    priority: 'proximity',
    renditions: desktop
      ? [{ formats: ['desktop', 'tablet'], src: desktop.src, type: 'video/mp4', width: desktop.width, height: desktop.height, bytes: desktop.bytes }]
      : [],
    poster: { ...posters.before.desktop },
    alt: 'Un SUV gris foncé couvert d’une couche de poussière — portière, capot, optique — puis le même véhicule nettoyé, dont le capot et le flanc reflètent les arbres.',
    scrub: { fps: generated.fps, duration: generated.duration },
    segments,
    source: story,
    license: storyRights,
  },
  {
    id: 'transformation-sequence',
    kind: 'sequence',
    role: 'Même preuve sur mobile, en séquence d’images.',
    chapters: ['arrivee', 'intervention', 'transformation'],
    priority: 'proximity',
    renditions: [
      {
        formats: ['mobile'],
        src: generated.sequence.src,
        type: generated.sequence.type,
        width: generated.sequence.width,
        height: generated.sequence.height,
        bytes: generated.sequence.bytes,
      },
    ],
    poster: { ...posters.before.mobile },
    alt: 'Un SUV gris foncé poussiéreux, puis le même véhicule nettoyé et brillant.',
    sequence: {
      count: generated.sequence.count,
      fps: generated.sequence.fps,
      width: generated.sequence.width,
      height: generated.sequence.height,
      type: generated.sequence.type,
      offsets: generated.sequence.offsets,
    },
    segments,
    source: story,
    license: storyRights,
  },
  {
    id: 'still-before',
    kind: 'image',
    role: 'Affiche « avant » : premier écran, repli sans vidéo, mouvement réduit.',
    chapters: ['arrivee'],
    priority: 'critical',
    renditions: [
      { formats: ['desktop', 'tablet'], src: posters.before.desktop.src, type: 'image/webp', width: posters.before.desktop.width, height: posters.before.desktop.height },
      { formats: ['mobile'], src: posters.before.mobile.src, type: 'image/webp', width: posters.before.mobile.width, height: posters.before.mobile.height },
    ],
    alt: 'Capot et optique avant d’un SUV gris foncé sous une épaisse couche de poussière.',
    source: story,
    license: storyRights,
  },
  {
    id: 'still-after',
    kind: 'image',
    role: 'Affiche « après » : le capot nettoyé reflète les arbres.',
    chapters: ['transformation', 'prestations'],
    priority: 'proximity',
    renditions: [
      { formats: ['desktop', 'tablet'], src: posters.after.desktop.src, type: 'image/webp', width: posters.after.desktop.width, height: posters.after.desktop.height },
      { formats: ['mobile'], src: posters.after.mobile.src, type: 'image/webp', width: posters.after.mobile.width, height: posters.after.mobile.height },
    ],
    alt: 'Le capot du même SUV après nettoyage, brillant, reflétant les arbres.',
    source: story,
    license: storyRights,
  },
  {
    id: 'env-night',
    kind: 'environment',
    role: 'Lumière de nuit pour des reflets 3D — conditionnel, aucune scène ne l’utilise encore.',
    chapters: [],
    priority: 'idle',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/env/night-128.hdr', width: 384, height: 512 }],
    alt: '',
    source: 'tools/3d/rogland_clear_night_4k.hdr — Poly Haven « Rogland Clear Night » (provenance probable)',
    license: 'TO_CONFIRM — CC0 si Poly Haven',
  },
];
