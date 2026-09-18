import {
  Box3,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * Un véhicule réel (modèle glTF fourni par le porteur, allégé par scripts/media-3d.mjs) posé dans la nuit du 06.
 * Il est SALI volontairement, puis une ligne de lumière le parcourt : derrière elle, la poussière a disparu, la laque
 * est vernie, les reflets reviennent. La salissure et le nettoyage ne sont pas des images : ce sont des paramètres des
 * matériaux du modèle, pilotés par le scroll (canaux `dirt`, `scan`, `polish`).
 * Aucun logo n'est mis en avant : les plans évitent les emblèmes (docs/DECISIONS.md, règle de vérité).
 */
export interface VehicleOptions {
  /** Modèle publié (public/models/*.glb, compressé meshopt). */
  url: string;
  /**
   * Fichier dont le téléchargement a été lancé au démarrage de la page (boot.ts), avant même que la scène existe.
   * Le premier plan du récit est un véhicule : attendre la création de la scène pour commencer à le télécharger
   * ajoutait une seconde de rideau. Un `<link rel="preload">` ne suffisait pas (mode d'authentification différent de
   * celui du chargeur : le fichier descendait DEUX fois).
   */
  buffer?: Promise<ArrayBuffer>;
  /** Longueur réelle du véhicule (m) : le modèle est mis à cette échelle. */
  length: number;
  /** Pose : point au sol (x, z) et cap (azimut du capot, radians). */
  at: readonly [number, number];
  heading: number;
  /** Le modèle regarde vers −x dans son propre repère. */
  flip?: boolean;
  /**
   * Canaux lus. `light` : présence (0–1). Les autres sont ceux de la démonstration du nettoyage ; absents, le véhicule
   * est simplement propre et verni (le véhicule de location).
   */
  channels: { light: string; dirt?: string; scan?: string; polish?: string };
  /** Avance le long du cap (m), pour la route de la location. */
  travel?: string;
  /**
   * Assombrissement de la carrosserie : les modèles fournis sont en gris clair. La nuit du 06 et la charte (noir,
   * jaune) demandent une laque sombre — c'est elle qui rend le reflet lisible. On ne touche qu'aux matériaux de
   * carrosserie, jamais aux optiques ni à l'habitacle.
   */
  tint?: { match: RegExp; scale: number };
  /** Bruit précalculé partagé (poussière). */
  noise: Texture;
  chapters?: readonly string[];
}

/** Uniformes injectés dans TOUS les matériaux du modèle. */
interface VehicleUniforms {
  uDirt: { value: number };
  /** 1 : la caisse entière est propre et vernie (l'ouverture du récit, avant tout relevé). */
  uCleanBase: { value: number };
  uScanFront: { value: number };
  uScanOn: { value: number };
  uPolish: { value: number };
  uNoise: { value: Texture };
  uCarOrigin: { value: Vector3 };
  uCarForward: { value: Vector2 };
  uHalf: { value: number };
}

const PATCH_VERTEX = /* glsl */ `
  #include <project_vertex>
  vCarWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vCarNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const PATCH_HEAD = /* glsl */ `
  varying vec3 vCarWorld;
  varying vec3 vCarNormal;
`;

const PATCH_FRAGMENT_HEAD = /* glsl */ `
  uniform float uDirt;
  uniform float uCleanBase;
  uniform float uScanFront;
  uniform float uScanOn;
  uniform float uPolish;
  uniform sampler2D uNoise;
  uniform vec3 uCarOrigin;
  uniform vec2 uCarForward;
  uniform float uHalf;
  varying vec3 vCarWorld;
  varying vec3 vCarNormal;

  /** Position le long du véhicule (m) : + vers l'avant, − vers l'arrière. */
  float carAxis() {
    return dot(vCarWorld.xz - uCarOrigin.xz, uCarForward);
  }
  /** 1 là où la ligne de lumière est déjà passée — ou partout quand la caisse est propre d'origine. */
  float carCleaned(float axis) {
    return max(uCleanBase, smoothstep(uScanFront - 0.05, uScanFront + 0.05, axis));
  }
  /** Poussière : plus épaisse sur les surfaces tournées vers le ciel et dans le bas de caisse. */
  float carDust(float cleaned) {
    vec3 n = normalize(vCarNormal);
    float up = smoothstep(-0.1, 0.85, n.y);
    float low = smoothstep(1.35, 0.15, vCarWorld.y - uCarOrigin.y);
    float grain = texture2D(uNoise, vCarWorld.xz * 0.55).r * 0.6 + texture2D(uNoise, vCarWorld.xy * 1.6 + 0.37).r * 0.4;
    return uDirt * (1.0 - cleaned) * clamp(0.34 + 0.78 * up + 0.5 * low, 0.0, 1.0) * (0.55 + 0.8 * grain);
  }
`;

/**
 * Ombre de contact : sans elle, un modèle posé sur un sol réfléchissant flotte. Ce n'est pas une ombre calculée (aucune
 * lumière dynamique, aucun rendu supplémentaire) : une empreinte sombre sous la caisse, plus dense sous les roues.
 */
const shadowFragment = /* glsl */ `
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float body = exp(-dot(p, p) * 2.6);
    // Deux appuis : les trains avant et arrière marquent le sol plus que le milieu.
    float axles = exp(-pow((abs(p.x) - 0.55) / 0.28, 2.0)) * exp(-p.y * p.y * 4.5) * 0.55;
    float alpha = clamp((body + axles) * uStrength, 0.0, 0.92);
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
  }
