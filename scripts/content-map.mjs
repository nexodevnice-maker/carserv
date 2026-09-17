// Contour réel des Alpes-Maritimes (06) pour la section « Déplacement dans tout le 06 » : projeté et simplifié au
// build (technique MECA RIVIERA : trait de côte calculé une fois, jamais dessiné à la main).
// Source : IGN Admin Express COG 2018, via github.com/gregoiredavid/france-geojson (qa-out/geo/dep06.geojson).
// Usage : node scripts/content-map.mjs → src/experience/map-06.json
import { readFileSync, writeFileSync } from 'node:fs';

const geo = JSON.parse(readFileSync('qa-out/geo/dep06.geojson', 'utf8'));
const polygons = geo.geometry.type === 'MultiPolygon' ? geo.geometry.coordinates : [geo.geometry.coordinates];
const rings = polygons.map((polygon) => polygon[0]);
const all = rings.flat();
const lat0 = all.reduce((s, [, lat]) => s + lat, 0) / all.length;
const k = Math.cos((lat0 * Math.PI) / 180);
const project = ([lon, lat]) => [lon * k, -lat];
const projected = rings.map((ring) => ring.map(project));
const xs = projected.flat().map(([x]) => x);
const ys = projected.flat().map(([, y]) => y);
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const WIDTH = 1000;
const scale = WIDTH / (maxX - minX);
const height = Math.round((maxY - minY) * scale);
const toView = ([x, y]) => [(x - minX) * scale, (y - minY) * scale];

// Douglas-Peucker (tolérance en unités de la vue).
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const d = Math.abs(dy * px - dx * py + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [a, b];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

// Anneau fermé (premier point = dernier) : coupé au point le plus éloigné du départ, chaque moitié simplifiée.
function simplifyRing(points, tolerance) {
  let far = 1;
  for (let i = 1; i < points.length; i++)
    if (Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]) > Math.hypot(points[far][0] - points[0][0], points[far][1] - points[0][1])) far = i;
  return [...simplify(points.slice(0, far + 1), tolerance).slice(0, -1), ...simplify(points.slice(far), tolerance)];
}

const paths = projected
  .map((ring) => simplifyRing(ring.map(toView), 0.8))
  .filter((ring) => ring.length > 3)
  .sort((a, b) => b.length - a.length)
  .map((ring) => `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`);

const out = {
  source: 'IGN Admin Express COG 2018 via github.com/gregoiredavid/france-geojson (département 06)',
  license: 'Données IGN (licence ouverte) — attribution à confirmer',
  viewBox: `0 0 ${WIDTH} ${height}`,
  width: WIDTH,
  height,
  /** Le continent d'abord, puis les îles. */
  paths,
};
writeFileSync('src/experience/map-06.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`map-06.json : ${paths.length} tracés, ${paths.reduce((s, p) => s + p.length, 0)} caractères, vue ${WIDTH}×${height}`);
