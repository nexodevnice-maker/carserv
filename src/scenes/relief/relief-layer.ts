import { BufferGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, ShaderMaterial, Vector3 } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import type { SharedNight } from '../map/map-layer';
import { GROUND_GLSL, SKY_GLSL } from '../shared/night-glsl';

/**
 * LE RELIEF — le monde en volume autour de nous.
 *
 * Une image 360° est une photographie : elle n'a ni profondeur ni parallaxe. Tant que les montagnes n'existent que
 * dans le ciel, la caméra peut voler des kilomètres sans que rien ne bouge derrière — c'est exactement ce qui fait
 * qu'une scène WebGL « ne vit pas ». Cette couche donne donc un CORPS au lieu photographié :
 *
 * - des **crêtes** concentriques (1,2 / 3 / 7,5 / 17 km) : quatre murs de montagnes au profil irrégulier, qui se
 *   décalent l'un par rapport à l'autre dès que la caméra se déplace. C'est la parallaxe qui crée la distance ;
 * - des **rochers** posés autour du véhicule (8 à 70 m) : le premier plan qui manque aux plans bas. Quand la caméra
 *   descend au ras du sol, ils passent devant l'objectif — le mouvement devient palpable.
 *
 * Tout est éclairé par la même nuit que le reste du monde (shared/night-glsl) : silhouette sombre, un filet de ciel
 * réfléchi sur les faces tournées vers le haut, la brume d'horizon au loin. Aucune texture, aucune lumière
 * supplémentaire : quelques milliers de triangles et deux appels de dessin.
 */
const reliefVertex = /* glsl */ `
  attribute float aShade;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vShade;
  void main() {
    vec4 world = modelMatrix * instanceOrNot(vec4(position, 1.0));
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vShade = aShade;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const reliefFragment = /* glsl */ `
  ${SKY_GLSL}
  ${GROUND_GLSL}
  uniform float uRock;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vShade;
  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    vec3 N = normalize(vNormalW);
    // La roche ne renvoie presque rien ; ce qu'on en voit, c'est le ciel qu'elle attrape par le dessus.
    float up = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 rock = vec3(0.010, 0.0105, 0.013) * (0.45 + 0.75 * vShade) * (0.35 + 0.9 * up);
    vec3 sky = skyLod(normalize(N + vec3(0.0, 0.35, 0.0)), 5.0) * (0.05 + 0.13 * up);
    vec3 col = (rock + sky) * uLight * uRock;
    // Le lointain se fond dans la brume d'horizon, comme le sol : aucune découpe à l'horizon.
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Bruit déterministe 1D (profil des crêtes) : le même relief à chaque chargement. */
function ridgeNoise(seed: number) {
  const table = new Float32Array(512);
  let s = seed;
  for (let i = 0; i < table.length; i += 1) {
    s = (s * 16807) % 2147483647;
    table[i] = (s - 1) / 2147483646;
  }
  return (x: number) => {
    const scaled = x * table.length;
    const i = Math.floor(scaled);
    const f = scaled - i;
    const a = table[((i % table.length) + table.length) % table.length]!;
    const b = table[(((i + 1) % table.length) + table.length) % table.length]!;
    return a + (b - a) * (f * f * (3 - 2 * f));
  };
}

/** Une crête : un mur fermé autour du monde, profil irrégulier, faces tournées vers l'intérieur. */
function ridge(radius: number, height: number, segments: number, seed: number) {
  const base = ridgeNoise(seed);
  const detail = ridgeNoise(seed * 7 + 13);
  const position: number[] = [];
  const normal: number[] = [];
  const shade: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    const f = i / segments;
    // Somme de deux fréquences : de grands massifs, et des dents plus courtes.
    const profile = 0.42 + 0.58 * base(f * 3.1) * (0.55 + 0.45 * detail(f * 11.3));
    const h = height * profile;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    position.push(cx * radius, -height * 0.08, cz * radius, cx * radius, h, cz * radius);
    // Face tournée vers le centre du monde, légèrement inclinée vers le haut.
    normal.push(-cx, 0.25, -cz, -cx, 0.45, -cz);
    shade.push(0.25 + 0.55 * detail(f * 5.7), 0.5 + 0.5 * base(f * 9.1));
    if (i < segments) {
      const k = i * 2;
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  geometry.setAttribute('aShade', new Float32BufferAttribute(shade, 1));
  geometry.setIndex(index);
  return geometry;
}

/** Un rocher : une icosphère déformée, différente pour chaque graine. */
function boulder(seed: number) {
  const geometry = new IcosahedronGeometry(1, 1);
  const noise = ridgeNoise(seed);
  const position = geometry.getAttribute('position');
  const shade = new Float32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const k = 0.62 + 0.55 * noise(Math.abs(x * 0.7 + y * 1.3 + z * 0.4) % 1);
    // Aplati : un rocher posé, pas une bille.
    position.setXYZ(i, x * k, y * k * 0.62, z * k);
    shade[i] = 0.3 + 0.7 * noise((i * 0.137) % 1);
  }
  geometry.setAttribute('aShade', new Float32BufferAttribute(shade, 1));
  geometry.computeVertexNormals();
  return geometry;
}

