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
  TorusGeometry,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LE CIRCUIT — la section location.
 *
 * Le véhicule de location ne se « téléporte » plus d'un plan à l'autre : il ROULE, et il roule quelque part. Ce
 * quelque part est un circuit de nuit, et un circuit de nuit tient en quatre choses :
 * - les VIBREURS rouge et blanc le long des bords : c'est le signe le plus reconnaissable d'une piste, et leur
 *   alternance donne la vitesse quand on les longe ;
 * - le BALISAGE AU SOL, espacé — des feux encastrés comme sur une piste d'aéroport. Espacés, justement : serrés,
 *   ils feraient sapin de Noël et on ne verrait plus la voiture ;
 * - les GRADINS, gradués et couverts, avec leur bandeau lumineux : c'est eux qui disent « course », et surtout ils
 *   donnent une ÉCHELLE — sans eux, une chaussée dans le noir n'a pas de taille ;
 * - les MÂTS d'éclairage derrière les tribunes, dont on ne voit que les halos.
 *
 * Tout est instancié et calculé : huit appels de dessin, aucun fichier, aucune texture.
 */
export interface CircuitOptions {
  night: SharedNight;
  /** Axe de la piste : abscisse de la voie, et portée en z (du plus proche au plus lointain). */
  lane: { x: number; from: number; to: number };
  /** Demi-largeur de la chaussée (m) : les vibreurs s'y posent. */
  half: number;
  /** Gradins : écartement depuis l'axe, centre en z, longueur, nombre de gradins. */
  stands: { side: number; at: number; length: number; tiers: number };
  chapters?: readonly string[];
}

const circuitVertex = /* glsl */ `
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

/** Les vibreurs : rouge et blanc, l'alternance décidée par la position dans le MONDE — un seul appel de dessin. */
const kerbFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform float uLight;
  uniform float uFog;
  uniform float uCircuit;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 N = normalize(vNormalW);
    float stripe = mod(floor(vWorld.z / 2.0), 2.0);
    vec3 base = mix(vec3(0.42, 0.045, 0.035), vec3(0.58, 0.58, 0.56), stripe);
    vec3 col = base * (0.10 + skyLod(N, 4.0) * uLight * 7.0);
    col = mix(haze(ray / t) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * uCircuit, uCircuit);
  }
`;

/** Béton des tribunes : sombre, et la lune sur les arêtes. */
const concreteFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform float uLight;
  uniform float uFog;
  uniform float uCircuit;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 N = normalize(vNormalW);
    vec3 col = vec3(0.055, 0.057, 0.064) * (0.28 + skyLod(N, 5.0) * uLight * 6.0);
    col = mix(haze(ray / t) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * uCircuit, uCircuit);
  }
`;

/** Le bandeau des tribunes et les feux du sol : de la lumière pure, rien d'autre. */
const neonFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uCircuit;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  void main() {
    gl_FragColor = vec4(uTint * uCircuit, uCircuit);
  }
`;

/** Halo d'un mât : panneau face caméra, taille en mètres, qui pâlit avec la distance. */
const glowVertex = /* glsl */ `
  uniform float uSize;
  varying vec2 vUv;
  varying float vFar;
  void main() {
    vec3 at = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    vec4 view = viewMatrix * modelMatrix * vec4(at, 1.0);
    view.xy += position.xy * uSize;
    vUv = uv;
    vFar = -view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const glowFragment = /* glsl */ `
  uniform float uCircuit;
  varying vec2 vUv;
  varying float vFar;
  void main() {
    vec2 d = vUv - 0.5;
    float r = dot(d, d) * 4.0;
    if (r > 1.0) discard;
    // Chute rapide : une traîne large donnait un disque gris flottant dans le ciel au lieu d'un halo de projecteur.
    float core = exp(-r * 14.0) + exp(-r * 3.6) * 0.22;
    gl_FragColor = vec4(vec3(0.86, 0.92, 1.0) * core * uCircuit / (1.0 + vFar * 0.0035), 1.0);
  }
