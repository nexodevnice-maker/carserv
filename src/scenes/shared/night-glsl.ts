import type { Texture, Vector2, Vector3 } from 'three';

/**
 * Uniformes de la nuit, partagés par TOUTES les couches posées dans le monde : elles réfléchissent le même ciel, la
 * même brume, la même lumière. C'est ce qui fait qu'aucune d'elles ne ressemble à un calque ajouté.
 */
export interface SharedNight {
  uSky: { value: Texture };
  uYaw: { value: number };
  uSkySize: { value: Vector2 };
  uPixelAngle: { value: number };
  uZenith: { value: Vector3 };
  uNoise: { value: Texture };
  uLight: { value: number };
  uFog: { value: number };
  uGroundH: { value: number };
  uTerrain: { value: number };
  uWorld: { value: number };
}

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
  const float SKY_PI = 3.14159265;
  // L'univers est rendu tel qu'il a été photographié (HDRI fourni) : aucune désaturation, aucun refroidissement — la
  // nuit garde ses étoiles chaudes. Les couleurs de la marque (jaune, rouge) viennent des objets, pas du ciel.
  vec3 grade(vec3 c) {
    return c;
  }
  /**
   * LE CIEL DU SITE. Il n'y a plus AUCUNE photographie ici : le ciel est calculé, et le vrai ciel du récit est la
   * galaxie 3D (scenes/galaxy), qu'on traverse. Cette fonction ne sert donc qu'aux REFLETS : ce que le sol mouillé,
   * la chaussée et les carrosseries renvoient quand elles regardent en l'air.
   * Le paramètre de flou (reflet rugueux) est conservé dans la signature — toutes les couches l'appellent — mais une
   * nuit calculée n'a pas de niveaux de détail : elle est lisse par construction.
   */
  vec3 skyLod(vec3 d, float bias) {
    float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(vec3(0.006, 0.008, 0.016), vec3(0.014, 0.017, 0.032), up);
    // LE DÔME DE LUMIÈRE DE LA VILLE. C'est la seule source de la nuit : un quartier de sodium renvoie sa lueur dans
    // le ciel bien au-dessus de l'horizon, et c'est elle que le sol mouillé, la chaussée et les carrosseries
    // réfléchissent. Elle était dix fois trop faible : hors du halo des candélabres, tout tombait dans le noir absolu
    // et le monde ressemblait à un radeau posé sur du vide.
    col += vec3(0.048, 0.030, 0.015) * exp(-abs(d.y) * 13.0);
    col += vec3(0.009, 0.006, 0.003) * exp(-abs(d.y) * 3.0);
    // Aucune étoile semée ici : une grille de points produit un moiré visible dès qu'on bouge, et les vraies étoiles
    // du site sont la galaxie 3D (scenes/galaxy). Ce ciel-ci ne sert qu'à donner sa lumière aux reflets.
    return col;
  }
  vec3 skySample(vec3 d) {
    return skyLod(d, 0.0);
  }
  /**
   * La nuit calculée, sans aucune photographie : un dégradé profond du zénith vers l'horizon, et des étoiles semées
   * par une fonction. C'est ce que le sol mouillé et les carrosseries réfléchissent désormais — le ciel du site est un
   * VRAI volume (la galaxie 3D), pas une image plaquée, et son reflet doit l'être aussi.
   */
  vec3 nightSky(vec3 d) {
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
    vec3 reflection = skyLod(R, mix(3.5, 0.3, puddle)) * min(fresnel, 0.85) * mix(0.45, 1.1, puddle);
    // Le terrain réel du panorama sous nos pieds ; l'eau le recouvre là où il y a des flaques, et la part réfléchie
    // n'est pas comptée deux fois.
    vec3 col = vec3(0.005, 0.006, 0.009) * (0.55 + grain * 0.9) + reflection;
    // Au loin, la brume d'horizon ; en rasant, exactement le pied des collines (continuité à l'horizon).
    float graze = 1.0 - smoothstep(0.0, 0.012, -d.y);
    vec3 far = mix(haze(d), skySample(normalize(vec3(d.x, 0.0, d.z))), graze);
    return mix(far, col, exp(-pow(uFog * t, 2.0)));
  }
`;
