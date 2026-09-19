import {
  Color,
  DoubleSide,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three';

/**
 * OMBRE PORTÉE CUITE UNE FOIS, dans une image.
 *
 * Technique reprise de MECA RIVIERA (`3d/stage.ts`, `castShadow`) — la méthode, pas l'apparence. Une carte d'ombre
 * classique coûte un rendu complet de la scène À CHAQUE IMAGE ; ici, l'objet ne bouge pas par rapport à son sol, donc
 * l'ombre ne change jamais : on la calcule UNE fois et on la lit comme une texture. Coût par image : zéro.
 *
 * Comment : on projette la silhouette des maillages sur le plan du sol depuis la position de la lumière (projection
 * centrale, faite dans le nuanceur de sommets), puis on la floute en deux passes séparables. Le flou porte DEUX
 * pénombres à la fois — une serrée dans le canal rouge (le contact sous les roues, qui doit rester net) et une large
 * dans le vert (l'ombre lointaine, qui doit être molle). C'est ce mélange qui fait qu'un objet POSE au lieu de flotter.
 *
 * Générique : aucune donnée, aucune couleur, aucun nom de projet.
 */
export interface BakedShadowOptions {
  /** Objets dont on veut la silhouette (leurs matrices monde doivent être à jour). */
  models: readonly Object3D[];
  /** Position de la lumière (m). Sa hauteur décide de l'étirement de l'ombre. */
  light: readonly [number, number, number];
  /** Emprise au sol couverte par l'image : [x0, z0, x1, z1] en mètres. */
  area: readonly [number, number, number, number];
  /** Largeur de l'image (px). 512 suffit : une ombre n'a pas de détail. */
  width?: number;
}

const QUAD = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export function bakeShadow(renderer: WebGLRenderer, options: BakedShadowOptions): Texture | null {
  const [x0, z0, x1, z1] = options.area;
  const width = options.width ?? 512;
  const height = Math.max(8, Math.round((width * Math.abs(z1 - z0)) / Math.abs(x1 - x0)));
  const make = () => new WebGLRenderTarget(width, height, { depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter });
  const silhouette = make();
  const across = make();
  const result = make();

  // — La silhouette, projetée depuis la lumière sur le plan y = 0.
  const projected = new ShaderMaterial({
    uniforms: {
      uLight: { value: new Vector4(options.light[0], options.light[1], options.light[2], 0) },
      uArea: { value: new Vector4(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0)) },
    },
    vertexShader: /* glsl */ `
      uniform vec4 uLight;
      uniform vec4 uArea;
      void main() {
        vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
        // Intersection du rayon lumière → sommet avec le plan du sol.
        vec2 g = uLight.xz + (w.xz - uLight.xz) * uLight.y / max(uLight.y - w.y, 0.05);
        gl_Position = vec4((g - uArea.xy) * uArea.zw * 2.0 - 1.0, 0.0, 1.0);
      }`,
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  });

  const caster = new Scene();
  for (const model of options.models) model.updateMatrixWorld(true);
  for (const model of options.models)
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      // Une vitre ne porte pas d'ombre : elle la teinterait à peine, et elle doublerait la silhouette.
      if (material && 'transparent' in material && material.transparent && (material.opacity ?? 1) < 0.9) return;
      const proxy = new Mesh(mesh.geometry, projected);
      proxy.matrixAutoUpdate = false;
      proxy.matrix.copy(mesh.matrixWorld);
      proxy.frustumCulled = false;
      caster.add(proxy);
    });
  if (!caster.children.length) return null;

  // — Le flou séparable, deux pénombres en parallèle.
  const blur = new ShaderMaterial({
    uniforms: { uMap: { value: null as Texture | null }, uStep: { value: new Vector2() }, uFirst: { value: 1 } },
    vertexShader: QUAD,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uStep;
      uniform float uFirst;
      varying vec2 vUv;
      void main() {
        vec2 sum = vec2(0.0);
        float total = 0.0;
        for (int i = -6; i <= 6; i++) {
          float w = exp(-float(i * i) / 18.0);
          // Canal rouge : pénombre SERRÉE (le contact sous les roues, qui doit rester net).
          // Canal vert : pénombre LARGE (l'ombre lointaine, molle). Les deux en une seule passe.
          vec2 tight = texture2D(uMap, vUv + uStep * float(i) * 0.5).rg;
          vec2 wide = texture2D(uMap, vUv + uStep * float(i) * 2.2).rg;
          sum += w * vec2(uFirst > 0.5 ? tight.r : tight.r, uFirst > 0.5 ? wide.r : wide.g);
          total += w;
        }
        gl_FragColor = vec4(sum / total, 0.0, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });

  const flat = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screen = new Scene();
  const quad = new Mesh(new PlaneGeometry(2, 2), blur);
  quad.frustumCulled = false;
  screen.add(quad);

  // L'état du rendu est EMPRUNTÉ, pas confisqué : cible, couleur et opacité d'effacement sont relevées puis
  // rendues. Sans la couleur, l'image suivante du site s'effaçait avec la nôtre — un rectangle clair en pleine scène.
  const previous = renderer.getRenderTarget();
  const clearAlpha = renderer.getClearAlpha();
  const clearColor = new Color();
  renderer.getClearColor(clearColor);
  renderer.setClearColor(0x000000, 0);

  renderer.setRenderTarget(silhouette);
  renderer.clear(true, false, false);
  renderer.render(caster, flat);

  blur.uniforms.uMap.value = silhouette.texture;
  blur.uniforms.uStep.value.set(1 / width, 0);
  blur.uniforms.uFirst.value = 1;
  renderer.setRenderTarget(across);
  renderer.clear(true, false, false);
  renderer.render(screen, flat);

  blur.uniforms.uMap.value = across.texture;
  blur.uniforms.uStep.value.set(0, 1 / height);
  blur.uniforms.uFirst.value = 0;
  renderer.setRenderTarget(result);
  renderer.clear(true, false, false);
  renderer.render(screen, flat);

  renderer.setRenderTarget(previous);
  renderer.setClearColor(clearColor, clearAlpha);

  silhouette.dispose();
  across.dispose();
  quad.geometry.dispose();
  blur.dispose();
  projected.dispose();
  return result.texture;
}
