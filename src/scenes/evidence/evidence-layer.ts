import { Group, LinearFilter, Mesh, PlaneGeometry, Texture, VideoTexture } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { createEvidenceMaterial } from './evidence-material';

/**
 * Couche « preuve » : le panneau vidéo dans la nuit, son reflet sur le sol mouillé de l'univers, et le passage de l'eau.
 * Sources (sans jamais d'écran vide) :
 * - vidéo pilotée (bureau, tablette) ou séquence d'images (mobile) : `setVideo` / `setBitmap` ;
 * - en attendant ou en repli : l'image fixe du même instant (avant : capot poussiéreux ; après : capot brillant).
 * Canaux lus (chapters.ts) : evidenceMode (0 vidéo, 1 passage), passage, evidenceLight, videoTime.
 */
export const PANEL = { width: 1.8, height: 1.8 * (1424 / 900), centerY: 1.6 };

export function createEvidenceLayer(options: { chapters: readonly string[]; stills: { before: string; after: string } }) {
  const root = new Group();
  root.name = 'evidence';
  const geometry = new PlaneGeometry(PANEL.width, PANEL.height);
  const panel = createEvidenceMaterial(false);
  const mirror = createEvidenceMaterial(true);
  const panelMesh = new Mesh(geometry, panel.material);
  panelMesh.position.set(0, PANEL.centerY, 0);
  panelMesh.renderOrder = 3;
  const mirrorMesh = new Mesh(geometry, mirror.material);
  mirrorMesh.position.set(0, -PANEL.centerY, 0);
  mirrorMesh.scale.y = -1;
  mirrorMesh.renderOrder = 1;
  root.add(mirrorMesh, panelMesh);

  const before = new Texture();
  const after = new Texture();
  // Vidéo : VideoTexture obligatoire (une Texture ordinaire est dimensionnée par l'attribut `width` de l'élément,
  // qui vaut 0 — allocation GPU refusée, panneau noir). Séquence : ImageBitmap dans une Texture.
  let videoTexture: VideoTexture | null = null;
  const bitmapTexture = new Texture();
  bitmapTexture.generateMipmaps = false;
  bitmapTexture.minFilter = LinearFilter;
  let live: Texture = bitmapTexture;
  let liveReady = false;
  let liveFlip = 0;
  let dirty = true;
  const abort = new AbortController();

  const loadStill = async (texture: Texture, url: string, ctx: StageContext) => {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    texture.image = await createImageBitmap(await response.blob());
    texture.needsUpdate = true;
    ctx.renderer.initTexture(texture);
    dirty = true;
    ctx.invalidate();
  };

  // Valeurs posées au dernier rendu : la couche ne demande une image que si l'une change.
  const last = { mode: -1, passage: -1, light: -1, source: '' };

  const layer: WebGLLayer & {
    setVideo(video: HTMLVideoElement | null): void;
    setBitmap(bitmap: ImageBitmap | null): void;
    frame(): void;
  } = {
    id: 'evidence',
    chapters: options.chapters,
    root,
    async init(ctx) {
      await Promise.all([loadStill(before, options.stills.before, ctx), loadStill(after, options.stills.after, ctx)]).catch((error: Error) => {
        if (error.name !== 'AbortError') console.warn('[evidence] images fixes :', error.message);
      });
    },
    setVideo(video) {
      if (videoTexture && videoTexture.image !== video) {
        videoTexture.dispose();
        videoTexture = null;
      }
      if (video && !videoTexture) {
        videoTexture = new VideoTexture(video);
        videoTexture.generateMipmaps = false;
        videoTexture.minFilter = LinearFilter;
      }
      if (video && videoTexture) live = videoTexture;
      liveFlip = 0;
      liveReady = Boolean(video);
      if (liveReady) live.needsUpdate = true;
      dirty = true;
    },
    setBitmap(bitmap) {
      if (bitmap) bitmapTexture.image = bitmap;
      live = bitmapTexture;
      liveFlip = 1;
      liveReady = Boolean(bitmap);
      if (liveReady) bitmapTexture.needsUpdate = true;
      dirty = true;
    },
    /** Une nouvelle image de la source vivante est prête (seek terminé, image de séquence décodée). */
    frame() {
      if (!liveReady) return;
      live.needsUpdate = true;
      dirty = true;
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const mode = (state.channels.evidenceMode ?? 0) > 0.5 ? 1 : 0;
      const passage = mode ? (state.channels.passage ?? 0) : 0;
      const light = state.channels.evidenceLight ?? 1;
      const afterSide = (state.channels.videoTime ?? 0) > 8;
      const source = mode ? 'stills' : liveReady ? 'live' : afterSide ? 'after' : 'before';
      if (!dirty && mode === last.mode && passage === last.passage && light === last.light && source === last.source) return false;
      dirty = false;
      Object.assign(last, { mode, passage, light, source });
      for (const { uniforms } of [panel, mirror]) {
        if (source === 'live') {
          uniforms.uA.value = live;
          uniforms.uFlipA.value = liveFlip;
        } else {
          uniforms.uA.value = source === 'after' ? after : before;
          uniforms.uFlipA.value = 1;
        }
        uniforms.uB.value = after;
        uniforms.uFlipB.value = 1;
        uniforms.uPassage.value = passage;
        uniforms.uLight.value = light;
        uniforms.uPhase.value = state.progress.shown * 40;
      }
      return true;
    },
    dispose() {
      abort.abort();
      for (const texture of [before, after]) {
        (texture.image as ImageBitmap | undefined)?.close?.();
        texture.dispose();
      }
      videoTexture?.dispose();
      bitmapTexture.dispose();
    },
  };
  return layer;
}

export type EvidenceLayer = ReturnType<typeof createEvidenceLayer>;
