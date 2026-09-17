import { installQaHooks } from '../engine/debug/qa-hooks';
import { createExperience } from '../engine/experience';
import { FrameSequence } from '../engine/media/frame-sequence';
import { createFileSource, createPackSource } from '../engine/media/frame-source';
import { createMediaRegistry } from '../engine/media/media-registry';
import { VideoScrub } from '../engine/media/video-scrub';
import { loadVideoBlob, type VideoBlob } from '../engine/media/video-source';
import type { WebGLStage } from '../engine/webgl/webgl-stage';
import { ENGINE, ENVIRONMENT, MEDIA_POLICY, SEQUENCE_BUDGET, STAGE } from '../experience/config';
import { probeDefinition, probeMedia } from './probe-definition';

/**
 * LABORATOIRE — démarrage de la piste de contrôle. Même câblage qu'une vraie page : moteur, registre média, liaisons
 * vidéo et séquence, scène WebGL chargée en différé, crochets de QA (`__experience`, `__lab`).
 */
export function bootLab() {
  const track = document.querySelector<HTMLElement>('[data-track]');
  const stageEl = track?.querySelector<HTMLElement>('[data-stage]');
  const video = document.querySelector<HTMLVideoElement>('[data-probe-video]');
  const sequenceCanvas = document.querySelector<HTMLCanvasElement>('[data-probe-sequence]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-probe-canvas]');
  const hud = document.querySelector<HTMLElement>('[data-probe-hud]');
  if (!track || !stageEl || !video || !sequenceCanvas || !canvas || !hud) throw new Error('[lab] page incomplète');

  const experience = createExperience(probeDefinition, ENGINE, { track, viewport: stageEl });
  const { state, timeline, capabilities } = experience;
  let version = 0;
  timeline.onMeasure(() => version++);
  experience.onFormat(() => version++);

  const registry = createMediaRegistry(probeMedia, {
    capabilities,
    chapterIndex: (id) => timeline.indexOf(id),
    policy: (format) => MEDIA_POLICY[format],
    wake: experience.invalidate,
  });

  // — Vidéo pilotée, chargée en mémoire (URL blob : seekable sans requêtes Range).
  let scrub: VideoScrub | null = null;
  let videoBlob: VideoBlob | null = null;
  let videoAbort: AbortController | null = null;
  registry.bind('probe-video', {
    async load(rendition, descriptor) {
      videoAbort = new AbortController();
      const loaded = await loadVideoBlob(rendition.src, videoAbort.signal);
      videoBlob = loaded;
      await new Promise<void>((resolve, reject) => {
        scrub = new VideoScrub(video, { fps: descriptor.scrub?.fps ?? 30, wake: experience.invalidate });
        video.addEventListener('loadeddata', () => resolve(), { once: true });
        video.addEventListener('error', () => reject(new Error(`vidéo illisible : ${rendition.src}`)), { once: true });
        video.src = loaded.url;
        video.load();
      });
    },
    release() {
      videoAbort?.abort();
      scrub?.dispose();
      scrub = null;
      videoBlob?.revoke();
      videoBlob = null;
    },
  });

  // — Séquence d'images.
  let sequence: FrameSequence | null = null;
  const context2d = sequenceCanvas.getContext('2d');
  registry.bind('probe-sequence', {
    async load(rendition, descriptor) {
      const info = descriptor.sequence;
      if (!info) throw new Error('séquence sans description');
      sequenceCanvas.width = info.width;
      sequenceCanvas.height = info.height;
      const budget = SEQUENCE_BUDGET[state.format];
      sequence = new FrameSequence({
        source: info.offsets
          ? createPackSource(rendition.src, info.offsets, info.type)
          : createFileSource((i) => rendition.src.replace('{i}', String(i).padStart(4, '0')), info.count),
        fps: info.fps,
        ...budget,
        wake: experience.invalidate,
        onFrame: (bitmap) => context2d?.drawImage(bitmap, 0, 0, sequenceCanvas.width, sequenceCanvas.height),
      });
    },
    release() {
      sequence?.dispose();
      sequence = null;
    },
  });

  experience.use('media', (s) => {
    registry.update(s.chapter.index, s.format);
    if (scrub) {
      scrub.set(s.channels.videoTime ?? 0);
      scrub.update();
    }
    if (sequence) {
      sequence.set(s.channels.sequenceTime ?? 0);
      sequence.update();
    }
  });

  // — Scène WebGL, en différé.
  let stage: WebGLStage | null = null;
  let stageStatus = 'pending';
  if (capabilities.webgl2 && !capabilities.saveData && experience.rig) {
    const rig = experience.rig;
    Promise.all([import('../engine/webgl/webgl-stage'), import('./probe-layer')])
      .then(async ([{ createWebGLStage }, { createProbeLayer }]) => {
        const layer = createProbeLayer({ rig, envUrl: () => ENVIRONMENT.url[state.format], version: () => version });
        stage = await createWebGLStage({
          experience,
          canvas,
          host: stageEl,
          layers: [layer],
          config: STAGE,
          onReady: () => (stageStatus = 'ready'),
          onFallback: (reason) => (stageStatus = `fallback:${reason}`),
        });
        Object.assign(labApi, { probe: () => layer.info() });
      })
      .catch((error: unknown) => {
        stageStatus = `error:${error instanceof Error ? error.message : String(error)}`;
        console.warn('[lab] WebGL indisponible', error);
      });
  } else stageStatus = 'static';

  const video2 = () =>
    scrub && {
      desired: Number(scrub.time.toFixed(3)),
      current: Number(video.currentTime.toFixed(3)),
      seeking: video.seeking,
      readyState: video.readyState,
      seekable: video.seekable.length ? [video.seekable.start(0), Number(video.seekable.end(0).toFixed(3))] : [],
      ...scrub.health,
    };

  installQaHooks(experience, {
    stage: () => (stage ? stage.info() : stageStatus),
    stageStatus: () => stageStatus,
    media: () => registry.snapshot(),
    video: () => video2(),
    sequence: () => sequence?.stats ?? null,
  });

  // L'extension est gardée avant la perte : sur un contexte perdu, getExtension renvoie null.
  let loseExtension: WEBGL_lose_context | null = null;
  const labApi: Record<string, unknown> = {
    disposeStage() {
      stage?.dispose();
      stage = null;
      stageStatus = 'disposed';
      return canvas.getContext('webgl2')?.isContextLost() ?? null;
    },
    loseContext() {
      loseExtension ??= canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context') ?? null;
      loseExtension?.loseContext();
    },
    restoreContext() {
      loseExtension?.restoreContext();
    },
    disposeAll() {
      stage?.dispose();
      registry.dispose();
      experience.dispose();
    },
  };
  Object.assign(window, { __lab: labApi });

  // — Tableau de bord (10 Hz au plus, seulement quand la boucle tourne).
  let lastHud = 0;
  experience.use('debug', (s, info) => {
    // Toujours à la dernière image avant le repos : le tableau ne reste jamais en retard sur l'écran.
    if (info.now - lastHud < 100 && s.moving) return;
    lastHud = info.now;
    const c = s.camera;
    const v = video2();
    const st = stage?.info();
    hud.textContent = [
      `format ${s.format}  tier ${s.capabilities.tier}  reduced ${s.reducedMotion}`,
      `p target ${s.progress.target.toFixed(4)}  shown ${s.progress.shown.toFixed(4)}  ${s.moving ? 'moving' : 'rest'}`,
      `chapter ${s.chapter.id}  local ${s.chapter.local.toFixed(3)}`,
      c ? `camera shot ${c.shot}  travel ${c.travel.toFixed(3)}  fov ${c.fov.toFixed(1)}` : 'camera —',
      st ? `webgl renders ${st.renders}  dpr ${st.pixelRatio}  calls ${st.calls}  tex ${st.textures}  prog ${st.programs}` : `webgl ${stageStatus}`,
      v ? `video ${v.current}/${v.desired}  seeks ${v.seeks}  last ${v.lastSeekMs.toFixed(0)}ms  max ${v.maxSeekMs.toFixed(0)}ms  range ${v.range}` : 'video —',
      sequence ? `sequence ${JSON.stringify(sequence.stats)}` : 'sequence —',
    ].join('\n');
  });

  return experience;
}
