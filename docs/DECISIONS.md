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

## 2026-09-17 — Le voyage : ciel → 06 → véhicule → univers → route (demandes du porteur : « on est la caméra », « le scroll ne fait pas assez voyager », « arrange le code couleur », « toujours arriver sur l'univers », « un scan comme MECA RIVIERA pour l'avant/après », « passer de l'univers à la location 100x plus professionnellement », « 10x plus surprenant »)

Monde à l'échelle (src/experience/world.ts) : le 06 (contour IGN) à 1 m par unité de carte (≈ 1 km × 1,1 km), plateau
affleurant à y = 0 dont la surface est le sol mouillé, falaises d'or de 40 m reflétées dans une mer de nuit ; le
monolithe de preuve (5,4 × 8,5 m) sur un point sans nom à 120 m de la côte ; la route de la location part vers le nord
derrière lui ; mer de nuages à 1 500 m (percée d'une trouée), bancs bas vers 400 m. Un seul ciel : rotation constante,
le nord regarde le cœur de la Voie lactée — plus aucun ciel qui tourne pendant un vol.

Récit (chapters.ts, shots.ts) — 10 chapitres, 19 pas : univers au-dessus de la mer de nuages → plongée par la trouée →
le 06 s'allume en vague d'or de la côte aux montagnes, balise de lumière au milieu → piqué sur la mer, falaise, balise →
pose devant le monolithe (avant) → **relevé** puis passage de l'eau → après → prestations → ascension verticale à travers
les deux couches de nuages → cap sur la galaxie → **descente verrouillée** : le regard ne quitte pas le nord (visée par
direction, interpolée en angles), la galaxie reste au même point de l'image, la route rouge se dessine vue du ciel et
monte à la rencontre de la caméra qui se pose dans la voie, point de fuite sous la galaxie → location à 100 m par pas →
au bout de la route, au bord du 06, face à la galaxie.

Moteur (générique) :
- camera-rig : `look` [azimut, élévation] (repère lointain verrouillé pendant un vol) ; `flight` par plan (focale,
  roulis, plongée du regard, turbulence) en enveloppe sin π·u, maximale au milieu du trajet quel que soit le format ;
- webgl-stage : regard libre à la souris (±4° / ±2,6°, amorti, souris seulement) ; tangage ; garde au sol (`floor`) ;
- guide : les liens internes n'écrivent plus d'ancre ; la page retire toute ancre et revient en haut au chargement —
  on arrive toujours sur l'univers ;
- glissade du bureau allongée (34 s par unité, 1,5–4,2 s) ; ressort au doigt ralenti (3,6 rad/s).

Relevé (evidence-material.ts) — technique de la ligne de scan de MECA RIVIERA, identité CAR SERVICE 06 : ligne d'or de
largeur constante à l'écran qui descend le monolithe et déborde dans la nuit (nappe additive) ; derrière elle, le
véhicule relevé (luminance froide, contours d'or détectés par Sobel sur l'image réelle, trame fine) ; halo en vraies
couleurs sous la ligne ; puis la ligne d'eau rend le véhicule propre en couleurs. Aucune promesse de « diagnostic » dans
les textes.

Code couleur : nuit froide (#04060a), blanc froid (#eef1f5), l'or seule couleur chaude (nettoyage, territoire), rouge pour
la location. Le HDRI est étalonné dans le shader (désaturé à 22 %, refroidi) : sa lueur orangée salissait l'or.

Rendu (shared/night-glsl.ts, partagé par ciel, mer, 06, falaises, chaussée) : ciel lu à un niveau de détail calculé sans
dérivées (mipmaps, niveau selon la taille angulaire du pixel) ; brume d'horizon au lieu du noir ; calotte au-dessus de 70°
fondue vers sa couleur moyenne semée d'étoiles calculées (l'image source y est étirée). Chaussée : shader maison dans la
même lumière (le matériau standard reflétait un environnement non étalonné, laiteux) ; reflets des feux en traînées
anisotropes ; plus aucune lumière dynamique (et plus de téléchargement de l'environnement pré-calculé).

Défauts trouvés et corrigés en filmant les vols (scripts/qa-flights.mjs, 10 vols × 9 images, bureau et téléphone) :
nuages géants qui voilaient l'écran (fondu selon la couverture), reflet des falaises dessiné par-dessus le 06 (passe
opaque avant la surface), falaises lointaines traversant la surface (ordre falaises → surface, test sans écriture de
profondeur), trajectoire qui creusait sous la route (points de passage, garde au sol), éventail et disque au zénith,
motif « camouflage » des flaques, plan final qui ne montrait pas la route.

Téléphone : définition plafonnée à 1,75 ; filé des étoiles à 6 échantillons ; moitié moins de nuages ; plus aucune lumière
dynamique ni environnement à télécharger.

Vérifié : typecheck, build ; captures des 19 repos et de leurs milieux (bureau, téléphone) ; 10 vols filmés ; 60/60
(`qa-engine`, attentes allongées pour la glissade en navigateur sans écran) sur le serveur de dev et sur
https://carservice.nexodevnice.workers.dev ; parcours publié bureau et téléphone, 19 pas, WebGL prêt, sans erreur.

## 2026-09-17 — Direction artistique des flyers, France en 3D, relevé recalé (demandes du porteur, mobile d'abord : « remets l'univers d'origine, je n'aime pas la DA », « sers-toi des flyers », « la carte de France en 3D, on atterrit dans les Alpes-Maritimes au même endroit », « de vrais onglets location / nettoyage », « indique vraiment tout ce que l'entreprise fait », « la vidéo propre doit apparaître exactement à cet endroit », « trouve et n'invente pas les assets »)

Direction artistique — relevée à la pipette sur les deux flyers (tools/flyers), plus aucune invention :
- noir franc (#000), blanc, **jaune #fdc727** pour le nettoyage et le territoire, **rouge #fb1220** pour la location ;
  un univers = un accent (`html[data-universe]`, écrit par le moteur) ;
- composants du flyer portés en CSS : badges à filet (« Intérieur + extérieur », « Déplacement dans tout le 06 »), prix
  en pastille pleine légèrement inclinée (50 €), pastilles d'icônes au trait (src/ui/BrandIcon.astro : siège, voiture,
  éclat, bouclier, camionnette, compteur, pompe, volant, calendrier, épingle), cadre de tarifs à liseré néon rouge
  (70 € / 400 € / 700 €), signature manuscrite en italique ;
- **onglets NETTOYAGE / LOCATION** (src/ui/Tabs.astro) : de vrais liens vers les chapitres, l'onglet actif suivant
  l'univers à l'écran — les deux métiers sont enfin distincts ;
- **prestations complètes** : les quatre prestations du flyer MAIN avec leurs détails, la formule et le déplacement ;
  les cinq conditions du flyer LOC (assurance comprise, kilométrage illimité, hybride économe, confort & sécurité,
  disponible 7J/7) avec les trois tarifs.

L'univers d'origine est revenu : le HDRI est rendu tel qu'il a été photographié (l'étalonnage froid de la veille est
supprimé), définition du téléphone remontée à 2.

