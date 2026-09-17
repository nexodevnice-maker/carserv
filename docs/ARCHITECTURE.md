# CAR SERVICE 06 — Architecture retenue

Socle validé le 17/09/2026 (voir § Validation). Aucune direction artistique n'est encore arrêtée : ce document décrit
le moteur, la séparation des responsabilités et les contrats sur lesquels le vertical slice va se construire.

## 1. Pile

| Couche | Choix | Origine |
|---|---|---|
| Site | **Astro 7** statique, TypeScript strict | MECA RIVIERA (en production sur nexodev.pages.dev) |
| Défilement | **natif**, aucun détournement | MECA RIVIERA |
| 3D | **Three.js 0.186**, chargé à la demande, une seule scène | MECA RIVIERA |
| Vidéo | H.264 GOP 5 sans B-frames + séquence d'images | Agenceeimoo (patterns 01–02), recette ajustée par mesure |
| Médias | sharp (paquet du site, comme MECA) ; ffmpeg-static / ffprobe-static dans `scripts/media-tools`, hors du build | nouveau (aucun ffmpeg sur la machine) |
| Déploiement | envoi web GitHub `nexodevnice-maker/carservice` → Cloudflare **Worker** `carservice` (`wrangler.jsonc` : actifs statiques `dist`) → https://carservice.nexodevnice.workers.dev | méthode MECA RIVIERA (envoi), Worker au lieu de Pages |
| QA | playwright-core + Edge/Chrome locaux (GPU réel), axe-core | MECA RIVIERA |

## 2. Flux

```text
défilement natif ──(événement : réveil seulement)──┐
                                                    ▼
                           SCHEDULER — une seule boucle rAF, endormie au repos
                                                    │ une image
  ┌─ input ─ ScrollInput.read()      une lecture de scrollY par image (zoom au pincement tenu)
  ├─ state ─ Timeline.progressAt()   p cible ∈ [0,1], linéaire en scroll
  │          Follow.step()           p affiché : amorti (bureau) / ressort critique (tactile), retard borné (maxLag)
  │                                  mouvement réduit : repos le plus proche, sans interpolation
  │          locate / locals         chapitre affiché, position locale de chaque chapitre
  │          CameraRig.evaluate(p)   pose pure (position, regard, focale, décalage optique, roulis)
  │          Channels.value(p)       canaux nommés (temps vidéo, uniformes…)
  │                                  ═══> ExperienceState (un objet, réutilisé, lu par tous)
  ├─ media ─ MediaRegistry.update()  quoi charger / libérer ; VideoScrub / FrameSequence .set(t).update()
  ├─ webgl ─ WebGLStage              caméra appliquée si changée, couches visibles par chapitre, rendu SI changement
  ├─ dom ─── DomWriter               --p, data-active-chapter, --local et data-state par chapitre (dédoublonné)
  └─ debug ─ HUD / crochets QA
```

Règles : une seule entrée (le scroll), une seule horloge (scheduler), un seul état, écrit à un seul endroit ; les
abonnés lisent. Tout ce qui se voit dérive de `progress.shown` — l'état visuel se reconstruit depuis p (aller,
retour, saut, rechargement), ce que la QA vérifie.

## 3. Arborescence

