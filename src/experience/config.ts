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
    // le rejoint en une glissade quintique de durée réglée : 26 s par unité de progression (un pas ≈ 1,5–2,2 s),
    // bornée à [1,1 ; 2,2] s. La barre de défilement (petits sauts) est suivie par amorti.
    desktop: { mode: 'glide', rate: 6, maxLag: 0.35, glide: { perUnit: 26, min: 1.1, max: 2.2, jump: 0.004 } },
    // MECA : au doigt, ressort critique (pulsation 4,8 rad/s : 90 % du trajet en ~0,8 s, posé à ~1 s).
    tablet: { mode: 'spring', rate: 4.8, maxLag: 0.12 },
    mobile: { mode: 'spring', rate: 4.8, maxLag: 0.12 },
  },
  // L'affichage est posé à moins d'un demi-pixel de défilement de sa cible : plus aucun rendu.
  settlePx: 0.5,
};

export const STAGE: StageConfig = {
  pixelRatios: {
    // MECA : 1,75 sur ordinateur, un cran de moins si les images ralentissent.
    desktop: [1.75, 1.25, 1, 0.75],
    // MECA : jusqu'à 2 sur écran dense, jamais sous 1,25 (au-delà, l'image devient floue).
    tablet: [2, 1.75, 1.5, 1.25],
    mobile: [2, 1.75, 1.5, 1.25],
  },
  layerMargin: 0.02,
  near: 0.05,
  far: 260,
  exposure: 1,
  background: 0x000000,
  // Focales écrites pour ces rapports d'écran : plus étroit, la focale s'ouvre (le sujet reste dans le cadre).
  referenceAspect: { desktop: 1.6, tablet: 0.75, mobile: 0.46 },
  // Objectif piloté (chapters.ts) : coup de focale, roulis, turbulence (0,0035 rad ≈ 0,2° par unité de canal).
  lens: { fov: 'lensFov', roll: 'lensRoll', shake: { channel: 'shake', amplitude: 0.0035 } },
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
