// Pré-calcule l'environnement lumineux tiré de l'HDRI fourni (tools/3d/rogland_clear_night_4k.hdr) :
// PMREM au format CubeUV de Three.js, encodé en Radiance HDR (repris de MECA RIVIERA, scripts/bake-env.mjs).
// L'HDRI n'est JAMAIS un décor visible (paysage désertique, 4K équirectangulaire trop peu défini en arrière-plan) :
// seulement une lumière de nuit pour des reflets, si une scène en a l'usage (voir docs/DECISIONS.md).
// Deux tailles : cube 256 (bureau, tablette) et 128 (mobile). À l'exécution : src/engine/webgl/environment.ts.
// Usage : npm run media:env
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, posix } from 'node:path';
import { FloatType } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { launch } from './lib/browser.mjs';
import { encodeHdr, floatToRgbe } from './lib/hdr.mjs';

const SOURCE = 'tools/3d/rogland_clear_night_4k.hdr';
const OUT = 'public/env';
const SIZES = [
  { cube: 256, file: 'night-256.hdr' },
  { cube: 128, file: 'night-128.hdr' },
];

const buffer = readFileSync(SOURCE);
const hdr = new HDRLoader().setDataType(FloatType).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
console.log(`source ${hdr.width}×${hdr.height}`);

/** Réduction par moyenne de boîte (conserve l'énergie), lignes remises dans l'ordre GL (bas → haut). */
function downscale(width) {
  const factor = hdr.width / width;
  const height = width / 2;
  const out = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = ((height - 1 - y) * width + x) * 4;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * hdr.width + x * factor + dx) * 4;
          out[o] += hdr.data[i];
          out[o + 1] += hdr.data[i + 1];
          out[o + 2] += hdr.data[i + 2];
        }
      }
      const n = factor * factor;
      out[o] /= n;
      out[o + 1] /= n;
      out[o + 2] /= n;
      out[o + 3] = 1;
    }
  }
  return { width, height, data: out };
}

const ORIGIN = 'http://bake.local';
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
window.bake = (b64, width, height) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const data = new Float32Array(bytes.buffer);
  const renderer = new THREE.WebGLRenderer();
  const source = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.LinearSRGBColorSpace;
  source.minFilter = THREE.LinearFilter;
  source.magFilter = THREE.LinearFilter;
  source.flipY = false;
  source.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  const w = target.width, h = target.height;
  const floatTarget = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: false });
  const copy = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { map: { value: target.texture } },
    vertexShader: 'in vec3 position; void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'precision highp float; uniform sampler2D map; out vec4 color; void main() { color = texelFetch(map, ivec2(gl_FragCoord.xy), 0); }',
  }));
  copy.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(copy);
  renderer.setRenderTarget(floatTarget);
  renderer.render(scene, new THREE.Camera());
  renderer.setRenderTarget(null);
  const out = new Float32Array(w * h * 4);
  renderer.readRenderTargetPixels(floatTarget, 0, 0, w, h, out);
  const raw = new Uint8Array(out.buffer);
  let binary = '';
  for (let i = 0; i < raw.length; i += 0x8000) binary += String.fromCharCode(...raw.subarray(i, i + 0x8000));
  renderer.dispose();
  return { width: w, height: h, data: btoa(binary) };
};
window.bakeReady = true;
</script></body></html>`;

mkdirSync(OUT, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.route(`${ORIGIN}/**`, (route) => {
  const path = posix.normalize(new URL(route.request().url()).pathname);
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: HTML });
  if (!path.startsWith('/node_modules/three/')) return route.fulfill({ status: 404, body: '' });
  const file = join(process.cwd(), path);
  return route.fulfill({ contentType: extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream', body: readFileSync(file) });
});
await page.goto(`${ORIGIN}/`);
await page.waitForFunction(() => window.bakeReady === true);

for (const { cube, file } of SIZES) {
  const equirect = downscale(cube * 4);
  const b64 = Buffer.from(equirect.data.buffer).toString('base64');
  const { width, height, data } = await page.evaluate(([d, w, h]) => window.bake(d, w, h), [b64, equirect.width, equirect.height]);
  const bytes = Buffer.from(data, 'base64');
  const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  let max = 0;
  let sum = 0;
  for (let i = 0; i < floats.length; i += 4) {
    const l = 0.2126 * floats[i] + 0.7152 * floats[i + 1] + 0.0722 * floats[i + 2];
    sum += l;
    if (l > max) max = l;
  }
  const path = join(OUT, file);
  writeFileSync(path, encodeHdr(width, height, floatToRgbe(floats, width, height)));
  console.log(`${path}  CubeUV ${width}×${height} (cube ${cube})  ${(statSync(path).size / 1024).toFixed(0)} Ko  luminance moyenne ${(sum / (floats.length / 4)).toFixed(3)}, max ${max.toFixed(2)}`);
}
await browser.close();
