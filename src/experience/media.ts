import type { MediaDescriptor } from '../engine/media/media-types';
import generated from './media.generated.json';

/**
 * Registre média de CAR SERVICE 06. Dimensions, durées et plages viennent du pipeline (scripts/media-video.mjs,
 * scripts/media-passage.mjs → media.generated.json) : rien n'est recopié à la main. Provenance :
 * docs/MEDIA_INVENTORY.md.
 *
 * Politique par format :
 * - bureau, tablette : vidéo pilotée par le scroll (H.264 GOP 5, chargée en mémoire : la production ignore Range) ;
 * - mobile : séquence d'images regroupée (aucun seek décodeur) ;
 * - toujours : les deux images exactes du passage (attente, repli, mouvement réduit).
 */
export const segments = generated.segments as unknown as Record<'before' | 'after-hood' | 'after-flank', readonly [number, number]>;

const story = 'Story Snapchat « Car-service06 », enregistrement d’écran fourni (tools/3d), recadrée et découpée';
const storyRights = 'TO_CONFIRM — images publiées par l’entreprise ; accord du propriétaire du véhicule filmé à confirmer';
const desktop = generated.renditions.find((r) => r.id === 'desktop');
const passage = generated.passage;

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
    poster: { ...passage.before.desktop },
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
    poster: { ...passage.before.mobile },
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
    id: 'passage',
    kind: 'image',
    role: 'Les deux images exactes du passage : capot poussiéreux, capot brillant (chargées par la scène).',
    chapters: ['arrivee', 'intervention', 'transformation'],
    priority: 'critical',
    renditions: [
      { formats: ['desktop', 'tablet'], src: passage.before.desktop.src, type: 'image/webp', width: 900, height: 1424 },
      { formats: ['mobile'], src: passage.before.mobile.src, type: 'image/webp', width: 720, height: 1138 },
    ],
    alt: 'Le capot du même SUV, poussiéreux puis nettoyé.',
    source: story,
    license: storyRights,
  },
  {
    id: 'env-night',
    kind: 'environment',
    role: 'Ciel de nuit du HDRI fourni, pré-calculé : reflets de la chaussée mouillée de la location.',
    chapters: ['bascule', 'location', 'contact'],
    priority: 'proximity',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/env/night-128.hdr', width: 384, height: 512 }],
    alt: '',
    source: 'tools/3d/rogland_clear_night_4k.hdr — Poly Haven « Rogland Clear Night » (provenance probable)',
    license: 'TO_CONFIRM — CC0 si Poly Haven',
  },
];
