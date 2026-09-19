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
    // Le plancher était à 1,5 : un téléphone qui n'y arrive pas n'avait plus aucune marge et restait à saccader
    // pour rien. Deux crans de secours en dessous — on ne les atteint que si le rythme le demande vraiment, et la
    // fluidité vaut mieux que la netteté quand il faut choisir.
    tablet: [2, 1.75, 1.5, 1.25],
    mobile: [2, 1.75, 1.5, 1.25, 1],
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
  /**
   * LA PASSE D'IMAGE. Le récit se joue de nuit, et une nuit sans halo autour des sources n'est pas une nuit : c'est
   * un fond noir avec des taches claires dessus. Les valeurs sont volontairement basses — il s'agit de faire croire
   * à une optique, pas d'ajouter un effet.
   *
   * `maxLevel: 1` : le halo survit à un cran de définition en moins, pas à deux. Passé là, le téléphone rame pour de
   * vrai et la fluidité vaut mieux que la photographie.
   * `grain: 0,012` ≈ trois valeurs sur 255 : c'est d'abord un TRAMAGE. Sans lui, le dégradé du ciel et le cône de
   * brume des candélabres se découpent en bandes sur un écran 8 bits — le défaut le plus visible d'une image sombre.
   */
  post: {
    maxLevel: 1,
    scale: 4,
    // Seuil en valeur d'écran : au-dessus, une source « déborde ». À 0,5, les phares, les lampes, la ligne d'or, le
    // liseré des tarifs et les étoiles débordent ; la carrosserie et le béton, non.
    threshold: 0.5,
    knee: 0.25,
    bloom: 0.55,
    // Le canal `bloom` (chapters.ts) module cette intensité : plein partout, retenu dans la galaxie où les sources
    // sont déjà par milliers.
    channel: 'bloom',
    spread: 1.6,
    // Mesurée vers les ANGLES, pas vers les bords : sur un écran de téléphone, tout ce qui compte est au milieu de la
    // hauteur, et une vignette un peu forte y mange le sol de la place.
    vignette: 0.18,
    grain: 0.012,
    // La lune est froide, les candélabres au sodium sont ambrés : on accentue ce que la scène contient déjà. Les deux
    // teintes se compensent (moyenne ≈ 1) : l'étalonnage colore, il n'assombrit pas.
    shadowTint: [0.96, 0.98, 1.06],
    lightTint: [1.06, 1.0, 0.94],
    contrast: 0.07,
  },
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
  /**
   * Ce que l'environnement ÉCLAIRE, pas ce qu'il reflète. Il était à 3,4 : la laque noire virait au kaki, les
   * façades au beige, et la nuit n'avait plus de noir — tout l'écran tombait dans le même sépia. La forme du
   * véhicule vient désormais de ses deux sources dirigées (scenes/vehicle/vehicle-light), l'environnement ne fait
   * plus que le reflet. Le canal `gloss` module ce niveau autour de 1.
   */
  intensity: 1.15,
};
