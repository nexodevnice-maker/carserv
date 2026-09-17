# CAR SERVICE 06

@00_CONTROL_PLANE/CLAUDE.md

## État

Maquette complète en ligne le 17/09/2026 (https://carservice.nexodevnice.workers.dev, 60/60 `npm run qa:engine`). Lire avant tout :
`docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/MEDIA_INVENTORY.md`, `docs/EXPERIENCE_GRAMMAR.md`.

## Règles du code

- `src/engine/` est générique : aucune donnée, aucun texte, aucune couleur CAR SERVICE 06.
- Un fait commercial vit dans `src/domain/` avec statut et source ; jamais écrit en dur dans une page ou une scène.
- Une valeur de réglage vit dans `src/experience/config.ts`, un rythme dans `src/experience/chapters.ts`, une couleur
  ou une typographie dans `src/styles/tokens.css`.
- Une seule boucle (`scheduler`), une seule lecture du scroll, un seul état : une scène s'abonne avec
  `experience.use(phase, …)` et ne crée jamais son propre `requestAnimationFrame` ni son écouteur de scroll.
- Clés en position locale de chapitre ; aucun état visuel piloté par le temps qui ne se reconstruise depuis `p`.
- Tout média passe par le pipeline (`scripts/media-*.mjs`) et le registre ; aucune plaque, interface ou logo mis en
  avant dans un fichier publié.
- Commentaires en français, sobres, qui disent pourquoi.

## Déployer

- Code : ce dossier est un dépôt git relié à **`nexodevnice-maker/carserv`** (`main`) → `git push` (identifiants dans
  le gestionnaire de Git).
- Site : Cloudflare **Worker** `carservice` (pas Pages) → **`npm run deploy`** (wrangler connecté ; `wrangler.jsonc`
  construit et publie `dist`) → https://carservice.nexodevnice.workers.dev.
- Puis `npm run qa:engine -- https://carservice.nexodevnice.workers.dev` et regarder les captures.
- La production Cloudflare ignore les requêtes Range : vidéo de scrub en URL blob, séquence regroupée avec sonde.
- `npm run deploy:prepare -- --simulate` : `npm ci` + `wrangler deploy --dry-run` sur copie vierge (et lots d'envoi web
  si git n'est pas disponible). Le paquet du site ne contient que ce que le build utilise ; les outils vidéo vivent
dans `scripts/media-tools` (`npm run media:setup`). Jamais de dossier de plus de 100 fichiers publiés.

## Vérifier

`npm run typecheck`, `npm run build`, puis serveur (`npm run dev` ou `npm run preview`) et `npm run qa:engine`.
La compilation n'est pas une validation visuelle : regarder les captures `qa-out/engine/` et le navigateur.
Jamais deux navigateurs 3D headless en même temps.
