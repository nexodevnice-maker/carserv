import { Group, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector2, Vector3, type Texture } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * Nuages de nuit : une mer de nuages sous l'univers et des bancs plus bas, que la caméra traverse pendant ses vols.
 * Chaque nuage est un plan face caméra texturé du bruit fractal précalculé (shared/noise-texture), éclairé par le
 * clair d'étoiles (bord argenté vers le ciel, corps sombre).
 * Opacité pilotée par la DISTANCE à la caméra, proportionnelle à la taille du nuage (pattern Agenceeimoo n° 4) : un
 * nuage s'efface avant de remplir l'écran — la traversée se lit comme des voiles qui passent autour du regard, jamais
 * comme un aplat. Un champ peut être percé (`hole`) : la plongée vers le 06 passe par une trouée.
 * Densité globale : canal `clouds`.
 */
export interface CloudField {
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  count: number;
  /** Taille des nuages (m). */
  scale: readonly [number, number];
  /** Trouée circulaire (x, z, rayon) : aucun nuage dedans. */
  hole?: readonly [number, number, number];
}

const vertexShader = /* glsl */ `
  attribute vec4 aCloud; // x, y, z, taille
  attribute vec2 aSeed;
  varying vec2 vUv;
  varying vec2 vSeed;
  varying float vFade;
  varying float vHeight;
  uniform float uFar;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vec4 center = viewMatrix * vec4(aCloud.xyz, 1.0);
    float dist = -center.z;
    // S'efface avant de couvrir le champ (un plan face caméra plus large que sa distance voilerait tout l'écran), et au
    // loin dans la nuit.
    vFade = smoothstep(aCloud.w * 0.35, aCloud.w * 1.1, dist) * (1.0 - smoothstep(uFar * 0.55, uFar, dist));
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

export function createCloudLayer(options: { fields: readonly CloudField[]; noise: Texture; far: number }) {
  const material = new ShaderMaterial({
    uniforms: {
      uNoise: { value: options.noise },
      uDensity: { value: 0 },
      uLight: { value: 1 },
      uFar: { value: options.far },
      uTop: { value: new Vector3(0.55, 0.62, 0.76) },
      uBottom: { value: new Vector3(0.016, 0.02, 0.03) },
      uLightDir: { value: new Vector2(0, 1) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // Prémultiplié : la brume voile ce qu'elle couvre sans liseré clair sur ses bords.
    premultipliedAlpha: true,
  });
  const clouds: number[] = [];
  const seeds: number[] = [];
  let s = 12345;
  const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (const field of options.fields) {
    let placed = 0;
    for (let tries = 0; placed < field.count && tries < field.count * 20; tries++) {
      const x = field.center[0] + (random() - 0.5) * field.size[0];
      const y = field.center[1] + (random() - 0.5) * field.size[1];
      const z = field.center[2] + (random() - 0.5) * field.size[2];
      const size = field.scale[0] + random() * (field.scale[1] - field.scale[0]);
      if (field.hole && Math.hypot(x - field.hole[0], z - field.hole[1]) < field.hole[2] + size * 0.25) continue;
      clouds.push(x, y, z, size);
      seeds.push(random(), random());
      placed++;
    }
  }
  const total = clouds.length / 4;
  const geometry = new PlaneGeometry(1, 1);
  geometry.setAttribute('aCloud', new InstancedBufferAttribute(new Float32Array(clouds), 4));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(seeds), 2));
  const mesh = new InstancedMesh(geometry, material, total);
  for (let i = 0; i < total; i++) mesh.setMatrixAt(i, new Matrix4());
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  const root = new Group();
  root.add(mesh);
  const last = { density: -1, light: -1, x: NaN, y: NaN, z: NaN };
  const cloudAttr = geometry.getAttribute('aCloud') as InstancedBufferAttribute;
  const seedAttr = geometry.getAttribute('aSeed') as InstancedBufferAttribute;
  const order = Array.from({ length: total }, (_, k) => k);
  const distance = new Float32Array(total);
  const sourceClouds = Float32Array.from(clouds);
  const sourceSeeds = Float32Array.from(seeds);
  const sort = (x: number, y: number, z: number) => {
    for (let k = 0; k < total; k++)
      distance[k] = (sourceClouds[k * 4]! - x) ** 2 + (sourceClouds[k * 4 + 1]! - y) ** 2 + (sourceClouds[k * 4 + 2]! - z) ** 2;
    order.sort((a, b) => distance[b]! - distance[a]!);
    const c = cloudAttr.array as Float32Array;
    const sd = seedAttr.array as Float32Array;
    order.forEach((from, to) => {
      c.set(sourceClouds.subarray(from * 4, from * 4 + 4), to * 4);
      sd.set(sourceSeeds.subarray(from * 2, from * 2 + 2), to * 2);
    });
    cloudAttr.needsUpdate = true;
    seedAttr.needsUpdate = true;
  };

  const layer: WebGLLayer = {
    id: 'clouds',
    root,
    init() {},
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const density = state.channels.clouds ?? 0;
      const light = state.channels.skyLight ?? 1;
      mesh.visible = density > 0.002;
      const eye = state.camera?.position;
      // Retri seulement après un déplacement sensible : l'ordre change lentement.
      if (mesh.visible && eye && (Math.abs(eye[0] - last.x) + Math.abs(eye[1] - last.y) + Math.abs(eye[2] - last.z) > 4 || Number.isNaN(last.x))) {
        sort(eye[0], eye[1], eye[2]);
        last.x = eye[0];
        last.y = eye[1];
        last.z = eye[2];
      }
      if (density === last.density && light === last.light) return false;
      last.density = density;
      last.light = light;
      material.uniforms.uDensity.value = density;
      material.uniforms.uLight.value = 0.35 + light * 0.65;
      return true;
    },
    dispose() {},
  };
  return layer;
}
