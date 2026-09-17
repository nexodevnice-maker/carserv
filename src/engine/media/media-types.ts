import type { Format } from '../responsive/formats';

/**
 * Description d'un média, séparée de son usage : le registre décide quand le charger, quelle déclinaison servir et
 * quand le libérer ; la scène décide comment le montrer.
 */
export type MediaKind = 'video' | 'sequence' | 'image' | 'environment';

/**
 * - `critical` : premier écran, chargé au démarrage ;
 * - `proximity` : chargé quand un de ses chapitres approche (anticipation réglée par format), libéré quand il s'éloigne ;
 * - `idle` : chargé après le chargement de la page, pendant un temps mort.
 */
export type MediaPriority = 'critical' | 'proximity' | 'idle';

export interface Rendition {
  formats: readonly Format[];
  src: string;
  type?: string;
  width: number;
  height: number;
  bytes?: number;
}

export interface Poster {
  src: string;
  avif?: string;
  width: number;
  height: number;
}

export interface MediaDescriptor {
  id: string;
  kind: MediaKind;
  /** Rôle narratif : pourquoi ce média existe. */
  role: string;
  /** Chapitres où il est visible (préchargement de proximité). */
  chapters: readonly string[];
  priority: MediaPriority;
  renditions: readonly Rendition[];
  /** Image fixe : attente, repli (sans WebGL, sans vidéo, économie de données) et mouvement réduit. */
  poster?: Poster;
  /** Alternative textuelle : ce que le média prouve, pas ce qu'il montre en surface. */
  alt: string;
  /** Vidéo pilotée par le scroll : cadence et durée de l'encodage. */
  scrub?: { fps: number; duration: number };
  /**
   * Séquence d'images. Avec `offsets` : la déclinaison est un fichier regroupé (image i = octets offsets[i] à
   * offsets[i+1]) ; sans : son `src` est un motif d'URL (`{i}` : numéro sur 4 chiffres).
   */
  sequence?: { count: number; fps: number; width: number; height: number; type?: string; offsets?: readonly number[] };
  /** Plages nommées (secondes, dans le fichier publié). */
  segments?: Readonly<Record<string, readonly [number, number]>>;
  /** Provenance et droits (jamais affichés tels quels, relevés par content:check). */
  source: string;
  license: string;
}

export type MediaStatus = 'idle' | 'loading' | 'ready' | 'poster' | 'error' | 'released';
