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
  // L'univers est rendu tel qu'il a été photographié (HDRI fourni) : aucune désaturation, aucun refroidissement — la
  // nuit garde ses étoiles chaudes. Les couleurs de la marque (jaune, rouge) viennent des objets, pas du ciel.
  vec3 grade(vec3 c) {
    return c;
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
    // De nuit, la brume près du sol ne renvoie qu'une fraction de la lueur du ciel : sans ça, le lointain devient laiteux.
    return skyLod(normalize(vec3(d.x, 0.05, d.z)), 6.5) * 0.3;
  }
`;

export const GROUND_GLSL = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uLight;
  uniform float uFog;
  uniform float uGroundH;
  uniform float uTerrain;
  /**
   * LE SOL EST LE TERRAIN DE L'IMAGE 360° FOURNIE. La moitié basse d'un panorama contient le vrai sol du lieu — roches,
   * herbes, pierres. On la projette sur le plan du monde (technique « grounded skybox ») : depuis un centre de
   * projection placé à uGroundH mètres au-dessus du sol, un point du sol se lit dans la direction qui va du centre vers
   * ce point. Résultat : on marche DANS le lieu photographié, les collines du ciel se prolongent dans le sol sans
   * couture, et le même azimut (uYaw) vaut pour les deux.
   */
  vec3 groundTerrain(vec2 p, float near) {
    vec3 dir = normalize(vec3(p.x, -uGroundH, p.y));
    // Sous nos pieds, l'image source est extrêmement étirée : on y va plus flou. Au loin, elle redevient nette et
    // rejoint exactement le pied des collines.
    return skyLod(dir, mix(0.7, 2.4, near));
  }
  // Sol mouillé au point p (plan horizontal), vu dans la direction d à la distance t. sea = 1 : miroir calme (la mer,
  // hors du 06) ; sea = 0 : asphalte humide et flaques. Bruit uniquement précalculé (mipmaps) : pas de grille, pas de
  // scintillement au loin, coût de quelques lectures de texture.
  vec3 groundShade(vec2 p, vec3 d, float t, float sea) {
    vec2 q1 = mat2(0.80, -0.60, 0.60, 0.80) * p;
    vec2 q2 = mat2(0.28, 0.96, -0.96, 0.28) * p;
    // Au loin, les flaques se fondent en un sol uniformément humide (aucun motif lisible depuis le ciel) et le grain
    // disparaît : au-delà, on ne lit RIEN de ces textures — autant ne pas les lire du tout. C'est la moitié du coût
    // par pixel du sol, et le sol occupe la moitié de l'écran sur les plans bas.
    float detail = exp(-t * 0.004);
    float field = 0.5;
    if (detail > 0.012) field = texture2D(uNoise, q1 * 0.03 + 0.31).r * 0.65 + texture2D(uNoise, q2 * 0.07 + 0.57).r * 0.35;
    float puddle = mix(mix(0.3, smoothstep(0.42, 0.66, field), detail), 1.0, sea);
    float near = exp(-t * 0.015);
    float grain = 0.5;
    vec2 ripple = vec2(0.0);
    if (near > 0.012) {
      grain = mix(0.5, texture2D(uNoise, p * 0.9).r, near);
      ripple = vec2(texture2D(uNoise, p * 0.31 + 0.13).r, texture2D(uNoise, q2 * 0.05 + 0.71).r) - 0.5;
    }
    float rough = mix(0.56, mix(0.05, 0.02, sea), puddle) * mix(0.25, 1.0, near);
    vec3 N = normalize(vec3(ripple.x * rough, 1.0, ripple.y * rough));
    vec3 R = reflect(d, N);
    R.y = abs(R.y);
    float fresnel = mix(0.03, mix(0.22, 0.18, sea), puddle) + 0.97 * pow(1.0 - clamp(dot(-d, N), 0.0, 1.0), 5.0);
    // Reflet flouté selon la rugosité : miroir dans l'eau, reflet diffus sur l'asphalte.
    vec3 reflection = skyLod(R, mix(3.5, 0.3, puddle)) * uLight * min(fresnel, 0.85) * mix(0.45, 1.1, puddle);
    // Le terrain réel du panorama sous nos pieds ; l'eau le recouvre là où il y a des flaques, et la part réfléchie
    // n'est pas comptée deux fois.
    vec3 terrain = groundTerrain(p, near) * uLight * uTerrain * (1.0 - puddle * 0.72) * (1.0 - min(fresnel, 0.85));
    vec3 col = vec3(0.006, 0.008, 0.012) * (0.55 + grain * 0.9) + terrain + reflection;
    // Au loin, la brume d'horizon ; en rasant, exactement le pied des collines (continuité à l'horizon).
    float graze = 1.0 - smoothstep(0.0, 0.012, -d.y);
    vec3 far = mix(haze(d), skySample(normalize(vec3(d.x, 0.0, d.z))), graze) * uLight;
    return mix(far, col, exp(-pow(uFog * t, 2.0)));
  }
`;
