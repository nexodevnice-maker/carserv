import type { MediaDescriptor } from '../engine/media/media-types';

/**
 * Registre média de CAR SERVICE 06 : QUOI charger, QUAND, et d'où ça vient. Provenance et droits :
 * docs/MEDIA_INVENTORY.md.
 *
 * Les deux véhicules du récit sont des modèles 3D fournis par le porteur (tools/3d), allégés par
 * `npm run media:3d` (gltf-transform : textures WebP 1024, quantification et compression meshopt). Ils sont chargés à
 * l'approche de leur chapitre et libérés quand on s'en éloigne : au téléphone, rien ne descend avant d'être utile.
 * Aucune plaque ni aucun emblème n'est mis en avant : les plans (shots.ts) évitent les logos.
 */
export const media: readonly MediaDescriptor[] = [
  {
    id: 'env-night',
    kind: 'environment',
    role: 'La nuit en reflet : sans elle, une carrosserie noire dans le noir n’est qu’une silhouette.',
    chapters: ['avant', 'intervention', 'transformation', 'prestations', 'bascule', 'location'],
    priority: 'proximity',
    renditions: [
      { formats: ['desktop'], src: '/env/night-256.hdr', type: 'image/vnd.radiance', bytes: 1741414 },
      { formats: ['tablet', 'mobile'], src: '/env/night-128.hdr', type: 'image/vnd.radiance', bytes: 457307 },
    ],
    alt: 'Ciel nocturne dégagé : la Voie lactée et ses étoiles, reflétées par la carrosserie.',
    source: 'Poly Haven « Rogland Clear Night » (fourni dans tools/3d), pré-calculé en PMREM par scripts/media-env.mjs',
    license: 'CC0 — Poly Haven',
  },
  {
    id: 'vehicle-cleaning',
    kind: 'model',
    role: 'Le véhicule de la démonstration : sali volontairement, parcouru par la ligne de lumière, verni, puis vu de l’intérieur.',
    chapters: ['avant', 'intervention', 'transformation', 'prestations'],
    priority: 'proximity',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/models/rs6.glb', type: 'model/gltf-binary', bytes: 3113548 }],
    alt: 'Une berline sombre posée sur un sol mouillé la nuit : d’abord ternie par une couche de poussière, puis nettoyée et vernie, ses reflets rendus à la carrosserie.',
    source: 'Modèle 3D fourni par le porteur du projet (tools/3d/RS6), allégé par scripts/media-3d.mjs',
    license: 'TO_CONFIRM — droits du modèle 3D à confirmer auprès du porteur (usage de démonstration)',
  },
  {
    id: 'vehicle-rental',
    kind: 'model',
    role: 'Le véhicule de location : il roule devant nous sur la route du 06, on le rattrape, on le double, il s’arrête au bord du territoire.',
    chapters: ['bascule', 'location'],
    priority: 'proximity',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/models/chr.glb', type: 'model/gltf-binary', bytes: 1764740 }],
    alt: 'Un SUV compact vu de trois quarts arrière sur une route mouillée dans la nuit, feux arrière allumés, la Voie lactée au bout de la route.',
    source: 'Modèle 3D fourni par le porteur du projet (tools/3d/TOYOTA), allégé par scripts/media-3d.mjs',
    license: 'TO_CONFIRM — droits du modèle 3D à confirmer auprès du porteur (usage de démonstration)',
  },
];
