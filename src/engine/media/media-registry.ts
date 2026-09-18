import type { Capabilities } from '../performance/capabilities';
import type { Format } from '../responsive/formats';
import type { MediaDescriptor, MediaStatus, Rendition } from './media-types';

/**
 * Registre des médias : QUAND charger et QUELLE déclinaison, jamais COMMENT montrer.
 * Ordre de priorité (08_MEDIA/MEDIA_PIPELINE.md) : premier écran → transition imminente → scène suivante → différé.
 * - `critical` : au démarrage ; `idle` : après `load`, pendant un temps mort ;
 * - `proximity` : quand un de ses chapitres est à moins de `ahead` chapitres devant (ou `behind` derrière) le chapitre
 *   affiché ; libéré au-delà de `release` (décodeur vidéo rendu, images fermées) ;
 * - économie de données ou réseau 2G : vidéos et séquences jamais chargées, affiche seule ;
 * - changement de format : la déclinaison change, le média est libéré puis rechargé.
 * Le chargement lui-même est confié à une liaison (`bind`) fournie par la scène qui montre le média.
 */
export interface MediaPolicy {
  ahead: number;
  behind: number;
  release: number;
}

export interface MediaBinding {
  load(rendition: Rendition, descriptor: MediaDescriptor): Promise<void>;
  release(): void;
}

export interface MediaEntry {
  readonly descriptor: MediaDescriptor;
  status: MediaStatus;
  rendition: Rendition | null;
  /** Distance (en chapitres) au chapitre affiché ; négative : derrière. */
  distance: number;
  error?: string;
}

export function createMediaRegistry(
  descriptors: readonly MediaDescriptor[],
  options: {
    capabilities: Capabilities;
    chapterIndex: (id: string) => number;
    policy: (format: Format) => MediaPolicy;
    wake: () => void;
  },
) {
  const entries = new Map<string, MediaEntry>(
    descriptors.map((descriptor) => [descriptor.id, { descriptor, status: 'idle', rendition: null, distance: Infinity }]),
  );
  const bindings = new Map<string, MediaBinding>();
  const listeners = new Set<(entry: MediaEntry) => void>();
  let format: Format | null = null;
  let loaded = document.readyState === 'complete';
  let idleReady = false;
  const onLoad = () => {
    loaded = true;
    const run = () => {
      idleReady = true;
      options.wake();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 300);
  };
  if (loaded) onLoad();
  else addEventListener('load', onLoad, { once: true });

  const posterOnly = options.capabilities.saveData || options.capabilities.slowNetwork;

  const emit = (entry: MediaEntry) => {
    for (const fn of listeners) fn(entry);
    options.wake();
  };

  const select = (descriptor: MediaDescriptor, current: Format) =>
    descriptor.renditions.find((r) => r.formats.includes(current)) ?? null;

  const release = (entry: MediaEntry, status: MediaStatus = 'released') => {
    bindings.get(entry.descriptor.id)?.release();
    entry.status = status;
    emit(entry);
  };

  const load = (entry: MediaEntry) => {
    const binding = bindings.get(entry.descriptor.id);
    if (!binding || !entry.rendition) return;
    entry.status = 'loading';
    const rendition = entry.rendition;
    emit(entry);
    binding.load(rendition, entry.descriptor).then(
      () => {
        if (entry.rendition !== rendition || entry.status !== 'loading') return;
        entry.status = 'ready';
        emit(entry);
      },
      (error: unknown) => {
        if (entry.rendition !== rendition) return;
        entry.status = 'error';
        entry.error = error instanceof Error ? error.message : String(error);
        console.warn(`[media] ${entry.descriptor.id} :`, entry.error);
        emit(entry);
      },
    );
  };

  return {
    entries,
    /** Un média lourd est en cours de décodage : la fluidité ne doit pas être jugée pendant ce temps. */
    get busy() {
      for (const entry of entries.values()) if (entry.status === 'loading') return true;
      return false;
    },
    get(id: string) {
      return entries.get(id);
    },
    bind(id: string, binding: MediaBinding) {
      if (!entries.has(id)) throw new Error(`[media] média inconnu : ${id}`);
      bindings.set(id, binding);
      options.wake();
      return () => {
        const entry = entries.get(id);
        if (entry && (entry.status === 'ready' || entry.status === 'loading')) release(entry);
        bindings.delete(id);
      };
    },
    onChange(fn: (entry: MediaEntry) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Phase `media` : décide des chargements et libérations pour le chapitre affiché. */
    update(activeChapter: number, current: Format) {
      const policy = options.policy(current);
      const formatChanged = format !== current;
      format = current;
      for (const entry of entries.values()) {
        const { descriptor } = entry;
        const heavy = descriptor.kind === 'video' || descriptor.kind === 'sequence';
        if (posterOnly && heavy) {
          if (entry.status !== 'poster') {
            if (entry.status === 'ready' || entry.status === 'loading') release(entry, 'poster');
            else {
              entry.status = 'poster';
              emit(entry);
            }
          }
          continue;
        }
        if (formatChanged) {
          const rendition = select(descriptor, current);
          if (rendition !== entry.rendition) {
            if (entry.status === 'ready' || entry.status === 'loading') release(entry, 'idle');
            entry.rendition = rendition;
            if (!rendition && entry.status !== 'poster') {
              entry.status = 'poster';
              emit(entry);
            } else if (rendition && entry.status === 'poster') entry.status = 'idle';
          }
        }
        let distance = Infinity;
        for (const id of descriptor.chapters) {
          const index = options.chapterIndex(id);
          if (index < 0) continue;
          const d = index - activeChapter;
          if (Math.abs(d) < Math.abs(distance)) distance = d;
        }
        entry.distance = distance;
        if (!bindings.has(descriptor.id) || !entry.rendition) continue;
        const idle = entry.status === 'idle' || entry.status === 'released' || entry.status === 'error';
        const near = distance >= 0 ? distance <= policy.ahead : -distance <= policy.behind;
        const wanted =
          descriptor.priority === 'critical' ||
          (descriptor.priority === 'idle' && loaded && idleReady) ||
          (descriptor.priority === 'proximity' && near);
        if (wanted && idle && entry.status !== 'error') load(entry);
        else if (
          descriptor.priority === 'proximity' &&
          Math.abs(distance) > policy.release &&
          (entry.status === 'ready' || entry.status === 'loading')
        )
          release(entry);
      }
    },
    snapshot() {
      return [...entries.values()].map((e) => ({
        id: e.descriptor.id,
        status: e.status,
        src: e.rendition?.src ?? null,
        distance: e.distance,
      }));
    },
    dispose() {
      removeEventListener('load', onLoad);
      for (const entry of entries.values()) if (entry.status === 'ready' || entry.status === 'loading') bindings.get(entry.descriptor.id)?.release();
      bindings.clear();
      listeners.clear();
    },
  };
}

export type MediaRegistry = ReturnType<typeof createMediaRegistry>;
