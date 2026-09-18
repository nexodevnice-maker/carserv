import {
  BackSide,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  Vector2,
  Vector3,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { GROUND_GLSL, SKY_GLSL } from '../shared/night-glsl';
import { createNoiseTexture } from '../shared/noise-texture';

/**
 * L'univers : le HDRI fourni (scripts/media-sky.mjs), présent pendant tout le récit. Une seule sphère à l'infini (elle
 * suit la caméra) porte le ciel ET le sol :
 * - au-dessus de l'horizon, le ciel ; pendant un mouvement rapide du regard, les étoiles filent (flou de mouvement
 *   réel : plusieurs échantillons le long du déplacement du regard depuis l'image précédente) ;
 * - au-dessous, la mer de nuit calculée analytiquement (intersection du regard avec le plan y = groundY) : infinie,
 *   sans bord ni plan lointain, miroir du même ciel, jusqu'au pied des collines à l'horizon, à toutes les altitudes.
 *   Le 06 (scenes/map) est posé dessus et utilise le même sol.
 * Canaux : skyLight (intensité), skyYaw (rotation, constante d'un bout à l'autre : un seul ciel), skySway (léger
 * balancement des étoiles sur l'ouverture, seule animation hors scroll), fog (densité du noir au loin, selon
 * l'altitude du plan).
 */
const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  ${SKY_GLSL}
  ${GROUND_GLSL}
  uniform float uGroundY;
  uniform vec3 uMotion;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    vec3 col;
    if (d.y < 0.0) {
      float t = max(cameraPosition.y - uGroundY, 0.05) / max(-d.y, 1e-5);
      col = groundShade(cameraPosition.xz + d.xz * t, d, t, 1.0);
    } else if (dot(uMotion, uMotion) < 1e-8) {
      col = skySample(d) * uLight;
    } else {
      col = vec3(0.0);
      for (int k = 0; k < STREAK_TAPS; k++) {
        float t = float(k) / float(STREAK_TAPS - 1);
        col += skySample(normalize(d - uMotion * t));
      }
      col *= uLight / float(STREAK_TAPS);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const FOG_DENSITY = 0.0095;

export interface SkyOptions {
  low: string;
  high?: string;
  /** Altitude du sol hors du 06 (la mer, sous la falaise). */
  groundY: number;
  /** Échantillons du filé des étoiles (moins au téléphone). */
  streakTaps: number;
}

export function createSkyLayer(options: SkyOptions) {
  const texture = new Texture();
  // Valeurs de la texture lues telles quelles (déjà étalonnées) : aucune conversion de couleur. Mipmaps : le niveau de
  // détail est choisi par le shader (skyLod) ; répétée en largeur (jonction de l'image sans couture).
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  const noise = createNoiseTexture();
  /** Uniformes partagés avec les couches posées dans le même monde (le 06). */
  const shared = {
    uSky: { value: texture },
    uYaw: { value: 0 },
    uLight: { value: 1 },
    uNoise: { value: noise },
    uFog: { value: FOG_DENSITY },
    uSkySize: { value: new Vector2(2048, 1024) },
    uPixelAngle: { value: 0.001 },
    uZenith: { value: new Vector3() },
    /**
     * Hauteur du centre de projection du sol (m) : c'est elle qui décide de l'échelle apparente du terrain de
     * l'image 360°. Basse, les roches sont énormes ; haute, le terrain s'aplatit vers l'horizon. 9 m place les
     * pierres du premier plan à quelques mètres de la voiture — l'échelle du lieu photographié.
     */
    uGroundH: { value: 9 },
    /** Présence du terrain photographié au sol (canal `terrain`). */
    uTerrain: { value: 1 },
  };
  const material = new ShaderMaterial({
    uniforms: { ...shared, uGroundY: { value: options.groundY }, uMotion: { value: new Vector3() } },
    defines: { STREAK_TAPS: options.streakTaps },
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const sphere = new Mesh(new SphereGeometry(150, 64, 32), material);
  sphere.renderOrder = -10;
  sphere.frustumCulled = false;
  const root = new Group();
  root.add(sphere);

  const abort = new AbortController();
  let ready = false;
  const forward = new Vector3();
  const previous = new Vector3();
  let hasPrevious = false;
  const motion = new Vector3();
  const last = { light: -1, yaw: NaN, fog: NaN, angle: NaN, fx: NaN, fy: NaN, fz: NaN, px: NaN, py: NaN, pz: NaN, mx: NaN, my: NaN, mz: NaN };

  const load = async (url: string, ctx: StageContext) => {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    const bitmap = await createImageBitmap(await response.blob());
    (texture.image as ImageBitmap | undefined)?.close?.();
    texture.image = bitmap;
    shared.uSkySize.value.set(bitmap.width, bitmap.height);
    // Couleur moyenne de la calotte (rangées entre ~68° et ~81° d'élévation).
    const probe = document.createElement('canvas');
    probe.width = 32;
    probe.height = 1;
    const pc = probe.getContext('2d', { willReadFrequently: true });
    if (pc) {
      pc.drawImage(bitmap, 0, Math.round(bitmap.height * 0.05), bitmap.width, Math.max(1, Math.round(bitmap.height * 0.07)), 0, 0, 32, 1);
      const px = pc.getImageData(0, 0, 32, 1).data;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < 32; i++) {
        r += px[i * 4]!;
        g += px[i * 4 + 1]!;
        b += px[i * 4 + 2]!;
      }
      shared.uZenith.value.set(r / 8160, g / 8160, b / 8160);
    }
    texture.needsUpdate = true;
    ready = true;
    ctx.invalidate();
  };

  const layer: WebGLLayer & { uniforms: typeof shared } = {
    id: 'sky',
    root,
    uniforms: shared,
    async init(ctx) {
      await load(options.low, ctx).catch((error: Error) => {
        if (error.name !== 'AbortError') console.warn('[sky]', error.message);
      });
      if (options.high)
        load(options.high, ctx).catch((error: Error) => {
          if (error.name !== 'AbortError') console.warn('[sky]', error.message);
        });
    },
    update(state: Readonly<ExperienceState>, ctx: StageContext): LayerUpdate {
      const pose = state.camera;
      // Taille angulaire d'un pixel du rendu (niveau de détail du ciel).
      const angle = (ctx.camera.fov * Math.PI) / 180 / Math.max(ctx.height * ctx.pixelRatio, 1);
      if (pose) {
        forward.set(pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]).normalize();
        sphere.position.set(...pose.position);
      }
      // Filé des étoiles : déplacement du regard depuis l'image précédente, amplifié et borné.
      if (hasPrevious && !state.reducedMotion) motion.subVectors(forward, previous).multiplyScalar(5);
      else motion.set(0, 0, 0);
      if (motion.length() > 0.3) motion.setLength(0.3);
      if (motion.length() < 0.004) motion.set(0, 0, 0);
      previous.copy(forward);
      hasPrevious = true;

      // Balancement borné (±0,7°) : l'univers respire sur l'ouverture, et revient exactement à sa place ensuite.
      const sway = state.reducedMotion ? 0 : (state.channels.skySway ?? 0);
      const yaw = (state.channels.skyYaw ?? 0) + (sway > 0 ? Math.sin(state.time * 0.00011) * 0.012 * sway : 0);
      const light = ready ? (state.channels.skyLight ?? 1) : 0;
      const fog = state.channels.fog ?? FOG_DENSITY;
      const changed =
        light !== last.light || yaw !== last.yaw || fog !== last.fog || angle !== last.angle || forward.x !== last.fx || forward.y !== last.fy || forward.z !== last.fz ||
        sphere.position.x !== last.px || sphere.position.y !== last.py || sphere.position.z !== last.pz ||
        motion.x !== last.mx || motion.y !== last.my || motion.z !== last.mz;
      if (!changed) return false;
      Object.assign(last, {
        light, yaw, fog, angle, fx: forward.x, fy: forward.y, fz: forward.z, px: sphere.position.x, py: sphere.position.y, pz: sphere.position.z,
        mx: motion.x, my: motion.y, mz: motion.z,
      });
      shared.uLight.value = light;
      shared.uYaw.value = yaw;
      shared.uFog.value = fog;
      shared.uPixelAngle.value = angle;
      (material.uniforms.uMotion.value as Vector3).copy(motion);
      // Encore en mouvement (balancement, ou filé qui doit retomber à zéro) : image suivante.
      return sway > 0.001 || motion.lengthSq() > 0 ? 'continue' : true;
    },
    dispose() {
      abort.abort();
      (texture.image as ImageBitmap | undefined)?.close?.();
      texture.dispose();
      noise.dispose();
    },
  };
  return layer;
}

export type SkyLayer = ReturnType<typeof createSkyLayer>;
