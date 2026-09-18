// Véhicules 3D fournis (tools/3d) → modèles publiés, allégés pour le téléphone.
// Chaîne : gltf-transform (dédoublonnage, élagage, textures WebP 1024, quantification + compression meshopt) — la
// géométrie et les matériaux restent ceux du modèle fourni, seul le poids change. Décodage à l'exécution par
// MeshoptDecoder (three/addons), comme sur MECA RIVIERA.
// Usage : npm run media:3d   (après npm run media:setup)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CLI = join('scripts', 'media-tools', 'node_modules', '.bin', process.platform === 'win32' ? 'gltf-transform.cmd' : 'gltf-transform');
if (!existsSync(CLI)) {
  console.error('Outils manquants : npm run media:setup (puis npm i -D @gltf-transform/cli dans scripts/media-tools)');
  process.exit(1);
}

const OUT = 'public/models';
mkdirSync(OUT, { recursive: true });

/** Modèles fournis par le porteur. Aucune retouche de forme : on ne fait que compresser. */
const MODELS = [
  { id: 'rs6', src: 'tools/3d/RS6/2020_audi_rs6_avant.glb', textures: 1024 },
  { id: 'chr', src: 'tools/3d/TOYOTA/source/MDL14246_reversed.glb', textures: 1024 },
];

const mo = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(2)} Mo`;

for (const model of MODELS) {
  if (!existsSync(model.src)) {
    console.warn(`absent : ${model.src}`);
    continue;
  }
  const out = join(OUT, `${model.id}.glb`);
  execFileSync(
    CLI,
    [
      'optimize',
      model.src,
      out,
      '--compress',
      'meshopt',
      '--texture-compress',
      'webp',
      '--texture-size',
      String(model.textures),
      '--simplify',
      'false',
      '--join',
      'true',
      '--flatten',
      'true',
      '--instance',
      'false',
    ],
    // Windows : le lanceur est un .cmd, il faut passer par le shell.
    { stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' },
  );
  console.log(`${out}  ${mo(model.src)} → ${mo(out)}`);
}
