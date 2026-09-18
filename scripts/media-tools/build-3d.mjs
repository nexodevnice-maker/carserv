// Chaîne 3D — exécutée DANS scripts/media-tools (c'est là que vivent les outils lourds).
// Lancée par `npm run media:3d` (scripts/media-3d.mjs), jamais par le build du site.
//
// Le problème résolu ici n'est pas le poids du fichier : c'est le COÛT PAR IMAGE au téléphone.
// Les modèles fournis sortent d'un export Sketchfab : une armature (`_rootJoint`), 1 480 nœuds, 475 maillages —
// soit ~750 appels de dessin par image. Un téléphone n'en tient pas 60 fois par seconde : la définition adaptative
// tombait à 1,25 et TOUT le site devenait flou.
//
// Étapes, dans cet ordre (l'ordre compte) :
//   1. supprimer animations et peaux         — sans elles, les transformations peuvent être figées
//   2. déquantifier                          — nécessaire avant d'aplatir
//   3. élaguer + dédoublonner                — enlève ce qui ne sert à rien
//   4. aplatir (flatten) + fusionner (join)  — 750 appels de dessin → un par matériau
//   5. souder (weld) + simplifier            — moitié moins de triangles, silhouette conservée
//   6. textures WebP bornées                 — mémoire GPU
//   7. quantifier + compresser (meshopt)     — poids du fichier
// Les noms de matériaux sont conservés : la scène s'en sert pour masquer emblèmes et plaques.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, dequantize, flatten, join, meshopt, prune, quantize, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [src, out, ratioArg, sizeArg, modeArg] = process.argv.slice(2);
const ratio = Number(ratioArg ?? 0.45);
const size = Number(sizeArg ?? 1024);
/**
 * `mode` : `vehicle` (chaîne complète), `scene` (décor : on fusionne et on compresse, mais on ne simplifie pas une
 * géométrie déjà basse), `points` (nuage de points : ni soudure ni simplification — elles n'ont aucun sens sur des
 * points, et les détruiraient).
 */
const mode = modeArg ?? 'vehicle';

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptEncoder, 'meshopt.encoder': MeshoptEncoder });
const document = await io.read(src);
const root = document.getRoot();

const count = () => {
  let triangles = 0;
  for (const mesh of root.listMeshes())
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      triangles += (indices ? indices.getCount() : (primitive.getAttribute('POSITION')?.getCount() ?? 0)) / 3;
    }
  return { meshes: root.listMeshes().length, nodes: root.listNodes().length, triangles: Math.round(triangles), materials: root.listMaterials().length };
};
const before = count();

// 1. Une voiture posée n'a besoin ni d'animation ni de squelette : ce sont eux qui interdisent la fusion.
for (const animation of root.listAnimations()) animation.dispose();
for (const node of root.listNodes()) node.setSkin(null);
for (const skin of root.listSkins()) skin.dispose();

const steps =
  mode === 'points'
    ? [prune({ keepAttributes: true, keepLeaves: false }), dedup()]
    : mode === 'scene'
      ? [
          dequantize(),
          prune({ keepAttributes: false, keepLeaves: false, keepSolidTextures: false }),
          dedup(),
          flatten(),
          join({ keepNamed: true }),
          textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size] }),
          quantize(),
          meshopt({ encoder: MeshoptEncoder, level: 'high' }),
        ]
      : [
          dequantize(),
          prune({ keepAttributes: false, keepLeaves: false, keepSolidTextures: false }),
          dedup(),
          flatten(),
          join({ keepNamed: false }),
          weld(),
          simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0012, lockBorder: false }),
          textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size] }),
          quantize(),
          meshopt({ encoder: MeshoptEncoder, level: 'high' }),
        ];
await document.transform(...steps);

await io.write(out, document);
const after = count();
const mo = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(2)} Mo`;
console.log(
  `${out}\n   ${mo(src)} → ${mo(out)} | maillages ${before.meshes} → ${after.meshes} | nœuds ${before.nodes} → ${after.nodes} | ` +
    `triangles ${before.triangles.toLocaleString('fr')} → ${after.triangles.toLocaleString('fr')} | matériaux ${before.materials} → ${after.materials}`,
);
