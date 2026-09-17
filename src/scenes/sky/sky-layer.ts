import { BackSide, Group, LinearFilter, Mesh, ShaderMaterial, SphereGeometry, Texture, Vector3 } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * L'univers : le HDRI fourni, vu pour de vrai (scripts/media-sky.mjs) — la Voie lactée au-dessus des collines.
 * Un passage « du tout au rien » : un iris centré sur le regard de la caméra ouvre l'univers entier (π) ou le referme
 * jusqu'à un point, puis le noir (0). Piloté par la progression (`skyIris`, `skyYaw`) ; une dérive lente des étoiles
 * s'ajoute tant que l'univers est visible (sauf mouvement réduit) — la seule animation de la page qui ne dépend pas du
 * scroll, et qui s'arrête dès que l'iris est fermé.
 * La sphère suit la caméra : l'univers est à l'infini.
 */
const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uSky;
  uniform float uIris;
  uniform float uYaw;
  uniform float uLight;
  uniform vec3 uForward;
  varying vec3 vDir;
  const float PI = 3.14159265;
  void main() {
    vec3 d = normalize(vDir);
    float u = fract((atan(d.z, d.x) + uYaw) / (2.0 * PI) + 0.5);
    float v = 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI;
    vec3 col = texture2D(uSky, vec2(u, v)).rgb;
    float angle = acos(clamp(dot(d, uForward), -1.0, 1.0));
    float radius = uIris * (PI + 0.4);
    float mask = smoothstep(radius, radius - 0.4, angle);
    // Bord de l'iris : un liseré froid à peine visible, la limite du monde.
    float rim = smoothstep(0.12, 0.0, abs(angle - (radius - 0.2))) * step(0.001, uIris) * (1.0 - step(0.999, uIris)) * 0.08;
    gl_FragColor = vec4(col * uLight * mask + vec3(0.55, 0.65, 0.8) * rim, 1.0);
  }
`;

export function createSkyLayer(options: { chapters: readonly string[]; low: string; high?: string; drift: boolean }) {
  const texture = new Texture();
  // Valeurs de la texture lues telles quelles (déjà étalonnées) : aucune conversion de couleur.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  const material = new ShaderMaterial({
    uniforms: {
      uSky: { value: texture },
      uIris: { value: 0 },
      uYaw: { value: 0 },
      uLight: { value: 1 },
      uForward: { value: new Vector3(0, 0, -1) },
    },
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
  });
  // Sortie des valeurs affichées telles quelles (texture déjà étalonnée) : pas de conversion de couleur supplémentaire.
  material.toneMapped = false;
  const sphere = new Mesh(new SphereGeometry(120, 64, 32), material);
  sphere.renderOrder = -10;
  sphere.frustumCulled = false;
  // La scène règle la visibilité de la racine (chapitres) ; la couche celle de la sphère (iris fermé : rien à dessiner).
  const root = new Group();
  root.add(sphere);
  const abort = new AbortController();
  let ready = false;
  let drift = 0;
  const forward = new Vector3();
  const last = { iris: -1, yaw: NaN, fx: NaN, fy: NaN, fz: NaN, px: NaN, py: NaN, pz: NaN };

  const load = async (url: string, ctx: StageContext) => {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    const bitmap = await createImageBitmap(await response.blob());
    (texture.image as ImageBitmap | undefined)?.close?.();
    texture.image = bitmap;
    texture.needsUpdate = true;
    ready = true;
    ctx.invalidate();
  };

  const layer: WebGLLayer = {
    id: 'sky',
    chapters: options.chapters,
    root,
    async init(ctx) {
      await load(options.low, ctx).catch((error: Error) => {
        if (error.name !== 'AbortError') console.warn('[sky]', error.message);
      });
      // Pleine définition ensuite, sans retarder la première image.
      if (options.high)
        load(options.high, ctx).catch((error: Error) => {
          if (error.name !== 'AbortError') console.warn('[sky]', error.message);
        });
    },
    update(state: Readonly<ExperienceState>, ctx): LayerUpdate {
      const iris = ready ? (state.channels.skyIris ?? 0) : 0;
      const pose = state.camera;
      if (pose) {
        forward.set(pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]).normalize();
        sphere.position.set(...pose.position);
      }
      const drifting = options.drift && iris > 0.001 && !state.reducedMotion;
      if (drifting) drift += state.dt * 0.006;
      const yaw = (state.channels.skyYaw ?? 0) + drift;
      sphere.visible = iris > 0.001;
      const changed =
        iris !== last.iris || yaw !== last.yaw || forward.x !== last.fx || forward.y !== last.fy || forward.z !== last.fz ||
        sphere.position.x !== last.px || sphere.position.y !== last.py || sphere.position.z !== last.pz;
      if (!changed) return false;
      Object.assign(last, { iris, yaw, fx: forward.x, fy: forward.y, fz: forward.z, px: sphere.position.x, py: sphere.position.y, pz: sphere.position.z });
      material.uniforms.uIris.value = iris;
      material.uniforms.uYaw.value = yaw;
      (material.uniforms.uForward.value as Vector3).copy(forward);
      void ctx;
      return drifting ? 'continue' : true;
    },
    dispose() {
      abort.abort();
      (texture.image as ImageBitmap | undefined)?.close?.();
      texture.dispose();
    },
  };
  return layer;
}
