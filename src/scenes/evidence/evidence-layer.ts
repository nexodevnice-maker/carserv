import { AdditiveBlending, Group, LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, Texture, VideoTexture } from 'three';
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
/** Un monolithe de lumière (5,4 × 8,5 m) : on le voit du ciel, on s'en approche jusqu'à ce que la vidéo remplisse l'image. */
export const PANEL = { width: 5.4, height: 5.4 * (1424 / 900), centerY: 4.8 };

/** Nappe du relevé : la ligne d'or déborde du panneau dans la nuit, de part et d'autre. */
const sheetVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const sheetFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float across = (vUv.y - 0.5) * 2.0;
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = exp(-across * across * 900.0) + exp(-across * across * 30.0) * 0.18;
    float reach = 1.0 - smoothstep(0.55, 1.0, x);
    gl_FragColor = vec4(vec3(1.0, 0.76, 0.36) * core * reach * uIntensity, 1.0);
  }
`;

/**
 * La balise : une colonne de lumière qui monte du monolithe dans l'univers. Du ciel, elle désigne l'endroit où l'on va
 * (« chez vous ») ; elle s'éteint quand on arrive. Plan tourné vers la caméra autour de l'axe vertical, additif.
 */
const beaconVertex = /* glsl */ `
  uniform float uHeight;
  uniform float uWidth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCamera = cameraPosition - base;
    vec3 side = normalize(vec3(toCamera.z, 0.0, -toCamera.x) + vec3(1e-5, 0.0, 0.0));
    // Largeur apparente bornée : un filet net de près, encore lisible à des kilomètres.
    float width = max(uWidth, length(toCamera) * 0.0045);
    vec3 world = base + side * position.x * width + vec3(0.0, (position.y + 0.5) * uHeight, 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;
const beaconFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.x - 0.5) * 2.0;
    float core = exp(-across * across * 30.0) + exp(-across * across * 4.0) * 0.35;
    float along = exp(-vUv.y * 4.5) * smoothstep(0.0, 0.004, vUv.y) + exp(-vUv.y * 40.0) * 0.6;
    vec3 col = vec3(1.0, 0.86, 0.6) * core * along * uIntensity;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const haloFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float glow = exp(-r * r * 9.0) * 0.35 + exp(-r * 30.0) * 0.3;
    gl_FragColor = vec4(vec3(1.0, 0.8, 0.5) * glow * uIntensity, 1.0);
  }
`;
const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function createEvidenceLayer(options: { stills: { before: string; after: string }; align: readonly [number, number, number] }) {
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
  for (const { uniforms } of [panel, mirror]) uniforms.uAlign.value = [...options.align];
  root.add(mirrorMesh, panelMesh);

  const beaconUniforms = { uIntensity: { value: 0 }, uHeight: { value: 2600 }, uWidth: { value: 3 } };
  const beaconMaterial = new ShaderMaterial({
    uniforms: beaconUniforms,
    vertexShader: beaconVertex,
    fragmentShader: beaconFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const beacon = new Mesh(new PlaneGeometry(1, 1, 1, 24), beaconMaterial);
  beacon.frustumCulled = false;
  beacon.renderOrder = 8;
  const halo = new Mesh(
    new PlaneGeometry(34, 34),
    new ShaderMaterial({
      uniforms: { uIntensity: beaconUniforms.uIntensity },
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  halo.renderOrder = 7;
  root.add(beacon, halo);

  const sheetUniforms = { uIntensity: { value: 0 } };
  const sheet = new Mesh(
    new PlaneGeometry(PANEL.width + 7, 0.5),
    new ShaderMaterial({ uniforms: sheetUniforms, vertexShader: sheetVertex, fragmentShader: sheetFragment, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  sheet.position.z = 0.03;
  sheet.renderOrder = 5;
  root.add(sheet);

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
    // Pas des contours du relevé : un texel de l'image fixe.
    if (texture === before) {
      const image = texture.image as ImageBitmap;
      for (const { uniforms } of [panel, mirror]) uniforms.uTexel.value = [1 / image.width, 1 / image.height];
    }
    texture.needsUpdate = true;
    ctx.renderer.initTexture(texture);
    dirty = true;
    ctx.invalidate();
  };

  // Valeurs posées au dernier rendu : la couche ne demande une image que si l'une change.
  const last = { mode: -1, passage: -1, light: -1, source: '', beacon: -1, scan: -1 };

  const layer: WebGLLayer & {
    setVideo(video: HTMLVideoElement | null): void;
    setBitmap(bitmap: ImageBitmap | null): void;
    frame(): void;
  } = {
    id: 'evidence',
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
      const beaconLight = state.channels.beacon ?? 0;
      panelMesh.visible = mirrorMesh.visible = light > 0.001;
      beacon.visible = halo.visible = beaconLight > 0.001;
      // Le relevé n'existe qu'en mode images fixes (l'image exacte du capot poussiéreux) et avant que l'eau n'ait tout passé.
      const scan = mode ? (state.channels.scan ?? 0) : 0;
      const scanning = scan > 0 && scan < 1 && light > 0.05;
      sheet.visible = scanning;
      if (!dirty && mode === last.mode && passage === last.passage && light === last.light && source === last.source && beaconLight === last.beacon && scan === last.scan)
        return false;
      dirty = false;
      Object.assign(last, { mode, passage, light, source, beacon: beaconLight, scan });
      sheet.position.y = PANEL.centerY + PANEL.height * (0.5 - (1.06 * Math.min(Math.max(scan, 0), 1) - 0.03));
      sheetUniforms.uIntensity.value = scanning ? light : 0;
      beaconUniforms.uIntensity.value = beaconLight;
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
        uniforms.uScan.value = scan;
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
