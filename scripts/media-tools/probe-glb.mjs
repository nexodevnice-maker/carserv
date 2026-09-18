// Sonde de contrôle d'un modèle fourni : où est le haut, où est la base, que contient-il vraiment.
// Un FBX converti n'a pas forcément l'axe vertical de la scène ; plutôt que de deviner, on mesure.
// Usage (depuis scripts/media-tools) : node probe-glb.mjs ../../tools/3d/CITY/city-raw.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { dequantize } from '@gltf-transform/functions';

const src = process.argv[2];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
await doc.transform(dequantize());
const root = doc.getRoot();

// Matrice monde d'un nœud (le glTF porte ses transformations dans la hiérarchie).
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const apply = (m, v) => [
  m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
  m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
  m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
];

const rows = [];
const walk = (node, parent) => {
  const world = mul(parent, node.getMatrix());
  const mesh = node.getMesh();
  if (mesh) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let verts = 0;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      verts += pos.getCount();
      for (let i = 0; i < pos.getCount(); i += 1) {
        const p = apply(world, pos.getElement(i, [0, 0, 0]));
        for (let a = 0; a < 3; a += 1) { if (p[a] < min[a]) min[a] = p[a]; if (p[a] > max[a]) max[a] = p[a]; }
      }
    }
    if (verts) rows.push({ name: node.getName() || mesh.getName(), verts, min, max, size: [0, 1, 2].map((a) => max[a] - min[a]) });
  }
  for (const child of node.listChildren()) walk(child, world);
};
for (const scene of root.listScenes()) for (const node of scene.listChildren()) walk(node, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

const f = (v) => v.map((x) => Number(x.toFixed(2))).join(', ');
const total = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const r of rows) for (let a = 0; a < 3; a += 1) { total.min[a] = Math.min(total.min[a], r.min[a]); total.max[a] = Math.max(total.max[a], r.max[a]); }

console.log(`${rows.length} maillages, ${root.listMaterials().length} matériaux, ${root.listTextures().length} textures`);
console.log(`boîte globale  min [${f(total.min)}]  max [${f(total.max)}]  taille [${f([0, 1, 2].map((a) => total.max[a] - total.min[a]))}]`);
rows.sort((a, b) => b.verts - a.verts);
for (const r of rows.slice(0, 24)) console.log(`  ${(r.name || '?').padEnd(28)} ${String(r.verts).padStart(7)} som  min [${f(r.min)}]  taille [${f(r.size)}]`);
