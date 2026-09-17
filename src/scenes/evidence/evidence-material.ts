import { DoubleSide, ShaderMaterial, type Texture } from 'three';

/**
 * Le panneau de preuve : la vidéo réelle posée dans l'espace, jamais un rectangle collé à l'écran.
 * - bords fondus dans la nuit (la prise de vue n'a pas de cadre) ;
 * - `uPassage` : une ligne d'eau descend en biais sur le panneau — devant elle la poussière, derrière elle le même
 *   capot propre, encore mouillé (plus sombre, plus contrasté), qui sèche en s'éloignant de la ligne ; au bord de
 *   l'eau, une réfraction et un liseré de lumière. Aucune particule : l'eau est une matière qui passe.
 * - `uScan` : avant l'eau, le relevé (technique de la ligne de scan de MECA RIVIERA, ici en or) : une ligne fine, de
 *   largeur constante à l'écran, descend sur le panneau ; derrière elle, le véhicule relevé — luminance froide et
 *   contours d'or détectés sur l'image réelle ; sous la ligne, un halo en vraies couleurs. L'eau passe ensuite sur le
 *   relevé et rend le véhicule propre, en couleurs.
 * - `uReflect` : la copie inversée posée sous le sol mouillé — sombre, ondulée, qui s'efface en s'éloignant du sol.
 * Tout dépend de la progression (aucune horloge) : l'image se reconstruit depuis p.
 */
export interface EvidenceUniforms {
  [name: string]: { value: unknown };
  uA: { value: Texture | null };
  uB: { value: Texture | null };
  uFlipA: { value: number };
  uFlipB: { value: number };
  uPassage: { value: number };
  uLight: { value: number };
  uReflect: { value: number };
  uPhase: { value: number };
  uScan: { value: number };
  uTexel: { value: [number, number] };
  /** Recalage de l'image « après » sur l'image « avant » : (dx, dy, échelle), mesuré au pipeline. */
  uAlign: { value: [number, number, number] };
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uFlipA;
  uniform float uFlipB;
  uniform float uPassage;
  uniform float uLight;
  uniform float uReflect;
  uniform float uPhase;
  uniform float uScan;
  uniform vec2 uTexel;
  uniform vec3 uAlign;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  vec3 sampleTex(sampler2D tex, vec2 uv, float flip) {
    uv = clamp(uv, 0.001, 0.999);
    return texture2D(tex, vec2(uv.x, mix(uv.y, 1.0 - uv.y, flip))).rgb;
  }

  // Le véhicule propre est filmé trois secondes plus tard : la main a bougé, la focale a respiré. Le recalage mesuré
  // au pipeline (scripts/lib/align.mjs) remet l'après EXACTEMENT là où était l'avant — la ligne d'eau ne déplace plus
  // le véhicule, elle ne change que sa matière.
  vec3 sampleAligned(sampler2D tex, vec2 uv, float flip, vec3 align) {
    vec2 p = vec2(uv.x, mix(uv.y, 1.0 - uv.y, flip));
    p = (p - 0.5 - align.xy) / align.z + 0.5;
    return texture2D(tex, clamp(p, 0.001, 0.999)).rgb;
  }

