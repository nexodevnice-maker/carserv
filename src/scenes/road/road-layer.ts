import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Fog,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Texture,
} from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * Couche « route » : la location comme mobilité. Une route mouillée dans la nuit, la durée peinte sur la chaussée
 * comme un marquage (1 JOUR, 7 JOURS, 15 JOURS — libellés du flyer), et devant la caméra un véhicule réduit à ses
 * feux arrière : de vraies sources (optique rouge + halo + lumière qui éclaire la chaussée), jamais une lueur peinte.
 * La chaussée est un matériau physique : elle reflète le ciel de nuit du HDRI fourni (environnement pré-calculé) et
 * la lumière des feux, plus nettement là où elle est mouillée.
 * Aucune voiture 3D : aucune image réelle du véhicule loué n'existe.
 */
export const ROAD = {
  start: 6,
  length: 170,
  center: -3.4,
  halfWidth: 6.8,
  lane: -1.7,
  /** Marquages de durée (x du centre). */
  markings: [
    { x: 21, label: '1 JOUR' },
    { x: 39, label: '7 JOURS' },
    { x: 57, label: '15 JOURS' },
  ],
};

const TILE = 24; // mètres de chaussée par répétition de texture

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
  for (let k = 0; k < 90; k++) {
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

export function createRoadLayer(options: { chapters: readonly string[] }) {
  const root = new Group();
  root.name = 'road';
  const textures: Texture[] = [];
  const roadMaterial = new MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 1, envMapIntensity: 0.9 });
  const road = new Mesh(new PlaneGeometry(ROAD.length, ROAD.halfWidth * 2 + 2), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(ROAD.start + ROAD.length / 2, 0, ROAD.center);
  // Bas-côtés : un terrain presque noir de part et d'autre, pour que la chaussée ne flotte pas dans le vide.
  const vergeMaterial = new MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.95, metalness: 0 });
  const verge = new Mesh(new PlaneGeometry(ROAD.length + 60, 140), vergeMaterial);
  verge.rotation.x = -Math.PI / 2;
  verge.position.set(ROAD.start + ROAD.length / 2, -0.02, ROAD.center);
  root.add(verge, road);

  const markingMaterials: MeshStandardMaterial[] = [];
  // Repère : u (largeur des lettres) vers +z (droite du conducteur), v (haut des lettres) vers +x (le lointain).
  const basis = new Matrix4().makeBasis(new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0));

  // Feux arrière : optiques, halos et vraies lumières.
  const tail = new Group();
  const lensMaterial = new MeshBasicMaterial({ color: 0xff2a1f, toneMapped: false });
  const lensGeometry = new BoxGeometry(0.05, 0.07, 0.26);
  const halo = haloTexture();
  textures.push(halo);
  const lights: PointLight[] = [];
  for (const side of [-1, 1]) {
    const lens = new Mesh(lensGeometry, lensMaterial);
    lens.position.set(0, 0.86, side * 0.66);
    const glow = new Sprite(new SpriteMaterial({ map: halo, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.copy(lens.position);
    glow.scale.setScalar(0.9);
    const light = new PointLight(0xff2418, 4, 14, 2);
    light.position.set(-0.3, 0.8, side * 0.66);
    lights.push(light);
    tail.add(lens, glow, light);
  }
  root.add(tail);

  const last = { light: -1, tailX: NaN };

  const layer: WebGLLayer = {
    id: 'road',
    chapters: options.chapters,
    root,
    async init(ctx: StageContext) {
      // Brouillard de nuit : la route se perd dans le noir au lieu de s'arrêter net. Les matériaux de la preuve
      // (ShaderMaterial, fog: false) n'y sont pas soumis ; ils sont à moins de 20 m de la caméra.
      ctx.scene.fog = new Fog(0x050506, 22, 95);
      // Les marquages attendent la police (sinon dessinés dans la police de repli).
      await document.fonts?.load('700 150px "Barlow Condensed"').catch(() => undefined);
      const { map, roughness } = roadTextures();
      textures.push(map, roughness);
      roadMaterial.map = map;
      roadMaterial.roughnessMap = roughness;
      roadMaterial.needsUpdate = true;
      for (const { x, label } of ROAD.markings) {
        const texture = markingTexture(label);
        textures.push(texture);
        const material = new MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
        markingMaterials.push(material);
        const decal = new Mesh(new PlaneGeometry(4.2, 8.4), material);
        decal.quaternion.setFromRotationMatrix(basis);
        decal.position.set(x, 0.01, ROAD.lane);
        root.add(decal);
      }
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const light = state.channels.roadLight ?? 0;
      const camX = state.camera?.position[0] ?? 0;
      const tailX = camX + (state.channels.tailDistance ?? 18);
      if (light === last.light && tailX === last.tailX) return false;
      last.light = light;
      last.tailX = tailX;
      roadMaterial.color.setScalar(light);
      vergeMaterial.color.setScalar(0.043 * light);
      roadMaterial.envMapIntensity = 0.9 * light;
      for (const material of markingMaterials) material.opacity = 0.9 * light;
      tail.position.set(tailX, 0, ROAD.lane);
      // Jamais masqués : changer le nombre de lumières recompilerait les matériaux de la chaussée (à-coup).
      lensMaterial.color.setRGB(1 * light, 0.16 * light, 0.12 * light);
      for (const child of tail.children) if ((child as Sprite).isSprite) ((child as Sprite).material as SpriteMaterial).opacity = light;
      for (const l of lights) l.intensity = 4 * light;
      return true;
    },
    dispose() {
      for (const texture of textures) texture.dispose();
    },
  };
  return layer;
}