export interface ReliefOptions {
  night: SharedNight;
  /** Crêtes : rayon (m), hauteur (m), segments. */
  ridges: readonly { radius: number; height: number; segments: number }[];
  /** Rochers autour de l'origine : nombre, rayons mini/maxi (m), taille mini/maxi (m). */
  rocks: { count: number; inner: number; outer: number; small: number; large: number };
  /** Couloir interdit (la route) : |x − lane| < width et z entre les deux bornes. */
  corridor: { lane: number; width: number; from: number; to: number };
}

export function createReliefLayer(options: ReliefOptions) {
  const root = new Group();
  root.name = 'relief';
  const uniforms = { ...options.night, uRock: { value: 1 } };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: reliefVertex.replace('instanceOrNot(vec4(position, 1.0))', 'vec4(position, 1.0)'),
    fragmentShader: reliefFragment,
  });
  const instanced = new ShaderMaterial({
    uniforms,
    vertexShader: reliefVertex.replace('instanceOrNot(vec4(position, 1.0))', 'instanceMatrix * vec4(position, 1.0)'),
    fragmentShader: reliefFragment,
  });

  for (const { radius, height, segments } of options.ridges) {
    const mesh = new Mesh(ridge(radius, height, segments, Math.round(radius)), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -2;
    root.add(mesh);
  }

  // Rochers : trois formes, réparties en anneau autour du véhicule, jamais sur la route ni sous la voiture.
  const random = (() => {
    let s = 20260918;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const shapes = [boulder(3), boulder(17), boulder(41)];
  const perShape = Math.ceil(options.rocks.count / shapes.length);
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const at = new Vector3();
  for (const [k, shape] of shapes.entries()) {
    const mesh = new InstancedMesh(shape, instanced, perShape);
    mesh.frustumCulled = false;
    let placed = 0;
    let guard = 0;
    while (placed < perShape && guard < perShape * 40) {
      guard += 1;
      const angle = random() * Math.PI * 2;
      const distance = options.rocks.inner + random() * (options.rocks.outer - options.rocks.inner);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const onRoad = Math.abs(x - options.corridor.lane) < options.corridor.width && z < options.corridor.from && z > options.corridor.to;
      if (onRoad) continue;
      const size = options.rocks.small + random() * (options.rocks.large - options.rocks.small);
      at.set(x, size * 0.34, z);
      quaternion.setFromAxisAngle(new Vector3(random() * 0.2, 1, random() * 0.2).normalize(), random() * Math.PI * 2);
      scale.setScalar(size).multiply(new Vector3(1, 0.7 + random() * 0.5, 1));
      mesh.setMatrixAt(placed, matrix.compose(at, quaternion, scale));
      placed += 1;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = `rocks-${k}`;
    root.add(mesh);
  }

  let last = -1;
  const layer: WebGLLayer = {
    id: 'relief',
    root,
    init(_ctx: StageContext) {},
    update(state: Readonly<ExperienceState>): LayerUpdate {
      // Le relief suit la lumière du monde : au-dessus des nuages, il n'y a plus rien à éclairer.
      const light = state.channels.relief ?? 1;
      if (light === last) return false;
      last = light;
      uniforms.uRock.value = light;
      root.visible = light > 0.002;
      return true;
    },
    dispose() {
      for (const child of root.children) {
        const mesh = child as Mesh;
        mesh.geometry?.dispose();
      }
      material.dispose();
      instanced.dispose();
    },
  };
  return layer;
}
