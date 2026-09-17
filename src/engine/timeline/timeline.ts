import { clamp01 } from '../math/scalar';

/**
 * La piste : scroll → progression normalisée p ∈ [0, 1], découpée en chapitres.
 *
 * Modèle (mesuré, jamais supposé) :
 * - la piste `[data-track]` contient une vue épinglée (sticky, 100svh) et, dans le flux, les chapitres
 *   `[data-chapter]` dont la hauteur fait le rythme (données → variable CSS `--span`, lisible sans script) ;
 * - p = (scrollY − haut de la piste) / (hauteur de la piste − hauteur de la vue) : linéaire, 0 quand la vue s'épingle,
 *   1 quand elle se libère ;
 * - le chapitre k occupe [haut_k, bas_k] / hauteur de la piste : les chapitres partagent [0, 1] exactement, au prorata
 *   de leur hauteur réelle. Une ligne de lecture qui descend de 0 à 100 % de la vue traverse les sections dans le flux :
 *   le premier chapitre est actif au départ, le dernier est entièrement dans la vue à la fin, sans zone morte.
 *
 * Aucune lecture de mise en page par image : mesure au chargement, au redimensionnement, au chargement des polices et
 * au changement de taille du contenu (regroupée à l'image suivante).
 * Hauteur de référence : celle de la vue épinglée (100svh) — la barre d'adresse mobile qui se replie ne déplace rien.
 */
export interface ChapterRange {
  readonly id: string;
  readonly index: number;
  start: number;
  end: number;
  readonly element: HTMLElement;
}

export interface Timeline {
  readonly chapters: readonly ChapterRange[];
  /** Longueur de défilement de la piste (px). */
  readonly length: number;
  /** Haut de la piste dans le document (px). */
  readonly top: number;
  progressAt(scrollY: number): number;
  /** Position de défilement (scrollY) où la progression vaut `p`. */
  scrollFor(p: number): number;
  /** Chapitre contenant `p` ; la position locale est écrite dans `out.local`. */
  locate(p: number, out?: { index: number; local: number }): { index: number; local: number };
  indexOf(id: string): number;
  /** Position globale d'une position locale (0–1) dans un chapitre. */
  toGlobal(chapter: string | number, local: number): number;
  measure(): void;
  requestMeasure(): void;
  onMeasure(fn: () => void): () => void;
  dispose(): void;
}

export function createTimeline(track: HTMLElement, viewport: HTMLElement | null): Timeline {
  const elements = [...track.querySelectorAll<HTMLElement>('[data-chapter]')];
  if (!elements.length) throw new Error('[timeline] aucun [data-chapter] dans la piste');
  const chapters: ChapterRange[] = elements.map((element, index) => ({
    id: element.dataset.chapter as string,
    index,
    start: index / elements.length,
    end: (index + 1) / elements.length,
    element,
  }));
  const byId = new Map(chapters.map((c) => [c.id, c.index]));
  let top = 0;
  let length = 1;
  let frame = 0;
  const listeners = new Set<() => void>();

  const measure = () => {
    frame = 0;
    const rect = track.getBoundingClientRect();
    top = rect.top + window.scrollY;
    const height = Math.max(rect.height, 1);
    const view = viewport?.clientHeight || window.innerHeight;
    length = Math.max(height - view, 1);
    const tops = chapters.map((c) => (c.element.getBoundingClientRect().top + window.scrollY - top) / height);
    chapters.forEach((c, k) => {
      c.start = k === 0 ? 0 : clamp01(tops[k] ?? 0);
      c.end = k === chapters.length - 1 ? 1 : clamp01(tops[k + 1] ?? 1);
    });
    for (const fn of listeners) fn();
  };

  const requestMeasure = () => {
    frame ||= requestAnimationFrame(measure);
  };

  const scratch = { index: 0, local: 0 };
  const locate = (p: number, out = scratch) => {
    let index = 0;
    for (let k = chapters.length - 1; k >= 0; k--) {
      const chapter = chapters[k];
      if (chapter && p >= chapter.start) {
        index = k;
        break;
      }
    }
    const c = chapters[index] as ChapterRange;
    out.index = index;
    out.local = c.end > c.start ? clamp01((p - c.start) / (c.end - c.start)) : 0;
    return out;
  };

  addEventListener('resize', requestMeasure);
  const observer = new ResizeObserver(requestMeasure);
  observer.observe(track);
  if (viewport) observer.observe(viewport);
  document.fonts?.ready.then(requestMeasure);
  measure();

  return {
    chapters,
    get length() {
      return length;
    },
    get top() {
      return top;
    },
    progressAt: (scrollY) => clamp01((scrollY - top) / length),
    scrollFor: (p) => top + clamp01(p) * length,
    locate,
    indexOf: (id) => byId.get(id) ?? -1,
    toGlobal(chapter, local) {
      const index = typeof chapter === 'number' ? chapter : (byId.get(chapter) ?? -1);
      const c = chapters[index];
      if (!c) throw new Error(`[timeline] chapitre inconnu : ${String(chapter)}`);
      return c.start + clamp01(local) * (c.end - c.start);
    },
    measure,
    requestMeasure,
    onMeasure(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispose() {
      removeEventListener('resize', requestMeasure);
      observer.disconnect();
      cancelAnimationFrame(frame);
      listeners.clear();
    },
  };
}
