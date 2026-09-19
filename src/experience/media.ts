import type { MediaDescriptor } from '../engine/media/media-types';

/**
 * Registre média de CAR SERVICE 06 : QUOI charger, QUAND, et d'où ça vient. Provenance et droits :
 * docs/MEDIA_INVENTORY.md.
 *
 * Les deux véhicules du récit sont des modèles 3D fournis par le porteur (tools/3d), taillés pour le téléphone par
 * `npm run media:3d` (750 appels de dessin → 25, moitié moins de triangles, textures WebP, meshopt).
 *
 * Priorité `idle` et NON `proximity` : décoder un modèle et compiler ses shaders bloque le fil principal presque une
 * seconde. Pendant le scroll, c'est une secousse qui fait aussi chuter la définition adaptative pour tout le reste de
 * la page. On paie donc ce coût une seule fois, au repos, juste après le chargement de la page — pendant que le
 * visiteur regarde l'univers d'ouverture, où rien ne bouge tant qu'il ne scrolle pas. Rien n'est libéré ensuite.
 * Aucune plaque ni aucun emblème n'est mis en avant : les plans (shots.ts) évitent les logos.
 */
export const media: readonly MediaDescriptor[] = [
  {
    id: 'galaxy',
    kind: 'model',
    role: 'L’univers du site : un nuage de 50 000 points colorés, qu’on traverse réellement (une image 360° ne peut pas l’être).',
    chapters: ['galaxie', 'descente', 'ville'],
    priority: 'critical',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/models/galaxy.glb', type: 'model/gltf-binary', bytes: 1401380 }],
    alt: 'Une galaxie spirale en trois dimensions, faite de dizaines de milliers d’étoiles colorées.',
    source: 'Modèle 3D fourni par le porteur du projet (tools/3d/GALAXY), allégé par scripts/media-3d.mjs',
    license: 'TO_CONFIRM — origine et licence du modèle à confirmer auprès du porteur',
  },
  {
    id: 'vehicle-cleaning',
    kind: 'model',
    role: 'Le véhicule du récit : sa laque EST la première image du site (unité 1), puis il est sali, parcouru par la ligne de lumière, verni, et visité de l’intérieur.',
    chapters: ['arrivee', 'intervention', 'transformation', 'prestations'],
    priority: 'idle',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/models/rs6.glb', type: 'model/gltf-binary', bytes: 1203772 }],
    alt: 'Une berline sombre posée sur un sol mouillé la nuit : d’abord ternie par une couche de poussière, puis nettoyée et vernie, ses reflets rendus à la carrosserie.',
    source: 'Modèle 3D fourni par le porteur du projet (tools/3d/RS6), allégé par scripts/media-3d.mjs',
    license: 'TO_CONFIRM — droits du modèle 3D à confirmer auprès du porteur (usage de démonstration)',
  },
  {
    id: 'vehicle-rental',
    kind: 'model',
    role: 'Le véhicule de location : il roule devant nous sur la route du 06, on le rattrape, on le double, il s’arrête au bord du territoire.',
    chapters: ['bascule', 'location'],
    priority: 'idle',
    renditions: [{ formats: ['desktop', 'tablet', 'mobile'], src: '/models/chr.glb', type: 'model/gltf-binary', bytes: 652868 }],
    alt: 'Un SUV compact vu de trois quarts arrière sur une route mouillée dans la nuit, feux arrière allumés, la Voie lactée au bout de la route.',
    source: 'Modèle 3D fourni par le porteur du projet (tools/3d/TOYOTA), allégé par scripts/media-3d.mjs',
    license: 'TO_CONFIRM — droits du modèle 3D à confirmer auprès du porteur (usage de démonstration)',
  },
];
