# CAR SERVICE 06 — Décisions

Format : décision → raison → mesure ou source. Les décisions remplacées restent, barrées par une entrée datée.

## 2026-09-17 — Socle (phase architecture)

### Technologies retenues

| Technologie | Raison |
|---|---|
| Astro 7 (statique) + TypeScript strict | pile en production sur nexodev.pages.dev (MECA RIVIERA) ; HTML complet et indexable sans script ; îlots de script ciblés |
| Défilement natif + moteur maison | élan, clavier, recherche, ancres et lecteurs d'écran restent ceux du navigateur ; MECA l'a validé sans bibliothèque |
| Three.js 0.186 en import dynamique | seule dépendance 3D ; jamais téléchargée si aucune couche n'est requise (accueil : 9,4 Kio de moteur gzip) |
| H.264 GOP 5 sans B-frames | pattern mesuré sur Agenceeimoo : un retour arrière ne redécode jamais plus de 5 images |
| Séquence d'images WebP (mobile) | repli certain du scrub (aucun seek décodeur, insensible au mode économie d'énergie iOS) — Agenceeimoo |
| PMREM pré-calculé (CubeUV RGBE) | MECA : aucun shader de flou à l'exécution ; 447 Kio au lieu de 26,6 Mio |
| ffmpeg-static, ffprobe-static | aucun ffmpeg sur la machine ; la vidéo doit être mesurée et ré-encodée de façon reproductible |
| sharp, playwright-core, axe-core | affiches AVIF/WebP ; QA dans les navigateurs locaux avec GPU réel ; audit WCAG |

### Technologies rejetées

| Technologie | Raison |
|---|---|
| GSAP / ScrollTrigger | une timeline concurrente de l'état maître ; Agenceeimoo en a montré le coût (plusieurs propriétaires du temps) ; l'amorti, le ressort et les rythmes existent déjà et sont validés |
| Lenis (smooth scroll) | détourne la molette et le toucher ; dégrade clavier, ancres, accessibilité ; le lissage est fait sur la progression, pas sur le défilement |
| React Three Fiber / React | aucun besoin de réconciliation UI ; ajouterait un runtime et une boucle de rendu parallèle au scheduler unique |
| `@astrojs/check` | non installé : compatibilité avec TypeScript 7 non vérifiée, MECA ne l'utilisait pas ; `tsc --noEmit` couvre le moteur (les `.astro` restent contrôlés par le build et la QA) — à réévaluer |
| VP9 / AV1 en complément | H.264 est lu par tous les navigateurs cibles ; Agenceeimoo : VP9 s'effondre en intra dense ; un second encodage doublerait le poids sans gain mesuré |
| WebCodecs pour le scrub | prometteur mais non mesuré sur appareil réel ; la séquence est un repli certain |
| `-tune fastdecode` (recette Agenceeimoo) | mesuré ici : +118 % de poids sur cette source bruitée ; décodage CABAC d'un GOP de 5 images en 900 px négligeable (seek typique 6–23 ms) |
| HDRI en décor visible | paysage désertique sans rapport avec le 06 ; ≈ 340 px pour 30° de champ |
| Images des flyers dans le site | interfaces Snapchat, compositions générées, logos constructeur ; ce sont des sources de vérité, pas des médias |
| Voiture 3D | aucun modèle dans le corpus ; une voiture tournante sans raison est interdite ; un modèle externe représenterait mal le véhicule réel |

### Réutilisé (technique) — sans reprendre l'identité

| Reprise | Depuis | Adaptation |
|---|---|---|
| progression mesurée, jamais calculée par image | MECA `stage-progress.ts` | généralisée : p ∈ [0,1] linéaire + chapitres au prorata ; ligne de lecture mobile de 0 à 100 % de la vue |
| rythme `pace` (fenêtre + courbe) | MECA `rigs.ts` | valable pour tout canal, pas seulement la caméra |
| amorti bureau / ressort critique | MECA `follow.ts` | + retard borné `maxLag` (un saut ne rejoue pas le film) |
| définition adaptative | MECA `quality.ts` | inchangé, étendu aux trois formats |
| rendu à la demande, compileAsync, textures une par image, hors écran, perte de contexte | MECA `stage.ts` | extrait en `WebGLStage` à couches ; rétablissement du contexte au lieu d'un repli définitif |
| zoom au pincement tenu | MECA `guide.ts` | déplacé dans l'entrée scroll |
| trajectoire Catmull-Rom continue | MECA | centripète, paramétrée par corde, points de passage, regard en avance |
| environnement pré-calculé, écriture RGBE | MECA `bake-env.mjs` | source équirectangulaire réduite en moyenne de boîte |
| Range obligatoire, garde anti-tempête de seeks, GOP 5 | Agenceeimoo patterns 01–02 | contrôle `health.range` + repli ; réveil par `seeked` (aucune attente active) |
| clés en unités relatives | Agenceeimoo leçon 6 | clés locales aux chapitres |
| statuts de vérité + `content:check` | MECA `site.ts` | + source typée, + droits des médias |
| SEO de production, 404 | MECA | indexation conditionnée à une adresse connue |
| QA navigateur local | MECA `qa-shots.mjs` | tests mesurés (monotonie, bornes, mémoire, repos) plutôt que captures seules |