La France en 3D (scripts/content-france.mjs → src/experience/map-france.json, 53 Ko) : les 96 départements
métropolitains (contours IGN via france-geojson), projetés en Mercator et **calés sur la boîte du 06 de map-06.json** —
donc à la même échelle et au même endroit que le plateau du récit. Chaque département est un volume de 25 m bordé d'un
trait d'or ; le 06 en garde 40 et s'allume. Tout s'efface avec l'altitude : vu de 12 km c'est un pays, au sol il n'en
reste que le plateau, ses falaises et la mer. La plage de profondeur de la caméra suit l'altitude (webgl-stage `range`) :
le même monde du pare-chocs (5 m) au pays entier (20 km).

Relevé et nettoyage recalés (demande du directeur artistique) : le capot propre est filmé trois secondes après le capot
poussiéreux, la main a bougé. scripts/lib/align.mjs mesure sur les CONTOURS le déplacement et l'échelle qui superposent
l'après sur l'avant (ici +11 % en largeur, −8,5 % en hauteur, échelle 1,015 ; écart moyen 1,179 → 1,095) ; le shader du
monolithe applique ce recalage à l'image « après ». La ligne d'eau ne déplace plus le véhicule : elle ne change que sa
matière. Au téléphone, les plans de la preuve sont rapprochés (11–13 m) : la vidéo remplit l'écran, on n'est plus devant
un panneau posé dans le noir.

