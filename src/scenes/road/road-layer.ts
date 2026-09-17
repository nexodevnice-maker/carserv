import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  FogExp2,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Texture,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import type { SharedNight } from '../map/map-layer';
import { GROUND_GLSL, SKY_GLSL } from '../shared/night-glsl';
import { FOG_DENSITY } from '../sky/sky-layer';

/**
 * Couche « route » : la location comme mobilité. Une route mouillée dans la nuit, la durée peinte sur la chaussée
 * comme un marquage (1 JOUR, 7 JOURS, 15 JOURS — libellés du flyer), et devant la caméra un véhicule réduit à ses
 * feux arrière (optique rouge, halo, et leur reflet étiré sur la chaussée mouillée).
 * La chaussée partage la lumière du monde (shared/night-glsl) : elle reflète le ciel étalonné, plus nettement là où
 * elle est mouillée. Elle est posée sur le sol mouillé de l'univers (bords
 * fondus, même brouillard) : on la voit depuis le ciel pendant le piqué, elle s'allume en arrivant (`roadLight`), les
 * feux battent avant de tenir — une ampoule qui s'amorce, fonction de la progression.
 * Aucune voiture 3D : aucune image réelle du véhicule loué n'existe.
 * Repère local : la route part de x = 0 vers +x ; `placement` la pose dans le monde (origine, cap). Vue du ciel, un
 * tracé rouge se dessine le long de la voie (`roadTrail` : longueur tracée et intensité) — la route de la location
 * traverse le 06 vers la Voie lactée.
 */
export const ROAD = {
  start: 0,
  length: 420,
  center: -3.4,
  halfWidth: 6.8,
  lane: -1.7,
  /** Marquages de durée (x du centre). */
  markings: [
    { x: 100, label: '1 JOUR' },
    { x: 200, label: '7 JOURS' },
    { x: 300, label: '15 JOURS' },
  ],
};

const TILE = 63; // mètres de chaussée par répétition de texture (7 tirets de 9 m : aucun raccord visible, motif long vu du ciel)

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Asphalte (couleur + marquages) et rugosité (flaques) sur une tuile, générés une fois. */
function roadTextures(): { map: CanvasTexture; roughness: CanvasTexture } {
  const w = 1024;
  const h = 512;
  const width = ROAD.halfWidth * 2 + 2;
  const zToY = (z: number) => ((z - (ROAD.center - width / 2)) / width) * h;
  const random = seeded(7);

  const color = document.createElement('canvas');
  color.width = w;
  color.height = h;
  const c = color.getContext('2d') as CanvasRenderingContext2D;
  c.fillStyle = '#17181b';
  c.fillRect(0, 0, w, h);
  for (let k = 0; k < 26000; k++) {
    const v = 14 + Math.floor(random() * 22);
    c.fillStyle = `rgb(${v},${v},${v + 2})`;
    c.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
  }
  // Marquages : axe en tirets, lignes de rive.
  c.fillStyle = 'rgba(214,214,206,0.82)';
  const dash = (x0: number, len: number, z: number, thick: number) => c.fillRect((x0 / TILE) * w, zToY(z) - thick / 2, (len / TILE) * w, thick);
  for (let x = 0; x < TILE; x += 9) dash(x, 4, ROAD.center, 7);
  dash(0, TILE, ROAD.center - ROAD.halfWidth + 0.3, 8);
  dash(0, TILE, ROAD.center + ROAD.halfWidth - 0.3, 8);

  const rough = document.createElement('canvas');
  rough.width = w;
  rough.height = h;
  const r = rough.getContext('2d') as CanvasRenderingContext2D;
  r.fillStyle = 'rgb(150,150,150)';
  r.fillRect(0, 0, w, h);
  // Flaques et traces d'eau : zones lisses (rugosité basse) qui renvoient ciel et feux.
  for (let k = 0; k < 220; k++) {
    const x = random() * w;
    const y = random() * h;
    const rx = 40 + random() * 220;
    const ry = 10 + random() * 60;
    const g = r.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(30,30,30,0.9)');
    g.addColorStop(1, 'rgba(30,30,30,0)');
    r.fillStyle = g;
    r.save();
    r.translate(x, y);
    r.scale(1, ry / rx);
    r.translate(-x, -y);
    r.beginPath();
    r.arc(x, y, rx, 0, Math.PI * 2);
    r.fill();
    r.restore();
  }
  const map = new CanvasTexture(color);
  map.colorSpace = SRGBColorSpace;
  const roughness = new CanvasTexture(rough);
  for (const t of [map, roughness]) {
    t.wrapS = RepeatWrapping;
    t.repeat.set(ROAD.length / TILE, 1);
    t.anisotropy = 8;
  }
  return { map, roughness };
}

