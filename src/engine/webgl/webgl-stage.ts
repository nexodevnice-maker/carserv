import {
  Color,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Material,
  type Mesh,
  type Object3D,
  type Texture,
  type ToneMapping,
} from 'three';
import type { Experience } from '../experience';
import { createQuality } from '../performance/quality';
import type { Format } from '../responsive/formats';
import type { ExperienceState } from '../state/experience-state';
import { disposeObject } from './dispose';
import { createPostProcess, type PostOptions } from './post-process';

/**
 * Une seule scène WebGL pour toute la page (un seul contexte, un seul canvas épinglé), rendue à la demande :
 * une image n'est dessinée que si la caméra a bougé, si une couche a changé, ou après un redimensionnement.
 * Chargé en différé (import dynamique) : Three.js n'est jamais téléchargé sans WebGL 2, en économie de données, ou si
 * aucune couche n'est nécessaire.
 *
 * Couches (`WebGLLayer`) : chacune possède ses objets, déclare ses chapitres et libère ce qu'elle crée. Hors de ses
 * chapitres (au-delà d'une marge), elle est masquée : aucun coût de rendu.
 * Discipline GPU reprise de MECA RIVIERA : définition adaptative (quality.ts), shaders compilés en parallèle
 * (compileAsync), textures envoyées au GPU une par image, arrêt hors écran, perte de contexte traitée.
 */
export interface StageContext {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly format: Format;
  invalidate(): void;
}

/** `true` : la couche a changé (rendu) ; `'continue'` : changé, et encore en mouvement (image suivante demandée). */
export type LayerUpdate = boolean | 'continue';

export interface WebGLLayer {
  readonly id: string;
  /** Chapitres où la couche est visible. Absent : toujours. */
  readonly chapters?: readonly string[];
  /** Racine ajoutée à la scène par la scène elle-même ; sa visibilité suit les chapitres. */
  readonly root: Object3D;
  init(ctx: StageContext): Promise<void> | void;
  update(state: Readonly<ExperienceState>, ctx: StageContext): LayerUpdate;
  resize?(ctx: StageContext): void;
  dispose(ctx: StageContext): void;
}

export interface StageConfig {
  /** Crans de définition par format (plafonnés à la densité de l'écran). */
  pixelRatios: Record<Format, readonly number[]>;
  /** Marge (en progression) autour des chapitres d'une couche. */
  layerMargin: number;
  near: number;
  far: number;
  /**
   * Plage de profondeur suivant l'altitude de la caméra (m) : le récit va du pare-chocs (5 m) au pays entier (20 km).
   * Un seul couple near/far ne peut pas servir les deux ; ici il suit le plan.
   */
  range?: { nearScale: number; nearMax: number; farScale: number; farMax: number };
  toneMapping?: ToneMapping;
  exposure?: number;
  transparent?: boolean;
  /**
   * Rapport largeur/hauteur pour lequel les focales des plans sont écrites, par format. Écran plus étroit : la focale
   * s'ouvre pour garder la même largeur de champ (le sujet ne sort pas du cadre) — technique MECA RIVIERA.
   */
  referenceAspect?: Partial<Record<Format, number>>;
  /**
   * Objectif piloté par des canaux, ajouté au plan : `fov` (degrés en plus, le coup de focale d'un vol), `roll`
   * (radians, l'inclinaison d'un virage), `shake` (tremblement angulaire, en radians par unité de canal). Le
   * tremblement est déterministe (fonction de la progression, jamais du temps) : il se reconstruit à l'identique au
   * retour.
   */
  lens?: {
    fov?: string;
    roll?: string;
    /** Tangage ajouté (radians) : plonger le regard au milieu d'un vol sans déplacer la visée des plans. */
    pitch?: string;
    shake?: { channel: string; amplitude: number };
    /**
     * Regard libre au pointeur (souris seulement) : on est la caméra. Décalage maximal (radians) et taux d'amorti (1/s).
     * Entrée utilisateur, jamais une horloge : au repos du pointeur, la boucle se rendort.
     */
    look?: { yaw: number; pitch: number; rate: number };
  };
  background?: number;
  /**
   * « Un chargement lourd est en cours » : décoder un modèle ou envoyer ses textures au GPU produit des images
   * longues qui ne disent rien du rythme réel. Pendant ce temps, la définition adaptative ne juge pas — sinon un seul
   * chargement fait retomber d'un cran toute la suite du récit.
   */
  busy?: () => boolean;
  /**
   * Garde au sol (m) : la caméra ne descend jamais sous cette hauteur. Une trajectoire lisse qui passe par des points
   * au ras du sol puis s'élève peut creuser légèrement entre deux points ; la garde l'aplatit au lieu de traverser le sol.
   */
  floor?: number;
  /** Passe d'image (halo, tramage, étalonnage). Absente : la scène va directement à l'écran, comme avant. */
  post?: PostOptions;
}

