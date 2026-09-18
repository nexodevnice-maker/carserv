import type { EngineConfig } from '../engine/experience';
import type { MediaPolicy } from '../engine/media/media-registry';
import type { Format } from '../engine/responsive/formats';
import type { StageConfig } from '../engine/webgl/webgl-stage';

/**
 * Valeurs de réglage centralisées de CAR SERVICE 06. Aucune valeur de rythme, de budget ou de politique média ne doit
 * être écrite en dur dans une scène : elle vit ici (technique) ou dans chapters.ts (narration), styles/tokens.css
 * (couleur, typographie, espace, durées CSS).
 * Les valeurs marquées « MECA » sont reprises telles quelles de MECA RIVIERA, où elles ont été mesurées.
 */

export const ENGINE: EngineConfig = {
  follow: {
    // Molette, pavé, clavier : un geste = un vol. La page saute au repos suivant (pas guidés instantanés), la caméra
    // le rejoint en une glissade quintique de durée réglée : 34 s par unité de progression (un pas de preuve ≈ 1,9 s,
    // une traversée de l'univers ≈ 4 s), bornée à [1,5 ; 4,2] s. La barre de défilement est suivie par amorti.
    desktop: { mode: 'glide', rate: 6, maxLag: 0.35, glide: { perUnit: 34, min: 1.5, max: 4.2, jump: 0.004 } },
    // AU DOIGT AUSSI : glissade, pas ressort. Avec un ressort, la vitesse de la caméra est celle du geste — un grand
    // balayage avalait un vol pensé pour deux secondes, et on ne voyageait nulle part. En glissade, le pas guidé pose
    // la page sur le repos suivant et la caméra y va en un vol de durée choisie : un geste = un plan, quelle que soit
    // la force du doigt. C'est ça, « le scroll maîtrisé ».
    tablet: { mode: 'glide', rate: 6, maxLag: 0.35, glide: { perUnit: 30, min: 1.4, max: 3.6, jump: 0.004 } },
    mobile: { mode: 'glide', rate: 6, maxLag: 0.35, glide: { perUnit: 30, min: 1.4, max: 3.6, jump: 0.004 } },
  },
  // L'affichage est posé à moins d'un demi-pixel de défilement de sa cible : plus aucun rendu.
  settlePx: 0.5,
};

export const STAGE: StageConfig = {
  pixelRatios: {
    // MECA : 1,75 sur ordinateur, un cran de moins si les images ralentissent.
    desktop: [1.75, 1.25, 1, 0.75],
    // Au téléphone, la netteté EST la qualité : le plancher est remonté à 1,5 (1,25 se voyait immédiatement). Le coût
    // par image a été ramené sous les 16 ms (modèles taillés à 25 appels de dessin) : le cran 2 est un filet, pas un
    // régime de croisière.
    tablet: [2, 1.75, 1.5],
    mobile: [2, 1.75, 1.5],
  },
  layerMargin: 0.02,
  near: 0.1,
  // Le monde fait des kilomètres : l'ouverture regarde le 06 à 3 km, la France à 20 km.
  far: 9000,
  range: { nearScale: 0.0009, nearMax: 12, farScale: 8, farMax: 90000 },
  exposure: 1,
  background: 0x000000,
  // Garde au sol : une trajectoire lisse peut creuser entre deux points, jamais traverser le sol. 0,32 m — la caméra
  // du récit descend à hauteur de moyeu (0,5 m) et frôle le capot (macro) : à 1,1 m, TOUS les plans rasants étaient
  // silencieusement remontés à hauteur d'homme, et l'image devenait celle d'un site, pas d'un film.
  floor: 0.32,
  // Focales écrites pour ces rapports d'écran : plus étroit, la focale s'ouvre (le sujet reste dans le cadre).
  referenceAspect: { desktop: 1.6, tablet: 0.75, mobile: 0.46 },
  // Objectif : turbulence des vols (0,0035 rad ≈ 0,2° par unité, shots.ts) ; au bureau, le regard suit la souris
  // (±4° de lacet, ±2,6° de tangage) — on est la caméra.
  lens: { shake: { channel: 'shake', amplitude: 0.0035 }, look: { yaw: 0.07, pitch: 0.045, rate: 2.4 } },
};

/** Anticipation des chargements, en chapitres. Le mobile anticipe moins (données, mémoire). */
export const MEDIA_POLICY: Record<Format, MediaPolicy> = {
  desktop: { ahead: 2, behind: 1, release: 3 },
  tablet: { ahead: 1, behind: 1, release: 2 },
  mobile: { ahead: 1, behind: 1, release: 2 },
};

/**
 * Séquences d'images : mémoire bornée (images décodées ≈ 3 Mo chacune en 540 × 854).
 * Le site n'affiche plus de séquence ; seul le laboratoire (src/pages/lab) s'en sert pour éprouver le moteur.
 */
export const SEQUENCE_BUDGET: Record<Format, { window: number; decoded: number; concurrency: number }> = {
  desktop: { window: 24, decoded: 12, concurrency: 6 },
  tablet: { window: 18, decoded: 8, concurrency: 4 },
  mobile: { window: 18, decoded: 6, concurrency: 4 },
};

/** Relevé photographique de l'enrobé (Poly Haven « Asphalt 06 », CC0), partagé par la chaussée et la place. */
export const ROAD_ASPHALT = {
  albedo: '/media/road/asphalt-albedo.webp',
  arm: '/media/road/asphalt-arm.webp',
  normal: '/media/road/asphalt-normal.webp',
};

/**
 * Destination des demandes de rendez-vous. Ce n'est PAS une adresse de l'entreprise (aucune n'est connue,
 * BUSINESS_TRUTH) : c'est la boîte de la maquette, qui relaie les demandes. Le courriel est préparé dans la messagerie
 * du visiteur : rien ne transite par un serveur.
 */
export const CONTACT = { inbox: 'nexodevnice@gmail.com' };

/**
 * Environnement de nuit pré-calculé (HDRI fourni) : la seule chose qui fasse lire une carrosserie dans le noir (les
 * reflets). Utilisé par les véhicules 3D et par eux seuls (scenes/vehicle/vehicle-light).
 * Cube 128 au téléphone et sur tablette (447 Ko) ; cube 256 sur ordinateur (1,7 Mo, étoiles incompressibles), où le
 * reflet est assez grand pour qu'on y distingue la Voie lactée.
 */
export const ENVIRONMENT = {
  // Cube 256 sur ordinateur (reflet net), cube 128 au téléphone : l'environnement est chargé AVANT la première image
  // (la laque est le premier plan du récit) — 1,3 Mo de moins, c'est une seconde de rideau en moins.
  url: { desktop: '/env/night-256.hdr', tablet: '/env/night-128.hdr', mobile: '/env/night-128.hdr' } satisfies Record<Format, string>,
  sharpUrl: '/env/night-256.hdr',
  /** Les valeurs du HDRI sont celles d'une nuit : il faut les pousser pour que la laque existe. Le canal `gloss`
   * module ce niveau autour de 1 (plans de matière : un vrai miroir ; le reste du récit : une nuit polie). */
  intensity: 3.4,
};