```text
src/
├── engine/                      MOTEUR GÉNÉRIQUE — aucune donnée CAR SERVICE 06 (réutilisable par un autre secteur)
│   ├── experience.ts            orchestrateur : définition + configuration → état maître, abonnés par phase
│   ├── scroll/scroll-input.ts   lecture du scroll natif, vitesse, zoom au pincement
│   ├── timeline/timeline.ts     piste mesurée : p, chapitres [start,end], scrollFor, toGlobal
│   ├── timeline/keys.ts         clés locales aux chapitres → globales ; canaux numériques rythmés
│   ├── motion/easing.ts         courbes avec intention (inOut quintique, out, in, outExpo, anticipate…)
│   ├── motion/pace.ts           fenêtre + courbe par segment (palier de lecture, pas de métronome)
│   ├── motion/follow.ts         amorti / ressort critique exact, retard borné
│   ├── state/experience-state.ts
│   ├── camera/camera-rig.ts     plans (intention écrite obligatoire), variantes tablette/mobile, regard en avance
│   ├── camera/path.ts           Catmull-Rom centripète par longueur de corde, points de passage (arcs)
│   ├── media/media-types.ts     descripteurs (rôle, chapitres, priorité, déclinaisons, affiche, alt, provenance)
│   ├── media/media-registry.ts  politique de chargement / libération par proximité et format
│   ├── media/video-scrub.ts     scrub sans tempête de seeks, contrôle de la plage seekable
│   ├── media/video-source.ts    vidéo de scrub en mémoire (URL blob) : seekable sans requêtes Range
│   ├── media/frame-sequence.ts  séquence d'images déterministe, mémoire bornée à deux étages
│   ├── media/frame-source.ts    images d'un fichier regroupé (Range, repli sans Range) ou de fichiers séparés
│   ├── webgl/webgl-stage.ts     scène unique à la demande : qualité adaptative, compileAsync, textures étalées,
│   │                            hors écran, perte/rétablissement de contexte, libération
│   ├── webgl/environment.ts     PMREM pré-calculé (CubeUV RGBE)
│   ├── webgl/dispose.ts         libération profonde (géométries, matériaux, textures d'uniformes)
│   ├── dom/dom-writer.ts        écritures DOM dédoublonnées, aucune lecture
│   ├── responsive/formats.ts    desktop / tablet / mobile lus depuis la CSS ; Responsive<T>, merged()
│   ├── performance/scheduler.ts une boucle, phases ordonnées, sommeil, onglet caché
│   ├── performance/quality.ts   définition adaptative au rythme réel de l'écran (MECA, inchangé)
│   ├── performance/capabilities.ts WebGL 2, économie de données, 2G, mémoire, cœurs, pointeur → palier
│   ├── accessibility/motion-preference.ts mouvement réduit en direct (+ ?motion=reduce|full)
│   └── debug/qa-hooks.ts        window.__experience (dev et <html data-qa> seulement)
│
├── domain/                      VÉRITÉ COMMERCIALE TYPÉE (Fact<T> : valeur, statut, source, note)
│   ├── facts.ts                 statuts CONFIRMED / TO_CONFIRM / UNKNOWN, registre des sources
│   ├── property.ts              « propriété » = l'entreprise : marque, sous-titres, zone, canaux, légal, horaires
│   ├── services.ts              univers 1 : prestations de nettoyage (par surface) et offres
│   └── rental.ts                univers 2 : flotte (véhicules → tarifs par durée, photos) et conditions
│
├── experience/                  LA RÉALISATION CAR SERVICE 06 (données d'expérience, pas de logique moteur)
│   ├── config.ts                valeurs de réglage centralisées (suivi, définition, politique média, budgets)
│   ├── chapters.ts              registre des chapitres : univers, titre, rythme par format, médias, repos, intention
│   ├── media.ts                 registre média (lit media.generated.json, jamais recopié à la main)
│   ├── media.generated.json     sortie du pipeline vidéo
│   └── boot.ts                  câblage de l'accueil (les scènes s'y branchent au vertical slice)
│
├── scenes/                      (vertical slice) une scène = abonnés de phase + couches WebGL + liaisons média
├── ui/                          ExperienceTrack (vue épinglée + chapitres), Chapter, SiteHeader
├── layouts/Base.astro           SEO : robots, canonique, Open Graph, Twitter, JSON-LD WebSite
├── pages/                       index (squelette structurel), 404, robots.txt, lab/engine (instrument)
├── lab/                         piste de contrôle du moteur (hors site)
└── styles/                      tokens.css (provisoires), formats.css (source des seuils), base.css

scripts/
├── media-inspect.mjs            inventaire mesuré des sources → docs/media-inventory.json
├── media-video.mjs              recadrage, plages sans plaques, scrub, séquence regroupée, affiches
├── media-env.mjs                HDRI → PMREM CubeUV 128/256
├── content-check.mjs            gate de publication (tout ce qui n'est pas CONFIRMED, droits médias)
├── qa-engine.mjs                validation navigateur (58 contrôles)
├── deploy-prepare.mjs           lots d'envoi GitHub + simulation du build Cloudflare (méthode MECA RIVIERA)
├── media-tools/                 ffmpeg/ffprobe du pipeline, paquet à part (jamais installé par Cloudflare)
└── lib/                         navigateur local, outils vidéo, écriture Radiance HDR
```

