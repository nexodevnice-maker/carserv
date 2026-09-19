import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LES ALENTOURS — ce qu'il y a AUTOUR de la place.
 *
 * Sans eux, on arrive sur une dalle éclairée posée dans du noir : le lieu n'a pas de dehors, donc il n'existe pas.
 * Ce qui fait un dehors, la nuit, ce n'est pas du décor — c'est de la LUMIÈRE QUI S'ÉLOIGNE :
 * - une file de lampadaires qui part vers l'horizon : c'est elle, et elle seule, qui donne la profondeur. Chaque
 *   halo plus petit et plus pâle que le précédent dit une distance ;
 * - des immeubles lointains aux fenêtres allumées, très sombres, très loin : une ville qu'on ne visite pas, qu'on
 *   devine ;
 * - une glissière le long de l'aire : la limite du terrain, et une arête qui accroche la lune.
 *
 * Coût : six appels de dessin pour tout, quelle que soit la quantité. Tout est instancié, rien n'est chargé — aucun
 * fichier, aucune texture. Les fenêtres sont peintes par le nuanceur, comme sur la place.
 */
export interface SurroundingsOptions {
  night: SharedNight;
  /** File de lampadaires : de `from` à `to` mètres le long de z, tous les `every` mètres, à `side` mètres en x. */
  lamps: { side: number; from: number; to: number; every: number; height: number };
  /** Immeubles lointains : nombre, distance mini/maxi (m), hauteurs (m). */
  blocks: { count: number; inner: number; outer: number; low: number; high: number };
  /** Glissière : abscisse, longueur (m). */
  rail: { at: number; length: number };
  chapters?: readonly string[];
}

/** Tirage déterministe : deux chargements donnent exactement le même dehors. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const farVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vec4 local = vec4(position, 1.0);
    vec3 nrm = normal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      nrm = mat3(instanceMatrix) * nrm;
    #endif
    vec4 world = modelMatrix * local;
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * nrm);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * LES IMMEUBLES DU FOND. Des volumes presque noirs dont SEULES LES FENÊTRES éclairent — étages de 3,2 m, travées de
 * 2,6 m mesurées dans le monde, une sur trois allumée. Quand une travée devient plus petite qu'un pixel, la trame
 * moirerait : on la remplace par sa moyenne, et de loin il ne reste qu'une lueur. C'est exactement ce que fait une
 * ville la nuit quand on la regarde de trois cents mètres.
 */
const blockFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform float uLight;
  uniform float uFog;
  uniform float uAround;
  varying vec3 vWorld;
  varying vec3 vNormalW;

  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    vec3 N = normalize(vNormalW);
    vec3 axis = abs(N);
    // Le béton de nuit : presque rien, juste ce que la lune pose sur les faces tournées vers elle.
    vec3 col = vec3(0.020, 0.021, 0.026) * (0.5 + skyLod(N, 5.0) * uLight * 5.0);
    vec2 uv = axis.x > axis.z ? vec2(vWorld.z, vWorld.y) : vec2(vWorld.x, vWorld.y);
    vec2 cell = uv / vec2(2.6, 3.2);
    vec2 edge = fwidth(cell) * 1.5;
    vec2 f = fract(cell);
    vec2 pane = smoothstep(0.16 - edge, 0.26 + edge, f) * (1.0 - smoothstep(0.74 - edge, 0.84 + edge, f));
    float lit = step(0.66, fract(sin(dot(floor(cell), vec2(12.9898, 78.233))) * 43758.5453));
    float blur = smoothstep(0.3, 0.8, max(edge.x, edge.y));
    float win = mix(pane.x * pane.y * lit, 0.1, blur) * (1.0 - axis.y);
    col += vec3(1.0, 0.76, 0.42) * win * 1.9;
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * uAround, uAround);
  }
`;

/** Métal de nuit : mâts et glissière. Une silhouette qui accroche la lune sur son arête, rien de plus. */
const metalFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform float uLight;
  uniform float uFog;
  uniform float uAround;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 N = normalize(vNormalW);
    vec3 col = vec3(0.045, 0.048, 0.056) * (0.35 + skyLod(N, 4.0) * uLight * 9.0);
    col = mix(haze(ray / t) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * uAround, uAround);
  }
`;

/**
 * LE HALO d'un lampadaire lointain. Panneau toujours face à la caméra, additif, dont la taille est donnée en MÈTRES :
 * un halo à trois cents mètres doit être petit, sinon la file ne recule pas. C'est cette décroissance qui fait la
 * profondeur, bien plus que la perspective.
 */
