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
  { id: 'rs6', src: 'tools/3d/RS6/2020_audi_rs6_avant.glb', ratio: 0.4, textures: 1024 },
  { id: 'chr', src: 'tools/3d/TOYOTA/source/MDL14246_reversed.glb', ratio: 0.4, textures: 1024 },
];

for (const model of MODELS) {
  if (!existsSync(model.src)) {
    console.warn(`absent : ${model.src}`);
    continue;
  }
  const out = join(OUT, `${model.id}.glb`);
  execFileSync(
    process.execPath,
    ['build-3d.mjs', join('..', '..', model.src), join('..', '..', out), String(model.ratio), String(model.textures)],
    { cwd: TOOLS, stdio: 'inherit' },
  );
}