/** Bords de chaussée fondus dans le sol mouillé (canal alpha, dans la largeur). */
function edgeTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#000');
  g.addColorStop(0.06, '#fff');
  g.addColorStop(0.94, '#fff');
  g.addColorStop(1, '#000');
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 256);
  return new CanvasTexture(canvas);
}

/** Amorçage déterministe des feux : quelques battements avant de tenir (0 → 1). */
function ignite(light: number) {
  if (light <= 0 || light >= 1) return light;
  const beat = Math.sin(light * 61.7) * Math.sin(light * 23.3);
  return light < 0.8 && beat < -0.18 ? light * 0.12 : light;
}

/** Durée peinte au sol, lettres étirées dans le sens de la marche (comme un marquage routier). */
function markingTexture(label: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.fillStyle = 'rgba(226,224,214,0.9)';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const [number, unit] = label.split(' ');
  c.save();
  c.translate(256, 420);
  c.scale(1, 2.4);
  c.font = '700 150px "Barlow Condensed", "Arial Narrow", sans-serif';
  c.fillText(number ?? '', 0, 0);
  c.restore();
  c.save();
  c.translate(256, 800);
  c.scale(1, 2.1);
  c.font = '600 64px "Barlow Condensed", "Arial Narrow", sans-serif';
  c.fillText(unit ?? '', 0, 0);
  c.restore();
  // Usure de la peinture.
  const random = seeded(label.length * 31);
  c.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 900; k++) {
    c.fillStyle = `rgba(0,0,0,${0.2 + random() * 0.5})`;
    c.fillRect(random() * 512, random() * 1024, 1 + random() * 4, 1 + random() * 3);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function haloTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,90,80,1)');
  g.addColorStop(0.12, 'rgba(255,40,30,0.55)');
  g.addColorStop(0.45, 'rgba(200,10,10,0.12)');
  g.addColorStop(1, 'rgba(120,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

const trailVertex = /* glsl */ `
  uniform float uWidth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position.x, 0.0, 0.0, 1.0);
    vec3 across = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    // Largeur apparente bornée : un filet de lumière encore lisible depuis le ciel.
    float width = max(uWidth, length(world.xyz - cameraPosition) * 0.006);
    world.xyz += across * position.z * width;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const trailFragment = /* glsl */ `
  uniform float uDraw;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.y - 0.5) * 2.0;
    float core = exp(-across * across * 18.0) + exp(-across * across * 3.0) * 0.3;
    // Tête du tracé plus vive, qui avance avec la progression.
    float drawn = smoothstep(uDraw, uDraw - 0.01, vUv.x);
    float head = exp(-pow((vUv.x - uDraw) / 0.012, 2.0)) * step(0.001, uDraw) * (1.0 - step(0.999, uDraw));
    vec3 col = vec3(1.0, 0.16, 0.1) * core * (drawn * 1.3 + head * 3.0) * uIntensity;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const roadVertex = /* glsl */ `
  uniform float uRepeat;
  varying vec2 vUv;
  varying vec2 vTile;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vTile = vec2(uv.x * uRepeat, uv.y);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * Chaussée dans la même lumière que le reste du monde (shared/night-glsl) : ciel étalonné en reflet, flou selon la
 * rugosité peinte (flaques lisses, asphalte rugueux), marquages éclairés par la nuit, et les feux arrière reflétés en
 * traînées verticales comme sur une route mouillée (reflet anisotrope : serré en azimut, étiré en hauteur). Aucune
 * lumière dynamique : rien à recompiler quand les feux s'allument, et un coût fixe au téléphone.
 */
const roadFragment = /* glsl */ `
  ${SKY_GLSL}
  ${GROUND_GLSL}
  uniform sampler2D uMap;
  uniform sampler2D uRough;
  uniform float uRoad;
  uniform float uLamp;
  uniform vec3 uTailA;
  uniform vec3 uTailB;
  varying vec2 vUv;
  varying vec2 vTile;
  varying vec3 vWorld;

  float streak(vec3 R, vec3 light, float wet, float spread) {
    vec3 toLight = light - vWorld;
    float dist = length(toLight);
    vec3 L = toLight / dist;
    float az = max(dot(normalize(R.xz), normalize(L.xz)), 0.0);
    float along = exp(-pow((R.y - L.y) / spread, 2.0));
    return pow(az, mix(2500.0, 9000.0, wet)) * along * (0.25 + wet) / (1.0 + dist * dist * 0.004);
  }

  void main() {
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    vec3 albedo = texture2D(uMap, vTile).rgb;
    float wet = 1.0 - smoothstep(0.2, 0.5, texture2D(uRough, vTile).r);
    float near = exp(-t * 0.015);
    vec2 ripple = vec2(texture2D(uNoise, vWorld.xz * 0.31 + 0.13).r, texture2D(uNoise, vWorld.xz * 0.12 + 0.71).r) - 0.5;
    float rough = mix(0.5, 0.04, wet) * mix(0.3, 1.0, near);
    vec3 N = normalize(vec3(ripple.x * rough, 1.0, ripple.y * rough));
    vec3 R = reflect(V, N);
    R.y = abs(R.y);
    float fresnel = mix(0.03, 0.2, wet) + 0.97 * pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 5.0);
    vec3 reflection = skyLod(R, mix(3.5, 0.4, wet)) * uLight * min(fresnel, 0.8) * mix(0.25, 0.75, wet);
    // Asphalte et peinture sous la nuit : la peinture blanche reste lisible, l'asphalte presque noir.
    vec3 col = albedo * albedo * 0.55 * uRoad + reflection * uRoad;
    // Feux arrière reflétés : traînées rouges vers la caméra, plus nettes dans l'eau.
    float spread = mix(0.3, 0.1, wet);
    col += vec3(1.0, 0.1, 0.06) * uLamp * 1.2 * (streak(R, uTailA, wet, spread) + streak(R, uTailB, wet, spread));
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    float edge = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    float alpha = edge * min(1.0, uRoad * 1.6);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

