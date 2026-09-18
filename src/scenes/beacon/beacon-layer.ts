import { AdditiveBlending, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import type { LayerUpdate, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * La balise : une colonne de lumière qui monte du sol dans l'univers, là où le véhicule attend. Vue de France, c'est le
 * seul point allumé du pays — « chez vous » ; elle s'éteint quand on arrive. Plan tourné vers la caméra autour de l'axe
 * vertical, additif ; largeur apparente bornée pour rester lisible à des kilomètres. Canal : `beacon`.
 */
const beaconVertex = /* glsl */ `
  uniform float uHeight;
  uniform float uWidth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCamera = cameraPosition - base;
    vec3 side = normalize(vec3(toCamera.z, 0.0, -toCamera.x) + vec3(1e-5, 0.0, 0.0));
    float width = max(uWidth, length(toCamera) * 0.0045);
    vec3 world = base + side * position.x * width + vec3(0.0, (position.y + 0.5) * uHeight, 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;
const beaconFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.x - 0.5) * 2.0;
    float core = exp(-across * across * 30.0) + exp(-across * across * 4.0) * 0.35;
    float along = exp(-vUv.y * 4.5) * smoothstep(0.0, 0.004, vUv.y) + exp(-vUv.y * 40.0) * 0.6;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.42) * core * along * uIntensity, 1.0);
  }
`;
const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const haloFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float glow = exp(-r * r * 9.0) * 0.35 + exp(-r * 30.0) * 0.3;
    gl_FragColor = vec4(vec3(1.0, 0.8, 0.5) * glow * uIntensity, 1.0);
  }
`;

export function createBeaconLayer(options: { at: readonly [number, number]; height: number }) {
  const root = new Group();
  root.name = 'beacon';
  const uniforms = { uIntensity: { value: 0 }, uHeight: { value: options.height }, uWidth: { value: 3 } };
  const column = new Mesh(
    new PlaneGeometry(1, 1, 1, 24),
    new ShaderMaterial({ uniforms, vertexShader: beaconVertex, fragmentShader: beaconFragment, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  column.frustumCulled = false;
  column.renderOrder = 8;
  const halo = new Mesh(
    new PlaneGeometry(34, 34),
    new ShaderMaterial({
      uniforms: { uIntensity: uniforms.uIntensity },
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  halo.renderOrder = 7;
  const body = new Group();
  body.position.set(options.at[0], 0, options.at[1]);
  body.add(column, halo);
  root.add(body);
  const last = { intensity: -1 };

  const layer: WebGLLayer = {
    id: 'beacon',
    root,
    init() {},
    update(state: Readonly<ExperienceState>): LayerUpdate {
      const intensity = state.channels.beacon ?? 0;
      body.visible = intensity > 0.001;
      if (intensity === last.intensity) return false;
      last.intensity = intensity;
      uniforms.uIntensity.value = intensity;
      return true;
    },
    dispose() {},
  };
  return layer;
}
