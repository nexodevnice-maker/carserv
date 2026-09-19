import { BackSide, CylinderGeometry, Group, LinearFilter, Mesh, MirroredRepeatWrapping, ShaderMaterial, Texture } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';
import { SKY_GLSL, type SharedNight } from '../shared/night-glsl';

/**
 * LA LIGNE D'HORIZON — la ville, au loin, derrière le mur du parking.
 *
 * Ce n'est pas un décor à traverser : c'est un FOND. À un kilomètre, une ville n'a plus de volume — elle n'a plus
 * qu'une silhouette et des lumières. Une photographie posée sur une portion de cylindre en dit donc infiniment plus
 * que des centaines de boîtes, et coûte un seul appel de dessin.
 *
 * Trois précautions, sans lesquelles une image plaquée se voit immédiatement :
 * - le HAUT se fond dans le ciel : sinon on voit le bord de l'image, et la Voie lactée s'arrête net sur une arête ;
 * - le BAS se fond dans le sol : une ville doit se poser sur l'horizon, pas s'y coller ;
 * - la BRUME du monde s'applique comme sur tout le reste, et la lumière suit le canal `world` : à l'arrivée elle
 *   s'allume avec le reste du décor, elle n'est pas là avant.
 */
export interface SkylineOptions {
  night: SharedNight;
  /** Images publiées (2048 px sur grand écran, 1024 au téléphone). */
  url: string;
  /** Rayon du cylindre (m) et hauteur de la bande (m). */
  radius: number;
  height: number;
  /** Azimut du centre de la bande (rad) et ouverture angulaire (rad). */
  heading: number;
  spread: number;
  /** Nombre de copies de l'image sur l'ouverture. Miroir une fois sur deux : aucune couture, aucune répétition lisible. */
  repeat: number;
  /** Élévation du bas de la bande (m) : la ville se pose un peu sous l'horizon. */
  base: number;
  chapters?: readonly string[];
}

const skylineVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const skylineFragment = /* glsl */ `
  ${SKY_GLSL}
  uniform sampler2D uPhoto;
  uniform float uLight;
  uniform float uFog;
  uniform float uSkyline;
  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vec4 photo = texture2D(uPhoto, vUv);
    vec3 ray = vWorld - cameraPosition;
    float t = length(ray);
    vec3 V = ray / t;
    // Nuit : on garde les LUMIÈRES de la ville et on éteint le reste. Une photographie de crépuscule posée telle
    // quelle éclaire plus que la lune et trahit le montage — ce sont ses points lumineux qui nous intéressent.
    float lum = dot(photo.rgb, vec3(0.3, 0.59, 0.11));
    float lights = smoothstep(0.30, 0.84, lum);
    // La photographie est un crépuscule magenta ; le site est une nuit. On la désature fortement, on la refroidit,
    // et on ne rallume que ses points lumineux — en ambre, comme tout l'éclairage urbain du site.
    vec3 night = mix(vec3(lum) * vec3(0.72, 0.80, 1.0), photo.rgb, 0.34);
    vec3 col = night * 0.05 + mix(night, vec3(1.0, 0.82, 0.55), 0.45) * lights * 3.2;
    // Les fondus sont calés sur CE QUE CONTIENT l'image : la ville occupe sa bande médiane. On efface le ciel de la
    // photo (le nôtre est derrière, avec sa Voie lactée) et son premier plan d'eau, qui tomberait sous l'horizon.
    float top = 1.0 - smoothstep(0.58, 0.84, vUv.y);
    float bottom = smoothstep(0.22, 0.34, vUv.y);
    float alpha = top * bottom * uSkyline;
    // Même brume que le reste du monde.
    col = mix(haze(V) * uLight, col, exp(-pow(uFog * t, 2.0)));
    gl_FragColor = vec4(col * uLight * alpha, alpha);
  }
`;

export function createSkylineLayer(options: SkylineOptions) {
  const root = new Group();
  root.name = 'skyline';
  root.visible = false;
  const uniforms = {
    ...options.night,
    uPhoto: { value: null as Texture | null },
    uSkyline: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: skylineVertex,
    fragmentShader: skylineFragment,
    transparent: true,
    depthWrite: false,
    side: BackSide,
  });
  // Portion de cylindre : ouverte, sans fond, vue de l'intérieur.
  const geometry = new CylinderGeometry(options.radius, options.radius, options.height, 96, 1, true, -options.spread / 2, options.spread);
  const band = new Mesh(geometry, material);
  band.position.y = options.base + options.height / 2;
  band.rotation.y = options.heading;
  band.frustumCulled = false;
  band.renderOrder = -1;
  root.add(band);

  let stage: StageContext | null = null;
  let last = -1;

  const layer: WebGLLayer & { ensure(): Promise<void> } = {
    id: 'skyline',
    chapters: options.chapters,
    root,
    init(ctx: StageContext) {
      stage = ctx;
    },
    async ensure() {
      if (uniforms.uPhoto.value) return;
      try {
        const response = await fetch(options.url);
        if (!response.ok) throw new Error(`${response.status} ${options.url}`);
        const texture = new Texture(await createImageBitmap(await response.blob()));
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
        // Répétition EN MIROIR : la ville fait tout le tour sans couture visible et sans qu'on reconnaisse la même
        // tour deux fois de suite. C'est ce qui supprime définitivement le vide noir autour de la place.
        texture.wrapS = MirroredRepeatWrapping;
        texture.repeat.x = options.repeat;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        uniforms.uPhoto.value = texture;
        stage?.invalidate();
      } catch (error) {
        console.warn('[skyline]', (error as Error).message);
      }
    },
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const level = (state.channels.world ?? 0) * (state.channels.place ?? 0);
      root.visible = level > 0.002 && Boolean(uniforms.uPhoto.value);
      if (!root.visible || level === last) return false;
      last = level;
      uniforms.uSkyline.value = level;
      return true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      uniforms.uPhoto.value?.dispose();
    },
  };
  return layer;
}
