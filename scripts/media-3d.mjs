// Véhicules 3D fournis (tools/3d) → modèles publiés, taillés pour le téléphone.
// Ce script n'est qu'un lanceur : la chaîne vit dans scripts/media-tools/build-3d.mjs, là où sont installés les outils
// lourds (`npm run media:setup`). Ce qui compte n'est pas le poids du fichier mais le coût par image : appels de
// dessin et triangles (voir le commentaire de build-3d.mjs).
// Usage : npm run media:3d
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TOOLS = join('scripts', 'media-tools');
if (!existsSync(join(TOOLS, 'node_modules', '@gltf-transform', 'functions'))) {
  console.error('Outils manquants : npm run media:setup');
  process.exit(1);
}

const OUT = 'public/models';
mkdirSync(OUT, { recursive: true });

/**
 * Modèles fournis par le porteur. `ratio` : part des triangles conservée par la simplification.
 * Le budget vise ≤ 90 000 triangles et ≤ 40 appels de dessin par véhicule — un téléphone tient alors la définition
 * maximale (DPR 2) au lieu de retomber à 1,25, ce qui rendait tout le site flou.
 */
const MODELS = [
  // MESURÉ (scripts/qa-perf.mjs) : à 0,4 la RS6 pesait 116 000 triangles par image — les trois quarts du coût de
  // TOUS les plans du nettoyage, sur un modèle qu'on regarde à cinq mètres sur un écran de téléphone. À 0,2 la
  // silhouette et les arêtes de tôle sont identiques à l'œil, et l'iPhone respire.
  // Textures en 512 : la carrosserie n'en a pas (sa laque est imposée par la scène), et une calandre de 512 px
  // occupe déjà plus de pixels à l'écran qu'elle n'en a. C'est la moitié de la mémoire vidéo du véhicule.
  { id: 'rs6', src: 'tools/3d/RS6/2020_audi_rs6_avant.glb', ratio: 0.2, textures: 512, mode: 'vehicle' },
  { id: 'chr', src: 'tools/3d/TOYOTA/source/MDL14246_reversed.glb', ratio: 0.25, textures: 512, mode: 'vehicle' },
  // L'univers : un nuage de 50 000 points colorés. On ne le simplifie pas — on le traverse.
  { id: 'galaxy', src: 'tools/3d/GALAXY/need_some_space.glb', ratio: 1, textures: 1024, mode: 'points' },
];

for (const model of MODELS) {
  if (!existsSync(model.src)) {
    console.warn(`absent : ${model.src}`);
    continue;
  }
  const out = join(OUT, `${model.id}.glb`);
  execFileSync(
    process.execPath,
    ['build-3d.mjs', join('..', '..', model.src), join('..', '..', out), String(model.ratio), String(model.textures), model.mode],
    { cwd: TOOLS, stdio: 'inherit' },
  );
}