Non repris : palette, typographie (Archivo), nuit en corniche, lampadaires, entrée « PRESENT », pas guidés (à décider
pour ce projet), cadrages, textes, rythmes, scènes.

### Nouveau (pas d'équivalent éprouvé)

- **Scheduler unique** pour toute la page (MECA avait une boucle par scène).
- **Registre média** par proximité de chapitres, par format, avec libération.
- **Séquence d'images à mémoire bornée** (images compressées en fenêtre, décodées en petit nombre, `close()`).
- **Format lu depuis la CSS** (`--format`) : aucun seuil dupliqué entre CSS et JS.

### Décisions de contenu (à partir des sources)

- **Écart avec BUSINESS_TRUTH.md** : le flyer nettoyage porte aussi **« 50€ » (Intérieur + Extérieur)** et
  **« Déplacement dans tout le 06 »**, absents du registre. Ajoutés dans `src/domain` : le prix en `TO_CONFIRM`
  (portée inconnue), le déplacement en `CONFIRMED`. Addendum ajouté au registre.
- « Disponible 7J/7 » est rattaché à la **location** (flyer LOC), pas au nettoyage.
- Le flyer location porte le sous-titre « Nettoyage auto professionnel » : les deux univers appartiennent à la même
  marque, ce que la narration doit relier.
- Aucun téléphone, e-mail, adresse, horaires, forme juridique : `UNKNOWN`, jamais affichés. L'action mène à Instagram.

### Décisions média

- **La vidéo est une preuve, pas une ambiance** : tournage de jour, à la main, dans une allée. Elle n'est ni étalonnée
  « de nuit » (ce serait maquiller la preuve) ni utilisée en papier peint.
- Publié : uniquement 0–7,55 s, 14,6–17,7 s, 18,1–19,6 s de la source. **Aucune plaque** (véhicule 8,2–9,5 s,
  utilitaire tiers dès 19,7 s), aucune interface, aucun centre de contrôle dans un fichier publié.
- Mobile = séquence ; bureau/tablette = scrub vidéo ; repli = affiches « avant » / « après ».
- HDRI : **conditionnel** — seulement pour des reflets si une scène de finition 3D est validée ; cube 128 par défaut.

### Limites connues

1. Pire seek vidéo mesuré 123–380 ms (typique 6–23 ms) sur cette machine (Intel UHD 620) ; un pic isolé de 7,2 s pendant
   la batterie complète sur le build Cloudflare simulé, **non reproduit** sur deux passes dédiées à cache froid
   (pire 243 puis 88 ms, position toujours atteinte en ≤ 243 ms). À mesurer sur appareil réel, notamment Safari.
