/**
 * Une seule boucle d'images pour toute la page.
 * Les tâches s'exécutent dans un ordre fixe (entrée → état → caméra → média → WebGL → DOM → QA), une fois par image.
 * Au repos, la boucle dort : elle ne repart que sur `invalidate()` (scroll, redimensionnement, média prêt) ou tant
 * qu'une tâche déclare avoir encore du mouvement (retour `true`). Onglet caché : aucune image.
 *
 * Remplace les boucles par scène de MECA RIVIERA (une par section, chacune avec son IntersectionObserver) : un seul
 * propriétaire du temps, aucune boucle concurrente, un état cohérent par image.
 */
export type Phase = 'input' | 'state' | 'camera' | 'media' | 'webgl' | 'dom' | 'debug';

const ORDER: Record<Phase, number> = { input: 0, state: 10, camera: 20, media: 30, webgl: 40, dom: 50, debug: 90 };

export interface FrameInfo {
  /** Horloge (ms) de l'image. */
  now: number;
  /** Intervalle (s) depuis l'image précédente, borné à 0,1 s ; 1/60 au réveil. */
  dt: number;
  frame: number;
}

/** Retourne `true` pour demander une image de plus (mouvement en cours). */
export type FrameTask = (info: FrameInfo) => boolean | void;

export interface Scheduler {
  add(phase: Phase, task: FrameTask): () => void;
  invalidate(): void;
  readonly frames: number;
  readonly awake: boolean;
  dispose(): void;
}

export function createScheduler(): Scheduler {
  let tasks: { order: number; task: FrameTask }[] = [];
  let raf = 0;
  let last = 0;
  let frames = 0;
  let invalid = false;
  let disposed = false;
  const info: FrameInfo = { now: 0, dt: 1 / 60, frame: 0 };

  const loop = (now: number) => {
    raf = 0;
    info.dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    info.now = now;
    info.frame = ++frames;
    last = now;
    invalid = false;
    let busy = false;
    // Copie : une tâche peut en retirer une autre pendant l'image.
    for (const { task } of tasks.slice()) {
      try {
        if (task(info) === true) busy = true;
      } catch (error) {
        // Une tâche en échec ne fige pas la page : signalée, les autres continuent.
        console.error('[scheduler]', error);
      }
    }
    if ((busy || invalid) && !disposed && !document.hidden) raf = requestAnimationFrame(loop);
    else last = 0;
  };

  const invalidate = () => {
    invalid = true;
    if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(loop);
  };

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else invalidate();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    add(phase, task) {
      const entry = { order: ORDER[phase], task };
      tasks = [...tasks, entry].sort((a, b) => a.order - b.order);
      invalidate();
      return () => {
        tasks = tasks.filter((t) => t !== entry);
      };
    },
    invalidate,
    get frames() {
      return frames;
    },
    get awake() {
      return raf !== 0;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      tasks = [];
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