Assets trouvés, pas créés : matière de la chaussée relevée par photogrammétrie libre — Poly Haven « Asphalt 06 » (CC0,
albédo + occlusion/rugosité + relief, 1024 px, 311 Ko au total, public/media/road/). Les marquages (axe, rives, durées)
et les flaques restent dessinés au pipeline : ce sont des données du récit. Plus aucune lumière dynamique ni
environnement pré-calculé à télécharger.

Vérifié : typecheck, build, 60/60 (`qa-engine`, attentes allongées pour les vols en navigateur sans écran ; rôles ARIA
du cadre de tarifs corrigés), 41 captures du parcours téléphone (repos et milieux de vol), parcours publié bureau et
téléphone (21 pas) sans erreur console, https://carservice.nexodevnice.workers.dev.

## 2026-09-18 — Les véhicules 3D fournis, le rendez-vous, la profondeur au téléphone (demandes du porteur, mobile d'abord : « on n'a pas cette impression de profondeur sur mobile », « supprime la partie où la vidéo avant/après passe avec le scan », « rajoute un calendrier, les courriels doivent atterrir sur nexodevnice@gmail.com », « je t'ai rajouté une voiture 3D, elle remplacera la vidéo, salis-la puis rends-la brillante, on veut une vue de l'intérieur », « la Toyota pour la location », « les deux premiers scrolls de location sont inutiles, on doit voyager 10x plus »)

La preuve vidéo est supprimée. Le monolithe, le passage de l'eau, le recalage des images, le scrub et la séquence
mobile ne sont plus dans le site : `src/scenes/evidence/*` n'est plus chargé, la balise est devenue sa propre couche
(`src/scenes/beacon/`), la page n'a plus de `<video>`. Le laboratoire (`/lab/engine`) garde le banc vidéo : c'est là
qu'on éprouve le moteur, pas dans le récit.

À la place, **les deux modèles 3D fournis** (tools/3d), allégés par `npm run media:3d`
(gltf-transform : textures WebP 1024, quantification, compression meshopt) :
- `public/models/rs6.glb` (13 Mo → 3,0 Mo) — le véhicule de la démonstration, posé à l'origine du monde ;
- `public/models/chr.glb` (1,8 Mo) — le véhicule de location, qui roule sur la route du 06.

`src/scenes/vehicle/vehicle-layer.ts` ne pose pas un objet dans une scène : il **modifie la matière du modèle** selon le
scroll. La salissure (`dirt`) est calculée dans les shaders du modèle — plus épaisse sur ce qui regarde le ciel et dans
le bas de caisse, bruitée, elle ternit la couleur, matifie la laque (rugosité 0,93) et éteint le métal ; la ligne de
lumière (`scan`) parcourt la caisse de l'avant vers l'arrière et, derrière elle, la poussière n'est plus là et le vernis
revient (`polish`, rugosité × 0,35). Aucune image, aucun fondu : un même objet, deux états, pilotés par la position du
scroll. Les vitres en transmission sont converties en verre sombre (une passe de rendu de moins : rédhibitoire au
téléphone). Les matériaux d'emblème et de plaque sont masqués au chargement (règle de vérité).

**La lumière des véhicules et d'eux seuls** (`src/scenes/vehicle/vehicle-light.ts`) : l'environnement de nuit
pré-calculé (PMREM, 447 Ko au téléphone / 1,7 Mo au bureau) plus deux directionnelles. Le reste du monde est en shaders
maison et les ignore : le blanchiment de la chaussée qu'un PMREM avait provoqué le 17/09 ne peut pas revenir. Sans ce
reflet, une carrosserie noire dans la nuit n'est qu'une silhouette. Une **ombre de contact** (empreinte sombre, plus
dense sous les trains) évite que le modèle flotte sur le sol mouillé.

