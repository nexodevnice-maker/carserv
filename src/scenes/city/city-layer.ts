import { Box3, Color, Group, Mesh, MeshStandardMaterial, Vector3, type Material, type Object3D } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LA VILLE — le lieu d'arrivée, en bas de l'univers.
 *
 * Modèle fourni (ville de nuit, gratte-ciel en basse définition) : 2 000 triangles, des façades dont les fenêtres sont
 * peintes en émissif. C'est exactement ce qu'il faut pour un téléphone — et surtout, c'est de la VRAIE géométrie :
 * on descend entre les tours, elles se croisent, la parallaxe fait le reste.
 *
 * Ce que la couche ajoute au modèle :
 * - le **sol du modèle est masqué** : c'est notre sol mouillé qui sert de rue, parce que lui réfléchit la nuit ;
 * - les façades sont **assombries** et leurs fenêtres **rallumées** (canal `city`) : une ville de nuit, pas une
 *   maquette grise. Les lumières s'allument en arrivant, comme la chaussée ;
 * - chaque façade se **fond dans la brume d'horizon** exactement comme le reste du monde : aucune tour ne flotte.
 */
export interface CityOptions {
  url: string;
  buffer?: Promise<ArrayBuffer>;
  night: SharedNight;
  /**
   * Hauteur de la plus haute tour (m) — et NON l'emprise : le modèle est un bloc aussi haut que large, le caler sur
   * l'emprise donnait des tours d'un kilomètre et demi, dans lesquelles la caméra passait sans rien voir.
   */
  height: number;
  at: readonly [number, number];
  /** Rotation de la ville (rad) : oriente les avenues. */
  heading: number;
  chapters?: readonly string[];
}

/** Ce qui, dans le modèle, ne doit pas être publié : son sol (on a le nôtre) et ses lampes de scène. */
const HIDDEN = /^(plane|point|sphere|lamp|light)/i;

