import { DoubleSide, ShaderMaterial, type Texture } from 'three';

/**
 * Le panneau de preuve : la vidéo réelle posée dans l'espace, jamais un rectangle collé à l'écran.
 * - bords fondus dans la nuit (la prise de vue n'a pas de cadre) ;
 * - `uPassage` : une ligne d'eau descend en biais sur le panneau — devant elle la poussière, derrière elle le même
 *   capot propre, encore mouillé (plus sombre, plus contrasté), qui sèche en s'éloignant de la ligne ; au bord de
 *   l'eau, une réfraction et un liseré de lumière. Aucune particule : l'eau est une matière qui passe.
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
    vec3 b = sampleTex(uB, uv + offset, uFlipB);
    vec3 col = mix(a, b, washed * step(0.0001, uPassage));

    // Mouillé derrière la ligne : plus sombre et plus contrasté, sèche en s'éloignant.
    float wet = washed * exp(-max(-s, 0.0) * 5.0) * step(0.0001, uPassage) * (1.0 - step(0.9999, uPassage));
    col = mix(col, col * col * 1.35, wet * 0.5);
    // Liseré de lumière sur l'eau (reflet froid du ciel).
    col += edge * vec3(0.78, 0.86, 1.0) * 0.28 * step(0.0001, uPassage) * (1.0 - step(0.9999, uPassage));

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
