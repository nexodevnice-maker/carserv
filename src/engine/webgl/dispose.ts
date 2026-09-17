import type { Material, Mesh, Object3D, Texture } from 'three';

/** Libère tout ce qu'un matériau tient sur le GPU : textures de ses propriétés et de ses uniformes, puis programme. */
export function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) if ((value as Texture | null)?.isTexture) (value as Texture).dispose();
  const uniforms = (material as Material & { uniforms?: Record<string, { value: unknown }> }).uniforms;
  if (uniforms) for (const { value } of Object.values(uniforms)) if ((value as Texture | null)?.isTexture) (value as Texture).dispose();
  material.dispose();
}

/** Libère un sous-arbre : géométries, matériaux, textures. Retire l'objet de son parent. */
export function disposeObject(root: Object3D) {
  root.traverse((node) => {
    const mesh = node as Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
  root.removeFromParent();
}
