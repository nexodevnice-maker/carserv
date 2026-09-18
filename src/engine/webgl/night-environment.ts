import { DataTexture, EquirectangularReflectionMapping, FloatType, LinearFilter, PMREMGenerator, RGBAFormat, type Texture, type WebGLRenderer } from 'three';

/**
 * Environnement lumineux CALCULÉ, sans aucun fichier.
 *
 * Une carrosserie noire dans la nuit n'est qu'une silhouette : ce qui la fait exister, c'est ce qu'elle reflète. Ce
 * reflet venait d'une photographie 360° ; il est désormais fabriqué à l'exécution — même nuit que celle du shader
 * partagé (shared/night-glsl) : un dégradé profond du zénith vers l'horizon, la lueur chaude de la ville tout en bas,
 * et quelques étoiles. Rien à télécharger, rien à étalonner, et le reflet reste cohérent avec le monde.
 *
 * On produit une petite équirectangulaire en virgule flottante, puis le PMREM de Three.js en tire les niveaux de flou
 * dont les matériaux ont besoin. Coût : quelques millisecondes, une seule fois.
 */
export function createNightEnvironment(renderer: WebGLRenderer, size = 64): Texture {
  const width = size * 2;
  const height = size;
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    // Élévation : +1 au zénith, −1 au nadir.
    const elevation = Math.cos((y / (height - 1)) * Math.PI);
    const up = elevation * 0.5 + 0.5;
    const horizon = Math.exp(-Math.abs(elevation) * 12);
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      // Le ciel, puis la lueur de la ville sur l'horizon (plus forte d'un côté : une ville n'éclaire pas en rond).
      const side = 0.6 + 0.4 * Math.cos((x / width) * Math.PI * 2 + 1.1);
      data[i] = 0.05 + 0.10 * up + 0.42 * horizon * side;
      data[i + 1] = 0.055 + 0.11 * up + 0.30 * horizon * side;
      data[i + 2] = 0.08 + 0.17 * up + 0.19 * horizon * side;
      data[i + 3] = 1;
      // Quelques étoiles, seulement au-dessus de l'horizon.
      if (elevation > 0.05 && Math.random() < 0.004) {
        const star = 0.6 + Math.random() * 1.6;
        data[i] += star;
        data[i + 1] += star * 0.96;
        data[i + 2] += star * 0.9;
      }
    }
  }
  const equirect = new DataTexture(data, width, height, RGBAFormat, FloatType);
  equirect.mapping = EquirectangularReflectionMapping;
  equirect.minFilter = LinearFilter;
  equirect.magFilter = LinearFilter;
  equirect.generateMipmaps = false;
  equirect.needsUpdate = true;
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(equirect);
  pmrem.dispose();
  equirect.dispose();
  return target.texture;
}
