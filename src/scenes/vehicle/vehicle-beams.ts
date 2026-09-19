import { AdditiveBlending, BufferGeometry, ConeGeometry, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';

/**
 * LA LUMIÈRE QUE LES PHARES JETTENT — et non les phares eux-mêmes.
 *
 * Une optique qui s'allume sans rien éclairer autour d'elle ne convainc personne : c'est une gommette lumineuse
 * collée sur une carrosserie. Ce qu'on reconnaît d'une voiture allumée la nuit, ce sont trois choses, et aucune
 * n'est l'ampoule :
 * - le FAISCEAU dans l'air, un cône dense près de l'optique qui se perd en s'éloignant ;
 * - la NAPPE au sol devant elle, étirée, la plus vive juste devant le pare-chocs ;
 * - le HALO autour de l'optique, qui éblouit quand on la regarde de face.
 *
 * Tout est additif et sans écriture de profondeur : la lumière s'ajoute à ce qui est derrière, elle ne le cache pas.
 * Six panneaux, aucun fichier, aucune lumière dynamique — une lumière dynamique de plus, c'est un rendu de plus pour
 * toutes les surfaces de la scène.
 */
export interface BeamOptions {
  /** Demi-longueur du véhicule (m) : l'avant est en +x, l'arrière en −x dans son repère. */
  half: number;
  /** Hauteur des optiques et écartement latéral (m). */
  height: number;
  spread: number;
}

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vLocal = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Le faisceau dans l'air : dense à la sortie de l'optique, éteint au bout, effacé sur sa silhouette. */
const coneFragment = /* glsl */ `
  uniform float uBeam;
  uniform vec3 uTint;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  void main() {
    vec3 V = normalize(vLocal);
    float rim = 1.0 - abs(dot(normalize(vNormalW), normalize(cameraPosition)));
    // vLocal.y va de +h/2 (à l'optique) à −h/2 (au bout du faisceau).
    float along = smoothstep(-0.5, 0.5, vLocal.y);
    float a = pow(along, 2.2) * uBeam * 0.14;
    gl_FragColor = vec4(uTint * a, 1.0);
  }
`;

/** La nappe au sol : une ellipse étirée devant le véhicule, la plus vive juste devant lui. */
const poolFragment = /* glsl */ `
  uniform float uBeam;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - vec2(0.5, 0.5);
    // Étirée dans le sens de la marche, et décalée : le maximum n'est pas au centre de la nappe mais à son bord
    // proche — une nappe de phares est un triangle, pas un rond.
    float along = clamp(vUv.x, 0.0, 1.0);
    float across = 1.0 - smoothstep(0.0, 0.5, abs(p.y) / mix(0.16, 0.5, along));
    float fade = pow(1.0 - along, 1.7);
    float a = across * fade * uBeam * 0.85;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uTint * a, 1.0);
  }
`;

/** Le halo autour de l'optique : un disque doux qui éblouit de face. */
const haloFragment = /* glsl */ `
  uniform float uBeam;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    vec2 d = vUv - 0.5;
    float r = dot(d, d) * 4.0;
    if (r > 1.0) discard;
    // Chute RAPIDE : avec une traîne large, le halo devenait un disque gris grand comme le pare-brise et lavait
    // tout le plan. Un halo de phare est petit et intense, pas grand et pâle.
    float core = exp(-r * 13.0) + exp(-r * 3.4) * 0.26;
    gl_FragColor = vec4(uTint * core * uBeam * 0.8, 1.0);
  }
`;

export function createVehicleBeams(options: BeamOptions) {
  const root = new Group();
  root.name = 'beams';
  root.visible = false;
  const shared = { uBeam: { value: 0 } };
  const geometries: BufferGeometry[] = [];
  const materials: ShaderMaterial[] = [];

  const make = (fragment: string, tint: [number, number, number]) => {
    const material = new ShaderMaterial({
      uniforms: { ...shared, uTint: { value: tint } },
      vertexShader: beamVertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    materials.push(material);
    return material;
  };

  // Xénon devant (blanc très légèrement bleu), rouge derrière.
  const xenon = make(coneFragment, [0.72, 0.84, 1.0]);
  const xenonPool = make(poolFragment, [0.6, 0.72, 0.95]);
  const xenonHalo = make(haloFragment, [0.78, 0.88, 1.0]);
  const rubyHalo = make(haloFragment, [1.0, 0.13, 0.07]);
  const rubyPool = make(poolFragment, [1.0, 0.1, 0.05]);

  const add = (geometry: BufferGeometry, material: ShaderMaterial, place: (mesh: Mesh) => void, order = 5) => {
    const mesh = new Mesh(geometry, material);
    place(mesh);
    mesh.renderOrder = order;
    mesh.frustumCulled = false;
    geometries.push(geometry);
    root.add(mesh);
  };

  const { half, height, spread } = options;

  // — LES DEUX FAISCEAUX, couchés vers l'avant et légèrement plongeants (des phares éclairent la route, pas le ciel).
  const beamLength = 13;
  for (const side of [1, -1]) {
    add(new ConeGeometry(2.1, beamLength, 14, 1, true), xenon, (mesh) => {
      mesh.position.set(half + beamLength / 2 - 0.2, height - 0.12, side * spread);
      mesh.rotation.z = -Math.PI / 2;
      mesh.rotation.y = side * 0.04;
    });
  }

  // — LA NAPPE AU SOL, une seule pour les deux phares : à deux mètres elles se confondent déjà.
  add(new PlaneGeometry(1, 1), xenonPool, (mesh) => {
    mesh.scale.set(15, 7.5, 1);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.PI;
    mesh.position.set(half + 7.2, 0.012, 0);
  }, 2);

  // — LES HALOS des optiques.
  for (const side of [1, -1]) {
    add(new PlaneGeometry(1, 1), xenonHalo, (mesh) => {
      mesh.scale.setScalar(0.8);
      mesh.position.set(half + 0.06, height, side * spread);
      mesh.rotation.y = Math.PI / 2;
    }, 6);
    add(new PlaneGeometry(1, 1), rubyHalo, (mesh) => {
      mesh.scale.setScalar(0.62);
      mesh.position.set(-half - 0.06, height + 0.06, side * spread * 1.02);
      mesh.rotation.y = -Math.PI / 2;
    }, 6);
  }

  // — LA NAPPE ARRIÈRE : courte, rouge, juste sous le bouclier.
  add(new PlaneGeometry(1, 1), rubyPool, (mesh) => {
    mesh.scale.set(5.4, 4.2, 1);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(-half - 2.5, 0.012, 0);
  }, 2);

  return {
    root,
    /** Niveau d'allumage : le canal `headlight`. */
    set(level: number) {
      root.visible = level > 0.003;
      shared.uBeam.value = level;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