export function createCityLayer(options: CityOptions) {
  const root = new Group();
  root.name = 'city';
  const body = new Group();
  body.position.set(options.at[0], 0, options.at[1]);
  body.rotation.y = options.heading;
  body.visible = false;
  root.add(body);
  const uniforms = { uCity: { value: 0 }, uWindow: { value: 0 } };
  let stage: StageContext | null = null;
  let loading: Promise<void> | null = null;
  let loaded = false;
  let measured: { size: number[]; scale: number } | null = null;
  const last = { city: -1, window: -1 };

  /** Nuit : la façade est sombre, ce sont les fenêtres qui font la ville. */
  const patch = (material: Material) => {
    const standard = material as MeshStandardMaterial;
    standard.roughness = 0.82;
    standard.metalness = 0.06;
    if (standard.emissive) standard.emissive = new Color(1, 0.86, 0.62);
    standard.emissiveIntensity = 1;
    standard.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, options.night, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'varying vec3 vCityWorld;\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vCityWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          // `uLight` et `uFog` sont déclarés par GROUND_GLSL, que la ville n'utilise pas : on les redéclare ici.
          `${SKY_GLSL}\nuniform float uLight;\nuniform float uFog;\nuniform float uCity;\nuniform float uWindow;\nvarying vec3 vCityWorld;\nvoid main() {`,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          #include <map_fragment>
          // Les fenêtres allumées sont DANS la texture de façade : ce sont ses zones claires. On les isole, on
          // assombrit tout le reste (c'est la nuit), et on rallume ces zones-là. Le modèle n'a pas de canal émissif
          // exploitable — on n'en a pas besoin.
          float cityLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
          float cityWin = smoothstep(0.28, 0.72, cityLum);
          vec3 cityLit = diffuseColor.rgb;
          diffuseColor.rgb *= 0.16;
        `,
        )
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += cityLit * cityWin * uWindow * 3.2;
        `,
        )
        .replace(
          '#include <fog_fragment>',
          /* glsl */ `
          // Même brume que tout le reste du monde : les tours du fond se fondent dans la nuit, aucune ne flotte.
          vec3 cityRay = vCityWorld - cameraPosition;
          float cityT = length(cityRay);
          gl_FragColor.rgb = mix(haze(cityRay / cityT) * uLight, gl_FragColor.rgb * uCity, exp(-pow(uFog * cityT, 2.0)));
        `,
        );
    };
    standard.needsUpdate = true;
  };

  /** Mise à l'échelle : l'emprise au sol est ramenée à `span`, la ville est posée sur y = 0. */
  const place = (scene: Object3D) => {
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      if (HIDDEN.test(mesh.name)) {
        mesh.visible = false;
        return;
      }
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) patch(material);
    });
    // La boîte ne tient compte QUE de ce qu'on affiche : le modèle contient un sol immense (qu'on masque) et des
    // objets de scène ; les inclure divisait la ville par dix et la rendait invisible.
    const box = new Box3();
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
      mesh.updateWorldMatrix(true, false);
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(geometry.boundingBox);
      geometry.dispose();
    });
    const size = box.getSize(new Vector3());
    const scale = options.height / Math.max(size.y, 0.001);
    measured = { size: size.toArray().map((v) => Number(v.toFixed(2))), scale: Number(scale.toFixed(3)) };
    scene.scale.multiplyScalar(scale);
    const center = box.getCenter(new Vector3()).multiplyScalar(scale);
    scene.position.set(-center.x, -box.min.y * scale, -center.z);
    // Un nœud glTF peut avoir `matrixAutoUpdate` à false (sa matrice vient du fichier) : sans cette remise à jour
    // explicite, changer position ou échelle n'a AUCUN effet — le modèle reste à la taille du fichier.
    scene.matrixAutoUpdate = true;
    scene.updateMatrix();
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
    const hidden = body.visible;
    body.visible = true;
    await stage.renderer.compileAsync(body, stage.camera, stage.scene).catch(() => undefined);
    body.visible = hidden;
    stage.invalidate();
  };

  /** Relevé de contrôle (crochets QA) : où la ville se trouve réellement, et à quelle taille. */
  const debug = () => {
    const box = new Box3();
    body.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
      mesh.updateWorldMatrix(true, false);
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      g.computeBoundingBox();
      if (g.boundingBox) box.union(g.boundingBox);
      g.dispose();
    });
    return {
      loaded,
      visible: body.visible,
      min: box.min.toArray().map((v) => Math.round(v)),
      max: box.max.toArray().map((v) => Math.round(v)),
      meshes: body.children[0]?.children.length ?? 0,
      measured,
      rootScale: Number((body.children[0]?.scale.x ?? 0).toFixed(3)),
      rootPos: body.children[0]?.position.toArray().map((v) => Math.round(v)),
      probe: (() => {
        let out: unknown = null;
        body.traverse((node) => {
          const mesh = node as Mesh;
          if (out || !mesh.isMesh || !mesh.visible) return;
          mesh.updateWorldMatrix(true, false);
          out = {
            name: mesh.name,
            auto: mesh.matrixAutoUpdate,
            parentAuto: mesh.parent?.matrixAutoUpdate,
            worldScaleX: Number(mesh.matrixWorld.elements[0]!.toFixed(3)),
            localScaleX: Number(mesh.scale.x.toFixed(3)),
          };
        });
        return out;
      })(),
    };
  };

  const layer: WebGLLayer & { ensure(): Promise<void>; debug(): unknown } = {
    id: 'city',
    chapters: options.chapters,
    root,
    init(ctx: StageContext) {
      stage = ctx;
    },
    debug,
    ensure() {
      loading ??= load().catch((error: unknown) => {
        loading = null;
        console.warn('[city]', error instanceof Error ? error.message : error);
      });
      return loading;
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const city = state.channels.city ?? 0;
      const windows = state.channels.cityWindow ?? city;
      body.visible = loaded && city > 0.002;
      if (!body.visible) return false;
      if (city === last.city && windows === last.window) return false;
      last.city = city;
      last.window = windows;
      uniforms.uCity.value = city;
      uniforms.uWindow.value = windows;
      return true;
    },
    dispose() {},
  };
  return layer;
}
