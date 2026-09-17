import { clamp } from '../math/scalar';

/**
 * Vidéo pilotée par le scroll (patterns 01 et 02 d'Agenceeimoo, mesurés) :
 * - fichier ré-encodé pour le scrub : H.264, GOP 5, sans B-frames, faststart (scripts/media-video.mjs) — un retour
 *   arrière ne redécode jamais plus de 5 images ;
 * - jamais de « tempête de seeks » : une seule demande à la fois (garde `seeking`), et seulement si l'écart dépasse
 *   une demi-image ; la demande suivante part à `seeked` (réveil de la boucle par événement, aucune attente active) ;
 * - requêtes Range obligatoires pour une vidéo servie en HTTP : sans elles `seekable` reste vide et tous les seeks
 *   échouent en silence — contrôlé ici (`health.range`), signalé, et la scène bascule sur son repli. Les scènes
 *   chargent la vidéo en mémoire (video-source.ts, URL blob) : seekable quel que soit l'hébergeur.
 */
export interface VideoScrubHealth {
  /** true : la plage seekable couvre la durée ; false : serveur sans Range (repli) ; null : pas encore connu. */
  range: boolean | null;
  seeks: number;
  /** Durée du dernier seek (ms) et pire durée observée. */
  lastSeekMs: number;
  maxSeekMs: number;
}

export class VideoScrub {
  readonly element: HTMLVideoElement;
  readonly health: VideoScrubHealth = { range: null, seeks: 0, lastSeekMs: 0, maxSeekMs: 0 };
  private desired = 0;
  private seekStart = 0;
  private readonly epsilon: number;
  private readonly abort = new AbortController();

  constructor(
    element: HTMLVideoElement,
    private readonly options: { fps: number; wake: () => void; onFrame?: () => void; onUnseekable?: () => void },
  ) {
    this.element = element;
    this.epsilon = 0.5 / options.fps;
    element.muted = true;
    element.playsInline = true;
    element.preload = 'auto';
    element.disableRemotePlayback = true;
    element.pause();
    const signal = this.abort.signal;
    element.addEventListener(
      'seeked',
      () => {
        this.health.lastSeekMs = performance.now() - this.seekStart;
        this.health.maxSeekMs = Math.max(this.health.maxSeekMs, this.health.lastSeekMs);
        options.onFrame?.();
        options.wake();
      },
      { signal },
    );
    const check = () => {
      if (!Number.isFinite(element.duration) || element.duration <= 0) return;
      const { seekable } = element;
      const ok = seekable.length > 0 && seekable.end(seekable.length - 1) >= element.duration * 0.95;
      if (ok === this.health.range) return;
      this.health.range = ok;
      if (!ok) {
        console.warn(`[video-scrub] ${element.currentSrc} : plage seekable incomplète (serveur sans requêtes Range ?)`);
        options.onUnseekable?.();
      }
      options.wake();
    };
    element.addEventListener('loadedmetadata', check, { signal });
    element.addEventListener('canplay', check, { signal });
    element.addEventListener('loadeddata', () => (options.onFrame?.(), options.wake()), { signal });
  }

  /** Temps voulu (s). */
  set(time: number) {
    const duration = this.element.duration;
    this.desired = clamp(time, 0, Number.isFinite(duration) ? Math.max(duration - 0.001, 0) : time);
  }

  get time() {
    return this.desired;
  }

  /** Phase `media` : lance au plus un seek. Retourne toujours false — le réveil suivant vient de `seeked`. */
  update(): boolean {
    const el = this.element;
    if (el.readyState < HTMLMediaElement.HAVE_METADATA || el.seeking || this.health.range === false) return false;
    if (Math.abs(el.currentTime - this.desired) <= this.epsilon) return false;
    this.seekStart = performance.now();
    this.health.seeks++;
    el.currentTime = this.desired;
    return false;
  }

  /** Libère le décodeur (la ressource reste en cache HTTP). */
  dispose() {
    this.abort.abort();
    const el = this.element;
    el.pause();
    el.removeAttribute('src');
    for (const source of el.querySelectorAll('source')) source.remove();
    el.load();
  }
}
