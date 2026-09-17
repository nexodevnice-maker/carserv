import type { Experience } from '../experience';

/**
 * Crochets de QA (`window.__experience`) : état lisible, affichage posé immédiatement, saut à une progression.
 * Présents en développement, ou sur une page qui les demande (`<html data-qa>`, le laboratoire) ; absents du site
 * publié.
 */
export function installQaHooks(experience: Experience, extra: Record<string, () => unknown> = {}) {
  if (!import.meta.env.DEV && !document.documentElement.hasAttribute('data-qa')) return () => {};
  const { state, timeline, scheduler } = experience;
  const api = {
    info() {
      const { camera } = state;
      return {
        frame: state.frame,
        awake: scheduler.awake,
        frames: scheduler.frames,
        format: state.format,
        reducedMotion: state.reducedMotion,
        tier: state.capabilities.tier,
        scrollY: state.scroll.y,
        target: Number(state.progress.target.toFixed(5)),
        shown: Number(state.progress.shown.toFixed(5)),
        moving: state.moving,
        chapter: state.chapter.id,
        local: Number(state.chapter.local.toFixed(4)),
        camera: camera && {
          position: camera.position.map((v) => Number(v.toFixed(4))),
          target: camera.target.map((v) => Number(v.toFixed(4))),
          fov: Number(camera.fov.toFixed(3)),
          shot: camera.shot,
          travel: Number(camera.travel.toFixed(4)),
        },
        channels: Object.fromEntries(Object.entries(state.channels).map(([k, v]) => [k, Number(v.toFixed(4))])),
        ...Object.fromEntries(Object.entries(extra).map(([k, fn]) => [k, fn()])),
      };
    },
    chapters() {
      return timeline.chapters.map((c) => ({ id: c.id, start: Number(c.start.toFixed(5)), end: Number(c.end.toFixed(5)) }));
    },
    length: () => timeline.length,
    scrollFor: (p: number) => timeline.scrollFor(p),
    seek(p: number) {
      experience.seek(p, 'instant');
    },
    settle() {
      experience.settle();
    },
  };
  Object.assign(window, { __experience: api });
  return () => {
    delete (window as { __experience?: unknown }).__experience;
  };
}
