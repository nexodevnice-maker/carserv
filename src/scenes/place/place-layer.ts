import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { GROUND_GLSL, SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LA PLACE — l'endroit où le véhicule est garé, et le seul décor du récit.
 *
 * Le nettoyage se fait CHEZ LE CLIENT : il fallait donc un vrai lieu, pas un objet posé sur un sol abstrait. Une aire
 * de stationnement de nuit, mouillée, fermée par un mur d'enceinte — c'est ce mur qui fait le lieu : sans lui, la
 * voiture se détache sur du vide et rien ne dit où l'on est. Derrière le véhicule il y a du béton éclairé en biais,
 * devant lui un butoir, à côté une grille d'égout, et trois candélabres dont les cônes de lumière traversent l'air.
 *
 * Ce qui fait croire au lieu, dans l'ordre :
 * 1. le MUR : il renvoie la lumière des candélabres et donne un fond au véhicule ;
 * 2. les CÔNES de lumière : une nuit sans air est une nuit fausse ;
 * 3. le MARQUAGE USÉ : peinture écaillée, traces de pneus, coulures — un parking neuf n'existe pas ;
 * 4. les OBJETS : butoirs, bornes, grille, panneau. Ils donnent l'échelle et le premier plan.
 *
 * Charte : l'enrobé est noir, les lignes sont jaunes (le jaune des flyers), la lumière est chaude comme la balise.
 * Rien n'évoque un local commercial : l'entreprise se déplace, elle n'a pas d'adresse connue (BUSINESS_TRUTH) —
 * c'est une place publique, la nuit.
 */
export interface PlaceOptions {
  night: SharedNight;
  /** Dimensions de l'aire (m). */
  size: readonly [number, number];
  /** Places de stationnement : largeur, longueur, nombre. */
  bay: { width: number; length: number; count: number };
  /** Candélabres : positions (x, z) et hauteur. */
  lamps: readonly (readonly [number, number])[];
  lampHeight: number;
  /** Mur d'enceinte derrière la rangée : abscisse, hauteur, longueur (m). */
  wall: { at: number; height: number; length: number };
  /** Textures d'enrobé (mêmes relevés que la chaussée). */
  asphalt: { albedo: string; arm: string; normal: string };
}

/** Nombre de candélabres que les nuanceurs d'objets savent éclairer (tableau de taille fixe en GLSL). */
const MAX_LAMPS = 4;

/** Tirage déterministe : deux chargements de la page donnent exactement la même usure. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Le marquage au sol ET son usure, dessinés une seule fois dans une image.
 * Un parking neuf n'existe pas : on peint les lignes, puis on les ronge (peinture écaillée), puis on ajoute ce que
 * les voitures y laissent — traces de freinage, gouttes d'huile sous les moteurs, coulures d'eau vers l'égout.
 * Tout ce qui est SOMBRE ici est de la crasse, tout ce qui est JAUNE est de la peinture : le nuanceur ne fait que
 * les mélanger à l'enrobé.
 */
function markingsTexture(options: PlaceOptions, pixelsPerMeter: number) {
  const [w, h] = options.size;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * pixelsPerMeter);
  canvas.height = Math.round(h * pixelsPerMeter);
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const toX = (x: number) => (x + w / 2) * pixelsPerMeter;
  const toY = (z: number) => (z + h / 2) * pixelsPerMeter;
  const random = seeded(20260918);
  c.clearRect(0, 0, canvas.width, canvas.height);

  const { width, length, count } = options.bay;
  const half = Math.floor(count / 2);
  const rows = [
    { from: -length / 2, to: length / 2, head: -length / 2 },
    { from: length / 2 + 5.8, to: length * 1.5 + 5.8, head: length * 1.5 + 5.8 },
  ];

  // — Traces de pneus : elles arrivent par l'allée et tournent dans les places. C'est le détail qui dit qu'on n'est
  // pas le premier à se garer ici. Dessinées AVANT la peinture : la peinture passe par-dessus, puis s'use.
  c.lineCap = 'round';
  for (const row of rows) {
    for (let k = -half; k <= half; k += 1) {
      if (random() < 0.35) continue;
      const z = k * width;
      const inner = row === rows[0] ? row.to : row.from;
      const outer = row === rows[0] ? row.from : row.to;
      for (const side of [-0.78, 0.78]) {
        c.strokeStyle = `rgba(10,9,8,${0.14 + random() * 0.16})`;
        c.lineWidth = (0.19 + random() * 0.05) * pixelsPerMeter;
        c.beginPath();
        c.moveTo(toX(inner + (row === rows[0] ? 3.2 : -3.2)), toY(z + side * 1.5));
        c.quadraticCurveTo(toX(inner), toY(z + side), toX(outer + (row === rows[0] ? 0.7 : -0.7)), toY(z + side));
        c.stroke();
      }
    }
  }

  // — Les places : une rangée où le véhicule est garé (sa place est centrée sur l'origine du monde, capot vers l'est),
  // l'allée devant lui, et une rangée qui lui fait face. C'est ce dessin qui dit « il est garé », pas « il est posé ».
  c.lineCap = 'square';
  for (const row of rows) {
    for (let k = -half; k <= half + 1; k += 1) {
      const z = (k - 0.5) * width;
      c.strokeStyle = `rgba(253,199,39,${0.62 + random() * 0.3})`;
      c.lineWidth = Math.max(2, (0.11 + random() * 0.02) * pixelsPerMeter);
      c.beginPath();
      c.moveTo(toX(row.from), toY(z));
      c.lineTo(toX(row.to), toY(z));
      c.stroke();
    }
    // Ligne de fond de places, contre la bordure.
    c.strokeStyle = 'rgba(253,199,39,0.7)';
    c.beginPath();
    c.moveTo(toX(row.head), toY((-half - 0.5) * width));
    c.lineTo(toX(row.head), toY((half + 1.5) * width));
    c.stroke();
  }

  // — Numéros de place, à la tête de chaque emplacement. Peints au pochoir, donc irréguliers.
  c.fillStyle = 'rgba(253,199,39,0.5)';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let k = -half; k <= half; k += 1) {
    c.save();
    c.translate(toX(rows[0]!.head + 0.95), toY(k * width));
    c.rotate(Math.PI / 2);
    c.font = `bold ${Math.round(0.62 * pixelsPerMeter)}px system-ui, sans-serif`;
    c.globalAlpha = 0.5 + random() * 0.4;
    c.fillText(String(11 + k + half), 0, 0);
    c.restore();
  }
  c.globalAlpha = 1;

  // — Flèche de circulation dans l'allée : un parking a un sens de rotation.
  c.fillStyle = 'rgba(253,199,39,0.42)';
  c.save();
  c.translate(toX(length / 2 + 2.9), toY(-half * width - 1.2));
  c.rotate(-Math.PI / 2);
  c.beginPath();
  c.moveTo(0, -1.5 * pixelsPerMeter);
  c.lineTo(0.55 * pixelsPerMeter, -0.45 * pixelsPerMeter);
  c.lineTo(0.2 * pixelsPerMeter, -0.45 * pixelsPerMeter);
  c.lineTo(0.2 * pixelsPerMeter, 1.5 * pixelsPerMeter);
  c.lineTo(-0.2 * pixelsPerMeter, 1.5 * pixelsPerMeter);
  c.lineTo(-0.2 * pixelsPerMeter, -0.45 * pixelsPerMeter);
  c.lineTo(-0.55 * pixelsPerMeter, -0.45 * pixelsPerMeter);
  c.closePath();
  c.fill();
  c.restore();

  // — Hachures d'interdiction au bout de l'allée (un vrai parking en a toujours).
  c.strokeStyle = 'rgba(253,199,39,0.36)';
  c.lineWidth = Math.max(2, 0.09 * pixelsPerMeter);
  for (let k = 0; k < 10; k += 1) {
    const x = 3.4 + k * 0.62;
    c.beginPath();
    c.moveTo(toX(x), toY(-half * width - 3.4));
    c.lineTo(toX(x + 1.2), toY(-half * width - 0.6));
    c.stroke();
  }

  // — L'USURE : on ronge la peinture. `destination-out` efface, donc la ligne devient l'enrobé nu par endroits —
  // exactement comme une bande roulée pendant dix ans.
  c.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 900; k += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const r = (0.05 + random() * 0.34) * pixelsPerMeter;
    c.globalAlpha = 0.25 + random() * 0.6;
    c.beginPath();
    c.ellipse(x, y, r, r * (0.4 + random()), random() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';

  // — Ce que les voitures laissent : huile sous les moteurs, eau qui file vers l'égout. Sombre = crasse.
  for (let k = -half; k <= half; k += 1) {
    if (random() < 0.45) continue;
    const z = k * width + (random() - 0.5) * 0.7;
    const x = rows[0]!.head + 1.5 + random() * 1.4;
    const r = (0.25 + random() * 0.5) * pixelsPerMeter;
    const g = c.createRadialGradient(toX(x), toY(z), 0, toX(x), toY(z), r);
    g.addColorStop(0, 'rgba(6,5,5,0.62)');
    g.addColorStop(1, 'rgba(6,5,5,0)');
    c.fillStyle = g;
    c.fillRect(toX(x) - r, toY(z) - r, r * 2, r * 2);
  }

  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** Flaques de lumière des candélabres, dans un canal séparé : elles éclairent, elles ne se peignent pas. */
function lampPoolTexture(options: PlaceOptions, pixelsPerMeter: number) {
  const [w, h] = options.size;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * pixelsPerMeter);
  canvas.height = Math.round(h * pixelsPerMeter);
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.fillStyle = '#000';
  c.fillRect(0, 0, canvas.width, canvas.height);
  for (const [x, z] of options.lamps) {
    const cx = (x + w / 2) * pixelsPerMeter;
    const cy = (z + h / 2) * pixelsPerMeter;
    const r = 9 * pixelsPerMeter;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,235,190,1)');
    g.addColorStop(0.25, 'rgba(255,214,140,0.5)');
    g.addColorStop(0.6, 'rgba(255,200,120,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}

const placeVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * L'enrobé de la place, dans la lumière du monde : le ciel s'y reflète, plus nettement dans les flaques ; les lignes
 * jaunes prennent la lumière des candélabres ; les bords se fondent dans le sol pour qu'aucune découpe ne trahisse la
 * dalle.
 */
const placeFragment = /* glsl */ `
  ${SKY_GLSL}
  ${GROUND_GLSL}
  uniform sampler2D uAlbedo;
  uniform sampler2D uArm;
  uniform sampler2D uNormalMap;
  uniform sampler2D uLines;
  uniform sampler2D uPool;
  uniform vec2 uTexScale;
  uniform float uPlace;
  uniform float uLamp;
  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    vec2 tex = vUv * uTexScale;
    vec3 asphalt = texture2D(uAlbedo, tex).rgb;
    vec3 arm = texture2D(uArm, tex).rgb;
    vec4 lines = texture2D(uLines, vUv);
    float pool = texture2D(uPool, vUv).r * uLamp;
    float near = exp(-t * 0.02);
    // Flaques : le relevé photographique décide où l'eau dort (zones lisses).
    float wet = clamp(1.0 - smoothstep(0.45, 0.9, arm.g), 0.0, 1.0);
    vec2 ripple = vec2(texture2D(uNoise, vWorld.xz * 0.33 + 0.13).r, texture2D(uNoise, vWorld.xz * 0.12 + 0.71).r) - 0.5;
    vec2 bump = (texture2D(uNormalMap, tex).xy - 0.5) * 2.0 * (1.0 - wet) * near * 0.3;
    float rough = mix(0.5, 0.03, wet) * mix(0.3, 1.0, near);
    vec3 N = normalize(vec3(ripple.x * rough + bump.x, 1.0, ripple.y * rough + bump.y));
    vec3 R = reflect(V, N);
    R.y = abs(R.y);
    float fresnel = mix(0.02, 0.2, wet) + 0.9 * pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 5.0);
    vec3 reflection = skyLod(R, mix(3.2, 0.3, wet)) * uLight * min(fresnel, 0.6) * mix(0.25, 1.0, wet);
    // L'enrobé sous la nuit : presque noir. Sous un candélabre : une vraie flaque de lumière chaude.
    vec3 lamp = vec3(1.0, 0.86, 0.6) * pool;
    vec3 base = asphalt * arm.r * (0.22 + 3.4 * pool);
    // La peinture jaune brille sous la lampe ; la crasse (le sombre du calque) mange l'enrobé au lieu de l'éclairer.
    vec3 paint = lines.rgb * (0.4 + 4.2 * pool);
    vec3 col = mix(base, paint, lines.a * 0.92) + reflection + lamp * 0.16;
    // Bords fondus : la dalle n'a pas de contour visible, elle devient le sol du monde.
    vec2 edge = smoothstep(vec2(0.0), vec2(0.06), vUv) * smoothstep(vec2(1.0), vec2(0.94), vUv);
    float alpha = edge.x * edge.y * uPlace;
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const propVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vLocal;
  void main() {
    vec4 local = vec4(position, 1.0);
    vec3 nrm = normal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      nrm = mat3(instanceMatrix) * nrm;
    #endif
    vLocal = position;
    vec4 world = modelMatrix * local;
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * nrm);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * LA MATIÈRE DES OBJETS de la place (mur, bordure, mâts, butoirs, bornes).
 *
 * Tout ce qui est en volume ici est éclairé par les candélabres, et par rien d'autre : une face tournée vers une
 * lampe est chaude, la face opposée tombe dans la nuit. C'est ce contraste — et non une lumière ambiante — qui donne
 * du relief. Sans lui, le mur serait un rectangle gris et le lieu resterait une maquette.
 */
const propFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform sampler2D uNoise;
  uniform float uLight;
  uniform float uFog;
  uniform float uPlace;
  uniform float uLamp;
  uniform vec3 uLampPos[${MAX_LAMPS}];
  uniform int uLampCount;
  uniform vec3 uTint;
  uniform float uGrime;
  uniform float uSpec;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vLocal;

  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    vec3 N = normalize(vNormalW);
    // Le béton est sale en bas : la pluie y dépose tout ce qu'elle lave, et laisse des coulures verticales. Un mur
    // propre et uni du sol au sommet est un mur de maquette — c'est cette variation-là qui le rend crédible.
    float grime = mix(1.0, smoothstep(0.0, 2.2, vWorld.y) * 0.72 + 0.28, uGrime);
    float streak = texture2D(uNoise, vec2(vWorld.z * 0.085 + vWorld.x * 0.02, vWorld.y * 0.015)).r;
    vec3 albedo = uTint * grime * mix(1.0, 0.68 + 0.62 * streak, uGrime);
    // Nuit : un peu de ciel sur les faces tournées vers le haut, rien de plus.
    vec3 col = albedo * skyLod(N, 5.0) * uLight * (0.5 + 0.9 * max(N.y, 0.0));
    for (int i = 0; i < ${MAX_LAMPS}; i++) {
      if (i >= uLampCount) break;
      vec3 L = uLampPos[i] - vWorld;
      float d = length(L);
      L /= d;
      // Décroissance douce : une lampe de rue éclaire large, on ne cherche pas la physique mais la lisibilité.
      float att = 1.0 / (1.0 + d * d * 0.028);
      // UN CANDÉLABRE ÉCLAIRE VERS LE BAS. Sans ce cône, la lumière montait aussi fort jusqu'en haut du mur et la
      // façade devenait une plaque crème uniforme : plus aucune ombre, donc plus aucun relief dans le plan.
      // Le vecteur L va de la surface VERS la lampe : son composant vertical est donc déjà le cosinus de l'angle
      // avec l'axe descendant du luminaire. (Pris en négatif, les candélabres éclairaient le ciel : le mur
      // restait entièrement noir.)
      float spot = smoothstep(0.02, 0.55, L.y);
      float ndl = max(dot(N, L), 0.0);
      float spec = pow(max(dot(reflect(V, N), L), 0.0), 28.0) * uSpec;
      col += albedo * vec3(1.0, 0.82, 0.55) * ndl * att * spot * uLamp * 4.2;
      col += vec3(1.0, 0.88, 0.66) * spec * att * spot * uLamp * 3.0;
    }
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * uPlace, uPlace);
  }
`;

/**
 * LE CÔNE DE LUMIÈRE d'un candélabre. Une nuit sans air est une nuit fausse : ce qu'on voit d'un lampadaire, ce n'est
 * pas seulement sa flaque au sol, c'est le volume de brume qu'il traverse. Cône ouvert, additif, sans écriture de
 * profondeur : dense sous la lampe, éteint au sol, et effacé sur la silhouette pour qu'aucune arête ne se voie.
 */
const coneFragment = /* glsl */ `
  uniform float uLamp;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vLocal;
  void main() {
    vec3 V = normalize(vWorld - cameraPosition);
    float rim = 1.0 - abs(dot(normalize(vNormalW), V));
    // vLocal.y va de +h/2 (sous la lampe) à -h/2 (au sol) : la brume s'éteint en descendant.
    float fall = smoothstep(-0.5, 0.5, vLocal.y);
    float a = pow(fall, 1.7) * (1.0 - pow(rim, 1.6)) * uLamp * 0.16;
    gl_FragColor = vec4(vec3(1.0, 0.84, 0.58) * a, 1.0);
  }
`;

export function createPlaceLayer(options: PlaceOptions) {
  const root = new Group();
  root.name = 'place';
  const textures: Texture[] = [];
  const geometries: BufferGeometry[] = [];
  const materials: ShaderMaterial[] = [];
  const pixelsPerMeter = 26;
  const lines = markingsTexture(options, pixelsPerMeter);
  const pool = lampPoolTexture(options, pixelsPerMeter);
  textures.push(lines, pool);

  const uniforms = {
    ...options.night,
    uAlbedo: { value: null as Texture | null },
    uArm: { value: null as Texture | null },
    uNormalMap: { value: null as Texture | null },
    uLines: { value: lines },
    uPool: { value: pool },
    uTexScale: { value: new Vector2(options.size[0] / 3, options.size[1] / 3) },
    uPlace: { value: 0 },
    uLamp: { value: 0 },
  };
  const slab = new Mesh(
    new PlaneGeometry(options.size[0], options.size[1]),
    new ShaderMaterial({ uniforms, vertexShader: placeVertex, fragmentShader: placeFragment, transparent: true, depthWrite: false, premultipliedAlpha: true }),
  );
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = 0.006;
  slab.renderOrder = 1;
  root.add(slab);

  // — Où sont les ampoules, en coordonnées du monde : c'est ce que les objets consultent pour s'éclairer.
  const lampPositions = options.lamps.map(([x, z]) => new Vector3(x + 1.0, options.lampHeight - 0.25, z));
  while (lampPositions.length < MAX_LAMPS) lampPositions.push(new Vector3(0, -1000, 0));

  /** Une matière d'objet : même nuanceur, une teinte et une brillance par famille. */
  const prop = (tint: [number, number, number], grime: number, spec: number) => {
    const material = new ShaderMaterial({
      uniforms: {
        ...options.night,
        uPlace: uniforms.uPlace,
        uLamp: uniforms.uLamp,
        uLampPos: { value: lampPositions },
        uLampCount: { value: Math.min(options.lamps.length, MAX_LAMPS) },
        uTint: { value: new Vector3(...tint) },
        uGrime: { value: grime },
        uSpec: { value: spec },
      },
      vertexShader: propVertex,
      fragmentShader: propFragment,
      transparent: true,
    });
    materials.push(material);
    return material;
  };

  const concrete = prop([0.19, 0.19, 0.20], 1, 0.15);
  const kerbStone = prop([0.225, 0.220, 0.205], 1, 0.3);
  const metal = prop([0.085, 0.09, 0.10], 0, 1.4);
  const painted = prop([0.44, 0.35, 0.08], 0.4, 0.9);

  /** Ajoute un objet unique et retient sa géométrie pour la libération. */
  const add = (geometry: BufferGeometry, material: ShaderMaterial, x: number, y: number, z: number) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    geometries.push(geometry);
    root.add(mesh);
    return mesh;
  };

  /** Ajoute N exemplaires d'un même objet en UN SEUL appel de dessin. */
  const repeat = (geometry: BufferGeometry, material: ShaderMaterial, places: readonly (readonly [number, number, number])[]) => {
    const mesh = new InstancedMesh(geometry, material, places.length);
    const matrix = new Matrix4();
    places.forEach(([x, y, z], i) => {
      matrix.makeTranslation(x, y, z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    geometries.push(geometry);
    root.add(mesh);
    return mesh;
  };

  // — LE MUR D'ENCEINTE, derrière la rangée où le véhicule est garé. C'est le fond de tous les plans du nettoyage :
  // sans lui, la voiture se découpe sur du vide et le lieu n'existe pas.
  const { at: wallX, height: wallH, length: wallL } = options.wall;
  add(new BoxGeometry(0.34, wallH, wallL), concrete, wallX, wallH / 2, 0);
  // Couronnement : l'arête qui accroche la lumière et donne l'épaisseur.
  add(new BoxGeometry(0.52, 0.13, wallL), kerbStone, wallX, wallH + 0.065, 0);
  // Pilastres : un mur plat est une surface, un mur rythmé est une construction.
  const pilasters: [number, number, number][] = [];
  for (let z = -wallL / 2 + 2.2; z <= wallL / 2 - 2.2; z += 4.4) pilasters.push([wallX + 0.16, wallH / 2, z]);
  repeat(new BoxGeometry(0.28, wallH, 0.56), concrete, pilasters);

  // — Bordure : la limite du stationnement, et l'arête qui sépare l'enrobé du pied du mur.
  add(new BoxGeometry(0.4, 0.15, wallL * 0.92), kerbStone, -options.bay.length / 2 - 0.5, 0.075, 0);

  // — Butoirs de roue : un par place. C'est l'objet qui dit « on se gare ICI », et il donne l'échelle au premier plan.
  const { width, length, count } = options.bay;
  const half = Math.floor(count / 2);
  const stops: [number, number, number][] = [];
  for (let k = -half; k <= half; k += 1) stops.push([-length / 2 + 1.05, 0.065, k * width]);
  repeat(new BoxGeometry(0.2, 0.13, 1.65), kerbStone, stops);

  // — Bornes le long de l'allée : le premier plan qui manque aux plans bas.
  const bollards: [number, number, number][] = [];
  for (let z = -13; z <= 13; z += 3.6) bollards.push([length / 2 + 1.4, 0.48, z]);
  repeat(new CylinderGeometry(0.085, 0.105, 0.96, 8), painted, bollards);

  // — Grille d'égout et regard : deux objets minuscules, mais ce sont eux qu'on cherche du regard quand on doute.
  add(new BoxGeometry(0.62, 0.05, 0.82), metal, length / 2 + 0.3, 0.025, -2.4);
  add(new CylinderGeometry(0.34, 0.34, 0.04, 12), metal, length / 2 + 2.6, 0.02, 4.1);

  // — Panneau de stationnement : un mât, une plaque. Aucun texte de marque — un panneau public, la nuit.
  add(new CylinderGeometry(0.035, 0.035, 2.3, 6), metal, length / 2 + 1.5, 1.15, -8.4);
  add(new BoxGeometry(0.04, 0.46, 0.34), painted, length / 2 + 1.5, 2.28, -8.4);

  // — Candélabres : mât, crosse, luminaire, cône de lumière, et le halo de l'ampoule.
  const poles: [number, number, number][] = [];
  const arms: [number, number, number][] = [];
  const heads: [number, number, number][] = [];
  const cones: [number, number, number][] = [];
  const coneHeight = options.lampHeight - 0.45;
  for (const [x, z] of options.lamps) {
    poles.push([x, options.lampHeight / 2, z]);
    arms.push([x + 0.5, options.lampHeight - 0.1, z]);
    heads.push([x + 1.0, options.lampHeight - 0.24, z]);
    cones.push([x + 1.0, options.lampHeight - 0.3 - coneHeight / 2, z]);
  }
  repeat(new CylinderGeometry(0.07, 0.115, options.lampHeight, 8), metal, poles);
  repeat(new BoxGeometry(1.1, 0.085, 0.085), metal, arms);
  repeat(new BoxGeometry(0.62, 0.13, 0.3), metal, heads);
  const coneMaterial = new ShaderMaterial({
    uniforms: { uLamp: uniforms.uLamp },
    vertexShader: propVertex,
    fragmentShader: coneFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  materials.push(coneMaterial);
  const coneMesh = repeat(new ConeGeometry(4.3, coneHeight, 14, 1, true), coneMaterial, cones);
  coneMesh.renderOrder = 3;

  // Le halo de l'ampoule elle-même : ce qui reste quand on regarde la lampe en face.
  const glow = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d') as CanvasRenderingContext2D;
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,242,214,1)');
    g.addColorStop(0.18, 'rgba(255,214,140,0.6)');
    g.addColorStop(0.55, 'rgba(255,190,110,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    const texture = new CanvasTexture(canvas);
    textures.push(texture);
    return texture;
  })();
  const lampSprites: Sprite[] = [];
  for (const [x, z] of options.lamps) {
    const head = new Sprite(new SpriteMaterial({ map: glow, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    head.position.set(x + 1.0, options.lampHeight - 0.3, z);
    head.scale.setScalar(2.6);
    head.renderOrder = 4;
    lampSprites.push(head);
    root.add(head);
  }

  const last = { place: -1, lamp: -1 };
  const layer: WebGLLayer = {
    id: 'place',
    root,
    async init(ctx: StageContext) {
      // Même enrobé que la route : le relevé est déjà publié, il n'y a rien à télécharger de plus.
      void Promise.all(
        ([
          ['uAlbedo', options.asphalt.albedo],
          ['uArm', options.asphalt.arm],
          ['uNormalMap', options.asphalt.normal],
        ] as const).map(async ([key, url]) => {
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${response.status} ${url}`);
            const texture = new Texture(await createImageBitmap(await response.blob()));
            texture.wrapS = texture.wrapT = RepeatWrapping;
            texture.generateMipmaps = true;
            texture.minFilter = LinearMipmapLinearFilter;
            texture.anisotropy = 8;
            texture.needsUpdate = true;
            textures.push(texture);
            uniforms[key].value = texture;
            ctx.invalidate();
          } catch (error) {
            console.warn('[place] matière', (error as Error).message);
          }
        }),
      );
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const place = state.channels.place ?? 0;
      const lamp = state.channels.placeLamp ?? place;
      if (place === last.place && lamp === last.lamp) return false;
      last.place = place;
      last.lamp = lamp;
      uniforms.uPlace.value = place;
      uniforms.uLamp.value = lamp;
      root.visible = place > 0.002;
      for (const sprite of lampSprites) (sprite.material as SpriteMaterial).opacity = lamp;
      return true;
    },
    dispose() {
      for (const texture of textures) texture.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
  return layer;
}
