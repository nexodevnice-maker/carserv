// Envoi vers GitHub (nexodevnice-maker/carservice) puis déploiement Cloudflare (Worker « carservice ») — méthode
// MECA RIVIERA : un dossier prêt à glisser dans l'envoi web GitHub (« Add file → Upload files »), puis la simulation
// sur une copie vierge (npm ci, npx wrangler deploy --dry-run), avant de dire au porteur de l'envoyer.
//
// Contraintes de l'envoi web GitHub, vérifiées ici : 100 fichiers au plus par envoi (lots `envoi-N`), 25 Mio au plus
// par fichier. Cloudflare construit sous Linux : la casse des imports est vérifiée (Windows ne la voit pas).
// Exclus : node_modules, dist, .astro, qa-out, tools (sources de 27 et 44 Mo), fichiers cachés (.claude, .gitignore).
//
// Usage : npm run deploy:prepare [-- --simulate]
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = resolve(ROOT, '..', 'carservice-envoi-github');
const BATCH = 95;
const MAX_BYTES = 25 * 1024 * 1024;
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.astro', 'qa-out', 'tools', '.git', '.vite']);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

// Documentation en dernier : le premier lot contient tout ce que le build utilise — Cloudflare construit à chaque
// envoi, le premier doit déjà réussir.
const isDoc = (f) => /^(docs\/|\d\d_[A-Z_]+\/|CLAUDE\.md$)/.test(f);
const files = walk(ROOT)
  .map((path) => relative(ROOT, path).replaceAll('\\', '/'))
  .sort((a, b) => Number(isDoc(a)) - Number(isDoc(b)) || a.localeCompare(b));

// — Limites GitHub.
const heavy = files.filter((f) => statSync(join(ROOT, f)).size > MAX_BYTES);
if (heavy.length) throw new Error(`Fichiers > 25 Mio (refusés par l'envoi web GitHub) : ${heavy.join(', ')}`);

// — Casse exacte des imports relatifs (Linux).
const exactCase = (absolute) => {
  let current = resolve(absolute);
  const root = resolve(ROOT);
  while (current !== root && current.startsWith(root)) {
    const name = current.slice(dirname(current).length + 1);
    if (!readdirSync(dirname(current)).includes(name)) return false;
    current = dirname(current);
  }
  return true;
};
const problems = [];
for (const file of files.filter((f) => /\.(ts|astro|mjs)$/.test(f))) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  for (const [, specifier] of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const base = resolve(ROOT, dirname(file), specifier);
    const candidates = [base, `${base}.ts`, `${base}.mjs`, `${base}.astro`, join(base, 'index.ts')];
    const found = candidates.find((c) => existsSync(c) && statSync(c).isFile());
    if (!found) problems.push(`${file} → ${specifier} (introuvable)`);
    else if (!exactCase(found)) problems.push(`${file} → ${specifier} (casse différente sur disque)`);
  }
}
if (problems.length) throw new Error(`Imports invalides sous Linux :\n  ${problems.join('\n  ')}`);

// — Lots d'envoi (arborescence conservée dans chaque lot).
rmSync(OUT, { recursive: true, force: true });
const batches = [];
for (let k = 0; k < files.length; k += BATCH) batches.push(files.slice(k, k + BATCH));
batches.forEach((batch, k) => {
  const dir = join(OUT, `envoi-${k + 1}`);
  for (const file of batch) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(join(ROOT, file), join(dir, file));
  }
  const bytes = batch.reduce((sum, f) => sum + statSync(join(ROOT, f)).size, 0);
  console.log(`envoi-${k + 1} : ${batch.length} fichiers, ${(bytes / 1048576).toFixed(1)} Mio`);
});
console.log(`${files.length} fichiers → ${OUT}`);

// — Simulation Cloudflare Pages : dépôt reconstitué depuis les lots, npm ci, npm run build.
if (process.argv.includes('--simulate')) {
  // Dossier neuf à chaque simulation : une simulation interrompue peut laisser l'ancien verrouillé (npm ci en cours).
  const sim = join(tmpdir(), `carservice-cloudflare-${Date.now()}`);
  mkdirSync(sim, { recursive: true });
  for (const k of batches.keys()) cpSync(join(OUT, `envoi-${k + 1}`), sim, { recursive: true });
  const run = (command) => {
    console.log(`\n$ ${command}   (${sim})`);
    execSync(command, { cwd: sim, stdio: 'inherit', env: { ...process.env, SITE_URL: '', CI: '1' } });
  };
  run('npm ci');
  // Commande de déploiement du projet Cloudflare (Worker) : build Astro (wrangler.jsonc → build.command) puis
  // vérification de la publication de dist, sans rien envoyer.
  run('npx --yes wrangler@4 deploy --dry-run');
  const dist = join(sim, 'dist');
  const built = readdirSync(dist, { recursive: true }).filter((f) => statSync(join(dist, f)).isFile());
  const tooBig = built.filter((f) => statSync(join(dist, f)).size > MAX_BYTES);
  console.log(`\nBuild simulé : ${built.length} fichiers dans dist${tooBig.length ? ` — > 25 Mio (limite Cloudflare) : ${tooBig.join(', ')}` : ''}`);
  if (tooBig.length) process.exit(1);
  console.log(`Copie simulée conservée : ${sim}`);
}