export function createRoadLayer(options: { placement: { origin: readonly [number, number]; heading: number }; night: SharedNight }) {
  const root = new Group();
  root.name = 'road';
  const { origin, heading } = options.placement;
  // Local +x → cap dans le monde (azimut = atan2(z, x)).
  const frame = new Group();
  frame.rotation.y = -heading;
  frame.position.set(origin[0], 0, origin[1]);
  root.add(frame);
  const along = [Math.cos(heading), Math.sin(heading)] as const;
  const textures: Texture[] = [];

  const roadUniforms = {
    ...options.night,
    uMap: { value: null as Texture | null },
    uRough: { value: null as Texture | null },
    uRepeat: { value: ROAD.length / TILE },
    uRoad: { value: 0 },
    uLamp: { value: 0 },
    uTailA: { value: new Vector3() },
    uTailB: { value: new Vector3() },
  };
  const roadMaterial = new ShaderMaterial({
    uniforms: roadUniforms,
    vertexShader: roadVertex,
    fragmentShader: roadFragment,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });
  const road = new Mesh(new PlaneGeometry(ROAD.length, ROAD.halfWidth * 2 + 2), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(ROAD.start + ROAD.length / 2, 0.005, ROAD.center);
  road.renderOrder = 1;
  frame.add(road);

  const trailUniforms = { uDraw: { value: 0 }, uIntensity: { value: 0 }, uWidth: { value: 0.35 } };
  const trailGeometry = new PlaneGeometry(ROAD.length, 1, 64, 1);
  trailGeometry.rotateX(-Math.PI / 2);
  trailGeometry.translate(ROAD.start + ROAD.length / 2, 0, 0);
  const trail = new Mesh(
    trailGeometry,
    new ShaderMaterial({ uniforms: trailUniforms, vertexShader: trailVertex, fragmentShader: trailFragment, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  trail.position.set(0, 0.03, ROAD.center);
  trail.renderOrder = 3;
  trail.frustumCulled = false;
  frame.add(trail);

  const markingMaterials: MeshBasicMaterial[] = [];
  // Repère : u (largeur des lettres) vers +z (droite du conducteur), v (haut des lettres) vers +x (le lointain).
  const basis = new Matrix4().makeBasis(new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0));

  // Feux arrière : optiques et halos ; leur reflet est calculé par la chaussée.
  const tail = new Group();
  const lensMaterial = new MeshBasicMaterial({ color: 0xff2a1f, toneMapped: false });
  const lensGeometry = new BoxGeometry(0.05, 0.07, 0.26);
  const halo = haloTexture();
  textures.push(halo);
  const lenses: Mesh[] = [];
  for (const side of [-1, 1]) {
    const lens = new Mesh(lensGeometry, lensMaterial);
    lens.position.set(0, 0.86, side * 0.66);
    const glow = new Sprite(new SpriteMaterial({ map: halo, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.copy(lens.position);
    glow.scale.setScalar(0.9);
    lenses.push(lens);
    tail.add(lens, glow);
  }
  frame.add(tail);

  const last = { light: -1, tailX: NaN, fog: NaN, draw: -1, trail: -1 };
  const world = new Vector3();

  const layer: WebGLLayer = {
    id: 'road',
    root,
    async init(ctx: StageContext) {
      // Couleur : la brume d'horizon moyenne de la nuit étalonnée (le lointain s'y fond comme le sol).
      ctx.scene.fog = new FogExp2(0x0a0d13, FOG_DENSITY);
      frame.updateMatrixWorld(true);
      // Les marquages attendent la police (sinon dessinés dans la police de repli).
      await document.fonts?.load('700 150px "Barlow Condensed"').catch(() => undefined);
      const { map, roughness } = roadTextures();
      textures.push(map, roughness);
      roadUniforms.uMap.value = map;
      roadUniforms.uRough.value = roughness;
      for (const { x, label } of ROAD.markings) {
        const texture = markingTexture(label);
        textures.push(texture);
        const material = new MeshBasicMaterial({ map: texture, color: 0x8a8d92, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
        markingMaterials.push(material);
        const decal = new Mesh(new PlaneGeometry(4.2, 8.4), material);
        decal.quaternion.setFromRotationMatrix(basis);
        decal.position.set(x, 0.012, ROAD.lane);
        decal.renderOrder = 2;
        frame.add(decal);
      }
    },
    update(state: Readonly<ExperienceState>, ctx: StageContext): LayerUpdate {
      const light = state.channels.roadLight ?? 0;
      const lamp = ignite(light);
      const eye = state.camera?.position;
      // Position de la caméra le long de la route (repère local).
      const camX = eye ? (eye[0] - origin[0]) * along[0] + (eye[2] - origin[1]) * along[1] : 0;
      const tailX = Math.min(ROAD.start + ROAD.length - 20, Math.max(camX, ROAD.start) + (state.channels.tailDistance ?? 18));
      const fog = state.channels.fog ?? FOG_DENSITY;
      const draw = state.channels.roadDraw ?? 0;
      const trailLight = state.channels.roadTrail ?? 0;
      if (light === last.light && tailX === last.tailX && fog === last.fog && draw === last.draw && trailLight === last.trail) return false;
      Object.assign(last, { light, tailX, fog, draw, trail: trailLight });
      if (ctx.scene.fog instanceof FogExp2) ctx.scene.fog.density = fog;
      trailUniforms.uDraw.value = draw;
      trailUniforms.uIntensity.value = trailLight;
      trail.visible = trailLight > 0.001 && draw > 0.001;
      road.visible = light > 0.001;
      roadUniforms.uRoad.value = light;
      roadUniforms.uLamp.value = lamp;
      for (const material of markingMaterials) material.opacity = 0.9 * Math.max(0, light * 1.4 - 0.4);
      tail.position.set(tailX, 0, ROAD.lane);
      tail.updateMatrixWorld(true);
      roadUniforms.uTailA.value.copy(lenses[0]!.getWorldPosition(world));
      roadUniforms.uTailB.value.copy(lenses[1]!.getWorldPosition(world));
      lensMaterial.color.setRGB(1 * lamp, 0.16 * lamp, 0.12 * lamp);
      for (const child of tail.children) if ((child as Sprite).isSprite) ((child as Sprite).material as SpriteMaterial).opacity = lamp;
      return true;
    },
    dispose() {
      for (const texture of textures) texture.dispose();
    },
  };
  return layer;
}
