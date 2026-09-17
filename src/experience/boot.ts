import { installQaHooks } from '../engine/debug/qa-hooks';
import { createDomWriter } from '../engine/dom/dom-writer';
import { createExperience } from '../engine/experience';
import { FrameSequence } from '../engine/media/frame-sequence';
import { createPackSource } from '../engine/media/frame-source';
import { createMediaRegistry } from '../engine/media/media-registry';
import { VideoScrub } from '../engine/media/video-scrub';
import { loadVideoBlob, type VideoBlob } from '../engine/media/video-source';
import { createGuide } from '../engine/scroll/guide';
import type { WebGLStage } from '../engine/webgl/webgl-stage';
import type { EvidenceLayer } from '../scenes/evidence/evidence-layer';
import { definition } from './chapters';
import { ENGINE, MEDIA_POLICY, SEQUENCE_BUDGET, STAGE } from './config';
import { copy } from './copy';
import map from './map-06.json';
import generated from './media.generated.json';
import { media } from './media';
import { WORLD } from './world';

/**
 * Démarrage de CAR SERVICE 06.
 * Entrée (technique MECA RIVIERA) : l'écran d'entrée couvre la préparation de la première scène et se lève à la
 * première image WebGL (au plus tôt 1,2 s, au plus tard 4,5 s ; sans WebGL : sur l'affiche). Pendant l'entrée, la page
 * reste en haut et aucun pas n'est pris. Page restaurée ou rechargée : toujours au début, sur l'univers.
 * Puis : moteur (scroll → progression → état), pas guidés, registre média et liaisons (vidéo en mémoire au bureau,
 * séquence au téléphone), scène WebGL chargée en différé — un seul monde : l'univers (ciel et sol mouillé), les nuages,
 * la preuve, le 06 en volume, la route —, repli statique à tout moment.
 */