  void main() {
    vec2 uv = vUv;
    // Reflet : ondulation fine du sol mouillé (fonction de la progression, pas du temps).
    if (uReflect > 0.5) {
      uv.x += (noise(vec2(uv.y * 38.0, uPhase * 6.0)) - 0.5) * 0.018;
    }

    // Ligne d'eau : descend du haut-droit vers le bas-gauche. s < 0 : déjà lavé.
    vec2 dir = normalize(vec2(0.42, 1.0));
    float d = dot(uv - 0.5, dir);
    float line = mix(0.72, -0.72, uPassage);
    float wobble = (noise(vec2(uv.x * 9.0, line * 4.0)) - 0.5) * 0.05;
    float s = line - d + wobble;
    float edge = exp(-pow(s / 0.022, 2.0));
    float washed = smoothstep(0.012, -0.012, s);
    // Réfraction au bord de l'eau.
    vec2 refr = vec2(noise(uv * vec2(22.0, 60.0) + line * 7.0) - 0.5, noise(uv * vec2(60.0, 22.0) - line * 5.0) - 0.5);
    vec2 offset = refr * edge * 0.035;

    vec3 a = sampleTex(uA, uv + offset, uFlipA);
    vec3 b = sampleAligned(uB, uv + offset, uFlipB, uAlign);

    // Relevé : la ligne descend du haut (uScan 0) au bas (1) ; au-dessus d'elle, tout est relevé.
    float scanning = step(0.0001, uScan);
    float lineY = mix(1.03, -0.03, clamp(uScan, 0.0, 1.0));
    float dy = vUv.y - lineY;
    float px = fwidth(vUv.y);
    float scanned = scanning * smoothstep(-px, px * 2.0, dy);
    if (scanned > 0.0) {
      // Contours (Sobel sur la luminance de l'image réelle).
      vec3 W = vec3(0.2126, 0.7152, 0.0722);
      vec2 e = uTexel * 1.5;
      float tl = dot(sampleTex(uA, uv + vec2(-e.x, e.y), uFlipA), W);
      float tr = dot(sampleTex(uA, uv + vec2(e.x, e.y), uFlipA), W);
      float bl = dot(sampleTex(uA, uv + vec2(-e.x, -e.y), uFlipA), W);
      float br = dot(sampleTex(uA, uv + vec2(e.x, -e.y), uFlipA), W);
      float l = dot(sampleTex(uA, uv + vec2(-e.x, 0.0), uFlipA), W);
      float r = dot(sampleTex(uA, uv + vec2(e.x, 0.0), uFlipA), W);
      float t = dot(sampleTex(uA, uv + vec2(0.0, e.y), uFlipA), W);
      float bo = dot(sampleTex(uA, uv + vec2(0.0, -e.y), uFlipA), W);
      float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      float gy = (tl + 2.0 * t + tr) - (bl + 2.0 * bo + br);
      float edgeMag = smoothstep(0.2, 0.75, length(vec2(gx, gy)));
      float lum = dot(a, W);
      // Trame fine du relevé, fixée au panneau.
      float grid = max(smoothstep(0.92, 1.0, abs(sin(vUv.x * 140.0))), smoothstep(0.92, 1.0, abs(sin(vUv.y * 222.0))));
      vec3 relief = vec3(0.03, 0.04, 0.06) + lum * vec3(0.2, 0.25, 0.33) + vec3(0.95, 0.72, 0.3) * (edgeMag * 0.85 + grid * 0.05);
      a = mix(a, relief, scanned);
    }
    // Ligne d'or et halo en vraies couleurs juste sous elle.
    float lineMask = scanning * (1.0 - step(0.9999, uScan));
    float scanLine = lineMask * (1.0 - smoothstep(px * 0.8, px * 2.6, abs(dy)));
    float scanGlow = lineMask * exp(-dy * dy / 0.0016);
    vec3 col = mix(a, b, washed * step(0.0001, uPassage));
    col += vec3(1.0, 0.78, 0.38) * (scanLine * 1.6 + scanGlow * 0.22);

    // Mouillé derrière la ligne : plus sombre et plus contrasté, sèche en s'éloignant.
    float wet = washed * exp(-max(-s, 0.0) * 5.0) * step(0.0001, uPassage) * (1.0 - step(0.9999, uPassage));
    col = mix(col, col * col * 1.35, wet * 0.5);
    float running = step(0.0001, uPassage) * (1.0 - step(0.9999, uPassage));
    // Liseré de lumière sur l'eau (reflet froid du ciel).
    col += edge * vec3(0.78, 0.86, 1.0) * 0.28 * running;
    // Ruissellement : des filets d'eau tirés dans le sens de la coulée, derrière la ligne, qui s'effacent en séchant.
    vec2 across = vec2(dir.y, -dir.x);
    float rill = smoothstep(0.62, 0.92, noise(vec2(dot(uv, across) * 74.0, d * 3.0 + line * 2.0)));
    float trail = washed * exp(-max(-s, 0.0) * 7.0) * running;
    col = mix(col, col * 0.55, rill * trail * 0.6);
    col += rill * trail * vec3(0.7, 0.78, 0.9) * 0.1;
    // Éclat : la bande de ciel accrochée par le film d'eau, juste derrière la ligne.
    float glint = exp(-pow((s + 0.045) / 0.012, 2.0)) * (0.55 + 0.45 * noise(vec2(dot(uv, across) * 18.0, line * 9.0)));
    col += glint * vec3(0.92, 0.95, 1.0) * 0.42 * running;

    // Étalonnage de nuit : noirs tenus, hautes lumières douces.
    col = pow(col, vec3(1.12)) * 0.96;

    // Bords fondus dans la nuit.
    float fx = smoothstep(0.0, 0.09, uv.x) * smoothstep(1.0, 0.91, uv.x);
    float fy = smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);
    float alpha = fx * fy;

    if (uReflect > 0.5) {
      // Le reflet naît au pied du panneau (bas de l'image) et s'éteint en s'en éloignant.
      float fade = pow(1.0 - vUv.y, 2.2);
      col *= 0.5;
      alpha *= fade;
    }
    // Éteint, le panneau disparaît (il ne masque pas l'univers derrière lui) ; allumé, il est opaque.
    gl_FragColor = vec4(col * uLight, alpha * smoothstep(0.0, 0.2, uLight));
  }
`;

export function createEvidenceMaterial(reflect: boolean) {
  const uniforms: EvidenceUniforms = {
    uA: { value: null },
    uB: { value: null },
    uFlipA: { value: 0 },
    uFlipB: { value: 0 },
    uPassage: { value: 0 },
    uLight: { value: 1 },
    uReflect: { value: reflect ? 1 : 0 },
    uPhase: { value: 0 },
    uScan: { value: 0 },
    uTexel: { value: [1 / 900, 1 / 1424] },
    uAlign: { value: [0, 0, 1] },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  return { material, uniforms };
}
