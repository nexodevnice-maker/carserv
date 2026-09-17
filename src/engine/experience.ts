import { watchReducedMotion } from './accessibility/motion-preference';
import { createCameraRig, createPose, type ShotDefinition } from './camera/camera-rig';
import { createDomWriter } from './dom/dom-writer';
import { clamp01, fixed } from './math/scalar';
import { createFollow, type FollowParams } from './motion/follow';
import { readCapabilities } from './performance/capabilities';
import { createScheduler, type FrameInfo, type Phase } from './performance/scheduler';
import { watchFormat, type Format } from './responsive/formats';
import { createScrollInput } from './scroll/scroll-input';
import type { ExperienceState } from './state/experience-state';
import { createChannel, type NumberKey } from './timeline/keys';
import { createTimeline } from './timeline/timeline';

/**
 * Orchestrateur : SCROLL → PROGRESSION NORMALISÉE → ÉTAT MAÎTRE → abonnés (caméra, médias, WebGL, DOM).
 * Générique : aucune donnée CAR SERVICE 06 ici. Un projet fournit une définition (chapitres, plans, canaux) et une
 * configuration (suivi par format) ; il branche ses scènes avec `use(phase, …)`.
 *
 * Une seule boucle (scheduler), une seule lecture du scroll par image, une seule évaluation de l'état ; les abonnés
 * lisent, n'écrivent pas l'état. Au repos, rien ne tourne.
 */
export interface ChapterDefinition {
  id: string;
  /** Positions locales (0–1) où le mouvement réduit pose l'affichage. Défaut : aucune (les plans caméra suffisent). */
  rests?: readonly number[];
}

export interface ExperienceDefinition {
  chapters: readonly ChapterDefinition[];
  shots?: readonly ShotDefinition[];
  channels?: Readonly<Record<string, readonly NumberKey[]>>;
}

export interface EngineConfig {
  follow: Record<Format, Omit<FollowParams, 'epsilon'>>;
  /** Écart (px de scroll) sous lequel l'affichage est posé sur sa cible. */
  settlePx: number;
}

export type Subscriber = (state: Readonly<ExperienceState>, info: FrameInfo) => boolean | void;