Correspondance avec la liste demandée : experience → `engine/experience.ts` + `experience/` ; camera → `engine/camera` ;
timeline → `engine/timeline` ; scroll → `engine/scroll` ; motion → `engine/motion` ; media → `engine/media` +
`experience/media.ts` ; webgl → `engine/webgl` ; property / services / rental → `domain/` ; ui → `ui/` ; responsive →
`engine/responsive` + `styles/formats.css` ; performance → `engine/performance` ; accessibility → `engine/accessibility`.

## 4. Contrats

### Piste et chapitres
- Une page a une piste `[data-track]` : vue épinglée `[data-stage]` (sticky, 100svh) + sections `[data-chapter]`
  dans le flux, recouvrant la vue (`margin-top: -100svh`).
- Rythme = donnée : `chapters.ts` → `--span-desktop/tablet/mobile` → `formats.css` choisit → `min-height`. Le moteur
  **mesure** (jamais ne calcule) : un texte plus long allonge le chapitre sans rien casser.
- `p = (scrollY − haut) / (hauteur − vue)` ; chapitre k = `[haut_k, bas_k] / hauteur` — partage exact de [0, 1].
- La piste porte `data-active-chapter`, jamais `data-chapter` (réservé aux sections ; collision trouvée par la QA).

### Clés, plans, canaux
- Toute clé est posée en **position locale d'un chapitre** (`{ chapter, at }`) : aucune clé en pixels ni en unités
  monde dépendantes du cadre (leçon Agenceeimoo n° 6).
- Un plan caméra a une **intention écrite** ; son `pace` décrit comment on le rejoint ; `via` dessine un arc ; `lead`
  fait précéder le regard ; `mobile`/`tablet` sont des surcharges partielles (héritent du bureau).

