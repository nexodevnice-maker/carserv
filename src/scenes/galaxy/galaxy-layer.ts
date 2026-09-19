import { AdditiveBlending, Box3, Group, Mesh, PlaneGeometry, Points, ShaderMaterial, Vector3, type BufferGeometry, type Object3D } from 'three';
import { smoothstep } from '../../engine/math/scalar';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * LA GALAXIE — l'univers du site, et un vrai volume.
 *
 * Le modèle fourni (`need_some_space.glb`) est un **nuage de 50 000 points colorés**, pas une image : chaque étoile a
 * une position dans l'espace. C'est exactement ce qui manquait au panorama 360° — une photographie tourne autour de
 * son point de prise de vue et ne bouge jamais ; ici, on TRAVERSE. Quand la caméra avance, les étoiles proches
 * défilent, les lointaines restent : la parallaxe est réelle, donc la distance existe.
 *
 * Rendu : un point = un disque doux, additif, dont la taille décroît avec la distance (`sizeAttenuation` maison, borné
 * pour qu'une étoile proche ne remplisse pas l'écran). Aucune lumière, aucune texture : la couleur est dans le modèle.
 * Un seul appel de dessin pour tout l'univers.
 *
 * Canaux : `galaxy` (présence) et `galaxySpin` (rotation lente sur son axe — une galaxie n'est jamais figée).
 */
const galaxyVertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixels;
  uniform float uBright;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    // Le modèle fourni porte ses couleurs en RGBA : on ne garde que la couleur (l'alpha est géré par le halo).
    vColor = color.rgb;
    vec4 view = viewMatrix * modelMatrix * vec4(position, 1.0);
    float dist = -view.z;
    // Taille apparente : constante en unités du monde, BORNÉE BAS. Elle était plafonnée à 26 pixels : dès qu'on
    // approchait du cœur, chaque étoile devenait un disque de 26 px et l'amas entier virait au bloc blanc — c'est
    // le « beaucoup trop blanc » qu'on nous signale. Une étoile est un POINT : au-delà d'une douzaine de pixels,
    // ce n'est plus une étoile, c'est une tache.
    gl_PointSize = clamp(uSize * uPixels / max(dist, 1.0), 1.0, 13.0);
    // Les étoiles très proches s'estompent : sinon on traverse des taches. Fondu élargi (6 → 11) pour que
    // l'approche soit progressive au lieu de saturer d'un coup.
    vFade = smoothstep(0.0, 1.0, clamp(dist / (uSize * 11.0), 0.0, 1.0)) * uBright;
    gl_Position = projectionMatrix * view;
  }
`;

const galaxyFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    // Disque doux : un noyau net, un halo qui meurt. Pas de texture, pas de bord dur.
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d) * 4.0;
    if (r > 1.0) discard;
    // Noyau plus serré et traîne plus discrète : un halo large faisait fondre les étoiles voisines les unes dans
    // les autres, et c'est cette fusion qui blanchissait l'amas. Séparées, elles se comptent.
    float core = exp(-r * 7.5) + exp(-r * 2.2) * 0.22;
    gl_FragColor = vec4(vColor * core * vFade, 1.0);
  }
`;

/**
 * L'ÉTOILE FILANTE du premier défilement. Un seul quadrilatère : sa longueur suit la trajectoire, sa largeur est
 * toujours tournée vers la caméra (panneau cylindrique). La tête est nette, la traînée meurt derrière — c'est le
 * dégradé qui fait la vitesse, pas le déplacement.
 * Elle passe VITE : visible sur le premier tiers du canal, puis plus rien. Une étoile filante qu'on a le temps de
 * regarder n'en est pas une.
 */
const meteorVertex = /* glsl */ `
  uniform vec3 uFrom;
  uniform vec3 uTo;
  uniform float uT;
  uniform float uLength;
  uniform float uWidth;
  varying float vTail;
  varying float vSide;
  void main() {
    vec3 dir = normalize(uTo - uFrom);
    vec3 head = mix(uFrom, uTo, uT);
    // position.x va de -0.5 (tête) à +0.5 (queue) ; position.y traverse la traînée.
    float tail = position.x + 0.5;
    vec3 p = head - dir * uLength * tail;
    vec3 toCam = normalize(cameraPosition - p);
    vec3 side = normalize(cross(dir, toCam));
    p += side * position.y * uWidth;
    vTail = tail;
    vSide = position.y * 2.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const meteorFragment = /* glsl */ `
  uniform float uFade;
  varying float vTail;
  varying float vSide;
  void main() {
    float along = pow(1.0 - vTail, 2.4);
    float across = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
    // Le noyau de la tête : un point net qui laisse une traînée, pas un trait uniforme.
    float core = exp(-vTail * 26.0) * exp(-abs(vSide) * 5.0);
    float a = (along * across * 0.55 + core) * uFade;
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a, 1.0);
  }