const glowVertex = /* glsl */ `
  uniform float uSize;
  varying vec2 vUv;
  varying float vFar;
  void main() {
    vec3 at = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    vec3 world = (modelMatrix * vec4(at, 1.0)).xyz;
    vec4 view = viewMatrix * vec4(world, 1.0);
    view.xy += position.xy * uSize;
    vUv = uv;
    vFar = -view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const glowFragment = /* glsl */ `
  uniform float uAround;
  varying vec2 vUv;
  varying float vFar;
  void main() {
    vec2 d = vUv - 0.5;
    float r = dot(d, d) * 4.0;
    if (r > 1.0) discard;
    // Noyau net, halo qui meurt ; et la lueur pâlit avec la distance, comme dans l'air.
    float core = exp(-r * 7.0) + exp(-r * 1.8) * 0.4;
    float far = 1.0 / (1.0 + vFar * 0.004);
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.52) * core * far * uAround, 1.0);
  }
`;

export function createSurroundingsLayer(options: SurroundingsOptions) {
  const root = new Group();
  root.name = 'surroundings';
  root.visible = false;
  const shared = { uAround: { value: 0 } };
  const geometries: BufferGeometry[] = [];
  const materials: ShaderMaterial[] = [];

  const make = (fragment: string, extra: Record<string, { value: unknown }> = {}) => {
    const material = new ShaderMaterial({
      uniforms: { ...options.night, ...shared, ...extra },
      vertexShader: farVertex,
      fragmentShader: fragment,
      transparent: true,
    });
    materials.push(material);
    return material;
  };

  const place = (geometry: BufferGeometry, material: ShaderMaterial, matrices: Matrix4[]) => {
    const mesh = new InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    geometries.push(geometry);
    root.add(mesh);
    return mesh;
  };

  // — LA FILE DE LAMPADAIRES. Deux files, une de chaque côté de l'aire, qui partent vers l'horizon.
  const { side, from, to, every, height } = options.lamps;
  const poles: Matrix4[] = [];
  const heads: Matrix4[] = [];
  const glows: Matrix4[] = [];
  for (const x of [side, -side]) {
    for (let z = from; Math.abs(z) <= Math.abs(to); z += Math.sign(to - from) * every) {
      poles.push(new Matrix4().makeTranslation(x, height / 2, z));
      heads.push(new Matrix4().makeTranslation(x, height - 0.2, z));
      glows.push(new Matrix4().makeTranslation(x, height - 0.25, z));
    }
  }
  const metal = make(metalFragment);
  place(new CylinderGeometry(0.1, 0.16, height, 6), metal, poles);
  place(new BoxGeometry(0.7, 0.16, 0.34), metal, heads);
  const glowMaterial = new ShaderMaterial({
    uniforms: { ...shared, uSize: { value: 2.1 } },
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  materials.push(glowMaterial);
  const glowMesh = place(new PlaneGeometry(1, 1), glowMaterial, glows);
  glowMesh.renderOrder = 3;

  // — LA GLISSIÈRE : la limite du terrain, côté ouvert.
  place(new BoxGeometry(0.1, 0.32, options.rail.length), metal, [new Matrix4().makeTranslation(options.rail.at, 0.62, 0)]);
  const posts: Matrix4[] = [];
  for (let z = -options.rail.length / 2 + 1.5; z <= options.rail.length / 2 - 1.5; z += 3.4) {
    posts.push(new Matrix4().makeTranslation(options.rail.at, 0.36, z));
  }
  place(new BoxGeometry(0.12, 0.72, 0.12), metal, posts);

  // — LES IMMEUBLES DU FOND. Répartis en couronne, jamais devant la place, jamais alignés.
  const random = seeded(7311);
  const { count, inner, outer, low, high } = options.blocks;
  const blocks: Matrix4[] = [];
  const scale = new Vector3();
  for (let k = 0; k < count; k += 1) {
    const angle = k * 2.399963 + 0.7;
    const radius = inner + (outer - inner) * Math.pow((k + 0.5) / count, 0.55);
    const h = low + (high - low) * random();
    scale.set(7 + random() * 16, h, 7 + random() * 16);
    blocks.push(
      new Matrix4()
        .makeTranslation(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius)
        .multiply(new Matrix4().makeRotationY(random() * Math.PI))
        .multiply(new Matrix4().makeScale(scale.x, scale.y, scale.z)),
    );
  }
  // Zéro immeuble : on ne crée ni le maillage ni son programme de nuanceur.
  if (blocks.length) place(new BoxGeometry(1, 1, 1), make(blockFragment), blocks);

  let last = -1;
  const layer: WebGLLayer = {
    id: 'surroundings',
    chapters: options.chapters,
    root,
    init() {},
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const around = state.channels.place ?? 0;
      root.visible = around > 0.002;
      if (!root.visible || around === last) return false;
      last = around;
      shared.uAround.value = around;
      return true;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
  return layer;
}
