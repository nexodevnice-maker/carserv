/**
 * Ce que l'appareil permet, relevé une fois au démarrage (sans créer de contexte WebGL : l'échec réel est traité à la
 * création du rendu, avec repli). Le palier (`tier`) est indicatif ; `?tier=high|mid|low` le fixe pour la QA.
 */
export type Tier = 'high' | 'mid' | 'low';

export interface Capabilities {
  webgl2: boolean;
  /** Économie de données demandée : affiches seules, aucune vidéo. */
  saveData: boolean;
  /** Réseau 2G : même politique que `saveData`. */
  slowNetwork: boolean;
  deviceMemory: number | null;
  cores: number | null;
  coarsePointer: boolean;
  hover: boolean;
  devicePixelRatio: number;
  videoFrameCallback: boolean;
  tier: Tier;
}

interface NavigatorExtras {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
}

export function readCapabilities(): Capabilities {
  const nav = navigator as Navigator & NavigatorExtras;
  const saveData = Boolean(nav.connection?.saveData);
  const slowNetwork = /(^|-)2g$/.test(nav.connection?.effectiveType ?? '');
  const deviceMemory = nav.deviceMemory ?? null;
  const cores = nav.hardwareConcurrency || null;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const hover = matchMedia('(hover: hover)').matches;
  const webgl2 = 'WebGL2RenderingContext' in window;

  let tier: Tier = 'mid';
  if (!webgl2 || saveData || (deviceMemory !== null && deviceMemory <= 2) || (cores !== null && cores <= 2)) tier = 'low';
  else if (!coarsePointer && (deviceMemory ?? 8) >= 8 && (cores ?? 8) >= 6) tier = 'high';
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced === 'high' || forced === 'mid' || forced === 'low') tier = forced;

  return {
    webgl2,
    saveData,
    slowNetwork,
    deviceMemory,
    cores,
    coarsePointer,
    hover,
    devicePixelRatio: window.devicePixelRatio || 1,
    videoFrameCallback: 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
    tier,
  };
}
