/**
 * GLSL partagé de la nuit de CAR SERVICE 06 : le ciel (HDRI fourni) et le sol mouillé qui le reflète. Le ciel, la mer,
 * la surface du 06 et ses falaises utilisent exactement les mêmes fonctions : une seule lumière pour tout le monde.
 * Uniformes attendus : uSky, uYaw, uSkySize, uPixelAngle, uZenith, uNoise, uLight, uFog.
 */
export const SKY_GLSL = /* glsl */ `
  uniform sampler2D uSky;
  uniform float uYaw;
  uniform vec2 uSkySize;
  uniform float uPixelAngle;
  uniform vec3 uZenith;
  const float PI = 3.14159265;
  // Étalonnage : la prise de vue a une lueur orangée (pollution lumineuse) qui salissait l'or de la marque. La nuit
  // est désaturée et refroidie ; les étoiles restent blanches. L'or reste la seule couleur chaude du site.
  vec3 grade(vec3 c) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, 0.22) * vec3(0.86, 0.97, 1.16);
    return c * (0.84 + 0.16 * smoothstep(0.02, 0.35, l));
  }
  // Lecture de l'équirectangulaire à un niveau de détail calculé (taille angulaire d'un pixel rapportée à celle d'un
  // texel, élargie vers les pôles), sans dérivées : ni éventail au zénith, ni couture à la jonction de l'image, et
  // utilisable partout (branches, boucles). L'horizon de la prise de vue est ~1,4° sous le pied des collines : abaissé
  // d'autant, les collines se posent sur l'horizon du sol.
  vec3 skyLod(vec3 d, float bias) {
    float u = fract((atan(d.z, d.x) + uYaw) / (2.0 * PI) + 0.5);
    float e = asin(clamp(d.y + 0.025, -1.0, 1.0));
    float texel = 2.0 * PI / uSkySize.x;
    float lod = min(log2(max(uPixelAngle / (texel * max(cos(e), 0.004)), 1.0)), 3.5) + bias;
    vec3 col = textureLod(uSky, vec2(u, 0.5 - e / PI), max(lod, 0.0)).rgb;
    // Calotte au-dessus de 70° : l'image source y est étirée (éventail cuit dans la texture). Fondu doux vers la couleur
    // moyenne de la calotte (mesurée au chargement), semée d'étoiles calculées.
    float cap = smoothstep(0.94, 0.99, d.y);
    if (cap > 0.0) {
      vec2 cell = floor(d.xz * 700.0);
      float star = pow(fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453), 90.0);
      col = mix(col, uZenith + vec3(star * 1.2), cap);
    }
    return grade(col);
  }
  vec3 skySample(vec3 d) {
    return skyLod(d, 0.0);
  }
  // Brume d'horizon : le ciel très flou juste au-dessus de l'horizon, dans la même direction. Le lointain s'y fond au
  // lieu de tomber dans le noir (perspective aérienne de nuit).
  vec3 haze(vec3 d) {
    return skyLod(normalize(vec3(d.x, 0.05, d.z)), 6.5) * 0.75;
  }
`;

export const GROUND_GLSL = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uLight;
  uniform float uFog;
  // Sol mouillé au point p (plan horizontal), vu dans la direction d à la distance t. sea = 1 : miroir calme (la mer,
  // hors du 06) ; sea = 0 : asphalte humide et flaques. Bruit uniquement précalculé (mipmaps) : pas de grille, pas de
  // scintillement au loin, coût de quelques lectures de texture.
  vec3 groundShade(vec2 p, vec3 d, float t, float sea) {
    vec2 q1 = mat2(0.80, -0.60, 0.60, 0.80) * p;
    vec2 q2 = mat2(0.28, 0.96, -0.96, 0.28) * p;
    float field = texture2D(uNoise, q1 * 0.03 + 0.31).r * 0.65 + texture2D(uNoise, q2 * 0.07 + 0.57).r * 0.35;
    // Au loin, les flaques se fondent en un sol uniformément humide (aucun motif lisible depuis le ciel).
    float detail = exp(-t * 0.004);
    float puddle = mix(mix(0.3, smoothstep(0.42, 0.66, field), detail), 1.0, sea);
    float near = exp(-t * 0.015);
    float grain = mix(0.5, texture2D(uNoise, p * 0.9).r, near);
    vec2 ripple = vec2(texture2D(uNoise, p * 0.31 + 0.13).r, texture2D(uNoise, q2 * 0.05 + 0.71).r) - 0.5;
    float rough = mix(0.56, mix(0.05, 0.02, sea), puddle) * mix(0.25, 1.0, near);
    vec3 N = normalize(vec3(ripple.x * rough, 1.0, ripple.y * rough));
    vec3 R = reflect(d, N);
    R.y = abs(R.y);
    float fresnel = mix(0.03, mix(0.22, 0.18, sea), puddle) + 0.97 * pow(1.0 - clamp(dot(-d, N), 0.0, 1.0), 5.0);
    // Reflet flouté selon la rugosité : miroir dans l'eau, reflet diffus sur l'asphalte.
    vec3 reflection = skyLod(R, mix(3.5, 0.3, puddle)) * uLight * min(fresnel, 0.85) * mix(0.45, 1.1, puddle);
    vec3 col = vec3(0.006, 0.008, 0.012) * (0.55 + grain * 0.9) + reflection;
    // Au loin, la brume d'horizon ; en rasant, exactement le pied des collines (continuité à l'horizon).
    float graze = 1.0 - smoothstep(0.0, 0.012, -d.y);
    vec3 far = mix(haze(d), skySample(normalize(vec3(d.x, 0.0, d.z))), graze) * uLight;
    return mix(far, col, exp(-pow(uFog * t, 2.0)));
  }
`;