`;

export interface GalaxyOptions {
  url: string;
  /** Fichier déjà en cours de téléchargement (boot.ts). */
  buffer?: Promise<ArrayBuffer>;
  /** Diamètre de la galaxie dans le monde (m) : c'est l'échelle du voyage. */
  diameter: number;
  /** Centre de la galaxie dans le monde (m). */
  at: readonly [number, number, number];
  /** Taille apparente d'une étoile (m à un mètre) et inclinaison du disque (rad). */
  starSize: number;
  tilt: number;
  /** L'étoile filante du premier défilement : d'où à où (m), longueur de traînée et largeur. */
  meteor: { from: readonly [number, number, number]; to: readonly [number, number, number]; length: number; width: number };
  chapters?: readonly string[];
}

export function createGalaxyLayer(options: GalaxyOptions) {
  const root = new Group();
  root.name = 'galaxy';
  const body = new Group();
  body.position.set(options.at[0], options.at[1], options.at[2]);
  body.rotation.z = options.tilt;
  body.visible = false;
  root.add(body);
  const uniforms = {
    uSize: { value: options.starSize },
    uPixels: { value: 600 },
    uBright: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: galaxyVertex,
    fragmentShader: galaxyFragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    vertexColors: true,
  });
  // — L'étoile filante. Elle vit hors du modèle : c'est notre ajout, et elle ne dépend pas du chargement du nuage.
  const meteorUniforms = {
    uFrom: { value: new Vector3(...options.meteor.from) },
    uTo: { value: new Vector3(...options.meteor.to) },
    uT: { value: 0 },
    uLength: { value: options.meteor.length },
    uWidth: { value: options.meteor.width },
    uFade: { value: 0 },
  };
  const meteorMaterial = new ShaderMaterial({
    uniforms: meteorUniforms,
    vertexShader: meteorVertex,
    fragmentShader: meteorFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  const meteor = new Mesh(new PlaneGeometry(1, 1), meteorMaterial);
  meteor.frustumCulled = false;
  meteor.visible = false;
  meteor.renderOrder = 2;
  root.add(meteor);

  let stage: StageContext | null = null;
  let loading: Promise<void> | null = null;
  let loaded = false;
  const last = { bright: -1, spin: NaN, meteor: -1 };

  /** Mise à l'échelle : le nuage est ramené au diamètre voulu, centré sur son propre barycentre. */
  const place = (scene: Object3D) => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = options.diameter / Math.max(size.x, size.y, size.z);
    scene.scale.multiplyScalar(scale);
    scene.position.sub(center.multiplyScalar(scale));
    // Un nœud glTF peut avoir `matrixAutoUpdate` à false (sa matrice vient du fichier) : sans cette remise à jour
    // explicite, changer position ou échelle n'a AUCUN effet — le modèle reste à la taille du fichier.
    scene.matrixAutoUpdate = true;
    scene.updateMatrix();
    scene.traverse((node) => {
      const points = node as Points;
      if (!points.isPoints) return;
      points.material = material;
      points.frustumCulled = false;
      (points.geometry as BufferGeometry).computeBoundingSphere();
    });
    body.add(scene);
  };

  const load = async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'),
    ]);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = options.buffer ? await loader.parseAsync(await options.buffer, '') : await loader.loadAsync(options.url);
    place(gltf.scene);
    loaded = true;
    if (!stage) return;
    await stage.renderer.compileAsync(body, stage.camera, stage.scene).catch(() => undefined);
    stage.invalidate();
  };

  const layer: WebGLLayer & { ensure(): Promise<void> } = {
    id: 'galaxy',
    chapters: options.chapters,
    root,
    init(ctx: StageContext) {
      stage = ctx;
      uniforms.uPixels.value = ctx.height * 0.5;
    },
    resize(ctx: StageContext) {
      // La taille d'une étoile est donnée en mètres : elle doit suivre la hauteur du rendu, pas les pixels.
      uniforms.uPixels.value = ctx.height * 0.5;
    },
    ensure() {
      loading ??= load().catch((error: unknown) => {
        loading = null;
        console.warn('[galaxy]', error instanceof Error ? error.message : error);
      });
      return loading;
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const bright = state.channels.galaxy ?? 0;
      const spin = state.channels.galaxySpin ?? 0;
      const shooting = state.channels.meteor ?? 0;
      body.visible = loaded && bright > 0.001;
      // Elle entre d'un coup et s'éteint avant la fin de la course : on ne la voit qu'une seconde.
      const fade = smoothstep(0.0, 0.06, shooting) * (1 - smoothstep(0.52, 0.78, shooting)) * bright;
      meteor.visible = fade > 0.002;
      if (!body.visible && !meteor.visible) return false;
      if (bright === last.bright && spin === last.spin && shooting === last.meteor) return false;
      last.bright = bright;
      last.spin = spin;
      last.meteor = shooting;
      uniforms.uBright.value = bright;
      meteorUniforms.uT.value = shooting;
      meteorUniforms.uFade.value = fade;
      body.rotation.y = spin;
      return true;
    },
    dispose() {
      material.dispose();
      meteorMaterial.dispose();
      meteor.geometry.dispose();
    },
  };
  return layer;
}
