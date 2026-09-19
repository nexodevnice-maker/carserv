import {
  Box3,
  CanvasTexture,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import { bakeShadow } from '../../engine/webgl/bake-shadow';
import { createVehicleBeams } from './vehicle-beams';
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
  channels: { light: string; dirt?: string; scan?: string; polish?: string; beam?: string; cabin?: string };
  /** Avance le long du cap (m), pour la route de la location. */
  travel?: string;
  /**
   * Peinture imposée : les modèles fournis sont en gris clair, et un gris clair sous une lampe au sodium devient
   * kaki. On ne touche qu'aux matériaux de carrosserie, jamais aux optiques ni à l'habitacle.
   *
   * `metalness` et `roughness` font partie du réglage, et ce n'est pas un détail : une laque NOIRE n'existe que par
   * ce qu'elle reflète (métal haut, très lisse), tandis qu'une peinture BLANCHE est un diélectrique — au même
   * réglage métallique elle vire au chrome et perd sa blancheur. Un blanc se rend avec un métal bas et un vernis.
   */
  tint?: { match: RegExp; color: readonly [number, number, number]; metalness?: number; roughness?: number };
  /**
   * EFFACEMENT D'EMBLÈME. Certains emblèmes ne portent pas de nom : sur le RS6, les quatre anneaux de la calandre
   * appartiennent au matériau des chromes (9 400 triangles : baguettes, entourages, inserts). Les masquer par le nom
   * crèverait toute la calandre. On les efface donc par la GÉOMÉTRIE : une boîte, en mètres, dans le repère du
   * monde, en mètres (le véhicule de la démonstration ne bouge jamais). Les fragments dedans ne sont pas dessinés.
   *
   * Bornes trouvées par DICHOTOMIE à l'écran : on efface une tranche, on capture, on regarde où elle tombe, on
   * resserre. C'est la seule méthode qui tienne — un encodage de la position en couleur avait été tenté et donnait
   * des valeurs fausses, parce que la capture partait avant que le modèle soit décodé et mesurait le mur du fond.
   * La boîte s'arrête juste derrière la saillie des anneaux : on retrouve le panneau lisse de la calandre, pas un
   * trou sur le compartiment moteur.
   */
  erase?: { x: readonly [number, number]; y: readonly [number, number]; z: readonly [number, number] };
  /** Bruit précalculé partagé (poussière). */
  noise: Texture;
  chapters?: readonly string[];
}

/** Uniformes injectés dans TOUS les matériaux du modèle. */
interface VehicleUniforms {
  uDirt: { value: number };
  /** 1 : la caisse entière est propre et vernie (l'ouverture du récit, avant tout relevé). */
  uCleanBase: { value: number };
  /** Allumage des optiques (canal `headlight`) : 0 éteint, 1 plein feu. */
  uBeam: { value: number };
  /** Éclairage d'ambiance de l'habitacle (canal `cabin`). */
  uCabin: { value: number };
  uScanFront: { value: number };
  uScanOn: { value: number };
  uPolish: { value: number };
  uNoise: { value: Texture };
  uCarOrigin: { value: Vector3 };
  uCarForward: { value: Vector2 };
  uHalf: { value: number };
  /** Boîte d'effacement (min, max) dans le repère du véhicule, et son interrupteur. */
  uEraseMin: { value: Vector3 };
  uEraseMax: { value: Vector3 };
  uErase: { value: number };
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
  uniform float uBeam;
  uniform float uCabin;
  uniform float uScanFront;
  uniform float uScanOn;
  uniform float uPolish;
  uniform sampler2D uNoise;
  uniform vec3 uCarOrigin;
  uniform vec2 uCarForward;
  uniform float uHalf;
  uniform vec3 uEraseMin;
  uniform vec3 uEraseMax;
  uniform float uErase;
  varying vec3 vCarWorld;
  varying vec3 vCarNormal;

