import {
  CanvasTexture,
  CylinderGeometry,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector2,
  AdditiveBlending,
  BoxGeometry,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { GROUND_GLSL, SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LA PLACE — l'endroit où le véhicule est garé.
 *
 * Le nettoyage se fait CHEZ LE CLIENT : il fallait donc un vrai lieu, pas un objet posé sur un sol abstrait. Une aire
 * de stationnement de nuit, mouillée : l'enrobé relevé en photogrammétrie (le même que la route), des places peintes,
 * une bordure, un trottoir, et trois candélabres dont les flaques de lumière tombent sur le sol. Le véhicule est garé
 * dans une place, entre deux lignes — c'est ce détail qui fait qu'on croit au lieu.
 *
 * Charte : l'enrobé est noir, les lignes sont jaunes (le jaune des flyers), la lumière des candélabres est chaude
 * comme la balise. Rien n'évoque un local commercial : l'entreprise se déplace, elle n'a pas d'adresse connue
 * (BUSINESS_TRUTH) — c'est une place publique, la nuit.
 *
 * Coût : une dalle, une bordure, trois mâts, trois halos. Tout le reste (reflets, flaques, brume) vient du shader de
 * nuit partagé, donc la place réfléchit exactement le même ciel que le reste du monde.
 */
export interface PlaceOptions {
  night: SharedNight;
  /** Dimensions de l'aire (m). */
  size: readonly [number, number];
  /** Places de stationnement : largeur, longueur, et décalage en z de la place du véhicule. */
  bay: { width: number; length: number; count: number };
  /** Candélabres : positions (x, z) et hauteur. */
  lamps: readonly (readonly [number, number])[];
  lampHeight: number;
  /** Textures d'enrobé (mêmes relevés que la chaussée). */
  asphalt: { albedo: string; arm: string; normal: string };
}

/** Marquage au sol : places peintes, hachures, et les flaques de lumière des candélabres. Dessiné une seule fois. */
function markingsTexture(options: PlaceOptions, pixelsPerMeter: number) {
  const [w, h] = options.size;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * pixelsPerMeter);
  canvas.height = Math.round(h * pixelsPerMeter);
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const toX = (x: number) => (x + w / 2) * pixelsPerMeter;
  const toY = (z: number) => (z + h / 2) * pixelsPerMeter;
  c.clearRect(0, 0, canvas.width, canvas.height);

  // — Les places : une rangée où le véhicule est garé (sa place est centrée sur l'origine du monde, capot vers l'est),
  // l'allée devant lui, et une rangée qui lui fait face de l'autre côté. C'est le seul dessin qui compte : c'est lui
  // qui dit « il est garé », pas « il est posé là ».
  const { width, length, count } = options.bay;
  c.strokeStyle = 'rgba(253,199,39,0.9)';
  c.lineWidth = Math.max(2, 0.12 * pixelsPerMeter);
  c.lineCap = 'square';
  const half = Math.floor(count / 2);
  const rows = [
    { from: -length / 2, to: length / 2 },
    { from: length / 2 + 5.8, to: length * 1.5 + 5.8 },
  ];
  for (const row of rows) {
    for (let k = -half; k <= half + 1; k += 1) {
      const z = (k - 0.5) * width;
      c.beginPath();
      c.moveTo(toX(row.from), toY(z));
      c.lineTo(toX(row.to), toY(z));
      c.stroke();
    }
    // Ligne de fond de places.
    c.beginPath();
    c.moveTo(toX(row === rows[0] ? row.from : row.to), toY((-half - 0.5) * width));
    c.lineTo(toX(row === rows[0] ? row.from : row.to), toY((half + 1.5) * width));
    c.stroke();
  }

  // — Hachures d'interdiction au bout de l'allée (un vrai parking en a toujours).
  c.strokeStyle = 'rgba(253,199,39,0.5)';
  c.lineWidth = Math.max(2, 0.09 * pixelsPerMeter);
  for (let k = 0; k < 10; k += 1) {
    const x = 3.4 + k * 0.62;
    c.beginPath();
    c.moveTo(toX(x), toY(-half * width - 3.4));
    c.lineTo(toX(x + 1.2), toY(-half * width - 0.6));
    c.stroke();
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
    vec3 paint = lines.rgb * (0.4 + 4.2 * pool);
    vec3 col = mix(base, paint, lines.a * 0.92) + reflection + lamp * 0.16;
    // Bords fondus : la dalle n'a pas de contour visible, elle devient le sol du monde.
    vec2 edge = smoothstep(vec2(0.0), vec2(0.06), vUv) * smoothstep(vec2(1.0), vec2(0.94), vUv);
    float alpha = edge.x * edge.y * uPlace;
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const lampFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform float uPlace;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    // Mât et crosse : une silhouette sombre qui accroche un peu de ciel sur le dessus.
    vec3 col = vec3(0.016, 0.017, 0.02) + skyLod(vec3(0.0, 1.0, 0.0), 5.0) * 0.08;
    gl_FragColor = vec4(col * uPlace, uPlace);
  }
`;

export function createPlaceLayer(options: PlaceOptions) {
  const root = new Group();
  root.name = 'place';
  const textures: Texture[] = [];
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

  // — Bordure et trottoir : ce qui donne une limite au lieu (et une arête qui accroche la lumière).
  const kerbMaterial = new ShaderMaterial({
    uniforms: { ...options.night, uPlace: uniforms.uPlace },
    vertexShader: placeVertex,
    fragmentShader: lampFragment,
    transparent: true,
  });
  // La bordure court derrière la rangée où le véhicule est garé : elle ferme le lieu sans le barrer.
  const kerb = new Mesh(new BoxGeometry(0.4, 0.16, options.size[1] * 0.8), kerbMaterial);
  kerb.position.set(-options.bay.length / 2 - 0.5, 0.08, 0);
  root.add(kerb);

  // — Candélabres : mât, crosse, et la lampe elle-même (un halo additif, pas une lumière dynamique).
  const poleGeometry = new CylinderGeometry(0.07, 0.11, options.lampHeight, 6);
  const armGeometry = new BoxGeometry(1.1, 0.09, 0.09);
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
    const pole = new Mesh(poleGeometry, kerbMaterial);
    pole.position.set(x, options.lampHeight / 2, z);
    const arm = new Mesh(armGeometry, kerbMaterial);
    arm.position.set(x + 0.5, options.lampHeight - 0.15, z);
    const head = new Sprite(new SpriteMaterial({ map: glow, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    head.position.set(x + 1.0, options.lampHeight - 0.2, z);
    head.scale.setScalar(3.4);
    lampSprites.push(head);
    root.add(pole, arm, head);
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
      poleGeometry.dispose();
      armGeometry.dispose();
      kerbMaterial.dispose();
    },
  };
  return layer;
}