Profondeur au téléphone : les plans ne sont plus des vues de trois quarts au centre du cadre. Chaque plan a du proche et
du lointain, la carrosserie fuit en diagonale, et les distances sont écrites pour un écran **portrait** (un véhicule de
5 m ne tient dans un cadre 0,46 qu'à partir de 13 m avec une focale de 50°) : plans d'ensemble à 13–26 m, et des macros
assumées (l'aile et la roue, l'optique) au lieu de plans larges rognés. L'habitacle est un vrai plan : assis à la place
du conducteur, tableau de bord et pare-brise, l'univers derrière.

La location voyage : le C-HR avance de 84 à 398 m sur la chaussée (`chrTravel`) pendant que la caméra va de 60 à 390 m.
On le rattrape (26 m), **on le double au ras** (la caméra passe sur la voie de gauche et le cadre se remplit de sa
carrosserie), il reprend la tête et s'éloigne (50 m, ses feux deviennent deux points), puis il s'arrête au bord du 06 et
on le rejoint. Les feux arrière ne sont plus un véhicule fantôme : ce sont ceux du modèle, et la chaussée en calcule le
reflet étiré.

**Rendez-vous** (`src/ui/Rendezvous.astro`, `src/experience/rendezvous.ts`) : le seul écran sans 3D — la nuit s'éteint
derrière la carte, la barre d'action s'efface. Bande de 14 jours régénérée à partir d'aujourd'hui (un site statique ne
doit jamais proposer une date passée), créneau, nom, téléphone, commune, véhicule, besoin, précisions. La demande part
par **courriel préparé** vers nexodevnice@gmail.com : aucun serveur, aucune donnée stockée ni transmise à un tiers, le
client relit et envoie depuis sa messagerie ; sans script, le lien courriel reste écrit dans la page. Les créneaux sont
ceux que DEMANDE le client : aucun horaire d'ouverture n'est confirmé (BUSINESS_TRUTH), l'entreprise confirme.

Limite connue : les emblèmes de marque restent visibles sur les modèles fournis quand un matériau ne les isole pas (le
C-HR n'en a qu'un seul pour toute la caisse). Ils ne sont jamais mis en avant par un plan ; le pied de page rappelle
qu'aucune affiliation n'existe. À trancher avec le porteur avant publication.

## 2026-09-18 — Reconstruction cinématique mobile (demandes du porteur : « la qualité visuelle sur mobile doit être 10000 fois supérieure, similaire aux 120 fps sur ordinateur », « un scroll = une unité cinématographique », « reconstruis, ne répare pas », « prends mon modèle et conserve entièrement ce qui s'y trouve : les montagnes, les roches, la voie lactée — je veux que le site vive dans cet univers »)

**La cause du « flou » était mesurable, pas subjective.** Sonde `scripts/qa-perf.mjs` (nouvelle) au format téléphone :
les modèles fournis, exportés avec une armature, produisaient **748 appels de dessin et 333 000 triangles** par image.
Le téléphone ne tenait pas le rythme, la définition adaptative retombait à **DPR 1,25** — et n'en remontait plus :
tout le reste de la visite était flou.

Trois corrections, dans l'ordre d'importance :

1. **Chaîne 3D refaite** (`scripts/media-tools/build-3d.mjs`, programmatique et non plus en ligne de commande) :
   suppression des peaux et animations (ce sont elles qui interdisaient la fusion), déquantification, élagage,
   aplatissement, fusion par matériau, soudure, simplification à 40 %, textures WebP, meshopt.
   → **25 maillages au lieu de 746**, 96 000 triangles au lieu de 234 000, **1,39 Mo au lieu de 3,0**.
2. **Ne jamais juger la fluidité pendant un chargement** : `StageConfig.busy` (le registre média dit quand il
   décode) et, dans `quality.ts`, tout blocage de plus de 120 ms n'est plus compté ET remet la fenêtre à zéro. Un
   décodage n'est pas un problème de rythme.
3. **Payer le coût au bon moment** : préchargement du modèle et de l'environnement dans l'en-tête du document
   (`<link rel="preload">`), compilation des shaders avec l'objet rendu visible (un objet masqué est ignoré par
   `compileAsync`, et le coût réapparaissait en plein scroll), et la route ne bloque plus la première image pour
   télécharger son asphalte.