  /** Vrai dans la boîte d'effacement : le fragment n'est pas dessiné (emblème sans nom de matériau). */
  bool carErased() {
    if (uErase < 0.5) return false;
    return all(greaterThan(vCarWorld, uEraseMin)) && all(lessThan(vCarWorld, uEraseMax));
  }

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
    // Borné à 1 : au-delà, le mélange EXTRAPOLE et la poussière dépasse sa propre couleur — la caisse devenait plus
    // claire que la poussière elle-même.
    return clamp(uDirt * (1.0 - cleaned) * clamp(0.34 + 0.78 * up + 0.5 * low, 0.0, 1.0) * (0.55 + 0.8 * grain), 0.0, 1.0);
  }
`;

/**
 * Ombre de contact : sans elle, un modèle posé sur un sol réfléchissant flotte. Ce n'est pas une ombre calculée (aucune
 * lumière dynamique, aucun rendu supplémentaire) : une empreinte sombre sous la caisse, plus dense sous les roues.
 */
const shadowFragment = /* glsl */ `
  uniform float uStrength;
  uniform sampler2D uShade;
  uniform float uBaked;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    // Repli tant que la silhouette n'est pas cuite : une empreinte approchée vaut mieux qu'un véhicule qui flotte.
    float body = exp(-dot(p, p) * 2.6);
    float axles = exp(-pow((abs(p.x) - 0.55) / 0.28, 2.0)) * exp(-p.y * p.y * 4.5) * 0.55;
    float rough = body + axles;
    // Cuite : le canal rouge porte la pénombre SERRÉE (le contact sous les roues), le vert la pénombre LARGE.
    // C'est leur somme qui fait qu'une voiture pose au lieu de planer.
    vec2 shade = texture2D(uShade, vUv).rg;
    float baked = clamp(shade.r * 0.5 + shade.g * 0.3, 0.0, 1.0);
    // Bordure fondue OBLIGATOIRE : sans elle, le panneau de l'ombre se voit comme un rectangle sombre posé sur le
    // sol — un trou, pas une ombre. Une ombre n'a jamais de bord droit.
    vec2 b = smoothstep(vec2(0.0), vec2(0.1), vUv) * smoothstep(vec2(1.0), vec2(0.9), vUv);
    float alpha = clamp(mix(rough, baked, uBaked) * uStrength * b.x * b.y, 0.0, 0.8);
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

/** Rien de ce qui identifie un CONSTRUCTEUR n'est publié : emblèmes et écussons sont retirés du modèle. */
const HIDDEN = /badge|logo|emblem/i;

/**
 * La plaque, elle, n'est pas retirée : elle est REPEINTE aux couleurs de l'entreprise. Ce n'est pas une
 * immatriculation — aucun numéro, aucun format officiel — c'est la signature du véhicule de démonstration.
 */
const PLATE = /plate/i;

/** Les optiques du modèle : l'avant (xénon, blanc froid) et l'arrière (rouge). */
const FRONT_LIGHT = /LightA|headlight|head_light/i;
const REAR_LIGHT = /red_glass|taillight|tail_light|rearlight/i;
/** Les garnitures de l'habitacle : sièges, contreportes, planche de bord. */
const CABIN = /Interior/i;

/** La plaque « CAR SERVICE | 06 », dessinée une fois. Fond sombre, filet jaune, deux blocs de texte. */
function plateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 220;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.fillStyle = '#0c0c0d';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = '#fdc727';
  c.lineWidth = 10;
  c.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  c.textBaseline = 'middle';
  c.fillStyle = '#f4f4f2';
  c.font = 'bold 108px "Arial Narrow", system-ui, sans-serif';
  c.textAlign = 'right';
  c.fillText('CAR SERVICE', 596, 114);
  c.fillStyle = '#fdc727';
  c.fillRect(628, 46, 9, 130);
  c.textAlign = 'left';
  c.fillText('06', 672, 114);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

