// Gate de publication (repris de MECA RIVIERA) : liste chaque information de src/domain qui n'est pas CONFIRMED, et les
// médias dont les droits restent à confirmer (src/experience/media.ts).
// Usage : npm run content:check [-- --strict]   (--strict : code de sortie 1 s'il reste des points)
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

// Les modules TypeScript du projet s'importent sans extension et lisent du JSON sans attribut (conventions Vite) :
// Node les résout ici.
registerHooks({
  load(url, context, next) {
    if (url.startsWith('file:') && url.endsWith('.json'))
      return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
    return next(url, context);
  },
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.(m?[jt]s|json)$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        /* chemin tel quel */
      }
    }
    return next(specifier, context);
  },
});

const { SOURCES } = await import('../src/domain/facts.ts');
const modules = {
  property: await import('../src/domain/property.ts'),
  services: await import('../src/domain/services.ts'),
  rental: await import('../src/domain/rental.ts'),
};

const rows = [];
function visit(path, node) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.status === 'string' && typeof node.source === 'string') {
    if (node.status !== 'CONFIRMED') rows.push({ path, status: node.status, note: node.note ?? '', source: SOURCES[node.source] ?? node.source });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => visit(`${path}.${item?.id ?? i}`, item));
    return;
  }
  for (const [key, value] of Object.entries(node)) visit(path ? `${path}.${key}` : key, value);
}
for (const [name, module] of Object.entries(modules))
  for (const [key, value] of Object.entries(module)) visit(key === name ? name : `${name}.${key}`, value);

console.log(rows.length ? `${rows.length} information(s) à valider avant publication :\n` : 'Contenu : tout est CONFIRMED.');
for (const r of rows) {
  console.log(`  [${r.status}] ${r.path}`);
  console.log(`      source : ${r.source}`);
  if (r.note) console.log(`      note   : ${r.note}`);
}

const media = [];
try {
  const { media: descriptors } = await import('../src/experience/media.ts');
  for (const d of descriptors) if (/TO_CONFIRM|UNKNOWN/.test(d.license)) media.push(d);
} catch (error) {
  console.warn(`\n(médias non vérifiés : ${error.message})`);
}
if (media.length) {
  console.log(`\n${media.length} média(s) aux droits à confirmer :`);
  for (const d of media) console.log(`  ${d.id} — ${d.license}`);
}
console.log('\nAvant publication : retirer le laboratoire (src/pages/lab), définir SITE_URL, mentions légales.');

if (process.argv.includes('--strict') && (rows.length || media.length)) process.exit(1);
