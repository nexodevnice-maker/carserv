import { clamp } from '../math/scalar';
import type { FrameSource } from './frame-source';

/**
 * Séquence d'images pilotée par le scroll : le repli certain du scrub vidéo (aucun seek décodeur, insensible au mode
 * économie d'énergie iOS — leçon Agenceeimoo). Déterministe : à un temps correspond une image.
 *
 * Mémoire bornée en deux étages :
 * - images compressées (Blob, quelques dizaines de Ko) : fenêtre autour de la position, chargées par priorité de
 *   distance, `concurrency` requêtes à la fois ;
 * - images décodées (ImageBitmap, plusieurs Mo chacune) : quelques-unes seulement (`decoded`), fermées dès qu'elles
 *   sortent du cache (`close()`).
 * Tant que l'image exacte n'est pas prête, la plus proche déjà décodée est montrée : jamais de trou.
 */
export interface FrameSequenceOptions {
  /** Fichier regroupé (Range) ou fichiers séparés : frame-source.ts. */
  source: FrameSource;
  fps: number;
  /** Images compressées gardées de part et d'autre de la position. */
  window: number;
  /** Images décodées gardées. */
  decoded: number;
  concurrency: number;
  wake: () => void;
  onFrame?: (bitmap: ImageBitmap, index: number) => void;
}

export class FrameSequence {
  private target = 0;
  private shown = -1;
  private readonly blobs = new Map<number, Blob>();
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly inflight = new Set<number>();
  private decoding = -1;
  private readonly abort = new AbortController();
  private disposed = false;

  constructor(private readonly options: FrameSequenceOptions) {}

  get index() {
    return this.target;
  }

  get current(): ImageBitmap | null {
    return this.bitmaps.get(this.shown) ?? null;
  }

  get stats() {
    return { target: this.target, shown: this.shown, blobs: this.blobs.size, bitmaps: this.bitmaps.size };
  }

  set(time: number) {
    this.target = clamp(Math.round(time * this.options.fps), 0, this.options.source.count - 1);
  }

  /** L'image voulue est affichée. */
  get ready() {
    return this.shown === this.target;
  }

  /**
   * Phase `media`. Retourne toujours false : chaque chargement ou décodage terminé réveille la boucle (`wake`), aucune
   * attente active — une image introuvable ne fait pas tourner la page à vide.
   */
  update(): boolean {
    if (this.disposed) return false;
    this.fetchWindow();
    this.decode();
    const best = this.nearestDecoded();
    if (best !== -1 && best !== this.shown) {
      this.shown = best;
      this.options.onFrame?.(this.bitmaps.get(best) as ImageBitmap, best);
    }
    return false;
  }

  private fetchWindow() {
    const { source, window, concurrency } = this.options;
    for (let d = 0; d <= window && this.inflight.size < concurrency; d++) {
      for (const index of d === 0 ? [this.target] : [this.target + d, this.target - d]) {
        if (index < 0 || index >= source.count || this.blobs.has(index) || this.inflight.has(index)) continue;
        if (this.inflight.size >= concurrency) break;
        this.inflight.add(index);
        source
          .fetch(index, this.abort.signal)
          .then((blob) => {
            this.blobs.set(index, blob);
          })
          .catch((error: Error) => {
            if (error.name !== 'AbortError') console.warn(`[sequence] image ${index} :`, error.message);
          })
          .finally(() => {
            this.inflight.delete(index);
            this.options.wake();
          });
      }
    }
    // Hors fenêtre : les images compressées lointaines sont oubliées.
    for (const index of this.blobs.keys()) if (Math.abs(index - this.target) > window * 2) this.blobs.delete(index);
  }

  private decode() {
    if (this.decoding !== -1 || this.bitmaps.has(this.target)) return;
    // L'image voulue d'abord. Tant qu'elle n'est pas téléchargée : une voisine seulement si rien d'assez proche n'est
    // déjà décodé (sinon décoder puis évincer en boucle).
    let index = this.blobs.has(this.target) ? this.target : -1;
    if (index === -1) {
      const nearest = this.nearestDecoded();
      if (nearest !== -1 && Math.abs(nearest - this.target) <= 2) return;
      for (let d = 1; d <= this.options.window && index === -1; d++) {
        if (this.blobs.has(this.target + d) && !this.bitmaps.has(this.target + d)) index = this.target + d;
        else if (this.blobs.has(this.target - d) && !this.bitmaps.has(this.target - d)) index = this.target - d;
      }
    }
    const blob = this.blobs.get(index);
    if (!blob) return;
    this.decoding = index;
    createImageBitmap(blob)
      .then((bitmap) => {
        if (this.disposed) return bitmap.close();
        this.bitmaps.set(index, bitmap);
        this.evict();
      })
      .catch((error: Error) => console.warn(`[sequence] décodage ${index} :`, error.message))
      .finally(() => {
        this.decoding = -1;
        this.options.wake();
      });
  }

  private evict() {
    if (this.bitmaps.size <= this.options.decoded) return;
    const far = [...this.bitmaps.keys()]
      .filter((index) => index !== this.shown)
      .sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    for (const index of far.slice(0, this.bitmaps.size - this.options.decoded)) {
      this.bitmaps.get(index)?.close();
      this.bitmaps.delete(index);
    }
  }

  private nearestDecoded() {
    let best = -1;
    for (const index of this.bitmaps.keys()) if (best === -1 || Math.abs(index - this.target) < Math.abs(best - this.target)) best = index;
    return best;
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    for (const bitmap of this.bitmaps.values()) bitmap.close();
    this.bitmaps.clear();
    this.blobs.clear();
  }
}