export function createVehicleLayer(options: VehicleOptions) {
  const root = new Group();
  root.name = `vehicle:${options.url}`;
  const body = new Group();
  root.add(body);
  body.visible = false;
  const shadowUniforms = { uStrength: { value: 0.85 }, uShade: { value: null as Texture | null }, uBaked: { value: 0 } };
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
  // LA LUMIÈRE QUE LES PHARES JETTENT (faisceaux, nappe au sol, halos). Elle vit dans le repère du véhicule : elle
  // suit donc son cap et son déplacement sans un calcul de plus.
  const beams = createVehicleBeams({ half: options.length / 2, height: options.length * 0.145, spread: options.length * 0.145 });
  beams.root.rotation.y = -options.heading;
  body.add(beams.root);
  const uniforms: VehicleUniforms = {
    uDirt: { value: 0 },
    uCleanBase: { value: 1 },
    uBeam: { value: 0 },
    uCabin: { value: 0 },
    uScanFront: { value: 99 },
    uScanOn: { value: 0 },
    uPolish: { value: 0 },
    uNoise: { value: options.noise },
    uCarOrigin: { value: new Vector3(options.at[0], 0, options.at[1]) },
    uCarForward: { value: forward },
    uHalf: { value: options.length / 2 },
    uEraseMin: { value: new Vector3(...(options.erase ? [options.erase.x[0], options.erase.y[0], options.erase.z[0]] : [0, 0, 0])) },
    uEraseMax: { value: new Vector3(...(options.erase ? [options.erase.x[1], options.erase.y[1], options.erase.z[1]] : [0, 0, 0])) },
    uErase: { value: options.erase ? 1 : 0 },
  };
  let stage: StageContext | null = null;
  let loaded = false;
  let loading: Promise<void> | null = null;
  let plate: CanvasTexture | null = null;
  /** Ce que la couche a VRAIMENT fait de chaque matériau (relevé QA : le nom lu par le navigateur, pas par le fichier). */
  const roles: Record<string, string> = {};
  const last = { dirt: -1, scan: -1, polish: -1, light: -1, travel: NaN, beam: -1, cabin: -1 };

  /** Poussière, scan et vernis dans tous les matériaux du modèle : aucune texture ajoutée, seuls les paramètres bougent. */
  const patch = (material: Material) => {
    const standard = material as MeshStandardMaterial & MeshPhysicalMaterial;
    // LES OPTIQUES. Une fois le relevé passé, le véhicule s'allume : xénon à l'avant (blanc très froid, légèrement
    // bleu — c'est ce bleu qui fait lire « xénon » et pas « ampoule »), feux rouges à l'arrière. Ce n'est pas une
    // décoration : c'est le signe que la voiture est prête à repartir.
    const beam = FRONT_LIGHT.test(standard.name) ? 'avant' : REAR_LIGHT.test(standard.name) ? 'arriere' : null;
    const cabin = !beam && CABIN.test(standard.name);
    if (cabin) {
      // L'habitacle était écrasé à 11 % de sa couleur : il ne restait plus rien des garnitures, et la lueur
      // d'ambiance orange posée par-dessus devenait TOUTE l'image — d'où l'intérieur « jaune bizarre ». On garde
      // maintenant l'essentiel de la matière d'origine (cuir, plastiques, surpiqûres, maintenant en 2048) et on se
      // contente de l'assombrir comme le fait la nuit.
      standard.color?.multiplyScalar(0.38);
      standard.roughness = Math.max(standard.roughness ?? 0.5, 0.55);
      standard.metalness = 0.04;
      standard.needsUpdate = true;
    }
    roles[standard.name || '(sans nom)'] = beam ? `optique ${beam}` : 'caisse';
    // Three.js met les programmes en cache d'après les PARAMÈTRES du matériau : deux matériaux réglés pareil
    // partagent le même programme, même si leur `onBeforeCompile` injecte un code différent. L'optique héritait donc
    // du programme de la carrosserie, sans la ligne qui l'allume — et restait éteinte. La clé lève l'ambiguïté.
    standard.customProgramCacheKey = () => `carservice:${beam ?? (cabin ? 'habitacle' : 'caisse')}`;
    if (beam) {
      standard.roughness = 0.14;
      standard.metalness = 0.1;
      standard.needsUpdate = true;
    }
    // LA LAQUE. On IMPOSE la couleur de carrosserie au lieu d'atténuer celle du modèle : les modèles fournis sont
    // peints en gris clair, et un gris clair sous une lumière chaude devient kaki — la voiture n'était plus noire,
    // elle était beige. Une laque sombre, elle, n'existe que par ce qu'elle reflète : c'est tout le sujet du récit
    // (elle est terne quand elle est sale, c'est un miroir quand elle est vernie).
    if (options.tint && options.tint.match.test(standard.name)) {
      standard.color?.setRGB(...(options.tint.color as [number, number, number]));
      standard.metalness = options.tint.metalness ?? 0.92;
      standard.roughness = options.tint.roughness ?? Math.min(standard.roughness ?? 0.3, 0.22);
    }
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
          if (carErased()) discard;
          #include <map_fragment>
          float carX = carAxis();
          float cleaned = carCleaned(carX);
          // Branchement sur un uniforme (donc uniforme pour tout le groupe) : caisse propre = deux lectures de bruit
          // économisées par pixel. Le véhicule remplit l'écran sur les macros : c'est là que ça compte.
          float dust = uDirt > 0.001 ? carDust(cleaned) : 0.0;
          // La poussière ternit la couleur et l'éclaircit à peine (elle diffuse la lumière des étoiles).
          // La poussière dépose un voile clair et sans vie par-dessus la couleur : c'est ce voile qu'on vient enlever.
          // Une laque noire sous la poussière reste SOMBRE : ce qu'on voit, c'est un voile terne, pas un véhicule
          // repeint en beige. La couleur de la poussière est donc basse, et la laque transparaît encore dessous.
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.075, 0.068, 0.058), diffuseColor.rgb * 0.8, 0.4), dust);
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
          ${
            cabin
              ? /* glsl */ `
          // L'HABITACLE. Une lueur chaude, très basse, posée sur les garnitures — la lumière d'ambiance qu'on laisse
          // allumée la nuit. Elle monte avec le canal cabin : on entre dans la voiture, la voiture s'allume.
          // Deux couches : un fond d'ambiance très bas sur toutes les garnitures, et une LIGNE DE LED sur le bas des
          // contreportes — la bande lumineuse qu'on voit dans une voiture récente, la nuit. Elle est tracée par la
          // hauteur dans le repère du véhicule, donc elle suit la caisse sans aucune géométrie ajoutée.
          float cabinY = vCarWorld.y - uCarOrigin.y;
          // LE FOND D'AMBIANCE : blanc chaud, très bas. Il était ORANGE et trois fois plus fort — c'est lui qui
          // teintait tout l'habitacle. Une veilleuse d'habitacle éclaire, elle ne colore pas.
          totalEmissiveRadiance += vec3(1.0, 0.94, 0.86) * uCabin * 0.045;
          // LA BANDE DE LED, ROUGE (demande du porteur). Deux hauteurs, comme dans une voiture récente : le filet
          // du haut de contreporte, et un second, plus diffus, qui éclaire le bas de caisse côté pieds. Un seul
          // trait pile net faisait autocollant ; c'est le HALO autour du filet qui fait la LED.
          float ligne = exp(-pow((cabinY - 0.775) / 0.018, 2.0));
          float halo = exp(-pow((cabinY - 0.775) / 0.048, 2.0));
          float pieds = exp(-pow((cabinY - 0.60) / 0.05, 2.0));
          vec3 rouge = vec3(1.0, 0.075, 0.105);
          // Resserré après capture : le halo à 7,5 cm noyait toute la planche de bord de rouge. Un filet se lit
          // comme un filet, pas comme un lavis.
          totalEmissiveRadiance += rouge * (ligne * 1.15 + halo * 0.14 + pieds * 0.12) * uCabin;
        `
              : ''
          }
          ${
            beam
              ? /* glsl */ `
          // L'OPTIQUE. Ce n'est pas une plaque qui s'allume : c'est un bloc de verre où SEULES les lentilles
          // éclairent. Le dessin de ces lentilles est déjà dans la texture du modèle — ses zones claires sont le
          // verre, ses zones sombres le boîtier — alors on s'en sert comme masque au lieu d'allumer tout le bloc.
          // Et une optique ÉBLOUIT de face, pas de profil : la part regardée de face s'ajoute par-dessus.
          float lensMask = smoothstep(0.10, 0.60, dot(diffuseColor.rgb, vec3(0.32, 0.55, 0.13)));
          vec3 lensView = normalize(cameraPosition - vCarWorld);
          float lensFace = pow(clamp(dot(normalize(vCarNormal), lensView), 0.0, 1.0), 1.5);
          ${
            beam === 'avant'
              ? // Xénon : le cœur est presque blanc, les bords tirent vers le bleu froid. C'est ce bleu qui fait
                // lire « xénon » et non « ampoule », et il ne survit que si le blanc ne sature pas tout.
                `vec3 lensTint = mix(vec3(0.52, 0.70, 1.0), vec3(1.0, 0.99, 0.95), lensMask);
          totalEmissiveRadiance += lensTint * uBeam * (lensMask * 2.6 + lensMask * lensFace * 4.4 + 0.10);`
              : // Feux arrière : le rouge doit RESTER rouge, donc la puissance est basse et c'est le masque qui
                // dessine la signature lumineuse.
                `vec3 lensTint = mix(vec3(0.55, 0.02, 0.01), vec3(1.0, 0.10, 0.05), lensMask);
          totalEmissiveRadiance += lensTint * uBeam * (lensMask * 1.5 + lensMask * lensFace * 1.6 + 0.05);`
          }
        `
              : ''
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
    // Un nœud glTF peut avoir `matrixAutoUpdate` à false (sa matrice vient du fichier) : sans cette remise à jour
    // explicite, changer position ou échelle n'a AUCUN effet — le modèle reste à la taille du fichier.
    model.matrixAutoUpdate = true;
    model.updateMatrix();
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
        for (const material of materials) roles[material.name || '(sans nom)'] = 'masqué';
        return;
      }
      if (materials.some((material) => PLATE.test(material.name))) {
        for (const material of materials) {
          const standard = material as MeshStandardMaterial;
          plate ??= plateTexture();
          standard.map = plate;
          standard.color?.setRGB(1, 1, 1);
          standard.metalness = 0.1;
          standard.roughness = 0.42;
          standard.needsUpdate = true;
          roles[standard.name || '(sans nom)'] = 'plaque';
        }
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
    // L'OMBRE PORTÉE, cuite ICI et une seule fois : le véhicule ne bouge pas par rapport à son sol, donc son ombre
    // ne change jamais. Une carte d'ombre classique coûterait un rendu complet de la scène à chaque image ; celle-ci
    // ne coûte rien après ce moment. Le modèle est visible à cet instant (compilation en cours), c'est exactement
    // quand il faut le faire.
    const half = options.length / 2;
    const shade = bakeShadow(stage.renderer, {
      models: [body],
      // Lumière haute et légèrement de côté : une ombre au pied du véhicule, pas une ombre de fin de journée.
      light: [options.at[0] - 2.4, 9.5, options.at[1] - 3.2],
      area: [options.at[0] - half * 1.5, options.at[1] - half * 1.1, options.at[0] + half * 1.5, options.at[1] + half * 1.1],
      width: 512,
    });
    if (shade) {
      shadowUniforms.uShade.value = shade;
      shadowUniforms.uBaked.value = 1;
      shadow.scale.set(1, (half * 2.2) / (options.length * 0.78), 1);
    }
    root.visible = hiddenRoot;
    body.visible = hiddenBody;
    stage.invalidate();
  };

  /** Relevé de contrôle (crochets QA) : ce que valent réellement les matériaux du modèle fourni. */
  const debug = () => {
    const seen = new Map<string, Record<string, unknown>>();
    seen.set('__roles', roles as unknown as Record<string, unknown>);
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
      const beam = options.channels.beam ? (state.channels[options.channels.beam] ?? 0) : 0;
      const cabin = options.channels.cabin ? (state.channels[options.channels.cabin] ?? 0) : 0;
      if (
        dirt === last.dirt && scan === last.scan && polish === last.polish && light === last.light &&
        travel === last.travel && beam === last.beam && cabin === last.cabin
      )
        return false;
      Object.assign(last, { dirt, scan, polish, light, travel, beam, cabin });
      uniforms.uBeam.value = beam;
      uniforms.uCabin.value = cabin;
      beams.set(beam * light);
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
    dispose() {
      beams.dispose();
    },
  };
  return layer;
}

export type VehicleLayer = ReturnType<typeof createVehicleLayer>;