`;

export function createCircuitLayer(options: CircuitOptions) {
  const root = new Group();
  root.name = 'circuit';
  root.visible = false;
  const shared = { uCircuit: { value: 0 } };
  const geometries: BufferGeometry[] = [];
  const materials: ShaderMaterial[] = [];

  const make = (fragment: string, extra: Record<string, { value: unknown }> = {}) => {
    const material = new ShaderMaterial({
      uniforms: { ...options.night, ...shared, ...extra },
      vertexShader: circuitVertex,
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

  const { x: lane, from, to } = options.lane;
  const step = Math.sign(to - from);

  // — LES VIBREURS, tous les deux mètres de chaque côté. L'alternance des couleurs est faite par le nuanceur.
  const kerbs: Matrix4[] = [];
  for (let z = from; Math.abs(z - from) <= Math.abs(to - from); z += step * 2) {
    kerbs.push(new Matrix4().makeTranslation(lane + options.half, 0.03, z));
    kerbs.push(new Matrix4().makeTranslation(lane - options.half, 0.03, z));
  }
  place(new BoxGeometry(0.9, 0.06, 2), make(kerbFragment), kerbs);

  // Le béton, partagé par les murets du tunnel, les gradins et les mâts : un seul matériau, un seul programme.
  const concreteWall = make(concreteFragment);

  // — LE BALISAGE AU SOL : des feux encastrés, espacés de dix-huit mètres. Espacés, parce qu'un chapelet serré
  // ferait guirlande et mangerait le véhicule.
  const marks: Matrix4[] = [];
  for (let z = from; Math.abs(z - from) <= Math.abs(to - from); z += step * 18) {
    marks.push(new Matrix4().makeTranslation(lane + options.half + 1.2, 0.02, z));
    marks.push(new Matrix4().makeTranslation(lane - options.half - 1.2, 0.02, z));
  }
  const markMaterial = make(neonFragment, { uTint: { value: [0.85, 0.93, 1.0] } });
  markMaterial.depthWrite = false;
  markMaterial.blending = AdditiveBlending;
  const markMesh = place(new BoxGeometry(0.34, 0.04, 0.9), markMaterial, marks);
  markMesh.renderOrder = 2;

  // — LES FEUX DE LA PISTE, encastrés dans la chaussée elle-même : deux files le long de l'axe, tous les neuf
  // mètres. C'est ce qui fait la vitesse quand on roule dessus — les vibreurs disent le bord, ces feux disent
  // l'avance. Additifs et posés au ras du sol : ils n'éclairent rien, ils défilent.
  const track: Matrix4[] = [];
  // Resserrés de neuf à cinq mètres : à neuf, on comptait les feux un par un au lieu de les voir filer.
  for (let z = from; Math.abs(z - from) <= Math.abs(to - from); z += step * 5) {
    track.push(new Matrix4().makeTranslation(lane - 1.9, 0.015, z));
    track.push(new Matrix4().makeTranslation(lane + 1.9, 0.015, z));
  }
  const trackMaterial = make(neonFragment, { uTint: { value: [0.68, 0.78, 1.0] } });
  trackMaterial.depthWrite = false;
  trackMaterial.blending = AdditiveBlending;
  const trackMesh = place(new BoxGeometry(0.26, 0.03, 2.2), trackMaterial, track);
  trackMesh.renderOrder = 2;

  /**
   * LE TUNNEL LUMINEUX. C'est ce qui manquait pour que la piste soit un LIEU et non deux bords dans le noir :
   * une enfilade d'arches éclairées que le véhicule traverse. Vue depuis la voie, la perspective les empile et
   * creuse un couloir — c'est la profondeur qui fait la vitesse, plus encore que les feux au sol.
   *
   * Deux arches par portique : une épaisse, tenue basse, et une fine posée dessus, plus vive. Une seule arche
   * donne un arceau de manège ; deux donnent une structure.
   */
  const arches: Matrix4[] = [];
  const archesFines: Matrix4[] = [];
  const PAS = 11;
  for (let z = from; Math.abs(z - from) <= Math.abs(to - from); z += step * PAS) {
    arches.push(new Matrix4().makeTranslation(lane, 0, z));
    archesFines.push(new Matrix4().makeTranslation(lane, 0, z));
  }
  const archRadius = options.half + 0.8;
  const archMaterial = make(neonFragment, { uTint: { value: [0.30, 0.40, 0.62] } });
  archMaterial.depthWrite = false;
  archMaterial.blending = AdditiveBlending;
  const archMesh = place(new TorusGeometry(archRadius, 0.16, 5, 30, Math.PI), archMaterial, arches);
  archMesh.renderOrder = 2;

  const archThin = make(neonFragment, { uTint: { value: [0.62, 0.74, 1.0] } });
  archThin.depthWrite = false;
  archThin.blending = AdditiveBlending;
  const archThinMesh = place(new TorusGeometry(archRadius + 0.34, 0.055, 4, 30, Math.PI), archThin, archesFines);
  archThinMesh.renderOrder = 3;

  /**
   * LES MURS QUI FERMENT LA PISTE. Sans eux, les arches flottent au-dessus de rien et la voie s'ouvre sur du noir
   * des deux côtés. Un muret continu au pied de chaque arche ferme le couloir et rend le tunnel crédible : c'est
   * lui qui arrête le regard, et c'est contre lui que les vibreurs prennent leur sens.
   */
  const murs: Matrix4[] = [];
  const longueur = Math.abs(to - from);
  const milieu = (from + to) / 2;
  for (const dir of [1, -1]) {
    murs.push(
      new Matrix4()
        .makeTranslation(lane + dir * (options.half + 0.85), 0.62, milieu)
        .multiply(new Matrix4().makeScale(0.3, 1.24, longueur)),
    );
  }
  place(new BoxGeometry(1, 1, 1), concreteWall, murs);

  // — LA LISSE LUMINEUSE au sommet du muret : un filet continu qui file avec la voiture. C'est la ligne de fuite
  // du tunnel, celle qui donne la vitesse quand tout le reste est noir.
  const lisses: Matrix4[] = [];
  for (const dir of [1, -1]) {
    lisses.push(
      new Matrix4()
        .makeTranslation(lane + dir * (options.half + 0.85), 1.26, milieu)
        .multiply(new Matrix4().makeScale(0.34, 0.07, longueur)),
    );
  }
  const lisseMaterial = make(neonFragment, { uTint: { value: [0.46, 0.56, 0.86] } });
  lisseMaterial.depthWrite = false;
  lisseMaterial.blending = AdditiveBlending;
  const lisseMesh = place(new BoxGeometry(1, 1, 1), lisseMaterial, lisses);
  lisseMesh.renderOrder = 2;

  // — LES GRADINS. Des marches qui montent EN S'ÉLOIGNANT de la piste, un toit plat, et sous le toit un bandeau
  // lumineux. C'est lui qu'on voit de loin, et c'est l'échelle de tout le reste.
  const { side, at, length, tiers } = options.stands;
  const concrete = concreteWall;
  const steps: Matrix4[] = [];
  for (const dir of [1, -1]) {
    for (let i = 0; i < tiers; i += 1) {
      steps.push(
        new Matrix4()
          .makeTranslation(lane + dir * (side + i * 1.15), 0.8 + i * 0.85, at)
          .multiply(new Matrix4().makeScale(1.15, 0.85, length)),
      );
    }
  }
  place(new BoxGeometry(1, 1, 1), concrete, steps);

  const roofs: Matrix4[] = [];
  const backs: Matrix4[] = [];
  for (const dir of [1, -1]) {
    const depth = tiers * 1.15 + 2.4;
    const centre = lane + dir * (side + depth / 2 - 1);
    roofs.push(new Matrix4().makeTranslation(centre, 0.9 + tiers * 0.85 + 2.6, at).multiply(new Matrix4().makeScale(depth, 0.35, length)));
    backs.push(
      new Matrix4()
        .makeTranslation(lane + dir * (side + depth - 1), (0.9 + tiers * 0.85 + 2.6) / 2, at)
        .multiply(new Matrix4().makeScale(0.4, 0.9 + tiers * 0.85 + 2.6, length)),
    );
  }
  place(new BoxGeometry(1, 1, 1), concrete, [...roofs, ...backs]);

  // LE BANDEAU DES TRIBUNES EST SUPPRIMÉ. C'est lui, la « bande jaune dont on ne sait pas ce que c'est » : vu depuis
  // la voie, il traversait le cadre en diagonale, et maintenant que la piste est un tunnel FERMÉ il n'a plus aucun
  // sens — il passait au-dessus du couloir, éclairant des gradins qu'on ne voit plus. Le tunnel donne désormais
  // l'échelle et le « lieu » que ce bandeau essayait de porter. Les gradins gardent leur silhouette de béton.

  // — LES MÂTS derrière les tribunes : on n'en voit que les halos, et c'est tout ce qu'il faut.
  const masts: Matrix4[] = [];
  const glows: Matrix4[] = [];
  const mastHeight = 26;
  for (const dir of [1, -1]) {
    for (const offset of [-length * 0.34, 0, length * 0.34]) {
      const x = lane + dir * (side + tiers * 1.15 + 4);
      masts.push(new Matrix4().makeTranslation(x, mastHeight / 2, at + offset));
      glows.push(new Matrix4().makeTranslation(x, mastHeight, at + offset));
    }
  }
  place(new CylinderGeometry(0.22, 0.34, mastHeight, 6), concrete, masts);
  const glowMaterial = new ShaderMaterial({
    uniforms: { ...shared, uSize: { value: 3.4 } },
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

  let last = -1;
  const layer: WebGLLayer = {
    id: 'circuit',
    chapters: options.chapters,
    root,
    init() {},
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const circuit = state.channels.circuit ?? 0;
      root.visible = circuit > 0.002;
      if (!root.visible || circuit === last) return false;
      last = circuit;
      shared.uCircuit.value = circuit;
      return true;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
  return layer;
}
