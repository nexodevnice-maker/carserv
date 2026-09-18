import { Box3, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Material, type Object3D } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LA VILLE — le lieu d'arrivée, autour de la place.
 *
 * Le modèle fourni n'est pas une ville : c'est UN PÂTÉ DE MAISONS — quatorze immeubles sur huit mètres de côté, plus
 * un sol et un dôme de ciel dont on n'a pas l'usage (on a les nôtres). Posé seul derrière le parking, il ne faisait
 * qu'une petite grappe perdue dans le noir. On en fait donc un QUARTIER : le même pâté répété une douzaine de fois,
 * tourné et redimensionné, en couronne autour de la place — bas et proche, haut et lointain, comme une ville vue de
 * son bord. La place reste dans la clairière du centre : aucune tour au-dessus de la voiture, jamais.
 *
 * Répétition sans coût : un `InstancedMesh` par maillage du modèle. Douze pâtés = toujours quatorze appels de dessin.
 *
 * Ce que la couche ajoute au modèle :
 * - les façades sont **assombries** et leurs fenêtres **rallumées** (canal `cityWindow`) : une ville de nuit, pas une
 *   maquette grise ;
 * - chaque façade se **fond dans la brume d'horizon** comme le reste du monde : aucune tour ne flotte.
 */
export interface CityOptions {
  url: string;
  buffer?: Promise<ArrayBuffer>;
  night: SharedNight;
  /**
   * Hauteur de la plus haute tour du quartier (m) — et NON l'emprise : le pâté fourni est deux fois plus large que
   * haut, le caler sur son emprise donnait des immeubles d'un kilomètre et demi.
   */
  height: number;
  /** Centre du quartier (x, z) et orientation de la couronne (rad). */
  at: readonly [number, number];
  heading: number;
  /**
   * La couronne : `count` pâtés entre `inner` et `outer` mètres du centre. `inner` est la clairière — le parking y
   * tient au large, et la tour la plus proche reste sous la ligne du regard. `low` : échelle du pâté le plus proche.
   */
  field: { count: number; inner: number; outer: number; low: number };
  /** Couloir interdit (la route de la location le traverse) : demi-largeur et portée vers le nord, en mètres. */
  corridor?: { half: number; reach: number };
  chapters?: readonly string[];
}

/** Ce qui, dans le modèle, ne doit pas être publié : son sol et son dôme de ciel (on a les nôtres), ses lampes. */
const HIDDEN = /^(plane|sphere|point|lamp|light)/i;

/** Angle d'or : répartit les pâtés sur la couronne sans jamais les aligner. */
const GOLDEN = 2.399963;

