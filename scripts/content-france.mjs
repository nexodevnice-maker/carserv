// Contour réel de la France métropolitaine, département par département, pour la carte 3D du voyage
// (« la France, puis les Alpes-Maritimes ») : projeté et simplifié au build, dans le MÊME repère que map-06.json —
// le 06 de la carte de France et le plateau du 06 sont donc le même objet, à la même échelle.
// Source : IGN Admin Express via github.com/gregoiredavid/france-geojson (departements-version-simplifiee.geojson,
// déposé dans qa-out/geo/departements.geojson).
// Usage : node scripts/content-france.mjs → src/experience/map-france.json
import { readFileSync, writeFileSync } from 'node:fs';

const geo = JSON.parse(readFileSync('qa-out/geo/departements.geojson', 'utf8'));
const dep06 = JSON.parse(readFileSync('src/experience/map-06.json', 'utf8'));

// Mercator : conforme (les formes locales sont justes), le nord vers −y comme la vue SVG du 06.
const merc = ([lon, lat]) => [(lon * Math.PI) / 180, -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];

const ringsOf = (feature) => {
  const g = feature.geometry;
  const polygons = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  // Anneau extérieur de chaque polygone (les enclaves ne se lisent pas à cette échelle).
  return polygons.map((polygon) => polygon[0].map(merc));
};

const features = geo.features.filter((f) => /^(\d{2}|2A|2B)$/.test(f.properties.code));
const rings06 = ringsOf(features.find((f) => f.properties.code === '06'));

// Calage : la boîte du 06 en Mercator → la boîte du 06 dans map-06.json (0…width, 0…height). Tout le reste suit.
const flat06 = rings06.flat();
const bounds = (points) => [
  Math.min(...points.map(([x]) => x)),
  Math.max(...points.map(([x]) => x)),
  Math.min(...points.map(([, y]) => y)),
  Math.max(...points.map(([, y]) => y)),
];
const [minX, maxX, minY, maxY] = bounds(flat06);
const scale = dep06.width / (maxX - minX);
// Le 06 de map-06.json est légèrement plus haut que large dans ses propres unités : le calage garde le rapport
// (Mercator est conforme, un seul facteur suffit) et centre la hauteur.
const offsetY = (dep06.height - (maxY - minY) * scale) / 2;
const toView = ([x, y]) => [(x - minX) * scale, (y - minY) * scale + offsetY];

/** Douglas-Peucker (tolérance en unités de la vue). */
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

/** Anneau fermé (premier point = dernier) : coupé au point le plus éloigné du départ, chaque moitié simplifiée. */
function simplifyRing(points, tolerance) {
  let far = 1;
  for (let i = 1; i < points.length; i++)
    if (Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]) > Math.hypot(points[far][0] - points[0][0], points[far][1] - points[0][1])) far = i;
  return [...simplify(points.slice(0, far + 1), tolerance).slice(0, -1), ...simplify(points.slice(far), tolerance)];
}

const path = (ring) => `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;

// Tolérance en unités du 06 (1 unité ≈ 90 m réels) : le trait reste net vu de 15 km, léger à charger.
const TOLERANCE = 34;
const departements = features
  .map((f) => {
    const rings = ringsOf(f)
      .map((ring) => simplifyRing(ring.map(toView), TOLERANCE))
      .filter((ring) => ring.length > 3)
      .sort((a, b) => b.length - a.length);
    return { code: f.properties.code, nom: f.properties.nom, paths: rings.map(path) };
  })
  .filter((d) => d.paths.length);

const all = departements.flatMap((d) => d.paths.join('').match(/-?\d+(?:\.\d+)?/g).map(Number));
const xs = all.filter((_, i) => i % 2 === 0);
const ys = all.filter((_, i) => i % 2 === 1);
const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];

const out = {
  source: 'IGN Admin Express via github.com/gregoiredavid/france-geojson (departements-version-simplifiee)',
  license: 'Données IGN (licence ouverte) — attribution à confirmer',
  projection: 'Mercator, calée sur la boîte du 06 de map-06.json (mêmes unités : 1 unité ≈ 90 m réels)',
  /** Boîte de la France entière dans ces unités : [minX, minY, maxX, maxY]. */
  box: box.map((v) => Number(v.toFixed(1))),
  /** Code du département où se déroule le récit. */
  home: '06',
  count: departements.length,
  departements,
};
writeFileSync('src/experience/map-france.json', `${JSON.stringify(out)}\n`);
const points = departements.reduce((n, d) => n + d.paths.join('').split('L').length, 0);
console.log(`map-france.json — ${departements.length} départements, ${points} points, boîte ${out.box.join(' ')}`);