export function createExperience(
  definition: ExperienceDefinition,
  config: EngineConfig,
  elements: { track: HTMLElement; viewport: HTMLElement | null },
) {
  const scheduler = createScheduler();
  const capabilities = readCapabilities();
  const timeline = createTimeline(elements.track, elements.viewport);
  const dom = createDomWriter();

  // La page et la définition doivent décrire les mêmes chapitres, dans le même ordre.
  const pageIds = timeline.chapters.map((c) => c.id).join(',');
  const definedIds = definition.chapters.map((c) => c.id).join(',');
  if (pageIds !== definedIds) throw new Error(`[experience] chapitres de la page (${pageIds}) ≠ définition (${definedIds})`);

  const rig = definition.shots?.length ? createCameraRig(definition.shots) : null;
  const pose = rig ? createPose() : null;
  const channels = Object.entries(definition.channels ?? {}).map(([name, keys]) => ({ name, channel: createChannel(keys) }));
  const follow = createFollow();
  const scroll = createScrollInput(scheduler.invalidate);
  const formatWatch = watchFormat((format) => {
    state.format = format;
    resolve();
    for (const fn of formatListeners) fn(format);
  });
  const motion = watchReducedMotion((reduced) => {
    state.reducedMotion = reduced;
    document.documentElement.classList.toggle('is-reduced-motion', reduced);
    follow.reset();
    scheduler.invalidate();
  });
  const formatListeners = new Set<(format: Format) => void>();

  const state: ExperienceState = {
    frame: 0,
    time: 0,
    dt: 1 / 60,
    format: formatWatch.current,
    reducedMotion: motion.reduced,
    capabilities,
    scroll: scroll.current,
    progress: { target: 0, shown: 0, velocity: 0 },
    chapter: { index: 0, id: timeline.chapters[0]?.id ?? '', local: 0 },
    locals: new Float64Array(timeline.chapters.length),
    camera: pose,
    channels: Object.fromEntries(channels.map(({ name }) => [name, 0])),
    moving: false,
  };

  /** Repos du mouvement réduit : plans caméra et repos déclarés des chapitres, triés. */
  let rests: number[] = [];
  const resolve = () => {
    rig?.resolve(timeline, state.format);
    for (const { channel } of channels) channel.resolve(timeline);
    const declared = definition.chapters.flatMap((c) => (c.rests ?? []).map((local) => timeline.toGlobal(c.id, local)));
    rests = [...new Set([...(rig?.rests() ?? []), ...declared])].sort((a, b) => a - b);
    scheduler.invalidate();
  };
  timeline.onMeasure(resolve);
  resolve();

  const nearestRest = (p: number) => {
    let best = p;
    let gap = Infinity;
    for (const rest of rests) {
      const d = Math.abs(rest - p);
      if (d < gap) {
        gap = d;
        best = rest;
      }
    }
    return best;
  };

  let settled = false;
  const params: FollowParams = { mode: 'damp', rate: 1, maxLag: 1, epsilon: 1e-4 };
  const evaluate = (info: FrameInfo) => {
    state.frame = info.frame;
    state.time = info.now;
    state.dt = info.dt;
    scroll.read(info.dt);
    const progress = state.progress;
    progress.target = timeline.progressAt(state.scroll.y);
    const previous = progress.shown;
    Object.assign(params, config.follow[state.format]);
    params.epsilon = config.settlePx / timeline.length;
    if (state.reducedMotion) {
      progress.shown = rests.length ? nearestRest(progress.target) : progress.target;
      state.moving = false;
    } else if (settled) {
      settled = false;
      progress.shown = progress.target;
      follow.reset();
      state.moving = false;
    } else if (follow.moving(progress.shown, progress.target, params.epsilon)) {
      progress.shown = clamp01(follow.step(progress.shown, progress.target, info.dt, params));
      state.moving = follow.moving(progress.shown, progress.target, params.epsilon);
    } else state.moving = false;
    progress.velocity = info.dt > 0 ? (progress.shown - previous) / info.dt : 0;

    const shown = progress.shown;
    const where = timeline.locate(shown);
    state.chapter.index = where.index;
    state.chapter.local = where.local;
    state.chapter.id = timeline.chapters[where.index]?.id ?? '';
    timeline.chapters.forEach((c, k) => {
      state.locals[k] = c.end > c.start ? clamp01((shown - c.start) / (c.end - c.start)) : 0;
    });
    if (rig && pose) rig.evaluate(shown, pose);
    for (const { name, channel } of channels) state.channels[name] = channel.value(shown);
    return state.moving;
  };
  scheduler.add('state', evaluate);

  // DOM : progression globale et état de chaque chapitre, pour les styles qui en dépendent (sans script : absents).
  // La piste porte `data-active-chapter` — jamais `data-chapter`, réservé aux sections mesurées.
  scheduler.add('dom', () => {
    dom.setVar(elements.track, '--p', fixed(state.progress.shown));
    dom.setData(elements.track, 'activeChapter', state.chapter.id);
    timeline.chapters.forEach((c, k) => {
      dom.setVar(c.element, '--local', fixed(state.locals[k] ?? 0));
      dom.setData(c.element, 'state', k < state.chapter.index ? 'before' : k > state.chapter.index ? 'after' : 'active');
    });
  });

  const disposers: (() => void)[] = [];

  return {
    state: state as Readonly<ExperienceState>,
    timeline,
    scheduler,
    capabilities,
    rig,
    /** Branche un abonné sur une phase de l'image. Retourner true demande une image de plus. */
    use(phase: Exclude<Phase, 'state'>, subscriber: Subscriber) {
      const remove = scheduler.add(phase, (info) => subscriber(state, info));
      disposers.push(remove);
      return remove;
    },
    /** Repos (progression globale, triés) : plans caméra et repos déclarés — pas guidés, mouvement réduit. */
    rests: () => rests as readonly number[],
    onFormat(fn: (format: Format) => void) {
      formatListeners.add(fn);
      return () => formatListeners.delete(fn);
    },
    invalidate: scheduler.invalidate,
    /** Défile jusqu'à une progression, ou une position locale d'un chapitre. */
    seek(to: number | { chapter: string; local?: number }, behavior: ScrollBehavior = 'instant') {
      const p = typeof to === 'number' ? to : timeline.toGlobal(to.chapter, to.local ?? 0);
      window.scrollTo({ top: timeline.scrollFor(p), behavior });
    },
    /** QA : l'affichage rejoint sa cible dès l'image suivante (captures déterministes). */
    settle() {
      settled = true;
      scheduler.invalidate();
    },
    dispose() {
      for (const remove of disposers) remove();
      scheduler.dispose();
      timeline.dispose();
      scroll.dispose();
      formatWatch.dispose();
      motion.dispose();
      formatListeners.clear();
    },
  };
}

export type Experience = ReturnType<typeof createExperience>;
