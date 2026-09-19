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
  /**
   * LA LUNE. Une nuit sans lune est une nuit sans fond : tout ce qui n'est pas sous un candélabre tombe au noir, et
   * le décor s'arrête au bord de la flaque de lumière. Elle est posée ici, dans le ciel partagé — donc elle éclaire
   * le fond de la scène ET elle apparaît dans tout ce qui réfléchit : le sol mouillé, la chaussée, la carrosserie.
   * Trois couches : le disque net, le halo serré autour, et la lueur large qui pâlit tout ce côté du ciel.
   */
  const vec3 SKY_MOON = normalize(vec3(-0.42, 0.34, -0.84));

  /**
   * LES ÉTOILES. Une grille de hachage posée sur la direction du regard : une cellule sur sept porte une étoile, à
   * une place tirée au sort mais STABLE. Le piège d'un ciel étoilé calculé, c'est le moirage : si l'étoile est plus
   * petite qu'un pixel, elle clignote dès que la caméra bouge. On lui donne donc une taille ANGULAIRE d'environ deux
   * pixels — assez pour qu'elle tienne en place, assez peu pour rester une étoile.
   */
  float skyStars(vec3 d) {
    vec3 a = abs(d);
    vec3 p = d / max(a.x, max(a.y, a.z));
    vec2 uv = a.x > a.y && a.x > a.z ? p.yz : (a.y > a.z ? p.xz : p.xy);
    vec2 g = uv * 74.0;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
    if (h < 0.855) return 0.0;
    vec2 off = vec2(fract(h * 37.0), fract(h * 91.0)) - 0.5;
    float r = length(f - off * 0.72);
    return exp(-r * r * 34.0) * (0.22 + fract(h * 13.0) * 1.7);
  }

  /**
   * UNE PLANÈTE. Un disque, et surtout sa PHASE : elle est éclairée par la même lune que le reste de la scène, donc
   * son croissant pointe dans la bonne direction. C'est ce détail qui fait qu'on la croit, et non un rond dans le
   * ciel. Sans elle, le fond du ciel n'a aucune échelle.
   */
  vec3 skyPlanet(vec3 d, vec3 dir, float size, vec3 tint) {
    float ang = acos(clamp(dot(d, dir), -1.0, 1.0));
    float disc = smoothstep(size, size * 0.955, ang);
    if (disc <= 0.0) return vec3(0.0);
    vec3 right = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, dir);
    vec2 local = vec2(dot(d, right), dot(d, up)) / size;
    vec3 n = normalize(vec3(local, sqrt(max(0.0, 1.0 - dot(local, local)))));
    vec3 lightLocal = normalize(vec3(dot(SKY_MOON, right), dot(SKY_MOON, up), dot(SKY_MOON, dir)));
    float lit = max(dot(n, lightLocal), 0.0);
    return tint * disc * (0.012 + lit * 0.85);
  }

  vec3 skyLod(vec3 d, float bias) {
    float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(vec3(0.004, 0.005, 0.011), vec3(0.008, 0.010, 0.020), up);
    // LE DÔME DE LUMIÈRE DE LA VILLE. C'est la seule source de la nuit : un quartier de sodium renvoie sa lueur dans
    // le ciel bien au-dessus de l'horizon, et c'est elle que le sol mouillé, la chaussée et les carrosseries
    // réfléchissent. Elle était dix fois trop faible : hors du halo des candélabres, tout tombait dans le noir absolu
    // et le monde ressemblait à un radeau posé sur du vide.
    col += vec3(0.048, 0.030, 0.015) * exp(-abs(d.y) * 13.0);
    col += vec3(0.009, 0.006, 0.003) * exp(-abs(d.y) * 3.0);
    float moon = max(dot(d, SKY_MOON), 0.0);
    col += vec3(0.92, 0.94, 1.0) * smoothstep(0.99955, 0.99982, moon) * 2.4;
    col += vec3(0.26, 0.30, 0.40) * pow(moon, 900.0) * 0.55;
    // Halo large RESSERRÉ : à la puissance 14 il pâlissait la moitié du ciel et les étoiles se détachaient sur du
    // gris. Le ciel doit rester noir — c'est le noir qui fait les étoiles.
    col += vec3(0.05, 0.06, 0.09) * pow(moon, 44.0);
    // Étoiles et planètes : elles s'effacent dans les reflets rugueux, où elles ne feraient que scintiller.
    float sharp = exp(-bias * 1.1);
    col += vec3(0.86, 0.90, 1.0) * skyStars(d) * 0.75 * sharp * smoothstep(-0.06, 0.16, d.y);
    col += skyPlanet(d, normalize(vec3(0.72, 0.21, -0.66)), 0.042, vec3(0.94, 0.72, 0.46)) * sharp;
    col += skyPlanet(d, normalize(vec3(-0.78, 0.44, 0.44)), 0.021, vec3(0.62, 0.76, 0.92)) * sharp;
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
