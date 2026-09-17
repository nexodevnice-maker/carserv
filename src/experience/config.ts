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
    // MECA : molette et pavé avancent déjà par crans → amorti simple (taux 4,5/s).
    desktop: { mode: 'damp', rate: 4.5, maxLag: 0.08 },
    // MECA : au doigt, ressort critique (pulsation 4,8 rad/s : 90 % du trajet en ~0,8 s, posé à ~1 s).
    tablet: { mode: 'spring', rate: 4.8, maxLag: 0.08 },
    mobile: { mode: 'spring', rate: 4.8, maxLag: 0.1 },
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
  far: 200,
  exposure: 1,
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
