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
    // Au doigt, ressort critique (MECA : 4,8 rad/s) ralenti à 3,6 rad/s : les vols traversent des kilomètres, un pas
    // se pose en ~1,4 s.
    tablet: { mode: 'spring', rate: 3.6, maxLag: 0.14 },
    mobile: { mode: 'spring', rate: 3.6, maxLag: 0.14 },
  },
  // L'affichage est posé à moins d'un demi-pixel de défilement de sa cible : plus aucun rendu.
  settlePx: 0.5,
};

export const STAGE: StageConfig = {
  pixelRatios: {
    // MECA : 1,75 sur ordinateur, un cran de moins si les images ralentissent.
    desktop: [1.75, 1.25, 1, 0.75],
    // MECA : jamais sous 1,25 (au-delà, l'image devient floue). Téléphone plafonné à 1,75 : le ciel, la mer et le 06 sont
    // calculés par pixel.
    tablet: [2, 1.75, 1.5, 1.25],
    mobile: [1.75, 1.5, 1.25],
  },
  layerMargin: 0.02,
  near: 0.1,
  // Le monde fait des kilomètres : l'ouverture regarde le 06 à 3 km.
  far: 9000,
  exposure: 1,
  background: 0x000000,
  // La caméra la plus basse du récit roule à 1,3 m.
  floor: 1.1,
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

/** Séquences d'images : mémoire bornée (images décodées ≈ 3 Mo chacune en 540 × 854). */
export const SEQUENCE_BUDGET: Record<Format, { window: number; decoded: number; concurrency: number }> = {
  desktop: { window: 24, decoded: 12, concurrency: 6 },
  tablet: { window: 18, decoded: 8, concurrency: 4 },
  mobile: { window: 18, decoded: 6, concurrency: 4 },
};

/**
 * Environnement de nuit pré-calculé (HDRI fourni) — conditionnel : aucune scène ne l'utilise encore.
 * Cube 128 partout par défaut (447 Ko) ; le cube 256 (1,7 Mo, étoiles incompressibles) seulement si un reflet net est
 * validé sur ordinateur.
 */
export const ENVIRONMENT = {
  url: { desktop: '/env/night-128.hdr', tablet: '/env/night-128.hdr', mobile: '/env/night-128.hdr' } satisfies Record<Format, string>,
  sharpUrl: '/env/night-256.hdr',
  intensity: 1,
};
