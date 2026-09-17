/** Vecteurs 3D en tuples, sans Three.js : le moteur calcule caméra et trajectoires avant (ou sans) la 3D. */
export type Vec3 = readonly [number, number, number];
export type MutableVec3 = [number, number, number];

export const vec3 = (x = 0, y = 0, z = 0): MutableVec3 => [x, y, z];

export function copyVec3(out: MutableVec3, a: Vec3): MutableVec3 {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

export function lerpVec3(out: MutableVec3, a: Vec3, b: Vec3, t: number): MutableVec3 {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

export const distanceVec3 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Symétrique de `b` par rapport à `a` (2a − b) : extrémité virtuelle d'une courbe. */
export const reflectVec3 = (a: Vec3, b: Vec3): MutableVec3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
