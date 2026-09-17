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

## 2026-09-17 — Mise en ligne (demande du porteur : « fais tout ce qui est nécessaire »)

| Constat | Action |
|---|---|
| Le dépôt public du porteur est **`nexodevnice-maker/carserv`** (et non `carservice`), qui ne contenait qu'un README | le dossier du projet devient un dépôt git relié à `carserv` (`main`), commit par-dessus l'« Initial commit » ; `.gitattributes` : médias binaires (un `.hdr` commence par du texte) |
| Aucun identifiant GitHub sur la machine | connexion du gestionnaire d'identifiants de Git par le navigateur (autorisation OAuth dans le navigateur du PC ; aucun mot de passe manipulé) → `git push` |
| Aucun build Cloudflare déclenché dans les 6 minutes suivant l'envoi (le Worker ne semble pas relié au dépôt) | `wrangler login` (autorisation OAuth dans le navigateur), puis **`npm run deploy`** (`wrangler deploy` : build Astro + publication de `dist`) |
| **Production Cloudflare : requêtes Range ignorées** (200 complet sur la vidéo et la séquence) | confirmé : la vidéo en URL blob et la sonde de la séquence étaient indispensables |
| QA sur l'adresse publique : l'en-tête mobile coupait « Contact » (non détecté : un élément fixe n'agrandit pas la page) | en-tête du squelette sur deux lignes sous 600 px ; contrôle ajouté (chaque lien entièrement dans la vue) |
| QA sur l'adresse publique : images demandées « au repos » pendant le chargement réseau de la vidéo | mesuré : 3 puis 2 réveils légitimes (chargement, canplay, premier seek), puis 0 sur 12 s ; le contrôle vérifie désormais que la boucle s'endort |

Résultat : https://carservice.nexodevnice.workers.dev en ligne, **60/60** (`npm run qa:engine -- https://carservice.nexodevnice.workers.dev`),
404 réelle, robots et sitemap, indexable. Publier ensuite : `git push` puis `npm run deploy`.

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

## 2026-09-17 — Maquette complète en ligne (demandes du porteur : « site maquette totalement fini », « la vidéo comme un avant/après piloté par le scroll », « l'univers HDR mis en avant comme un réel passage du tout au rien, 3D animée au maximum »)

Récit publié (src/experience/chapters.ts, shots.ts) — 9 chapitres, 17 pas guidés :

| Chapitre | Scène WebGL | Ce qui se passe |
|---|---|---|
| Arrivée | ciel (HDRI) + preuve | l'univers entier (Voie lactée) se referme en iris pendant que le regard plonge (focale 58° → 24°) jusqu'au noir, où le panneau vidéo s'allume ; la vidéo poussiéreuse avance avec le scroll |
| Le passage | preuve | une ligne d'eau (réfraction, bord mouillé, liseré) traverse le capot : images exactes de la vidéo (n° 165 et 257), jauge Avant / Après synchronisée |
| Après | preuve | vidéo propre (capot, flanc) pilotée par le scroll, caméra en arc au ras du sol mouillé (reflet du panneau) |
| Prestations | preuve | recul ; prestations et offre (src/domain) |
| Le 06 | — (SVG) | contour réel du département (IGN) tracé par le scroll |
| Univers | ciel | l'iris se rouvre (rien → tout), le regard longe la Voie lactée ; dérive lente des étoiles |
| Bascule | ciel + route | l'univers se referme sur une route mouillée |
| Location | route | durées peintes au sol (1 JOUR / 7 JOURS / 15 JOURS), feux arrière réels (optiques, halos, lumières ponctuelles), chaussée physique reflétant l'environnement pré-calculé du HDRI, brouillard |
| Contact | route | la caméra s'élève, les feux s'éloignent ; Instagram |

Techniques MECA RIVIERA intégrées : entrée qui couvre la préparation de la scène et tient la page en haut ; affiches capturées sur la vraie scène (scripts/capture-posters.mjs) ; pas guidés (un geste, un plan : molette, clavier, doigt) ; légendes posées sur la scène (bas d'écran au téléphone) ; barre d'action mobile ; ressort critique au doigt ; définition adaptative ; rendu à la demande ; décalage optique pour la colonne de texte ; focale compensée selon le rapport d'écran ; vraies sources lumineuses ; zoom au pincement tenu ; retour au premier plan à chaque arrivée ; SEO, 404, robots, sitemap ; QA navigateur (qa-shots, qa-engine) et parcours du site publié (scripts/qa-live.mjs).

Médias ajoutés : `public/env/sky-{2048,4096}.webp` (HDRI étalonné en ciel de nuit, 88 et 516 Ko, scripts/media-sky.mjs), `passage-{before,after}-*.webp` (scripts/media-passage.mjs), `public/media/stage/poster-*` (affiches), `src/experience/map-06.json` (scripts/content-map.mjs, source IGN Admin Express via france-geojson). Typographie : Barlow Condensed (signalisation routière) et Barlow.

Écart assumé avec la règle « aucun état piloté par le temps » : la dérive lente des étoiles, tant que l'univers est visible (rendu continu seulement pendant ce passage ; arrêtée en mouvement réduit et iris fermé).

Défauts corrigés pendant la réalisation (vus sur captures) : panneau vidéo noir au bureau (Three.js dimensionne une Texture ordinaire par l'attribut `width` de la vidéo → VideoTexture), panneau éteint masquant l'univers (alpha lié à la lumière), plans de l'univers trop bas (visée recalculée sur l'arche de la Voie lactée), légende de la carte sur la côte, sous-titre de la location trop gros au téléphone, captures intermédiaires ramenées aux points d'accroche (accroche neutralisée en QA).

Vérifié : 60/60 (`npm run qa:engine`) sur le serveur de dev et sur https://carservice.nexodevnice.workers.dev ; parcours publié bureau et téléphone, 17 pas, WebGL prêt en 4,9 s (bureau) et 2,3 s (téléphone, réseau réel), aucune erreur console.

## 2026-09-17 — Un seul monde traversé, scroll maîtrisé de bout en bout (demandes du porteur : « la carte en 3D », « des transitions qui marquent l'esprit », « traverse l'univers, les nuages », « le scroll n'est pas maîtrisé bout à bout »)

Scroll (src/engine/motion/follow.ts, src/engine/scroll/guide.ts, config.ts) :
- cause du rendu mou : double lissage — défilement doux du navigateur vers le pas suivant, puis amorti du moteur ;
- au bureau, les pas guidés sautent instantanément (`scrollBehavior: instant`) et le moteur seul fait le mouvement :
  mode `glide`, une courbe d'Hermite quintique de durée réglée (26 s par unité de progression, bornée à 1,1–2,2 s),
  qui repart de la vitesse en cours si un second geste arrive pendant le vol (aucun arrêt net) ; la barre de défilement
  reste suivie par amorti ; au doigt, ressort critique MECA inchangé ;
- mesuré sur l'accueil : premier geste = départ à vitesse nulle, arrivée posée en ~1,4 s ; second geste en vol, vitesse
  continue.

Monde (src/experience/world.ts) — l'univers n'est plus un chapitre mais le lieu de tout le récit :
- sol mouillé infini calculé dans le shader du ciel (intersection du regard avec y = 0) : aucun bord, aucun plan
  lointain, reflet de l'équirectangulaire, flaques tirées d'un bruit fractal précalculé (shared/noise-texture.ts, avec
  mipmaps) ; il rejoint exactement le pied des collines à l'horizon, en rasant seulement. Remplace un plan de 900 m qui
  produisait couture d'horizon, « piliers » verticaux (couleur d'horizon étirée) et rectangles (bruit de grille seuillé) ;
- horizon du HDRI abaissé de 1,4° (collines posées sur le sol) ; zénith fondu vers la moyenne de la calotte (éventail de
  repliement visible au téléphone) ;
- rotation du ciel choisie pour que la route mène au cœur de la Voie lactée (collines basses du HDRI) au lieu d'un mur de
  rochers ; le piqué vers la route fait tourner le ciel d'un quart de tour (descente en spirale) ;
- nuages : bancs de plans face caméra (bruit précalculé, bord argenté), opacité fonction de la distance, traversés par
  la caméra ; densité par canal (retirés au-dessus de la carte) ;
- le 06 en volume (scenes/map) : contour IGN extrudé, dessus laqué qui reflète le ciel, tranche or, reflet inversé sur le
  sol ; il sort du sol en une vague de la côte vers les montagnes, arête de lumière sur le front ; « 06 » et « Mer
  Méditerranée » posés au sol. La carte SVG reste pour les lecteurs d'écran et le repli statique.

Vols (shots.ts, chapters.ts) : ouverture au-dessus d'une mer de nuages → plongée à travers les nuages jusqu'au panneau →
preuve → montée par-dessus le panneau vers le 06 → montée à travers les nuages dans la Voie lactée → travelling latéral
→ piqué en virage vers la route (on la voit s'allumer d'en haut, les feux s'amorcent) → location → élévation finale.
Objectif piloté par canaux (webgl-stage `lens`) : coup de focale au milieu des vols, roulis dans les virages, turbulence
angulaire déterministe dans les nuages. Passage de l'eau : filets de ruissellement et éclat derrière la ligne.

QA ajoutée : scripts/qa-flights.mjs (chaque vol filmé en 9 images à progression fixe, bureau et téléphone).

Vérifié : typecheck, build, captures des 17 repos et de leurs milieux (bureau, téléphone), 6 vols filmés, 60/60
(`qa-engine`, contrôle du retard adapté à maxLag 0,35) sur le serveur de dev et sur https://carservice.nexodevnice.workers.dev,
parcours publié bureau et téléphone sans erreur console.
