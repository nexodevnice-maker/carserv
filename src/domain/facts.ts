/**
 * Vérité commerciale typée (05_BUSINESS/BUSINESS_TRUTH.md). Chaque information porte son statut et sa source :
 * - CONFIRMED  : lisible dans une source fournie (flyer, vidéo) ou confirmée par le porteur ;
 * - TO_CONFIRM : présent dans une source mais ambigu (portée, conditions, actualité) — affichable en démonstration,
 *                à valider avant publication ;
 * - UNKNOWN    : absent des sources — jamais affiché, jamais deviné.
 * `npm run content:check` liste tout ce qui n'est pas CONFIRMED.
 */
export type Status = 'CONFIRMED' | 'TO_CONFIRM' | 'UNKNOWN';

export interface Fact<T> {
  value: T;
  status: Status;
  source: SourceId;
  note?: string;
}

/** Sources inventoriées dans docs/MEDIA_INVENTORY.md. */
export const SOURCES = {
  'flyer-main': 'tools/flyers/MAIN.png — story Snapchat « Car-service06 », flyer nettoyage (relevé du 17/09/2026)',
  'flyer-loc': 'tools/flyers/LOC.png — story Snapchat « Car-service06 », flyer location (relevé du 17/09/2026)',
  'video-story': 'tools/3d/ScreenRecording_09-16-2026 22-57-08_1.mp4 — story Snapchat « Car-service06 » enregistrée',
  none: 'aucune source',
} as const;

export type SourceId = keyof typeof SOURCES;

export const fact = <T>(value: T, status: Status, source: SourceId, note?: string): Fact<T> => ({ value, status, source, note });

/** Valeur affichable : jamais une information UNKNOWN. */
export const shown = <T>(f: Fact<T>): T | null => (f.status === 'UNKNOWN' ? null : f.value);