export function boot() {
  const html = document.documentElement;
  const track = document.querySelector<HTMLElement>('[data-track]');
  const stageEl = track?.querySelector<HTMLElement>('[data-stage]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  const video = document.querySelector<HTMLVideoElement>('[data-stage-video]');
  if (!track || !stageEl || !canvas || !video) return null;
  html.classList.add('has-experience');
  const posterMode = new URLSearchParams(location.search).has('poster');
  if (posterMode) html.classList.add('is-poster');

  const experience = createExperience(definition, ENGINE, { track, viewport: stageEl });
  const { state, timeline, capabilities } = experience;

  // — Entrée.
  const introStart = performance.now();
  let introDone = !html.classList.contains('is-intro');
  const hold = () => {
    if (!introDone && window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  addEventListener('scroll', hold, { passive: true });
  const liftIntro = () => {
    if (introDone) return;
    const wait = Math.max(0, 1200 - (performance.now() - introStart));
    window.setTimeout(() => {
      introDone = true;
      html.classList.remove('is-intro');
      removeEventListener('scroll', hold);
      experience.invalidate();
    }, wait);
  };
  window.setTimeout(liftIntro, 4500);
  const setIntroProgress = (value: number) => html.style.setProperty('--intro', value.toFixed(3));
  setIntroProgress(0.08);

  const fallback = (reason: string) => {
    html.classList.add('is-static');
    console.warn('[experience] repli statique :', reason);
    liftIntro();
  };

  // — Pas guidés : un geste, un plan.
  const guide = posterMode
    ? null
    : createGuide({
        track,
        timeline,
        rests: experience.rests,
        locked: () => !introDone,
        // Au bureau, la glissade du moteur fait seule le mouvement ; au doigt, défilement natif.
        scrollBehavior: () => (ENGINE.follow[state.format].mode === 'glide' ? 'instant' : 'smooth'),
      });

  // — Médias.
  const registry = createMediaRegistry(media, {
    capabilities,
    chapterIndex: (id) => timeline.indexOf(id),
    policy: (format) => MEDIA_POLICY[format],
    wake: experience.invalidate,
  });

  let evidence: EvidenceLayer | null = null;
  let scrub: VideoScrub | null = null;
  let videoBlob: VideoBlob | null = null;
  let videoAbort: AbortController | null = null;
  registry.bind('transformation-scrub', {
    async load(rendition, descriptor) {
      videoAbort = new AbortController();
      const loaded = await loadVideoBlob(rendition.src, videoAbort.signal);
      videoBlob = loaded;
      await new Promise<void>((resolve, reject) => {
        scrub = new VideoScrub(video, {
          fps: descriptor.scrub?.fps ?? 30,
          wake: experience.invalidate,
          onFrame: () => evidence?.frame(),
        });
        video.addEventListener(
          'loadeddata',
          () => {
            evidence?.setVideo(video);
            resolve();
          },
          { once: true },
        );
        video.addEventListener('error', () => reject(new Error(`vidéo illisible : ${rendition.src}`)), { once: true });
        video.src = loaded.url;
        video.load();
      });
    },
    release() {
      videoAbort?.abort();
      scrub?.dispose();
      scrub = null;
      evidence?.setVideo(null);
      videoBlob?.revoke();
      videoBlob = null;
    },
  });

  let sequence: FrameSequence | null = null;
  let lastBitmap: ImageBitmap | null = null;
  registry.bind('transformation-sequence', {
    async load(rendition, descriptor) {
      const info = descriptor.sequence;
      if (!info?.offsets) throw new Error('séquence sans table des positions');
      sequence = new FrameSequence({
        source: createPackSource(rendition.src, info.offsets, info.type),
        fps: info.fps,
        ...SEQUENCE_BUDGET[state.format],
        wake: experience.invalidate,
        onFrame: (bitmap) => {
          lastBitmap = bitmap;
          evidence?.setBitmap(bitmap);
        },
      });
    },
    release() {
      sequence?.dispose();
      sequence = null;
      lastBitmap = null;
      evidence?.setBitmap(null);
    },
  });

  // Jauge Avant / Après : deux variables CSS sur la vue épinglée, réécrites seulement si elles changent.
  const dom = createDomWriter();
  experience.use('dom', (s) => {
    dom.setVar(stageEl, '--clean', (s.channels.clean ?? 0).toFixed(4));
    dom.setVar(stageEl, '--gauge', (s.channels.gauge ?? 0).toFixed(3));
  });

  experience.use('media', (s) => {
    registry.update(s.chapter.index, s.format);
    const time = s.channels.videoTime ?? 0;
    if (scrub) {
      scrub.set(time);
      scrub.update();
    }
    if (sequence) {
      sequence.set(time);
      sequence.update();
    }
  });

  // — Scène WebGL, en différé.
  let stage: WebGLStage | null = null;
  let stageStatus = 'pending';
  const startStage = () => {
    if (!capabilities.webgl2 || capabilities.saveData) {
      stageStatus = 'static';
      fallback(capabilities.saveData ? 'économie de données' : 'WebGL 2 indisponible');
      return;
    }
    setIntroProgress(0.3);
    Promise.all([
      import('../engine/webgl/webgl-stage'),
      import('../scenes/evidence/evidence-layer'),
      import('../scenes/road/road-layer'),
      import('../scenes/sky/sky-layer'),
      import('../scenes/map/map-layer'),
      import('../scenes/clouds/cloud-layer'),
    ])
      .then(async ([{ createWebGLStage }, { createEvidenceLayer }, { createRoadLayer }, { createSkyLayer }, { createMapLayer }, { createCloudLayer }]) => {
        setIntroProgress(0.55);
        const portrait = state.format !== 'desktop';
        const stills = generated.passage;
        evidence = createEvidenceLayer({
          stills: {
            before: portrait ? stills.before.mobile.src : stills.before.desktop.src,
            after: portrait ? stills.after.mobile.src : stills.after.desktop.src,
          },
        });
        if (video.readyState >= 2 && scrub) evidence.setVideo(video);
        if (lastBitmap) evidence.setBitmap(lastBitmap);
        const desktop = state.format === 'desktop';
        // L'univers (HDRI fourni), partout : 2048 px d'abord ; 4096 px ensuite sur grand écran.
        const sky = createSkyLayer({
          low: '/env/sky-2048.webp',
          high: desktop ? '/env/sky-4096.webp' : undefined,
          groundY: -WORLD.map.depth,
          streakTaps: desktop ? 10 : 6,
        });
        const territory = createMapLayer(
          {
            data: map,
            anchor: WORLD.map.anchor,
            scale: WORLD.map.scale,
            depth: WORLD.map.depth,
            bevel: WORLD.map.bevel,
            labels: { number: '06', numberAt: WORLD.map.numberAt, sea: copy.zone.sea, seaAt: WORLD.map.seaAt },
            font: '"Barlow Condensed", "Arial Narrow", sans-serif',
          },
          sky.uniforms,
        );
        const road = createRoadLayer({ placement: WORLD.road, night: sky.uniforms });
        const clouds = createCloudLayer({
          fields: WORLD.clouds[desktop ? 'desktop' : 'mobile'],
          noise: sky.uniforms.uNoise.value,
          far: WORLD.cloudFar,
        });
        const created = await createWebGLStage({
          experience,
          canvas,
          host: stageEl,
          layers: [sky, territory, evidence, road, clouds],
          config: STAGE,
          onReady: () => {
            stageStatus = 'ready';
            html.classList.add('is-3d');
            setIntroProgress(1);
            liftIntro();
          },
          onFallback: (reason) => {
            stageStatus = `fallback:${reason}`;
            fallback(reason);
          },
        });
        if (!created) return;
        stage = created;
        setIntroProgress(0.85);
      })
      .catch((error: unknown) => {
        stageStatus = `error:${error instanceof Error ? error.message : String(error)}`;
        fallback(stageStatus);
      });
  };
  if (document.readyState === 'complete' || !introDone) startStage();
  else addEventListener('load', startStage, { once: true });

  installQaHooks(experience, {
    stage: () => (stage ? stage.info() : stageStatus),
    stageStatus: () => stageStatus,
    media: () => registry.snapshot(),
    video: () =>
      scrub && {
        desired: Number(scrub.time.toFixed(3)),
        current: Number(video.currentTime.toFixed(3)),
        seeking: video.seeking,
        readyState: video.readyState,
        ...scrub.health,
      },
    sequence: () => sequence?.stats ?? null,
    guide: () => guide?.points.length ?? 0,
    intro: () => !introDone,
  });

  const dispose = () => {
    guide?.dispose();
    stage?.dispose();
    registry.dispose();
    experience.dispose();
  };
  addEventListener('pagehide', (event) => {
    if (!event.persisted) dispose();
  });
  // Page restaurée depuis l'historique : état incohérent possible (GPU libéré) — rechargement (MECA RIVIERA).
  addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });
  return { experience, registry, dispose };
}