### Médias
- Le registre décide QUAND et QUELLE déclinaison ; la scène fournit une liaison `{ load, release }` qui décide COMMENT.
- Économie de données / 2G : affiches seules. Format changé : libéré puis rechargé dans la bonne déclinaison.
- Tout média porte `role`, `alt` (ce qu'il prouve), `source`, `license`.

### WebGL
- Une couche = `{ id, root, chapters?, init, update → boolean | 'continue', resize?, dispose }`. Hors de ses
  chapitres (± `layerMargin`), `root.visible = false` : aucun coût.
- Rendu seulement si caméra, couche ou taille a changé. Une animation temporelle retourne `'continue'`.

### DOM
- Variables écrites : `--p` sur la piste ; `--local` et `data-state="before|active|after"` sur chaque chapitre.
- Pas de fondu piloté par le temps sur un état de chapitre : un état visuel doit se déduire de la progression
  (observé dans le laboratoire : un fondu CSS de 220 ms superposait deux médias pendant un saut).

## 5. Ajouter sans reconstruire

| Ajout | Où | Moteur modifié ? |
|---|---|---|
| un véhicule de location | `domain/rental.ts` → `rentalFleet` | non |
| une durée / un tarif | `rates` du véhicule | non |
| une prestation ou une offre de nettoyage | `domain/services.ts` | non |
| un chapitre | `experience/chapters.ts` + sa section dans la page | non |
| un plan caméra | `definition.shots` | non |
| un média | pipeline → `experience/media.ts` + liaison dans la scène | non |
| une scène | `src/scenes/<nom>` : abonnés `experience.use`, couches, liaisons | non |
| un autre secteur (démo LOCccc) | nouveaux `domain/`, `experience/`, `scenes/`, tokens | non |

## 6. Budgets et politiques (config.ts)

| | Bureau | Tablette | Mobile |
|---|---|---|---|
| Suivi | amorti 4,5/s | ressort 4,8 rad/s | ressort 4,8 rad/s |
| Retard max (p) | 0,08 | 0,08 | 0,10 |
| Définition WebGL | 1,75 → 0,75 | 2 → 1,25 | 2 → 1,25 |
| Préchargement (chapitres devant / derrière / libération) | 2 / 1 / 3 | 1 / 1 / 2 | 1 / 1 / 2 |
| Transformation | scrub vidéo 900 px (6,2 Mio) | idem | séquence 540 px (3,9 Mio, 6 images décodées max) |
| Environnement (si utilisé) | cube 128 (447 Kio) | 128 | 128 |

Poids JavaScript mesurés (gzip) : accueil 9,4 Kio de moteur ; Three.js + scène 136 Kio, **chargés seulement** quand une
couche WebGL est requise (WebGL 2 présent, pas d'économie de données).

## 7. Validation (17/09/2026)

`npm run qa:engine` — Edge headless, ANGLE D3D11, GPU réel. **58/58 sur le build de production servi**
(`astro preview`, 4322) et sur le serveur de dev.

| Domaine | Contrôle mesuré |
|---|---|
| Piste | chapitres contigus sur [0,1], au prorata des données (±1 %) ; p exact de 0 à 1 (8 640 px) |
| État | aller = retour : pose identique au bit près pour 8 progressions ; 7 poses distinctes |
| Caméra | posée sur ses plans à ±2 cm ; trajectoire en arc visible (captures `qa-out/engine`) |
| Repos | 0 rAF sur 1,5 s, 0 rendu WebGL |
| Molette | amorti puis repos exact |
| Défilement brutal | pire retard 0,074 ≤ 0,08 ; convergence |
| Clavier | Fin → 1, Début → 0 ; Tab → lien d'évitement visible, contour 2 px |
| Vidéo | Range (206, seekable = 12,167 s) ; aller strictement croissant, retour strictement décroissant ; sauts rejoints à ±1 image ; seek typique 6–23 ms, pire 123–380 ms |
| Séquence | image exacte affichée ; ≤ 12 décodées (bureau), ≤ 6 (mobile) |
| GPU | textures, géométries, programmes constants sur 3 traversées (2 / 6 / 4) |
| Contexte | perte puis rétablissement : rendu repris, environnement intact |
| Responsive | 1440 → 390 px : format mobile, piste re-mesurée, cadrage mobile appliqué ; tablette reconnue |
| Mobile | déclinaison vidéo mobile servie ; ressort ; définition ≤ 2 |
| Mouvement réduit | affichage posé sur le repos le plus proche, sans interpolation |
| Libération | contexte rendu au navigateur ; plus aucune boucle ensuite |
| Accueil | 1 h1, hiérarchie sans saut, 7 chapitres dans l'ordre, aucun débordement, axe-core WCAG 2.1 AA : 0 violation, console vide, crochets QA absents du build |
| SEO | `SITE_URL` défini : canonique, OG, JSON-LD WebSite, sitemap sans /lab/ ; sinon noindex + `Disallow: /` |

Limites connues : voir `docs/DECISIONS.md` § Limites.

## 8. Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `preview` | 4321 / dist / 4322 |
| `npm run typecheck` | `astro sync` + `tsc --noEmit` |
| `npm run media:setup` | installe ffmpeg/ffprobe du pipeline (une fois, hors paquet du site) |
| `npm run media:inspect` | inventaire mesuré des sources |
| `npm run media:video` | dérivés vidéo (≈ 6 min) |
| `npm run deploy:prepare [-- --simulate]` | dossier d'envoi GitHub `Desktop/carservice-envoi-github` + build Cloudflare simulé |
| `npm run media:env` | environnement pré-calculé |
| `npm run content:check [-- --strict]` | gate de publication |
| `npm run qa:engine [-- http://localhost:4322]` | validation navigateur (serveur requis) |