Résultat mesuré : **16,7 ms par image (60 i/s, le plafond de l'écran) sur 20 unités sur 24**, DPR 2 tenu, plancher
remonté à 1,5. Première image 3D en production : **3,7 s** (contre 14 s avec le modèle en ouverture non préchargé).

**Le garde au sol était à 1,1 m** : tous les plans rasants écrits dans `shots.ts` (0,4 à 0,9 m) étaient silencieusement
remontés à hauteur d'homme. C'est ce qui donnait l'impression d'un « WebGL posé sur une page » plutôt que d'un film.
Descendu à 0,32 m.

**Le récit est reconstruit en 24 unités cinématographiques** (`docs/MOBILE_CINEMATIC_GRAMMAR.md`) : un scroll = une
action, une idée, une conséquence. La chaîne remplace les sections : une laque trop proche pour être comprise → des
étoiles apparaissent dedans → recul, c'est une voiture → on sort par le reflet et on est dans le ciel → ce ciel couvre
un pays → le pays devient le 06 → le même véhicule, sale → la lumière le traverse → **la rime** (le plan de l'unité 3,
à l'identique, mais gagné) → l'habitacle → le métier → la route → le C-HR → le prix → le rendez-vous.
Le commercial n'arrive qu'après l'unité 14. Les unités 2, 4, 5, 12 et 20 n'ont aucun texte.

Deux bogues trouvés en chemin, qui expliquaient beaucoup :
- le **vernis ne s'appliquait jamais avant le relevé** (`cleaned` valait 0 partout tant que le scan n'avait pas
  commencé) : l'ouverture montrait donc une laque mate. Corrigé par `uCleanBase` (propre d'origine = propre partout) ;
- **le niveau de reflet restait à zéro** : l'environnement arrive après la première mise à jour de la couche, qui
  croyait alors n'avoir rien à faire. Une carrosserie noire dans le noir n'était qu'une silhouette.

**Le sol est désormais le terrain de l'image 360° fournie** (`groundTerrain`, shared/night-glsl.ts). La moitié basse du
panorama — roches, sol, végétation — est projetée sur le plan du monde depuis un centre placé à 9 m (technique dite
*grounded skybox*), au même azimut que le ciel : les collines du ciel se prolongent dans le sol sans couture. L'eau
(flaques, mer) recouvre le terrain là où elle est. Le site vit dans le lieu photographié, et plus sur un sol abstrait.

Carrosseries assombries (facteur 0,42 sur les matériaux de peinture du modèle) : les modèles fournis sont en gris
clair ; la nuit du 06 et la charte (noir, jaune) demandent une laque sombre — c'est elle qui rend le reflet lisible.

Typographie mobile : plus de grand titre à chaque écran. Une annotation (`.note`), un repère, un titre court ;
`--step` du titre mobile ramené de 11 vw à 8,6 vw.

Vérifié : typecheck, build, **60/60 `qa:engine`**, 24 captures mobile + planche-contact, sonde de fluidité, déployé,
parcouru en production sans erreur console, première image 3D en 3,7 s.