export function createCityLayer(options: CityOptions) {
  const root = new Group();
  root.name = 'city';
  const body = new Group();
  body.visible = false;
  root.add(body);
  const uniforms = { uCity: { value: 0 }, uWindow: { value: 0 } };
  let stage: StageContext | null = null;
  let loading: Promise<void> | null = null;
  let loaded = false;
  let measured: unknown = null;
  const last = { city: -1, window: -1 };

  /** Nuit : la façade est sombre, ce sont les fenêtres qui font la ville. */
  const patch = (material: Material) => {
    const standard = material as MeshStandardMaterial;
    standard.roughness = 0.82;
    standard.metalness = 0.06;
    // AUCUN émissif de matériau : le modèle en déclare sur la plupart de ses façades, ce qui allumait des tours
    // entières en beige pâle. La seule lumière de la ville, ce sont les fenêtres qu'on peint plus bas.
    if (standard.emissive) standard.emissive = new Color(0, 0, 0);
    standard.emissiveIntensity = 1;
    standard.emissiveMap = null;
    standard.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, options.night, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'varying vec3 vCityWorld;\nvarying vec3 vCityNormal;\nvoid main() {')
        .replace(
          '#include <project_vertex>',
          /* glsl */ `
          #include <project_vertex>
          // Position ET normale doivent passer par la matrice d'instance : sinon les pâtés partagent la brume et la
          // trame du premier — ils se fondraient tous à la même distance, et leurs fenêtres seraient alignées.
          vec4 cityLocal = vec4(transformed, 1.0);
          vec3 cityNrm = objectNormal;
          #ifdef USE_INSTANCING
            cityLocal = instanceMatrix * cityLocal;
            cityNrm = mat3(instanceMatrix) * cityNrm;
          #endif
          vCityWorld = (modelMatrix * cityLocal).xyz;
          vCityNormal = normalize(mat3(modelMatrix) * cityNrm);
        `,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          // `uLight` et `uFog` sont déclarés par GROUND_GLSL, que la ville n'utilise pas : on les redéclare ici.
          `${SKY_GLSL}\nuniform float uLight;\nuniform float uFog;\nuniform float uCity;\nuniform float uWindow;\nvarying vec3 vCityWorld;\nvarying vec3 vCityNormal;\nvoid main() {`,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          #include <map_fragment>
          // La texture fournie est une façade de JOUR : la rallumer en bloc donnait des tours beiges qui brillaient
          // entièrement. On ne garde donc d'elle que la matière — désaturée, très assombrie, c'est du béton de nuit.
          diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.33))), diffuseColor.rgb, 0.35) * 0.05;
        `,
        )
        .replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `
          #include <emissivemap_fragment>
          // LES FENÊTRES SONT PEINTES ICI, pas lues dans la texture : étages de 3,2 m, travées de 2,4 m mesurées dans
          // le monde (donc à la bonne taille quel que soit le pâté), et une empreinte déterministe qui n'en allume
          // qu'un tiers — une ville habitée, où quelqu'un est encore debout, pas un panneau lumineux.
          vec3 cityAxis = abs(vCityNormal);
          vec2 cityUv = cityAxis.x > cityAxis.z ? vec2(vCityWorld.z, vCityWorld.y) : vec2(vCityWorld.x, vCityWorld.y);
          vec2 cityCell = cityUv / vec2(2.4, 3.2);
          vec2 cityEdge = fwidth(cityCell) * 1.5;
          vec2 cityFract = fract(cityCell);
          vec2 cityPane = smoothstep(0.14 - cityEdge, 0.22 + cityEdge, cityFract) *
                          (1.0 - smoothstep(0.76 - cityEdge, 0.84 + cityEdge, cityFract));
          vec2 cityId = floor(cityCell);
          float cityLit = step(0.63, fract(sin(dot(cityId, vec2(12.9898, 78.233))) * 43758.5453));
          // Quand une travée devient plus petite qu'un pixel, la trame moirerait : on la remplace alors par sa
          // moyenne. De près des fenêtres, de loin une lueur — c'est exactement ce que fait une vraie skyline.
          float cityBlur = smoothstep(0.3, 0.8, max(cityEdge.x, cityEdge.y));
          float cityWin = mix(cityPane.x * cityPane.y * cityLit, 0.13, cityBlur) * (1.0 - cityAxis.y);
          totalEmissiveRadiance += vec3(1.0, 0.77, 0.44) * cityWin * uWindow * 3.4;
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

  /**
   * La couronne de pâtés. Déterministe (aucun tirage au sort) : deux captures du même plan sont identiques.
   * Le rayon croît moins vite que le rang : il y a donc plus de pâtés près du centre, c'est ce qui remplit l'horizon.
   * La hauteur croît avec la distance — bas au bord, haut au fond, comme une ville vue depuis sa périphérie.
   */
  const layout = () => {
    const { count, inner, outer, low } = options.field;
    const blocks: Matrix4[] = [];
    const move = new Matrix4();
    const spin = new Matrix4();
    const grow = new Matrix4();
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const radius = inner + (outer - inner) * Math.pow(t, 0.62);
      const angle = i * GOLDEN + options.heading;
      let x = options.at[0] + Math.cos(angle) * radius;
      const z = options.at[1] + Math.sin(angle) * radius;
      // La route de la location file vers le nord : on ÉCARTE le pâté qui lui tomberait dessus plutôt que de le
      // supprimer — un trou dans l'horizon se voit bien davantage qu'un immeuble décalé.
      const corridor = options.corridor;
      if (corridor && z < 0 && z > -corridor.reach && Math.abs(x) < corridor.half) x += x < 0 ? -corridor.half : corridor.half;
      move.makeTranslation(x, 0, z);
      spin.makeRotationY(angle * 1.7 + i);
      const scale = low + (1 - low) * t;
      grow.makeScale(scale, scale, scale);
      blocks.push(move.clone().multiply(spin).multiply(grow));
    }
    return blocks;
  };

  /**
   * Pose le quartier. Le modèle est déjà debout, base au sol — vérifié à la sonde (`scripts/media-tools/probe-glb.mjs`),
   * pas supposé : c'est ce relevé qui a montré que le redresser était une erreur.
   *
   * ATTENTION : ses géométries sont QUANTIFIÉES (entiers normalisés). On mesure donc en transformant la BOÎTE de chaque
   * maillage, jamais ses sommets — `geometry.applyMatrix4()` réécrit les sommets à travers la normalisation et les
   * rabat tous dans [-1, 1] : la ville semblait alors mesurer deux mètres, et se plantait n'importe où.
   */
  const place = (scene: Object3D) => {
    scene.updateMatrixWorld(true);
    const parts: Mesh[] = [];
    const patched = new Set<Material>();
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || HIDDEN.test(mesh.name)) return;
      parts.push(mesh);
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (patched.has(material)) continue;
        patched.add(material);
        patch(material);
      }
    });
    const box = new Box3();
    const one = new Box3();
    for (const mesh of parts) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(one.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld));
    }
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const unit = options.height / Math.max(size.y, 0.001);
    // Le pâté ramené à l'origine, base exactement au sol, plus haute tour à `height`.
    const normalize = new Matrix4()
      .makeScale(unit, unit, unit)
      .multiply(new Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
    const blocks = layout();
    const world = new Matrix4();
    for (const mesh of parts) {
      const instanced = new InstancedMesh(mesh.geometry, mesh.material as Material, blocks.length);
      instanced.name = mesh.name;
      instanced.castShadow = false;
      instanced.receiveShadow = false;
      instanced.frustumCulled = false;
      for (let i = 0; i < blocks.length; i += 1) {
        world.multiplyMatrices(blocks[i]!, normalize).multiply(mesh.matrixWorld);
        instanced.setMatrixAt(i, world);
      }
      instanced.instanceMatrix.needsUpdate = true;
      body.add(instanced);
    }
    measured = {
      pate: [size.x * unit, size.y * unit, size.z * unit].map((v) => Math.round(v)),
      blocks: blocks.length,
      appels: parts.length,
    };
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

  /** Relevé de contrôle (crochets QA) : où le quartier se trouve réellement, et à quelle taille. */
  const debug = () => {
    const box = new Box3();
    const one = new Box3();
    const matrix = new Matrix4();
    for (const child of body.children) {
      const instanced = child as InstancedMesh;
      if (!instanced.isInstancedMesh) continue;
      if (!instanced.geometry.boundingBox) instanced.geometry.computeBoundingBox();
      for (let i = 0; i < instanced.count; i += 1) {
        instanced.getMatrixAt(i, matrix);
        box.union(one.copy(instanced.geometry.boundingBox!).applyMatrix4(matrix));
      }
    }
    return {
      loaded,
      visible: body.visible,
      min: box.min.toArray().map((v) => Math.round(v)),
      max: box.max.toArray().map((v) => Math.round(v)),
      measured,
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