export async function createWebGLStage(options: {
  experience: Experience;
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  layers: readonly WebGLLayer[];
  config: StageConfig;
  onReady?: () => void;
  onFallback?: (reason: string) => void;
}) {
  const { experience, canvas, host, layers, config } = options;
  const { state, scheduler, timeline } = experience;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio < 2,
      alpha: Boolean(config.transparent),
      powerPreference: 'high-performance',
    });
  } catch (error) {
    options.onFallback?.('webgl-unavailable');
    throw error;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = config.toneMapping ?? NeutralToneMapping;
  renderer.toneMappingExposure = config.exposure ?? 1;
  // La vérification des shaders force une attente synchrone : réservée au développement.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;

  const scene = new Scene();
  if (config.background !== undefined) scene.background = new Color(config.background);
  const camera = new PerspectiveCamera(35, 1, config.near, config.far);
  /** Adapte near/far à l'altitude (rien à faire si la plage n'est pas configurée). */
  const applyRange = (altitude: number) => {
    const range = config.range;
    if (!range) return false;
    const near = Math.min(Math.max(altitude * range.nearScale, config.near), range.nearMax);
    const far = Math.min(Math.max(altitude * range.farScale, config.far), range.farMax);
    if (Math.abs(near - camera.near) < near * 0.02 && Math.abs(far - camera.far) < far * 0.02) return false;
    camera.near = near;
    camera.far = far;
    return true;
  };
  let width = 1;
  let height = 1;
  let dirty = true;
  let active = true;
  let lost = false;
  let disposed = false;
  let firstFrame = true;

  const ratios = (format: Format) => config.pixelRatios[format].map((r) => Math.min(window.devicePixelRatio, r));
  let quality = createQuality(ratios(state.format), () => resize());

  // La passe d'image. Elle n'existe que si elle est configurée, et elle s'efface d'elle-même dès que la définition
  // recule : au-delà du cran toléré, le téléphone a besoin de ses millisecondes, pas d'un halo.
  const post = config.post ? createPostProcess(renderer, config.post) : null;
  const postActive = () => post !== null && quality.level <= (config.post?.maxLevel ?? 0);

  const ctx: StageContext = {
    renderer,
    scene,
    camera,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get pixelRatio() {
      return renderer.getPixelRatio();
    },
    get format() {
      return state.format;
    },
    invalidate: () => {
      dirty = true;
      scheduler.invalidate();
    },
  };

  // Regard au pointeur : cible normalisée (−1…1) et valeur amortie.
  const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    scheduler.invalidate();
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
    scheduler.invalidate();
  };
  const pointerLook = Boolean(config.lens?.look) && matchMedia('(pointer: fine)').matches;
  if (pointerLook) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }
  /** Avance l'amorti du regard ; vrai tant qu'il bouge. */
  const stepLook = (dt: number) => {
    const look = config.lens?.look;
    if (!look || !pointerLook || state.reducedMotion) {
      pointer.x = pointer.y = 0;
      return false;
    }
    const k = 1 - Math.exp(-look.rate * dt);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    if (Math.abs(pointer.tx - pointer.x) < 1e-4 && Math.abs(pointer.ty - pointer.y) < 1e-4) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
      return false;
    }
    return true;
  };

  // Dernière pose appliquée : la caméra n'est réécrite (et l'image redessinée) que si elle change.
  const last = { px: NaN, py: NaN, pz: NaN, tx: NaN, ty: NaN, tz: NaN, fov: NaN, sx: NaN, sy: NaN, roll: NaN, pitch: NaN, lx: NaN, ly: NaN };
  const applyCamera = () => {
    const pose = state.camera;
    if (!pose) return false;
    const [px, rawY, pz] = pose.position;
    const py = config.floor === undefined ? rawY : Math.max(rawY, config.floor);
    let [tx, ty, tz] = pose.target;
    const lens = config.lens;
    const still = state.reducedMotion;
    const fov = pose.fov + (lens?.fov && !still ? (state.channels[lens.fov] ?? 0) : 0);
    // Mouvement réduit : les repos seulement (l'enveloppe de vol y est nulle).
    const roll = pose.roll + (lens?.roll && !still ? (state.channels[lens.roll] ?? 0) : 0);
    const pitch = still ? 0 : pose.pitch + (lens?.pitch ? (state.channels[lens.pitch] ?? 0) : 0);
    const amount = lens?.shake && !still ? (pose.shake + (state.channels[lens.shake.channel] ?? 0)) * lens.shake.amplitude : 0;
    if (amount > 0) {
      const p = state.progress.shown;
      const distance = Math.hypot(tx - px, ty - py, tz - pz);
      tx += Math.sin(p * 1913.7) * Math.sin(p * 371.3) * amount * distance;
      ty += Math.sin(p * 1277.1) * Math.sin(p * 229.9) * amount * distance;
    }
    if (
      px === last.px && py === last.py && pz === last.pz && tx === last.tx && ty === last.ty && tz === last.tz &&
      fov === last.fov && pose.shiftX === last.sx && pose.shiftY === last.sy && roll === last.roll && pitch === last.pitch &&
      pointer.x === last.lx && pointer.y === last.ly
    )
      return false;
    Object.assign(last, { px, py, pz, tx, ty, tz, fov, sx: pose.shiftX, sy: pose.shiftY, roll, pitch, lx: pointer.x, ly: pointer.y });
    applyRange(Math.max(py, 1));
    camera.position.set(px, py, pz);
    camera.up.set(0, 1, 0);
    camera.lookAt(tx, ty, tz);
    const look = lens?.look;
    if (look && pointer.x) camera.rotateY(-pointer.x * look.yaw);
    const tilt = pitch - (look ? pointer.y * look.pitch : 0);
    if (tilt) camera.rotateX(tilt);
    if (roll) camera.rotateZ(roll);
    camera.fov = fovFor(fov);
    applyProjection();
    return true;
  };
  const fovFor = (fov: number) => {
    const reference = config.referenceAspect?.[state.format];
    const aspect = width / height;
    if (!reference || aspect >= reference) return fov;
    const half = (fov * Math.PI) / 360;
    return (Math.atan((Math.tan(half) * reference) / aspect) * 360) / Math.PI;
  };
  const applyProjection = () => {
    const sx = state.camera?.shiftX ?? 0;
    const sy = state.camera?.shiftY ?? 0;
    if (sx || sy) camera.setViewOffset(width, height, -sx * width, sy * height, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };

  const resize = () => {
    if (disposed) return;
    width = Math.max(host.clientWidth, 1);
    height = Math.max(host.clientHeight, 1);
    renderer.setPixelRatio(quality.ratio);
    renderer.setSize(width, height, false);
    post?.resize();
    camera.aspect = width / height;
    if (Number.isFinite(last.fov)) camera.fov = fovFor(last.fov);
    applyProjection();
    for (const layer of layers) layer.resize?.(ctx);
    ctx.invalidate();
  };

  const layerVisible = (layer: WebGLLayer) => {
    if (!layer.chapters?.length) return true;
    const p = state.progress.shown;
    return layer.chapters.some((id) => {
      const c = timeline.chapters[timeline.indexOf(id)];
      return c ? p >= c.start - config.layerMargin && p <= c.end + config.layerMargin : false;
    });
  };

  // — Mise en place : couches, compilation parallèle, textures une par image.
  for (const layer of layers) {
    scene.add(layer.root);
    await layer.init(ctx);
  }
  resize();
  if (state.camera) applyCamera();
  await renderer.compileAsync(scene, camera);
  for (const texture of collectTextures(scene)) {
    renderer.initTexture(texture);
    await new Promise(requestAnimationFrame);
    if (disposed) return null;
  }

  const onFormat = experience.onFormat((format) => {
    quality = createQuality(ratios(format), () => resize());
    resize();
  });
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(host);
  const visibility = new IntersectionObserver(([entry]) => {
    active = Boolean(entry?.isIntersecting);
    if (active) ctx.invalidate();
  });
  visibility.observe(host);

  /**
   * PERTE DE CONTEXTE 3D — ce qui arrive vraiment sur un téléphone à court de mémoire.
   *
   * On basculait aussitôt en repli statique : la scène disparaissait, la page changeait de mise en page, et le
   * défilement se déplaçait tout seul. De l'extérieur, le site avait planté et repartait du début. Pire : même
   * quand le navigateur rendait le contexte une seconde plus tard, plus aucune image n'était dessinée — le repli
   * avait sorti la vue du champ, donc la boucle restait éteinte pour de bon.
   *
   * Désormais : on attend. Un contexte perdu est presque toujours rendu dans la seconde ; on ne renonce qu'au bout
   * de quatre. Et au retour, tout est redessiné depuis zéro.
   */
  let lostTimer = 0;
  const onLost = (event: Event) => {
    event.preventDefault();
    if (disposed) return;
    lost = true;
    host.classList.add('is-webgl-lost');
    clearTimeout(lostTimer);
    lostTimer = window.setTimeout(() => {
      if (lost && !disposed) options.onFallback?.('context-lost');
    }, 4000);
  };
  const onRestored = () => {
    clearTimeout(lostTimer);
    if (disposed) return;
    lost = false;
    host.classList.remove('is-webgl-lost');
    // Le contexte est NEUF : l'état interne de Three.js ne décrit plus rien, et toutes les couches doivent être
    // redessinées. Sans cette remise à plat, la scène restait noire même contexte rétabli.
    renderer.resetState();
    for (const layer of layers) layer.resize?.(ctx);
    active = true;
    dirty = true;
    ctx.invalidate();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  let renders = 0;
  const removeTask = experience.use('webgl', (_, info) => {
    if (lost || !active) return false;
    let changed = dirty;
    let again = stepLook(_.dt);
    dirty = false;
    if (applyCamera()) changed = true;
    for (const layer of layers) {
      const visible = layerVisible(layer);
      if (layer.root.visible !== visible) {
        layer.root.visible = visible;
        changed = true;
      }
      if (!visible) continue;
      const result = layer.update(state, ctx);
      if (result) changed = true;
      if (result === 'continue') again = true;
    }
    if (!config.busy?.()) quality.tick(info.dt, changed, info.now);
    if (!changed) return false;
    renderer.render(scene, camera);
    // La scène est dans le canevas : la passe d'image la reprend telle quelle et la repose, retouchée. Le grain suit
    // la position de défilement, jamais l'horloge — au retour, la même image.
    if (postActive()) {
      const channel = config.post?.channel;
      post?.render(state.progress.shown, channel ? (state.channels[channel] ?? 1) : 1);
    }
    renders++;
    if (firstFrame) {
      firstFrame = false;
      canvas.classList.add('is-ready');
      options.onReady?.();
    }
    return again;
  });

  return {
    ctx,
    get renders() {
      return renders;
    },
    info() {
      return {
        renders,
        pixelRatio: renderer.getPixelRatio(),
        qualityLevel: quality.level,
        size: [canvas.width, canvas.height],
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        post: postActive(),
        lost,
        active,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      removeTask();
      onFormat();
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      resizeObserver.disconnect();
      visibility.disconnect();
      for (const layer of layers) {
        layer.dispose(ctx);
        disposeObject(layer.root);
      }
      post?.dispose();
      scene.environment?.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      renderer.forceContextLoss();
    },
  };
}

export type WebGLStage = NonNullable<Awaited<ReturnType<typeof createWebGLStage>>>;

function collectTextures(root: Object3D) {
  const textures = new Set<Texture>();
  if ((root as Scene).environment) textures.add((root as Scene).environment as Texture);
  root.traverse((node) => {
    const material = (node as Mesh).material as Material | Material[] | undefined;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(m)) if ((value as Texture | null)?.isTexture) textures.add(value as Texture);
    }
  });
  return textures;
}
