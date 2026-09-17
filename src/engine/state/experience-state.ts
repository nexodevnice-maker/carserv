import type { CameraPose } from '../camera/camera-rig';
import type { Capabilities } from '../performance/capabilities';
import type { Format } from '../responsive/formats';
import type { ScrollSample } from '../scroll/scroll-input';

/**
 * État maître de l'expérience : un seul objet, recalculé une fois par image depuis la progression, lu par tous les
 * abonnés (caméra, médias, WebGL, DOM). Aucun abonné n'écrit dedans ; aucun ne garde de référence d'une image à
 * l'autre (l'objet est réutilisé, sans allocation).
 *
 * `progress.target` : ce que demande le scroll. `progress.shown` : ce que l'écran montre (amorti, ressort, ou repos le
 * plus proche en mouvement réduit). Tout ce qui se voit dérive de `shown` : l'état visuel se reconstruit toujours
 * depuis une progression.
 */
export interface ExperienceState {
  frame: number;
  /** Horloge (ms). */
  time: number;
  /** s. */
  dt: number;
  format: Format;
  reducedMotion: boolean;
  capabilities: Capabilities;
  scroll: ScrollSample;
  progress: {
    target: number;
    shown: number;
    /** Vitesse de `shown` (progression par seconde). */
    velocity: number;
  };
  chapter: {
    index: number;
    id: string;
    /** Position dans le chapitre affiché (0–1). */
    local: number;
  };
  /** Position locale de chaque chapitre (0 avant, 1 après). */
  locals: Float64Array;
  camera: CameraPose | null;
  /** Canaux nommés (temps vidéo, uniformes, opacités…) évalués sur `shown`. */
  channels: Record<string, number>;
  /** L'affichage rejoint encore sa cible. */
  moving: boolean;
}
