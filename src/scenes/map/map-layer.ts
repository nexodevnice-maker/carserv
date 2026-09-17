import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  Vector2,
  Vector3,
  type Texture,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { FOG_DENSITY, NOISE_GLSL, SKY_GLSL } from '../sky/sky-layer';

/**
 * Le 06 en volume : le contour officiel du département (IGN, scripts/content-map.mjs) extrudé en une plaque posée sur
 * le sol mouillé de l'univers. Dessus : une laque noire qui reflète le même ciel ; tranche : l'or de la marque, plus
 * vif vers l'arête. La plaque sort du sol en une vague qui part de la côte et remonte vers les montagnes
 * (`mapReveal`), une arête de lumière sur le front de la vague ; son reflet (copie inversée, assombrie) s'étire sur le
 * sol. Aucune ville, aucun relief inventé : seulement le contour et le numéro.
 */
export interface MapData {
  width: number;
  height: number;
  paths: readonly string[];
}

export interface MapOptions {
  data: MapData;
  /** Centre de la plaque au sol (x, z) et mètres par unité de la carte. */
  center: readonly [number, number];
  scale: number;
  depth: number;
  /** Libellés posés au sol : numéro (sur la plaque) et mer (au sud de la côte). */
  labels: { number: string; numberAt: readonly [number, number]; sea: string; seaAt: readonly [number, number] };
  font: string;
}

