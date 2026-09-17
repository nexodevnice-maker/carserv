import {
  BufferGeometry,
  CanvasTexture,
  CustomBlending,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShapeGeometry,
  ShaderMaterial,
  Shape,
  Vector2,
  Vector3,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { GROUND_GLSL, SKY_GLSL } from '../shared/night-glsl';

/**
 * Le 06, le sol de tout le récit : le contour officiel du département (IGN, scripts/content-map.mjs) à l'échelle du
 * monde, extrudé en un plateau dont la surface EST le sol mouillé (même fonction que la mer, flaques en plus) et dont
 * les falaises sont d'or, reflétées dans la mer de nuit. Vu de près, on marche dessus ; vu du ciel, c'est un territoire.
 * `mapReveal` : une vague de lumière parcourt le 06 de la côte vers les montagnes et allume les falaises.
 *
 * Autour : la France entière, département par département (scripts/content-france.mjs, contours IGN), à la même échelle
 * et au même endroit — des terres presque noires bordées d'un trait d'or, le 06 allumé au milieu. Tout cela s'efface
 * avec l'altitude : vu du ciel c'est un pays, au sol il n'en reste que le plateau, ses falaises et la mer.
 * Aucune ville, aucun relief inventé : seulement les contours, le numéro et la mer.
 */
export interface MapData {
  width: number;
  height: number;
  paths: readonly string[];
}

export interface FranceData {
  box: readonly number[];
  home: string;
  departements: readonly { code: string; nom: string; paths: readonly string[] }[];
}

export interface MapOptions {
  data: MapData;
  /** La France autour : mêmes unités de carte, même ancre. */
  france: FranceData;
  /** Point de la carte (unités de la carte) placé à l'origine du monde. */
  anchor: readonly [number, number];
  /** Mètres par unité de la carte. */
  scale: number;
  /** Hauteur des falaises : le plateau affleure à y = 0, la mer est à −depth. */
  depth: number;
  bevel: number;
  labels: { number: string; numberAt: readonly [number, number]; sea: string; seaAt: readonly [number, number] };
  font: string;
}

export interface SharedNight {
  uSky: { value: Texture };
  uYaw: { value: number };
  uSkySize: { value: Vector2 };
  uPixelAngle: { value: number };
  uZenith: { value: Vector3 };
  uNoise: { value: Texture };
  uLight: { value: number };
  uFog: { value: number };
}

const vertexShader = /* glsl */ `
  uniform float uReveal;
  uniform float uMirror;
  uniform float uSeaY;
  uniform vec2 uDir;
  uniform vec2 uRange;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vFront;
  varying float vLit;
  varying float vHeight;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // Vague : 0 sur la côte, 1 au nord.
    float s = (dot(world.xz, uDir) - uRange.x) / (uRange.y - uRange.x);
    float w = 0.2;
    vLit = smoothstep(0.0, 1.0, clamp((uReveal * (1.0 + w) - s) / w, 0.0, 1.0));
    vFront = uReveal * (1.0 + w) - w * 0.5 - s;
    vHeight = clamp((world.y - uSeaY) / -uSeaY, 0.0, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    if (uMirror > 0.5) {
      world.y = 2.0 * uSeaY - world.y;
      n.y = -n.y;
    }
    vWorld = world.xyz;
    vNormal = n;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  ${SKY_GLSL}
  ${GROUND_GLSL}
  uniform float uReveal;
  uniform float uMirror;
  uniform float uSide;
  uniform float uSeaY;
  uniform vec3 uGold;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vFront;
  varying float vLit;
  varying float vHeight;
  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    float fog = exp(-pow(uFog * t, 2.0));
    float front = exp(-pow(vFront / 0.025, 2.0)) * (1.0 - smoothstep(0.96, 1.0, uReveal)) * step(0.001, uReveal);
    vec3 col;
    if (uSide < 0.5) {
      // Surface du 06 : le sol mouillé ; la vague y passe comme une lumière rasante.
      col = groundShade(vWorld.xz, V, t, 0.0) + uGold * front * 0.45 * fog;
    } else {
      // Falaises d'or : plus vives vers l'arête, éteintes tant que la vague n'est pas passée.
      vec3 N = normalize(vNormal);
      float fresnel = 0.04 + 0.96 * pow(1.0 - abs(dot(-V, N)), 5.0);
      float h = vHeight * vHeight;
      // Arête : un filet d'or vif sur le haut de la falaise, lisible depuis le ciel.
      float rim = smoothstep(0.93, 0.99, vHeight);
      col = uGold * ((0.18 + 0.95 * h) * mix(0.42, 1.0, vLit) + rim * mix(0.8, 1.6, vLit)) + skySample(reflect(V, N)) * uLight * fresnel * 0.3;
      col = mix(haze(V) * uLight, col + uGold * front * 1.5, fog);
    }
    if (uMirror > 0.5) {
      // Reflet dans la mer : sombre, qui s'efface en s'enfonçant.
      float a = 0.4 * exp((vWorld.y - uSeaY) * 0.035);
      gl_FragColor = vec4(col * a, a);
      return;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

const franceVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const franceFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform float uLight;
  uniform float uFade;
  uniform float uHome;
  uniform vec3 uGold;
  varying vec3 vWorld;
  void main() {
    if (uFade <= 0.002) discard;
    vec3 ray = vWorld - cameraPosition;
    vec3 V = ray / length(ray);
    // Les terres : presque noires, un reflet du ciel très flou (elles se distinguent de la mer par leur matité).
    vec3 col = vec3(0.012, 0.013, 0.016) + skyLod(reflect(V, vec3(0.0, 1.0, 0.0)), 4.0) * uLight * 0.07;
    col = mix(col, uGold * 0.85, uHome);
    float a = uFade * mix(1.0, 0.8, uHome);
    gl_FragColor = vec4(col * a, a);
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
    vec3 ray = vWorld - cameraPosition;
    float dist = length(ray);
    // Lisible seulement vu d'en haut : en rasant, un marquage au sol ne serait qu'un scintillement.
    float a = t.a * uOpacity * exp(-pow(uFog * dist, 2.0)) * smoothstep(0.08, 0.3, -ray.y / dist);
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Chemins SVG absolus (M, L, Z) → formes, dans le plan de la carte (x vers l'est, y vers le nord), ancre à l'origine. */
function shapesFrom(data: MapData, anchor: readonly [number, number], scale: number): Shape[] {
  return data.paths.map((d) => {
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points: Vector2[] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2)
      points.push(new Vector2(((numbers[i] ?? 0) - anchor[0]) * scale, -((numbers[i + 1] ?? 0) - anchor[1]) * scale));
    return new Shape(points);
  });
}

function labelTexture(text: string, font: string, size: [number, number], spacing = 0): CanvasTexture {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = font;
  if (spacing) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  c.fillText(text, size[0] / 2, size[1] / 2);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

export function createMapLayer(options: MapOptions, night: SharedNight) {
  const root = new Group();
  root.name = 'map';
  const { data, scale, depth, bevel, anchor } = options;
  const seaY = -depth;

  const geometry = new ExtrudeGeometry(shapesFrom(data, anchor, scale), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  // Plan de la carte → sol : y de la carte vers −z (le nord au loin), extrusion vers le haut, plateau affleurant à y = 0.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -(depth + bevel), 0);

  // Direction de la vague (côte au sud-est → montagnes au nord-ouest) et étendue le long de cette direction.
  const dir = new Vector2(-0.35, -1).normalize();
  let min = Infinity;
  let max = -Infinity;
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getX(i) * dir.x + pos.getZ(i) * dir.y;
    min = Math.min(min, s);
    max = Math.max(max, s);
  }

  const own = {
    uReveal: { value: 0 },
    uSeaY: { value: seaY },
    uDir: { value: dir },
    uRange: { value: new Vector2(min, max) },
    uGold: { value: new Vector3(0.93, 0.7, 0.28) },
  };
  const material = (side: boolean, mirror: boolean) => {
    const m = new ShaderMaterial({
      uniforms: { ...night, ...own, uSide: { value: side ? 1 : 0 }, uMirror: { value: mirror ? 1 : 0 } },
      vertexShader,
      fragmentShader,
      // La surface est un sol : elle n'écrit pas la profondeur (route, monolithe et marquages s'y posent sans combat
      // de profondeur, même à des kilomètres).
      depthWrite: side && !mirror,
    });
    if (mirror) {
      // Reflet mélangé mais dessiné dans la passe opaque, AVANT la surface du 06 : la surface le recouvre ; il n'apparaît
      // que sur la mer.
      m.side = DoubleSide;
      m.blending = CustomBlending;
      m.blendSrc = OneFactor;
      m.blendDst = OneMinusSrcAlphaFactor;
    }
    return m;
  };
  // Ordre : reflet (sur la mer) → falaises (écrivent la profondeur) → surface (la teste sans l'écrire). La surface
  // recouvre le reflet, ne passe jamais devant une falaise plus proche, et les falaises lointaines ne la traversent pas.
  const only = (group: number) => {
    const g = geometry.clone();
    g.clearGroups();
    const range = geometry.groups[group];
    if (range) g.addGroup(range.start, range.count, 0);
    return g;
  };
  const capsGeometry = only(0);
  const sidesGeometry = only(1);
  const top = new Mesh(capsGeometry, material(false, false));
  top.renderOrder = -8;
  const cliffs = new Mesh(sidesGeometry, material(true, false));
  cliffs.renderOrder = -8.5;
  const reflection = new Mesh(sidesGeometry, material(true, true));
  reflection.renderOrder = -9;
  for (const mesh of [top, cliffs, reflection]) mesh.frustumCulled = false;
  root.add(reflection, cliffs, top);

  // — La France autour du 06 : plaques (hors 06) et traits de frontière (tous les départements).
  const franceUniforms = { ...night, uFade: { value: 0 }, uHome: { value: 0 }, uGold: own.uGold };
  const franceMaterial = (home: boolean) =>
    new ShaderMaterial({
      uniforms: { ...franceUniforms, uHome: { value: home ? 1 : 0 } },
      vertexShader: franceVertex,
      fragmentShader: franceFragment,
      transparent: true,
      depthWrite: false,
    });
  const france = new Group();
  const shapesOf = (paths: readonly string[]) => shapesFrom({ width: data.width, height: data.height, paths }, anchor, scale);
  // Chaque département est un volume : 25 m de relief (le 06 en garde 40 : il domine ses voisins).
  const plate = (paths: readonly string[], height: number, y: number) => {
    const shapes = shapesOf(paths);
    const g = shapes.length
      ? new ExtrudeGeometry(shapes, { depth: height, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 1, curveSegments: 1 })
      : new ShapeGeometry(shapes, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return g;
  };
  const others = options.france.departements.filter((d) => d.code !== options.france.home);
  const lands = mergeGeometries(others.map((d) => plate(d.paths, 25, -25.6)));
  const homeLand = plate(options.france.departements.find((d) => d.code === options.france.home)?.paths ?? [], 40, -40.3);
  const landsMesh = new Mesh(lands ?? homeLand, franceMaterial(false));
  const homeMesh = new Mesh(homeLand, franceMaterial(true));
  // Traits de frontière : un pixel à l'écran, quelle que soit l'altitude.
  const borderPoints: number[] = [];
  for (const d of options.france.departements)
    for (const shape of shapesOf(d.paths)) {
      const points = shape.getPoints(1);
      for (let i = 0; i < points.length; i++) {
        const a = points[i]!;
        const b = points[(i + 1) % points.length]!;
        borderPoints.push(a.x, 0.2, -a.y, b.x, 0.2, -b.y);
      }
    }
  const borderGeometry = new BufferGeometry();
  borderGeometry.setAttribute('position', new Float32BufferAttribute(borderPoints, 3));
  const borderMaterial = new LineBasicMaterial({ color: 0xfdc727, transparent: true, opacity: 0, depthWrite: false });
  const borders = new LineSegments(borderGeometry, borderMaterial);
  for (const mesh of [landsMesh, homeMesh, borders]) {
    mesh.frustumCulled = false;
    mesh.renderOrder = -9;
  }
  france.add(landsMesh, homeMesh, borders);
  root.add(france);

  const at = (point: readonly [number, number]) => [(point[0] - anchor[0]) * scale, (point[1] - anchor[1]) * scale] as const;
  const labels: { material: ShaderMaterial; from: number }[] = [];
  const textures: Texture[] = [];
  const addLabel = (texture: CanvasTexture, width: number, height: number, point: readonly [number, number], y: number, from: number, color: Vector3) => {
    textures.push(texture);
    const labelMaterial = new ShaderMaterial({
      uniforms: { uMap: { value: texture }, uColor: { value: color }, uOpacity: { value: 0 }, uFog: night.uFog },
      vertexShader: labelVertex,
      fragmentShader: labelFragment,
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
    });
    const mesh = new Mesh(new PlaneGeometry(width, height), labelMaterial);
    mesh.rotation.x = -Math.PI / 2;
    const [x, z] = at(point);
    mesh.position.set(x, y, z);
    mesh.renderOrder = -6;
    root.add(mesh);
    labels.push({ material: labelMaterial, from });
  };

  const last = { reveal: -1, fade: -1 };
  const layer: WebGLLayer = {
    id: 'map',
    root,
    async init() {
      await document.fonts?.load(`700 200px ${options.font}`).catch(() => undefined);
      const { labels: text } = options;
      addLabel(labelTexture(text.number, `700 420px ${options.font}`, [1024, 512]), 380 * scale, 190 * scale, text.numberAt, 0.4, 0.75, new Vector3(0.93, 0.72, 0.3));
      addLabel(labelTexture(text.sea.toUpperCase(), `600 64px ${options.font}`, [2048, 128], 26), 760 * scale, 47 * scale, text.seaAt, seaY + 0.4, 0.5, new Vector3(0.7, 0.74, 0.8));
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const reveal = state.channels.mapReveal ?? 0;
      // Vue du ciel : le pays ; au sol : rien (le plateau et la mer suffisent).
      const altitude = state.camera?.position[1] ?? 0;
      const fade = Math.min(1, Math.max(0, (altitude - 400) / 2000));
      france.visible = fade > 0.002;
      if (reveal === last.reveal && fade === last.fade) return false;
      last.reveal = reveal;
      last.fade = fade;
      own.uReveal.value = reveal;
      franceUniforms.uFade.value = fade;
      for (const mesh of [landsMesh, homeMesh]) (mesh.material as ShaderMaterial).uniforms.uFade.value = fade;
      borderMaterial.opacity = fade * 0.75;
      for (const { material: m, from } of labels) m.uniforms.uOpacity.value = Math.max(0, Math.min(1, (reveal - from) / (1 - from)));
      return true;
    },
    dispose() {
      for (const texture of textures) texture.dispose();
      capsGeometry.dispose();
      sidesGeometry.dispose();
      geometry.dispose();
    },
  };
  return layer;
}