Reste à faire : reflet du véhicule sur la chaussée mouillée, et trois unités encore à 19–24 ms (les macros où le
véhicule remplit l'écran).


---

## 19/09/2026 — La passe d'image : halo, tramage, étalonnage

**Le manque.** Le récit se joue de nuit, et toutes ses sources — lampes, phares, ligne d'or, liseré des tarifs, feux
du circuit, étoiles — s'arrêtaient net au bord de leur pixel. Une nuit sans débordement n'est pas une nuit : c'est un
fond noir avec des taches claires dessus. C'était le plus gros écart restant avec une image de cinéma.

**La contrainte qui a décidé de tout.** Le réflexe (rendre la scène dans une cible, composer, corriger à la fin)
était impraticable ici. Trois.js n'applique sa correction d'affichage (courbe de rendu + encodage écran) **que**
lorsqu'il dessine dans le canevas ; dans une cible de rendu, il ne l'applique pas (vérifié dans la source de
`three@0.186`, `WebGLPrograms` : `toneMapping = NoToneMapping` et espace de travail linéaire dès que la cible n'est
pas l'écran). Or ce projet mélange deux familles : les **véhicules** (matériaux standard, corrigés par Trois.js) et
**tout le reste** (nuanceurs maison, qui écrivent déjà des valeurs d'écran et n'incluent aucun `colorspace_fragment`).
Rendre dans une cible aurait assombri les véhicules ; rattraper au moment de composer aurait éclairci tout le reste.
La direction artistique entière y passait.

**Le choix.** La scène se dessine **exactement comme avant**, dans le canevas. On **recopie** ensuite le résultat
dans une texture (`copyFramebufferToTexture`, un blit de GPU à GPU), et les effets s'ajoutent par-dessus. L'image de
départ est au pixel près celle d'hier. Conséquence heureuse : passe éteinte, il ne reste rigoureusement rien — ni
coût, ni différence. Le halo travaille sur des valeurs **mises au carré** (retour approximatif vers l'énergie) :
sinon une étoile et un phare, tous deux proches de 1 à l'écran, débordent pareil.

**Coût mesuré** (téléphone, 780 × 1688, cran 0) : **+6 appels de dessin, +12 triangles, +3 programmes, +5 textures**.
La chaîne de flou travaille au quart puis au huitième de côté. Au-delà d'un cran de définition perdu
(`post.maxLevel: 1`), la passe s'efface : un téléphone qui rame a besoin de ses millisecondes, pas d'un halo.

**Trois erreurs, corrigées en mesurant** (luminance moyenne de la zone 3D, 31 unités, avant/après) :

1. **Vignette rapportée au côté long.** Sur un écran en 0,46, elle noircissait de 28 % le tiers haut et le tiers bas :
   la place perdait son sol, le ciel ses étoiles. Elle se mesure désormais en « part du chemin vers le coin »,
   indépendante du format. Seuls les angles s'assombrissent.
2. **Courbe en S classique.** Elle creuse tout ce qui est sous la moitié — or ce récit est à 98 % dans les ombres.
   Mesuré : **−13 % sur la descente et −14 % sur la place**, les deux plans qu'on nous reproche déjà de ne pas voir.
   Remplacée par une sculpture des **hautes lumières seules** : les noirs ne bougent plus.
3. **Halo à pleine intensité dans la galaxie.** La traversée du cœur perdait ses étoiles une à une, fondues en une
   seule tache blanche — or cette unité ne raconte QUE ça, des étoiles détachées à des vitesses différentes. Le canal
   `bloom` (chapters.ts) retient le débordement à mesure qu'on entre dans l'amas (0,85 → 0,32).

Résultat après correction : **+7,5 % de luminance moyenne** sur les 31 unités, avec la « matière » (les valeurs entre
12 et 50 %, celles qui portent le relief) en hausse partout — la location passe de 4,9 % à 11,5 % de l'image. Les
deux plans les plus sombres restent à −6 %, ce qui vaut ici **un millième de luminance, soit un quart de niveau
d'affichage** : invisible.

**Le grain est d'abord un tramage.** 0,012 ≈ trois valeurs sur 255. Sans lui, le dégradé du ciel et le cône de brume
des candélabres se découpent en bandes sur un écran 8 bits. Il est fonction de la **position de défilement**, jamais
de l'horloge : même endroit, même image, à l'aller comme au retour.

**Constaté au passage, pas corrigé** : les quatre anneaux du constructeur sont lisibles sur la calandre du RS6
(unité 10). Le filtre `badge|logo|emblem` masque bien `BadgeA_Material1`, mais ces anneaux-là sont portés par un
matériau `Grille*A` que le nom ne trahit pas. C'est une entorse à la règle de vérité, à lever avant publication
réelle (REFERENTIEL §13.9).


---

## 19/09/2026 — L'emblème sans nom, le banc d'essai hors du paquet

**Les quatre anneaux.** La règle du projet interdit de mettre en avant un logo constructeur, et le filtre de
`vehicle-layer.ts` masque les matériaux nommés `badge|logo|emblem`. Il masquait bien `BadgeA_Material1` — et les
anneaux restaient à l'écran, en plein centre d'un plan de face. Ils appartiennent au matériau des **chromes**, une
seule pièce de 9 400 triangles qui porte aussi les baguettes, les entourages et les inserts : ni le nom du matériau
ni celui du maillage ne permettent de les isoler.

Ils sont donc effacés par la **géométrie** : une boîte en coordonnées monde (`WORLD.vehicles.cleaning.erase`), et un
`discard` dans le nuanceur. La boîte s'arrête juste derrière la saillie des anneaux — on retrouve le panneau lisse de
la calandre, pas un trou sur le compartiment moteur.

**Comment les bornes ont été trouvées, et l'erreur qui a coûté cher.** Premier essai : encoder la position locale en
couleur et échantillonner les pixels. Résultat faux, et faux de façon crédible — toutes les zones donnaient le même
x. La cause : la sonde capturait 1,2 s après le saut, **avant que le modèle 3D soit décodé**. Je mesurais le mur du
fond. Pire, la même course faisait apparaître ou disparaître la voiture d'une capture à l'autre, ce qui se lisait
tour à tour comme « l'effacement ne marche pas » et « l'effacement a tout mangé ». Deux heures pour un symptôme qui
n'existait pas.

La leçon tient en une ligne : **une sonde qui n'attend pas explicitement le média attend le hasard**. La sonde
attend désormais `vehicle-cleaning: ready`. Les bornes ont ensuite été trouvées par dichotomie à l'écran — on efface
une tranche, on capture, on regarde où elle tombe, on resserre — ce qui est mesuré dans le même rendu, donc fiable.

**Le banc d'essai.** `/lab/engine` était en ligne, accessible à qui connaissait l'adresse, avec les quinze
mégaoctets de vidéo et de séquence d'images dont il est le seul consommateur (65 % du paquet). Le supprimer était
tentant — sauf que `npm run qa:engine` s'appuie dessus : c'est le banc de mesure de la piste, de l'état, de la
caméra, du GPU et de l'accessibilité. Supprimer le banc, c'était supprimer le contrôle qualité.

Il est donc **construit puis retiré du paquet** (`sansBancDEssai`, `astro.config.mjs`, au `astro:build:done`) : présent
en développement, absent en ligne. Le `robots.txt` ne suffisait pas — il déconseille aux robots, il n'interdit à
personne. **Paquet publié : 23 Mo → 8,1 Mo.**

**La passe d'image ne s'éteint plus en route.** Elle était coupée dès le deuxième cran de définition. Mais son coût a
été mesuré et il est **sous le bruit de la mesure**. Couper quelque chose de gratuit ne faisait que provoquer une
rupture visible en plein parcours — halo, étalonnage et vignette disparaissant d'un coup, sans fondu. Elle ne
s'éteint plus qu'au tout dernier cran.

**Le bandeau des tribunes** était à onze mètres et long de cent quarante : vu par la tranche depuis la voie, il
traversait tout le cadre en diagonale. On lisait une barre dorée en travers du ciel, pas une tribune. Il descend au
niveau des gradins — c'est là qu'un bandeau sert, il éclaire les places — et ne court plus que sur la moitié de la
longueur.

**Constaté, pas corrigé : les roues ne tournent pas.** Le modèle de location est fusionné en **cinq maillages par
matériau**, roues comprises dans la caisse : il n'y a rien à faire tourner. Il faudrait recouper le modèle hors ligne.
Le RS6 a bien un matériau de roue isolable — mais il ne bouge jamais.
