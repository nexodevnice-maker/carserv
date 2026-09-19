import {
  FramebufferTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';

/**
 * LA PASSE D'IMAGE — ce qui sépare une scène 3D d'un plan de cinéma.
 *
 * Trois choses, dans cet ordre : le HALO autour des sources (une lampe vue de nuit déborde, l'œil le sait), le
 * TRAMAGE qui casse les bandes d'un dégradé sombre, et un ÉTALONNAGE léger (ombres froides, hautes lumières
 * ambrées, bords assombris). Rien d'autre : chaque effet ajouté ici coûte une image entière.
 *
 * POURQUOI ON RECOPIE L'IMAGE AU LIEU DE RENDRE DANS UNE CIBLE.
 * Trois.js n'applique sa correction d'affichage (courbe de rendu, encodage écran) QUE lorsqu'il dessine dans le
 * canevas ; dans une cible de rendu, il ne l'applique pas. Or ce projet mélange deux familles de matériaux : les
 * véhicules (matériaux standard, corrigés par Trois.js) et TOUT LE RESTE (nuanceurs maison, qui écrivent déjà des
 * valeurs d'écran). Rendre la scène dans une cible aurait donc assombri les véhicules et, en rattrapant le coup au
 * moment de composer, éclairci tout le reste : la direction artistique entière y passait.
 *
 * On laisse donc la scène se dessiner exactement comme avant, dans le canevas, puis on RECOPIE le résultat dans une
 * texture (une recopie de GPU à GPU, pas une lecture). L'image de départ est alors au pixel près celle d'hier, et
 * les effets s'ajoutent par-dessus. Conséquence heureuse : passe désactivée, il ne reste rigoureusement rien — ni
 * coût, ni différence.
 *
 * Le halo travaille sur des valeurs MISES AU CARRÉ (retour approximatif vers l'énergie lumineuse) : sans cela, une
 * étoile et un phare, tous deux proches de 1 à l'écran, débordent pareil — et le phare ne pèse plus rien.
 */
export interface PostOptions {
  /**
   * Au-delà de ce cran de définition, la passe est abandonnée. Un téléphone qui a déjà reculé deux fois n'a pas
   * besoin d'un halo : il a besoin de ses millisecondes.
   */
  maxLevel: number;
  /** Diviseur de définition de la chaîne de halo (4 : un quart de côté, seize fois moins de pixels à flouter). */
  scale: number;
  /** Valeur d'écran (0→1) à partir de laquelle une source déborde, et la douceur du passage. */
  threshold: number;
  knee: number;
  /** Intensité du halo. `channel` (facultatif) la module au fil du récit. */
  bloom: number;
  channel?: string;
  /** Écartement du flou, en texels de la source. */
  spread: number;
  /** Assombrissement des bords (0 : aucun). */
  vignette: number;
  /** Grain. Il sert surtout de TRAMAGE : deux valeurs sur 255 suffisent à effacer les bandes d'un ciel sombre. */
  grain: number;
  /** Étalonnage : teinte des ombres, teinte des hautes lumières, force de la courbe en S. */
  shadowTint: readonly [number, number, number];
  lightTint: readonly [number, number, number];
  contrast: number;
}

/** Sommet commun : un rectangle qui couvre l'écran, sans projection à calculer. */
const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Le tri des sources. Quatre prélèvements en quinconce : c'est un sous-échantillonnage doux, qui évite qu'une étoile
 * d'un pixel n'apparaisse et ne disparaisse d'une image à l'autre.
 */
const brightFragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform vec2 uTexel;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uScene, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
    c += texture2D(uScene, vUv + uTexel * vec2(1.0, -1.0)).rgb;
    c += texture2D(uScene, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
    c += texture2D(uScene, vUv + uTexel * vec2(1.0, 1.0)).rgb;
    c *= 0.25;
    float level = max(max(c.r, c.g), c.b);
    float weight = clamp((level - uThreshold) / max(uKnee, 0.0001), 0.0, 1.0);
    weight *= weight;
    // Mise au carré : on repart de l'énergie, pour que les vraies sources écrasent les gris clairs.
    gl_FragColor = vec4(c * c * weight, 1.0);
  }
`;

/**
 * Flou séparable : neuf prélèvements gaussiens obtenus en cinq lectures (les poids intermédiaires sont pris entre
 * deux texels, le filtrage linéaire fait la moyenne gratuitement).
 */
const blurFragment = /* glsl */ `
  uniform sampler2D uSource;
  uniform vec2 uDirection;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uSource, vUv).rgb * 0.2270270270;
    c += (texture2D(uSource, vUv + uDirection * 1.3846153846).rgb
        + texture2D(uSource, vUv - uDirection * 1.3846153846).rgb) * 0.3162162162;
    c += (texture2D(uSource, vUv + uDirection * 3.2307692308).rgb
        + texture2D(uSource, vUv - uDirection * 3.2307692308).rgb) * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/**
 * La composition. Deux octaves de halo (une serrée, une large) donnent une décroissance que le flou d'une seule
 * taille ne sait pas produire : c'est ce qui fait la différence entre « une tache » et « une lampe ».
 *
 * Le grain est fonction de la POSITION DE DÉFILEMENT, jamais de l'horloge : même endroit, même image, à l'aller
 * comme au retour (règle du projet : aucun état visuel piloté par le temps).
 */
const compositeFragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uBloomA;
  uniform sampler2D uBloomB;
  uniform float uBloom;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uSeed;
  uniform float uContrast;
  uniform vec3 uShadowTint;
  uniform vec3 uLightTint;
  varying vec2 vUv;

  void main() {
    vec3 base = texture2D(uScene, vUv).rgb;
    vec3 halo = texture2D(uBloomA, vUv).rgb * 0.62 + texture2D(uBloomB, vUv).rgb * 0.38;
    // Le halo a été calculé en énergie : racine carrée pour revenir à l'échelle de l'écran avant de l'ajouter.
    vec3 col = base + sqrt(max(halo, 0.0)) * uBloom;

    // ÉTALONNAGE — la nuit a deux lumières : la lune (froide) et les lampes au sodium (ambrées). On accentue ce qui
    // est déjà là au lieu de plaquer une teinte : les ombres vers le bleu, les hautes lumières vers l'ambre.
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 tint = mix(uShadowTint, uLightTint, smoothstep(0.0, 0.6, luma));
    // Teinte ramenée à luminance constante : l'étalonnage COLORE, il n'assombrit pas. Sans cette division, une teinte
    // d'ombre à 0,96 coûtait deux pour cent de lumière sur une image qui est à 98 % dans les ombres.
    col *= tint / dot(tint, vec3(0.2126, 0.7152, 0.0722));

    // Sculpture des HAUTES LUMIÈRES seulement. Une courbe en S classique creuse tout ce qui est sous la moitié — or
    // ce récit est nocturne : mesuré, elle retirait 13 % de lumière à la descente et à la place, les deux plans qu'on
    // nous reproche déjà de ne pas voir. Ici les noirs ne bougent pas, seules les lumières prennent du galbe.
    col = mix(col, max(col, smoothstep(vec3(0.0), vec3(1.0), col)), uContrast);

    // VIGNETTE mesurée en « part du chemin vers le coin » : 0 au centre, 1 dans un angle, quel que soit le format.
    // Rapportée au côté long (l'erreur du premier jet), un écran de téléphone voyait son tiers haut et son tiers bas
    // noircis de 28 % : la place perdait son sol et le ciel ses étoiles. Ici seuls les angles s'assombrissent.
    float corner = length((vUv - 0.5) * 2.0) * 0.70710678;
    col *= 1.0 - uVignette * smoothstep(0.55, 1.0, corner);

    float grain = fract(sin(dot(vUv * 1024.0 + uSeed, vec2(127.1, 311.7))) * 43758.5453) - 0.5;
    col += grain * uGrain;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

export function createPostProcess(renderer: WebGLRenderer, options: PostOptions) {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(geometry, new ShaderMaterial());
  quad.frustumCulled = false;
  scene.add(quad);

  const target = () => {
    const rt = new WebGLRenderTarget(1, 1, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    return rt;
  };
  // Deux octaves : `bloomA` au quart, `bloomB` au huitième. Les deux « temp » sont les allers du flou séparable.
  const bloomA = target();
  const tempA = target();
  const bloomB = target();
  const tempB = target();

  let scene2D: FramebufferTexture | null = null;
  let width = 0;
  let height = 0;

  const material = (fragment: string, uniforms: Record<string, { value: unknown }>) =>
    new ShaderMaterial({ uniforms, vertexShader: quadVertex, fragmentShader: fragment, depthTest: false, depthWrite: false });

  const bright = material(brightFragment, {
    uScene: { value: null },
    uTexel: { value: new Vector2() },
    uThreshold: { value: options.threshold },
    uKnee: { value: options.knee },
  });
  const blur = material(blurFragment, { uSource: { value: null }, uDirection: { value: new Vector2() } });
  const composite = material(compositeFragment, {
    uScene: { value: null },
    uBloomA: { value: bloomA.texture },
    uBloomB: { value: bloomB.texture },
    uBloom: { value: options.bloom },
    uVignette: { value: options.vignette },
    uGrain: { value: options.grain },
    uSeed: { value: 0 },
    uContrast: { value: options.contrast },
    uShadowTint: { value: [...options.shadowTint] },
    uLightTint: { value: [...options.lightTint] },
  });

  const draw = (pass: ShaderMaterial, into: WebGLRenderTarget | null) => {
    quad.material = pass;
    renderer.setRenderTarget(into);
    renderer.render(scene, camera);
  };

  /** Un aller du flou : `from` → `into`, dans une direction, avec l'écartement exprimé en texels de la SOURCE. */
  const blurPass = (from: WebGLRenderTarget, into: WebGLRenderTarget, horizontal: boolean) => {
    blur.uniforms.uSource.value = from.texture;
    const direction = blur.uniforms.uDirection.value as Vector2;
    const spread = options.spread;
    direction.set(horizontal ? spread / from.width : 0, horizontal ? 0 : spread / from.height);
    draw(blur, into);
  };

  const resize = () => {
    const size = renderer.getDrawingBufferSize(new Vector2());
    const w = Math.max(Math.floor(size.x), 1);
    const h = Math.max(Math.floor(size.y), 1);
    if (w === width && h === height) return;
    width = w;
    height = h;
    // La texture de recopie a EXACTEMENT la taille du tampon de dessin : la recopie est alors un simple blit.
    scene2D?.dispose();
    scene2D = new FramebufferTexture(width, height);
    scene2D.minFilter = LinearFilter;
    scene2D.magFilter = LinearFilter;
    bright.uniforms.uScene.value = scene2D;
    composite.uniforms.uScene.value = scene2D;
    (bright.uniforms.uTexel.value as Vector2).set(1 / width, 1 / height);
    const aw = Math.max(Math.floor(width / options.scale), 1);
    const ah = Math.max(Math.floor(height / options.scale), 1);
    bloomA.setSize(aw, ah);
    tempA.setSize(aw, ah);
    bloomB.setSize(Math.max(aw >> 1, 1), Math.max(ah >> 1, 1));
    tempB.setSize(Math.max(aw >> 1, 1), Math.max(ah >> 1, 1));
  };

  return {
    resize,
    /**
     * À appeler juste après le rendu de la scène, le canevas encore à l'écran.
     * `seed` : la position de défilement (le grain en dépend). `amount` : le canal qui module le halo.
     */
    render(seed: number, amount: number) {
      if (!scene2D || width === 0) return;
      // Les passes qui suivent appartiennent à CETTE image : sans cela, Trois.js remet ses compteurs à zéro à chaque
      // passe et le relevé de performance ne montrerait plus que le dernier rectangle dessiné.
      const autoReset = renderer.info.autoReset;
      renderer.info.autoReset = false;
      renderer.copyFramebufferToTexture(scene2D);
      draw(bright, bloomA);
      blurPass(bloomA, tempA, true);
      blurPass(tempA, bloomA, false);
      // L'octave large se remplit EN LISANT l'octave serrée dans une cible deux fois plus petite : le
      // sous-échantillonnage est fait par le filtrage, sans passe supplémentaire.
      blurPass(bloomA, tempB, true);
      blurPass(tempB, bloomB, false);
      composite.uniforms.uBloom.value = options.bloom * amount;
      composite.uniforms.uSeed.value = seed;
      draw(composite, null);
      renderer.info.autoReset = autoReset;
    },
    dispose() {
      scene2D?.dispose();
      scene2D = null;
      for (const rt of [bloomA, tempA, bloomB, tempB]) rt.dispose();
      for (const pass of [bright, blur, composite]) pass.dispose();
      geometry.dispose();
    },
  };
}

export type PostProcess = ReturnType<typeof createPostProcess>;
