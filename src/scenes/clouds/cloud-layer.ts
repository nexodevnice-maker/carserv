import { Group, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { createNoiseTexture } from '../shared/noise-texture';

/**
 * Nuages de nuit : des bancs de brume que la caméra traverse pendant ses vols (plongée depuis l'univers, montée vers la
 * carte, passage dans la Voie lactée, piqué sur la route). Chaque nuage est un plan face caméra texturé d'un bruit
 * fractal précalculé (shared/noise-texture), éclairé par le clair d'étoiles (dessus bleuté, dessous sombre).
 * Opacité pilotée par la DISTANCE à la caméra (pattern Agenceeimoo n° 4) : un nuage s'efface avant de remplir l'écran
 * — la traversée se lit comme un voile qui passe, jamais comme un aplat laiteux. Densité globale : canal `clouds`.
 */
const vertexShader = /* glsl */ `
  attribute vec4 aCloud; // x, y, z, taille
  attribute vec2 aSeed;
  varying vec2 vUv;
  varying vec2 vSeed;
  varying float vFade;
  varying float vHeight;
  uniform float uNear;
  uniform float uFar;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vec4 center = viewMatrix * vec4(aCloud.xyz, 1.0);
    float dist = -center.z;
    // S'efface avant de toucher la caméra, et au loin dans la nuit.
    vFade = smoothstep(uNear, uNear * 2.8, dist) * (1.0 - smoothstep(uFar * 0.6, uFar, dist));
    vHeight = position.y;
    center.xy += position.xy * aCloud.w * vec2(1.0, 0.55);
    gl_Position = projectionMatrix * center;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uDensity;
  uniform float uLight;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec2 uLightDir;
  varying vec2 vUv;
  varying vec2 vSeed;
  varying float vFade;
  varying float vHeight;
  void main() {
    vec2 p = vUv - 0.5;
    float radial = 1.0 - smoothstep(0.18, 0.5, length(p * vec2(1.0, 1.25)));
    float n = texture2D(uNoise, vUv * 0.9 + vSeed).r;
    float m = texture2D(uNoise, vUv * 2.3 - vSeed * 1.7).r;
    float body = n * 0.72 + m * 0.38;
    float shape = smoothstep(0.44, 0.84, body) * radial;
    float alpha = shape * vFade * uDensity * 0.58;
    if (alpha < 0.004) discard;
    // Relief : la densité vue un peu plus loin vers la lumière (le ciel, au-dessus) — là où elle baisse, un bord
    // argenté ; ailleurs, le corps sombre du nuage.
    float toward = texture2D(uNoise, vUv * 0.9 + vSeed + uLightDir * 0.045).r * 0.72 + m * 0.38;
    float rim = clamp((body - toward) * 9.0, 0.0, 1.0);
    float h = clamp(vHeight + 0.5, 0.0, 1.0);
    vec3 col = (mix(uBottom, uTop, h * 0.45 + rim * 0.75) + uTop * rim * (1.0 - shape) * 0.6) * uLight;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

export function createCloudLayer(options: { fields: { center: [number, number, number]; size: [number, number, number]; count: number }[] }) {
  const noise = createNoiseTexture();
  const material = new ShaderMaterial({
    uniforms: {
      uNoise: { value: noise },
      uDensity: { value: 0 },
      uLight: { value: 1 },
      uNear: { value: 7 },
      uFar: { value: 140 },
      uTop: { value: new Vector3(0.42, 0.46, 0.56) },
      uBottom: { value: new Vector3(0.018, 0.02, 0.028) },
      uLightDir: { value: new Vector2(0, 1) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // Prémultiplié : la brume voile ce qu'elle couvre sans liseré clair sur ses bords.
    premultipliedAlpha: true,
  });
  const total = options.fields.reduce((sum, f) => sum + f.count, 0);
  const geometry = new PlaneGeometry(1, 1);
  const clouds = new Float32Array(total * 4);
  const seeds = new Float32Array(total * 2);
  let s = 12345;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  let k = 0;
  for (const field of options.fields) {
    for (let i = 0; i < field.count; i++, k++) {
      clouds[k * 4] = field.center[0] + (random() - 0.5) * field.size[0];
      clouds[k * 4 + 1] = field.center[1] + (random() - 0.5) * field.size[1];
      clouds[k * 4 + 2] = field.center[2] + (random() - 0.5) * field.size[2];
      clouds[k * 4 + 3] = 16 + random() * 26;
      seeds[k * 2] = random();
      seeds[k * 2 + 1] = random();
    }
  }
  geometry.setAttribute('aCloud', new InstancedBufferAttribute(clouds, 4));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 2));
  const mesh = new InstancedMesh(geometry, material, total);
  for (let i = 0; i < total; i++) mesh.setMatrixAt(i, new Matrix4());
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  const root = new Group();
  root.add(mesh);
  const last = { density: -1, light: -1 };

  const layer: WebGLLayer = {
    id: 'clouds',
    root,
    init() {},
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const density = state.channels.clouds ?? 0;
      const light = state.channels.skyLight ?? 1;
      mesh.visible = density > 0.002;
      if (density === last.density && light === last.light) return false;
      last.density = density;
      last.light = light;
      material.uniforms.uDensity.value = density;
      material.uniforms.uLight.value = 0.35 + light * 0.65;
      return true;
    },
    dispose() {
      noise.dispose();
    },
  };
  return layer;
}

