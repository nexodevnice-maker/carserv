import { BackSide, Group, LinearFilter, Mesh, ShaderMaterial, SphereGeometry, Texture, Vector3 } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { createNoiseTexture } from '../shared/noise-texture';

/**
 * L'univers : le HDRI fourni (scripts/media-sky.mjs), présent pendant tout le récit — le panneau de preuve, la carte du
 * 06 et la route sont posés dedans. Une seule sphère à l'infini (elle suit la caméra) porte le ciel ET le sol :
 * - au-dessus de l'horizon, le ciel ; pendant un mouvement rapide du regard, les étoiles filent (flou de mouvement
 *   réel : plusieurs échantillons le long du déplacement du regard depuis l'image précédente) ;
 * - au-dessous, un sol mouillé calculé analytiquement (intersection du regard avec le plan y = 0) : infini, sans bord
 *   ni plan lointain, il reflète le même ciel (reflet exact de l'équirectangulaire, perturbé par le grain et les
 *   flaques) et rejoint le pied des collines à l'horizon, sans couture, à toutes les altitudes.
 * Canaux : skyLight (intensité de l'univers), skyYaw (rotation), skyDrift (dérive lente des étoiles, seule animation
 * qui ne dépend pas du scroll — rendu continu uniquement pendant l'ouverture et le passage dans l'univers).
 */
