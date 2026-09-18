import {
  CubeUVReflectionMapping,
  DataTexture,
  LinearFilter,
  LinearSRGBColorSpace,
  RGBAFormat,
  type Texture,
} from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/**
 * Environnement lumineux pré-calculé (repris de MECA RIVIERA, `bakedStudio`) : un PMREM au format CubeUV de Three.js,
 * encodé en Radiance HDR par scripts/media-env.mjs. À l'exécution, aucun rendu ni shader de flou : le fichier est
 * décodé et utilisé tel quel (quelques centaines de Ko au lieu d'une équirectangulaire 4K de 27 Mo).
 * Retourne null si le fichier manque ou est illisible : la scène garde son éclairage de repli.
 */
export async function loadBakedEnvironment(url: string, signal?: AbortSignal, prefetched?: Promise<ArrayBuffer>): Promise<Texture | null> {
  try {
    // `prefetched` : le téléchargement a pu être lancé dès le démarrage de la page, avant même que la scène existe.
    let buffer: ArrayBuffer;
    if (prefetched) buffer = await prefetched;
    else {
      const response = await fetch(url, { signal });
      if (!response.ok) return null;
      buffer = await response.arrayBuffer();
    }
    const hdr = new HDRLoader().parse(buffer);
    const texture = new DataTexture(hdr.data, hdr.width, hdr.height, RGBAFormat, hdr.type);
    texture.mapping = CubeUVReflectionMapping;
    texture.colorSpace = LinearSRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') console.warn('[environment]', url, error);
    return null;
  }
}