2. Après un rétablissement de contexte WebGL, la libération de la scène émet des avertissements
   `object does not belong to this context` (objets de l'ancien contexte) : sans effet, cas rare.
3. Le scrub vidéo et la séquence ne sont pas vérifiés sur iOS réel (pas d'appareil) ; le ressort au doigt est simulé.
4. `tsc` ne contrôle pas les fichiers `.astro`.
5. Le laboratoire `/lab/engine` est présent dans le build (noindex, hors sitemap, `Disallow`) : à retirer avant
   publication (`content:check` le rappelle).
6. `night-256.hdr` pèse 1,7 Mio (étoiles incompressibles).

## 2026-09-17 — Envoi GitHub et build Cloudflare (retour du porteur : « ça ne fonctionne pas sur GitHub »)

L'erreur exacte n'est pas visible d'ici (dépôt privé ou vide : API GitHub 404 ; `carservice.pages.dev` est le site d'un
tiers). Écarts relevés avec la méthode MECA RIVIERA, tous corrigés :

| Écart | Effet | Correction |
|---|---|---|
| 243 fichiers à publier, dont 146 images de séquence | l'envoi web GitHub refuse plus de 100 fichiers à la fois | séquence regroupée en **un fichier** lu par requêtes Range (`engine/media/frame-source.ts`, repli si le serveur ignore Range) → 101 fichiers, 2 lots |
| `ffmpeg-static` (télécharge 80 Mo à l'installation) et `ffprobe-static` (336 Mo) dans le paquet du site | `npm ci` de Cloudflare lourd et dépendant d'un téléchargement externe | sortis du paquet : `scripts/media-tools` (installé seulement pour le pipeline, `npm run media:setup`) ; `package.json` du site = celui de MECA RIVIERA sans le pipeline 3D |
| `tools/` : vidéo 44 Mo, HDRI 28 Mo | refusés par l'envoi web (25 Mio max) | jamais envoyés (sources locales) |
| champs `engines` et `allowScripts` (npm 11) | inconnus de l'outillage de Cloudflare | retirés |
| aucun dossier d'envoi ni build vérifié | fichiers manquants ou en trop | **`npm run deploy:prepare [-- --simulate]`** : dossier `Desktop/carservice-envoi-github/envoi-N` (≤ 95 fichiers, ≤ 25 Mio chacun, fichiers du build dans le premier lot), casse des imports vérifiée (Linux), puis copie vierge → `npm ci` → `npm run build` |

Vérifié le 17/09/2026 : copie vierge reconstituée depuis les lots → `npm ci` → `npm run build` réussis (24 fichiers
dans `dist`) ; ce `dist` servi → `npm run qa:engine` **58/58** ; séquence regroupée lue par Range (206) ; repli sans
Range vérifié (serveur forcé en 200 complet : images 73, 15, 131 exactes, aucune erreur — 4 téléchargements complets
en parallèle au premier accès, coût accepté pour un cas de repli). Non vérifiable d'ici : le build sur l'infrastructure
Cloudflare elle-même (Linux) — la casse des imports est contrôlée par le script.

~~Réglages Cloudflare Pages identiques à MECA RIVIERA~~ — remplacé ci-dessous : le projet est un Worker.

## 2026-09-17 — Le projet Cloudflare est un Worker, pas un projet Pages

Adresse attribuée par Cloudflare (porteur) : `https://carservice.nexodevnice.workers.dev`. Constat : toute adresse y
répond « Hello world » (text/plain) — le Worker d'exemple ; le site n'a jamais été publié.

| Constat | Décision |
|---|---|
| Un Worker se publie par `npx wrangler deploy`, qui exige une configuration (MECA RIVIERA, sur Pages, n'en avait pas) | `wrangler.jsonc` : actifs statiques `./dist`, `not_found_handling: "404-page"` (vraie 404), `build.command: npm run build` (le build a lieu même si la commande de build du projet Cloudflare est vide). Vérifié : `wrangler deploy --dry-run` sur copie vierge |
| Adresse connue | `site` = cette adresse dans `astro.config.mjs` (comme MECA : URL absolues, sitemap, indexable en production ; `SITE_URL` ou `PUBLIC_INDEXABLE=false` au build pour changer) |
| `wrangler dev` (moteur de Cloudflare en local) répond **200 complet aux requêtes Range** — vidéo comme séquence | vidéo de scrub chargée en mémoire et servie par URL `blob:` (`engine/media/video-source.ts`) : seekable quel que soit l'hébergeur ; séquence regroupée : la première requête sonde le serveur, les suivantes attendent (au pire un seul téléchargement complet) |
| Wrangler dans `package.json` ? | non : `npx wrangler deploy` l'installe ; le paquet du site reste celui du build |

Le comportement Range de la production Cloudflare n'est pas vérifiable avant publication : `curl -H "Range: bytes=0-99"`
sur l'adresse publiée le dira ; le site fonctionne dans les deux cas.

### En attente du porteur

| Question | Pourquoi |
|---|---|
| Portée du prix 50 € (formule, gabarit, déplacement inclus ?) et actualité des tarifs | affichage d'un prix |
| Autorisation d'utiliser la vidéo du client (véhicule reconnaissable) | droits |
| Logos constructeur visibles dans la vidéo (calandre 6,4–7,0 s, capot 16,4–17,2 s) : garder ou flouter | pas de suggestion d'affiliation |
| Photos réelles du Toyota C-HR loué (extérieur, intérieur) | la location n'a aucune image vraie |
| Images d'habitacle nettoyé, de lavage (mousse, eau) | chapitres INTÉRIEUR et EAU impossibles sans elles |
| Identifiant Snapchat exact, page Facebook, téléphone, e-mail | canaux d'action |
| Adresse de production (domaine) | canonique, sitemap, indexation |
| Provenance de l'HDRI (Poly Haven ?) | licence |