`;
const shadowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Rien de ce qui identifie un constructeur ou un propriétaire n'est publié : emblèmes et plaque sont retirés. */
const HIDDEN = /badge|plate|logo|emblem|numberplate/i;

export function createVehicleLayer(options: VehicleOptions) {
  const root = new Group();
  root.name = `vehicle:${options.url}`;
  const body = new Group();
  root.add(body);
  body.visible = false;
  const shadowUniforms = { uStrength: { value: 0.85 } };
  const shadow = new Mesh(
    new PlaneGeometry(options.length * 1.5, options.length * 0.78),
    new ShaderMaterial({ uniforms: shadowUniforms, vertexShader: shadowVertex, fragmentShader: shadowFragment, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.rotation.z = -options.heading;
  shadow.position.y = 0.02;
  shadow.renderOrder = 4;
  body.add(shadow);
  const forward = new Vector2(Math.cos(options.heading), Math.sin(options.heading));
  const uniforms: VehicleUniforms = {
    uDirt: { value: 0 },
    uCleanBase: { value: 1 },
    uScanFront: { value: 99 },
    uScanOn: { value: 0 },
    uPolish: { value: 0 },
    uNoise: { value: options.noise },
    uCarOrigin: { value: new Vector3(options.at[0], 0, options.at[1]) },
    uCarForward: { value: forward },
    uHalf: { value: options.length / 2 },
  };
  let stage: StageContext | null = null;
  let loaded = false;
  let loading: Promise<void> | null = null;
  const last = { dirt: -1, scan: -1, polish: -1, light: -1, travel: NaN };

  /** Poussière, scan et vernis dans tous les matériaux du modèle : aucune texture ajoutée, seuls les paramètres bougent. */
  const patch = (material: Material) => {
    const standard = material as MeshStandardMaterial & MeshPhysicalMaterial;
    if (options.tint && options.tint.match.test(standard.name)) standard.color?.multiplyScalar(options.tint.scale);
    // Les vitres en transmission imposent une passe de rendu supplémentaire à chaque image : au téléphone, c'est
    // rédhibitoire. Verre sombre translucide à la place — la nuit, c'est ce qu'on voit.
    if (standard.transmission !== undefined && standard.transmission > 0) {
      standard.transmission = 0;
      standard.transparent = true;
      standard.opacity = 0.38;
      standard.roughness = Math.min(standard.roughness ?? 0.1, 0.12);
      standard.metalness = 0.1;
      standard.depthWrite = false;
    }
    standard.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('void main() {', `${PATCH_HEAD}\nvoid main() {`).replace('#include <project_vertex>', PATCH_VERTEX);
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', `${PATCH_FRAGMENT_HEAD}\nvoid main() {`)
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          #include <map_fragment>
          float carX = carAxis();
          float cleaned = carCleaned(carX);
          // Branchement sur un uniforme (donc uniforme pour tout le groupe) : caisse propre = deux lectures de bruit
          // économisées par pixel. Le véhicule remplit l'écran sur les macros : c'est là que ça compte.
          float dust = uDirt > 0.001 ? carDust(cleaned) : 0.0;
          // La poussière ternit la couleur et l'éclaircit à peine (elle diffuse la lumière des étoiles).
          // La poussière dépose un voile clair et sans vie par-dessus la couleur : c'est ce voile qu'on vient enlever.
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.15, 0.135, 0.115), diffuseColor.rgb * 0.6, 0.45), dust);
        `,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          /* glsl */ `
          #include <roughnessmap_fragment>
          // Sale : mat. Nettoyé et verni : la laque reprend son miroir — et un vrai miroir, pas une surface polie
          // (c'est ce reflet qui fait exister une carrosserie noire dans la nuit).
          roughnessFactor = mix(roughnessFactor, 0.93, dust);
          roughnessFactor = mix(roughnessFactor, min(roughnessFactor * 0.3, 0.07), cleaned * uPolish);
        `,
        )
        .replace(
          '#include <metalnessmap_fragment>',
          /* glsl */ `
          #include <metalnessmap_fragment>
          metalnessFactor *= 1.0 - 0.9 * dust;
        `,
        )
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `
          #include <emissivemap_fragment>
          // Ligne de lumière : un trait d'or net, son halo serré, et la lueur qui meurt juste derrière lui.
          // Hors du relevé, rien n'est calculé du tout.
          if (uScanOn > 0.001) {
            float line = exp(-pow((carX - uScanFront) / 0.022, 2.0));
            float glow = exp(-pow((carX - uScanFront) / 0.11, 2.0)) * 0.5;
            float wake = exp(-pow((carX - uScanFront - 0.5) / 0.55, 2.0)) * 0.08;
            totalEmissiveRadiance += vec3(1.0, 0.8, 0.3) * (line * 5.0 + glow + wake) * uScanOn;
          }
        `,
        );
    };
    standard.needsUpdate = true;
  };

  /** Mise à l'échelle et pose : roues au sol, longueur réelle, cap donné. */
  const place = (model: Object3D) => {
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const axis = size.x >= size.z ? 'x' : 'z';
    const scale = options.length / (axis === 'x' ? size.x : size.z);
    model.scale.setScalar(scale);
    // Le modèle est recentré au sol, puis tourné : son avant regarde le cap demandé.
    const center = box.getCenter(new Vector3()).multiplyScalar(scale);
    const floor = box.min.y * scale;
    model.position.set(-center.x, -floor, -center.z);
    const inner = new Group();
    inner.add(model);
    inner.rotation.y = -options.heading + (axis === 'z' ? Math.PI / 2 : 0) + (options.flip ? Math.PI : 0);
    body.add(inner);
    body.position.set(options.at[0], 0, options.at[1]);
  };

  const load = async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'),
    ]);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = options.buffer ? await loader.parseAsync(await options.buffer, '') : await loader.loadAsync(options.url);
    gltf.scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.some((material) => HIDDEN.test(material.name))) {
        mesh.visible = false;
        return;
      }
      for (const material of materials) patch(material);
    });
    place(gltf.scene);
    loaded = true;
    if (!stage) return;
    // Shaders compilés ET textures envoyées au GPU avant la première image du chapitre. Il faut rendre l'objet
    // visible le temps de la compilation : un objet masqué est ignoré, et le coût réapparaîtrait en plein scroll.
    const hiddenRoot = root.visible;
    const hiddenBody = body.visible;
    root.visible = true;
    body.visible = true;
    await stage.renderer.compileAsync(body, stage.camera, stage.scene).catch(() => undefined);
    root.visible = hiddenRoot;
    body.visible = hiddenBody;
    stage.invalidate();
  };

  /** Relevé de contrôle (crochets QA) : ce que valent réellement les matériaux du modèle fourni. */
  const debug = () => {
    const seen = new Map<string, Record<string, unknown>>();
    body.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const m = material as MeshStandardMaterial & MeshPhysicalMaterial;
        if (seen.has(m.name)) continue;
        seen.set(m.name, {
          type: m.type,
          roughness: Number((m.roughness ?? -1).toFixed(3)),
          metalness: Number((m.metalness ?? -1).toFixed(3)),
          clearcoat: Number((m.clearcoat ?? 0).toFixed(3)),
          envMapIntensity: m.envMapIntensity,
          hasRoughnessMap: Boolean(m.roughnessMap),
          color: m.color?.getHexString(),
        });
      }
    });
    return {
      environmentIntensity: stage?.scene.environmentIntensity,
      environment: Boolean(stage?.scene.environment),
      materials: Object.fromEntries([...seen].slice(0, 12)),
    };
  };

  const layer: WebGLLayer & { ensure(): Promise<void>; debug(): unknown } = {
    id: root.name,
    chapters: options.chapters,
    root,
    init(ctx: StageContext) {
      stage = ctx;
    },
    debug,
    /** Chargement à la demande (registre média) : le modèle n'arrive que quand son chapitre approche. */
    ensure() {
      loading ??= load().catch((error: unknown) => {
        loading = null;
        console.warn('[vehicle]', options.url, error instanceof Error ? error.message : error);
      });
      return loading;
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const light = state.channels[options.channels.light] ?? 0;
      body.visible = loaded && light > 0.001;
      if (!body.visible) return false;
      const dirt = options.channels.dirt ? (state.channels[options.channels.dirt] ?? 0) : 0;
      const scan = options.channels.scan ? (state.channels[options.channels.scan] ?? 0) : 0;
      const polish = options.channels.polish ? (state.channels[options.channels.polish] ?? 0) : 1;
      const travel = options.travel ? (state.channels[options.travel] ?? 0) : 0;
      if (dirt === last.dirt && scan === last.scan && polish === last.polish && light === last.light && travel === last.travel) return false;
      Object.assign(last, { dirt, scan, polish, light, travel });
      uniforms.uDirt.value = dirt;
      // Avant tout relevé, une caisse sans poussière est propre PARTOUT : sinon le vernis de l'ouverture n'existe pas.
      uniforms.uCleanBase.value = scan <= 0.001 && dirt <= 0.001 ? 1 : 0;
      // Le scan descend de l'avant vers l'arrière ; hors de [0, 1], la ligne est absente.
      const half = options.length / 2;
      uniforms.uScanFront.value = scan <= 0 ? half + 0.6 : scan >= 1 ? -half - 0.6 : half + 0.5 - scan * (options.length + 1);
      uniforms.uScanOn.value = scan > 0.001 && scan < 0.999 ? 1 : 0;
      uniforms.uPolish.value = polish;
      if (options.travel) {
        body.position.set(options.at[0] + forward.x * travel, 0, options.at[1] + forward.y * travel);
        uniforms.uCarOrigin.value.set(body.position.x, 0, body.position.z);
      }
      return true;
    },
    dispose() {},
  };
  return layer;
}

export type VehicleLayer = ReturnType<typeof createVehicleLayer>;
