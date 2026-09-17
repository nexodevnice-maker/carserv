import { distanceVec3, reflectVec3, type MutableVec3, type Vec3 } from '../math/vec3';

/**
 * Trajectoire lisse passant par des points : Catmull-Rom centripète (α = 0,5 — ni boucle ni pointe, même quand les
 * points sont serrés), paramétrée par longueur de corde. Continuité de tangente à chaque point : la caméra ne casse
 * jamais sa direction en passant un plan (comme la trajectoire globale de MECA RIVIERA), et des points de passage
 * dessinent un arc voulu (contourner un capot, s'accroupir en avançant).
 * Aucune allocation à l'évaluation.
 */
export interface Path {
  readonly length: number;
  /** Distance (le long des cordes) du point `i`. */
  distanceOf(i: number): number;
  /** Point à la distance `d` ∈ [0, length]. */
  at(out: MutableVec3, d: number): MutableVec3;
}

const EPS = 1e-4;

export function createPath(points: readonly Vec3[], alpha = 0.5): Path {
  const n = points.length;
  if (!n) throw new Error('[path] trajectoire vide');
  const cumulative = new Float64Array(n);
  for (let i = 1; i < n; i++) cumulative[i] = (cumulative[i - 1] ?? 0) + distanceVec3(points[i - 1] as Vec3, points[i] as Vec3);
  const total = cumulative[n - 1] ?? 0;
  // Extrémités virtuelles (symétriques) : la courbe part et arrive dans l'axe de son premier et dernier segment.
  const head = n > 1 ? reflectVec3(points[0] as Vec3, points[1] as Vec3) : ([...(points[0] as Vec3)] as MutableVec3);
  const tail = n > 1 ? reflectVec3(points[n - 1] as Vec3, points[n - 2] as Vec3) : head;

  const knot = (a: Vec3, b: Vec3) => Math.max(distanceVec3(a, b) ** alpha, EPS);

  return {
    length: total,
    distanceOf: (i) => cumulative[Math.min(Math.max(i, 0), n - 1)] ?? 0,
    at(out, d) {
      if (n === 1 || total <= 0) {
        const p = points[0] as Vec3;
        out[0] = p[0];
        out[1] = p[1];
        out[2] = p[2];
        return out;
      }
      const target = Math.min(Math.max(d, 0), total);
      let i = 0;
      while (i < n - 2 && target > (cumulative[i + 1] ?? 0)) i++;
      const from = cumulative[i] ?? 0;
      const to = cumulative[i + 1] ?? from;
      const t = to > from ? (target - from) / (to - from) : 0;
      const p0 = i > 0 ? (points[i - 1] as Vec3) : head;
      const p1 = points[i] as Vec3;
      const p2 = points[i + 1] as Vec3;
      const p3 = i + 2 < n ? (points[i + 2] as Vec3) : tail;
      // Forme pyramidale de Barry-Goldman.
      const t1 = knot(p0, p1);
      const t2 = t1 + knot(p1, p2);
      const t3 = t2 + knot(p2, p3);
      const tt = t1 + (t2 - t1) * t;
      for (let c = 0; c < 3; c++) {
        const a1 = ((t1 - tt) / t1) * (p0[c] as number) + (tt / t1) * (p1[c] as number);
        const a2 = ((t2 - tt) / (t2 - t1)) * (p1[c] as number) + ((tt - t1) / (t2 - t1)) * (p2[c] as number);
        const a3 = ((t3 - tt) / (t3 - t2)) * (p2[c] as number) + ((tt - t2) / (t3 - t2)) * (p3[c] as number);
        const b1 = ((t2 - tt) / t2) * a1 + (tt / t2) * a2;
        const b2 = ((t3 - tt) / (t3 - t1)) * a2 + ((tt - t1) / (t3 - t1)) * a3;
        out[c] = ((t2 - tt) / (t2 - t1)) * b1 + ((tt - t1) / (t2 - t1)) * b2;
      }
      return out;
    },
  };
}