const vertexShader = /* glsl */ `
  uniform float uReveal;
  uniform float uMirror;
  uniform vec2 uCenter;
  uniform vec2 uDir;
  uniform vec2 uRange;
  uniform float uDepth;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vFront;
  varying float vHeight;
  void main() {
    vec3 p = position;
    vec4 base = modelMatrix * vec4(p, 1.0);
    // Vague : 0 sur la côte, 1 au nord ; chaque point monte quand elle passe.
    float s = (dot(base.xz - uCenter, uDir) - uRange.x) / (uRange.y - uRange.x);
    float w = 0.22;
    float local = clamp((uReveal * (1.0 + w) - s) / w, 0.0, 1.0);
    float rise = local * local * (3.0 - 2.0 * local);
    vHeight = p.y / uDepth;
    p.y *= rise;
    if (uMirror > 0.5) p.y = -p.y;
    vFront = uReveal * (1.0 + w) - w * 0.5 - s;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal) * vec3(1.0, uMirror > 0.5 ? -1.0 : 1.0, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  ${SKY_GLSL}
  ${NOISE_GLSL}
  uniform float uReveal;
  uniform float uMirror;
  uniform float uSide;
  uniform float uFog;
  uniform float uSkyLight;
  uniform vec3 uGold;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vFront;
  varying float vHeight;
  void main() {
    if (uReveal <= 0.0) discard;
    vec3 V = normalize(vWorld - cameraPosition);
    vec3 N = normalize(vNormal);
    float fresnel = 0.04 + 0.96 * pow(1.0 - abs(dot(-V, N)), 5.0);
    // Arête de lumière sur le front de la vague.
    float front = exp(-pow(vFront / 0.018, 2.0)) * (1.0 - smoothstep(0.96, 1.0, uReveal));
    vec3 col;
    if (uSide > 0.5) {
      // Tranche dorée : plus vive vers l'arête haute, reflet du ciel par-dessus.
      float h = clamp(vHeight, 0.0, 1.0);
      col = uGold * (0.18 + 0.82 * h * h) + skySample(reflect(V, N)) * uSkyLight * fresnel * 0.5;
    } else {
      // Dessus : laque noire, grain fin, le ciel en reflet.
      vec2 q = vWorld.xz;
      vec3 Np = normalize(N + vec3(noise(q * 1.7) - 0.5, 0.0, noise(q * 1.7 + 9.0) - 0.5) * 0.035);
      vec3 R = reflect(V, Np);
      R.y = abs(R.y);
      col = vec3(0.012, 0.011, 0.010) + skySample(R) * uSkyLight * (0.26 + fresnel * 0.9);
    }
    col += uGold * front * 1.6;
    float dist = length(vWorld.xz - cameraPosition.xz);
    col *= exp(-pow(uFog * dist, 2.0));
    float alpha = 1.0;
    if (uMirror > 0.5) {
      // Reflet sur le sol mouillé : sombre, qui s'efface en s'éloignant de la surface.
      col *= 0.34;
      alpha = exp(vWorld.y * 1.1);
      gl_FragColor = vec4(col * alpha, alpha);
      return;
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

const labelVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const labelFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFog;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float dist = length(vWorld.xz - cameraPosition.xz);
    float a = t.a * uOpacity * exp(-pow(uFog * dist, 2.0));
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Chemins SVG absolus (M, L, Z) → formes, dans le plan de la carte (x vers l'est, y vers le nord). */
function shapesFrom(data: MapData, scale: number): Shape[] {
  const cx = data.width / 2;
  const cy = data.height / 2;
  return data.paths.map((d) => {
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points: Vector2[] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2)
      points.push(new Vector2(((numbers[i] ?? 0) - cx) * scale, -((numbers[i + 1] ?? 0) - cy) * scale));
    return new Shape(points);
  });
}

function labelTexture(text: string, font: string, size: [number, number], weight: string, spacing = 0): CanvasTexture {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.fillStyle = '#f3f1ec';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `${weight} ${font}`;
  if (spacing) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  c.fillText(text, size[0] / 2, size[1] / 2);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

export function createMapLayer(options: MapOptions, sky: { texture: Texture; yaw: { value: number } }) {
  const root = new Group();
  root.name = 'map';
  // Visibilité propre à la couche (la racine appartient à la scène, qui gère la sienne).
  const body = new Group();
  root.add(body);
  const { data, scale, depth, center } = options;

  const geometry = new ExtrudeGeometry(shapesFrom(data, scale), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 2,
    curveSegments: 1,
  });
  // Plan de la carte → sol : y de la carte vers −z (le nord au loin), extrusion vers le haut, base posée à y = 0.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0.06, 0);

  // Direction de la vague (côte au sud-est → montagnes au nord-ouest) et étendue le long de cette direction.
  const dir = new Vector2(-0.45, -1).normalize();
  let min = Infinity;
  let max = -Infinity;
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getX(i) * dir.x + pos.getZ(i) * dir.y;
    min = Math.min(min, s);
    max = Math.max(max, s);
  }

  const shared = {
    uSky: { value: sky.texture },
    uYaw: sky.yaw,
    uReveal: { value: 0 },
    uCenter: { value: new Vector2(center[0], center[1]) },
    uDir: { value: dir },
    uRange: { value: new Vector2(min, max) },
    uDepth: { value: depth + 0.12 },
    uFog: { value: FOG_DENSITY },
    uSkyLight: { value: 1 },
    uGold: { value: new Vector3(0.9, 0.68, 0.26) },
  };
  const material = (side: boolean, mirror: boolean) => {
    const m = new ShaderMaterial({
      uniforms: { ...shared, uSide: { value: side ? 1 : 0 }, uMirror: { value: mirror ? 1 : 0 } },
      vertexShader,
      fragmentShader,
      transparent: mirror,
      depthWrite: !mirror,
      premultipliedAlpha: mirror,
    });
    // Copie inversée : l'ordre des sommets s'inverse avec elle.
    if (mirror) m.side = DoubleSide;
    return m;
  };
  const plate = new Mesh(geometry, [material(false, false), material(true, false)]);
  const mirror = new Mesh(geometry, [material(false, true), material(true, true)]);
  plate.renderOrder = 2;
  mirror.renderOrder = 0;
  for (const mesh of [plate, mirror]) {
    mesh.position.set(center[0], 0, center[1]);
    mesh.frustumCulled = false;
  }
  body.add(mirror, plate);

  const labels: { mesh: Mesh; material: ShaderMaterial; from: number }[] = [];
  const textures: Texture[] = [];
  const addLabel = (texture: CanvasTexture, width: number, height: number, at: readonly [number, number], y: number, from: number, color: Vector3) => {
    textures.push(texture);
    const labelMaterial = new ShaderMaterial({
      uniforms: { uMap: { value: texture }, uColor: { value: color }, uOpacity: { value: 0 }, uFog: { value: FOG_DENSITY } },
      vertexShader: labelVertex,
      fragmentShader: labelFragment,
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
    });
    const mesh = new Mesh(new PlaneGeometry(width, height), labelMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(center[0] + (at[0] - data.width / 2) * scale, y, center[1] + (at[1] - data.height / 2) * scale);
    mesh.renderOrder = 4;
    body.add(mesh);
    labels.push({ mesh, material: labelMaterial, from });
  };

  const last = { reveal: -1, light: -1 };
  const layer: WebGLLayer = {
    id: 'map',
    root,
    async init(_ctx: StageContext) {
      await document.fonts?.load(`700 200px ${options.font}`).catch(() => undefined);
      const { labels: text } = options;
      addLabel(labelTexture(text.number, `420px ${options.font}`, [1024, 512], '700'), 12, 6, text.numberAt, depth + 0.14, 0.82, new Vector3(0.93, 0.72, 0.3));
      addLabel(labelTexture(text.sea.toUpperCase(), `64px ${options.font}`, [2048, 128], '600', 26), 26, 1.6, text.seaAt, 0.03, 0.6, new Vector3(0.8, 0.8, 0.78));
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const reveal = state.channels.mapReveal ?? 0;
      const light = state.channels.skyLight ?? 1;
      body.visible = reveal > 0;
      if (reveal === last.reveal && light === last.light) return false;
      last.reveal = reveal;
      last.light = light;
      shared.uReveal.value = reveal;
      shared.uSkyLight.value = light;
      for (const { material: m, from } of labels) m.uniforms.uOpacity.value = Math.max(0, Math.min(1, (reveal - from) / (1 - from)));
      return true;
    },
    dispose() {
      for (const texture of textures) texture.dispose();
    },
  };
  return layer;
}