const SKY_GLSL = /* glsl */ `
  uniform sampler2D uSky;
  uniform float uYaw;
  const float PI = 3.14159265;
  // L'horizon de la prise de vue est ~1,4° sous le pied des collines : abaissé d'autant, les collines se posent sur
  // le bord du sol mouillé au lieu de flotter au-dessus d'une bande noire.
  vec3 skySample(vec3 d) {
    float u = fract((atan(d.z, d.x) + uYaw) / (2.0 * PI) + 0.5);
    float v = 0.5 - asin(clamp(d.y + 0.025, -1.0, 1.0)) / PI;
    vec3 col = texture2D(uSky, vec2(u, v)).rgb;
    // Zénith : toute une rangée de l'image converge en un point (éventail de repliement, sans mipmaps). Fondu vers la
    // moyenne de la calotte.
    float pole = smoothstep(0.9, 0.985, d.y);
    if (pole > 0.0) {
      vec3 cap = vec3(0.0);
      for (int k = 0; k < 8; k++) cap += texture2D(uSky, vec2((float(k) + 0.5) / 8.0, 0.06)).rgb;
      col = mix(col, cap / 8.0, pole);
    }
    return col;
  }
`;

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

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
  ${NOISE_GLSL}
  uniform sampler2D uNoise;
  uniform float uLight;
  uniform float uFog;
  uniform vec3 uMotion;
  varying vec3 vDir;

  vec3 ground(vec3 d) {
    float t = max(cameraPosition.y, 0.05) / max(-d.y, 1e-5);
    vec2 p = cameraPosition.xz + d.xz * t;
    float near = exp(-t * 0.02);
    // Flaques larges : là, le sol est un miroir ; ailleurs, un asphalte humide qui brouille le reflet. Deux échelles
    // du bruit précalculé sur des repères tournés : aucune répétition lisible, aucun bord droit.
    vec2 q1 = mat2(0.80, -0.60, 0.60, 0.80) * p;
    vec2 q2 = mat2(0.28, 0.96, -0.96, 0.28) * p;
    float field = texture2D(uNoise, q1 * 0.0105 + 0.31).r * 0.62 + texture2D(uNoise, q2 * 0.027 + 0.57).r * 0.38;
    float puddle = smoothstep(0.47, 0.6, field);
    float grain = mix(0.5, noise(p * 2.4) * 0.6 + noise(p * 9.0) * 0.4, near);
    float rough = mix(0.28, 0.025, puddle) * near;
    vec3 N = normalize(vec3((noise(p * 3.3) - 0.5) * rough, 1.0, (noise(p * 3.3 + 17.0) - 0.5) * rough));
    vec3 R = reflect(d, N);
    R.y = abs(R.y);
    // Plancher de réflectance dans les flaques (eau calme vue de haut) : depuis le ciel, la Voie lactée s'y lit encore.
    float fresnel = mix(0.03, 0.3, puddle) + 0.97 * pow(1.0 - clamp(dot(-d, N), 0.0, 1.0), 5.0);
    vec3 reflection = skySample(R) * uLight * min(fresnel, 0.85) * mix(0.45, 1.15, puddle);
    vec3 col = vec3(0.010, 0.010, 0.012) * (0.55 + grain * 0.9) + reflection;
    // Au loin, et seulement en rasant, le sol rejoint exactement le pied des collines : continuité à l'horizon.
    float graze = 1.0 - smoothstep(0.0, 0.014, -d.y);
    vec3 horizon = skySample(normalize(vec3(d.x, 0.0, d.z))) * uLight * graze;
    return mix(horizon, col, exp(-pow(uFog * t, 2.0)));
  }

  void main() {
    vec3 d = normalize(vDir);
    vec3 col;
    if (d.y < 0.0) {
      col = ground(d);
    } else if (dot(uMotion, uMotion) < 1e-8) {
      col = skySample(d) * uLight;
    } else {
      col = vec3(0.0);
      for (int k = 0; k < 10; k++) {
        float t = float(k) / 9.0;
        col += skySample(normalize(d - uMotion * t));
      }
      col *= uLight / 10.0;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const FOG_DENSITY = 0.0095;

export function createSkyLayer(options: { low: string; high?: string }) {
  const texture = new Texture();
  // Valeurs de la texture lues telles quelles (déjà étalonnées) : aucune conversion de couleur.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  const noise = createNoiseTexture();
  const uniforms = {
    uSky: { value: texture },
    uYaw: { value: 0 },
    uLight: { value: 1 },
    uNoise: { value: noise },
    uFog: { value: FOG_DENSITY },
    uMotion: { value: new Vector3() },
  };
  const material = new ShaderMaterial({
    uniforms,
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
  let drift = 0;
  const forward = new Vector3();
  const previous = new Vector3();
  let hasPrevious = false;
  const motion = new Vector3();
  const last = { light: -1, yaw: NaN, fx: NaN, fy: NaN, fz: NaN, px: NaN, py: NaN, pz: NaN, mx: NaN, my: NaN, mz: NaN };

  const load = async (url: string, ctx: StageContext) => {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    const bitmap = await createImageBitmap(await response.blob());
    (texture.image as ImageBitmap | undefined)?.close?.();
    texture.image = bitmap;
    texture.needsUpdate = true;
    ready = true;
    ctx.invalidate();
  };

  const layer: WebGLLayer & { texture: Texture; yaw: { value: number }; light: { value: number } } = {
    id: 'sky',
    root,
    texture,
    yaw: uniforms.uYaw,
    light: uniforms.uLight,
    async init(ctx) {
      await load(options.low, ctx).catch((error: Error) => {
        if (error.name !== 'AbortError') console.warn('[sky]', error.message);
      });
      if (options.high)
        load(options.high, ctx).catch((error: Error) => {
          if (error.name !== 'AbortError') console.warn('[sky]', error.message);
        });
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const pose = state.camera;
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

      const drifting = (state.channels.skyDrift ?? 0) > 0.5 && !state.reducedMotion;
      if (drifting) drift += state.dt * 0.007;
      const light = ready ? (state.channels.skyLight ?? 1) : 0;
      const yaw = (state.channels.skyYaw ?? 0) + drift;
      const changed =
        light !== last.light || yaw !== last.yaw || forward.x !== last.fx || forward.y !== last.fy || forward.z !== last.fz ||
        sphere.position.x !== last.px || sphere.position.y !== last.py || sphere.position.z !== last.pz ||
        motion.x !== last.mx || motion.y !== last.my || motion.z !== last.mz;
      if (!changed) return false;
      Object.assign(last, {
        light, yaw, fx: forward.x, fy: forward.y, fz: forward.z, px: sphere.position.x, py: sphere.position.y, pz: sphere.position.z,
        mx: motion.x, my: motion.y, mz: motion.z,
      });
      uniforms.uLight.value = light;
      uniforms.uYaw.value = yaw;
      uniforms.uMotion.value.copy(motion);
      // Encore en mouvement (dérive, ou filé qui doit retomber à zéro) : image suivante.
      return drifting || motion.lengthSq() > 0 ? 'continue' : true;
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
export { SKY_GLSL, NOISE_GLSL };
