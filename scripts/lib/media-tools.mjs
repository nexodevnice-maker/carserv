// ffmpeg et ffprobe du pipeline vidéo, installés à part (scripts/media-tools) : ffprobe-static pèse 336 Mo et
// ffmpeg-static télécharge son binaire à l'installation — ni l'un ni l'autre ne doit entrer dans le `npm ci` du
// déploiement (Cloudflare Pages), comme sur MECA RIVIERA dont le paquet ne contient que ce que le build utilise.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../media-tools/package.json', import.meta.url));

export function mediaTools() {
  try {
    return { ffmpeg: require('ffmpeg-static'), ffprobe: require('ffprobe-static').path };
  } catch {
    throw new Error('Outils vidéo absents : lancer `npm run media:setup` (une fois).');
  }
}
