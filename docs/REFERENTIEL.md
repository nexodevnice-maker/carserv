# CAR SERVICE 06 — RÉFÉRENTIEL DU PROJET

**À quoi sert ce document.** C'est la trace complète de ce qui a été construit, pourquoi, et où se trouve chaque
réglage. Il est écrit pour être lu d'un bout à l'autre par une IA (ou un développeur) qui reprend le projet sans
l'avoir fait : après cette lecture, on doit savoir corriger n'importe quel défaut **sans explorer le dépôt au hasard**
et sans casser ce qui marche.

Ordre de lecture conseillé : §1 (le projet) → §2 (règles non négociables) → §3 (où vit quoi) → §12 (recettes de
correction). Le reste est de la référence à consulter au besoin.

Dernière mise à jour : **18/09/2026** — reconstruction cinématique mobile (24 unités, sol = terrain du panorama
fourni, 60 i/s au téléphone). La mise en scène mobile a désormais son propre document, à lire avec celui-ci :
**`docs/MOBILE_CINEMATIC_GRAMMAR.md`**.

---

## 1. Le projet en dix lignes

| | |
|---|---|
| Client | **CAR SERVICE 06** — nettoyage automobile premium à domicile dans les Alpes-Maritimes, et location d'un Toyota C-HR |
| Nature | **Maquette de démonstration sectorielle** : montrer ce qu'une expérience haut de gamme peut devenir pour ce métier. Ce n'est pas la reproduction d'un site existant |
| En ligne | https://carservice.nexodevnice.workers.dev (Cloudflare **Worker** nommé `carservice`, assets statiques `./dist`) |
| Dépôt | `nexodevnice-maker/carserv`, branche `main` |
| Technologie | Astro 7 (site **statique**) + TypeScript + Three.js 0.186 (chargé en différé) |
| Forme | **Une seule page** parcourue au scroll : on est la caméra, un seul monde 3D traversé sans coupure, du ciel étoilé jusqu'au bord du 06 |
| Sources de vérité | deux flyers de l'entreprise (`tools/flyers/MAIN.png`, `LOC.png`) et deux modèles 3D fournis (`tools/3d/`) |
| Juge | le porteur regarde **au téléphone, en portrait**. Ce qui n'est pas visible à l'écran n'existe pas |
| Langue | interface, textes, commentaires de code et documentation : **français** |
| État | maquette complète et déployée ; défauts connus et travaux restants au §13 |

---

## 2. Règles non négociables

Elles viennent de `CLAUDE.md` et `00_CONTROL_PLANE/CLAUDE.md`. **Les enfreindre est une régression, même si le rendu
est joli.**

1. **Vérité commerciale.** On n'invente jamais une prestation, un prix, une garantie, un horaire, une zone, un avis,
   une certification. Tout fait commercial vit dans `src/domain/` avec un **statut** (`CONFIRMED`, `TO_CONFIRM`,
   `UNKNOWN`) et sa **source**. Un fait `UNKNOWN` n'est jamais affiché. `npm run content:check` liste tout ce qui
   n'est pas confirmé.
2. **Aucune plaque, aucun logo constructeur mis en avant**, aucune interface (Snapchat, etc.) dans un fichier publié.
   Les matériaux d'emblème et de plaque des modèles 3D sont masqués au chargement quand ils sont isolables.
3. **`src/engine/` est générique** : aucune donnée, aucun texte, aucune couleur CAR SERVICE 06 dedans. Ce qui est
   propre au projet vit dans `src/experience/`, `src/scenes/`, `src/domain/`, `src/styles/`.
4. **Une seule boucle, une seule lecture du scroll, un seul état.** Une scène s'abonne avec
   `experience.use(phase, …)`. Elle ne crée jamais son propre `requestAnimationFrame` ni son écouteur de scroll.
5. **Aucun état visuel piloté par le temps.** Tout se reconstruit depuis la progression `p` : à l'aller comme au
   retour, la même position de scroll donne exactement la même image.
6. **Chaque valeur à sa place** : réglage technique → `src/experience/config.ts` ; rythme et narration →
   `src/experience/chapters.ts` ; plan caméra → `src/experience/shots.ts` ; couleur et typographie →
   `src/styles/tokens.css` ; texte de récit → `src/experience/copy.ts` ; fait commercial → `src/domain/`.
7. **Commentaires en français, sobres, qui disent POURQUOI** (pas ce que le code fait déjà lire).
8. **Anti-template** : pas de grille de cartes comme expérience principale, pas de glassmorphism, pas de dégradés
   arbitraires, pas de 3D décorative sans rôle narratif.
9. **Le build n'est pas une validation.** Toute étape se vérifie par une capture d'écran réelle (§11).

---

## 3. Où vit quoi (carte de décision)

```
src/
├── engine/          LE MOTEUR, générique et réutilisable (aucune donnée du client)
│   ├── experience.ts          assemble tout : scroll → progression → état → phases
│   ├── timeline/              chapitres, positions locales, canaux (keys.ts)
│   ├── camera/camera-rig.ts   plans, vols, Catmull-Rom centripète, `look`, `flight`
│   ├── motion/                amorti, ressort, glissade quintique, courbes (pace)
│   ├── scroll/guide.ts        pas guidés : un geste = un plan
│   ├── webgl/webgl-stage.ts   scène unique, rendu à la demande, DPR adaptatif, near/far par altitude
│   ├── webgl/post-process.ts  la passe d'image : halo, tramage, étalonnage, vignette
│   ├── media/media-registry.ts  QUAND charger un média, QUELLE déclinaison, QUAND libérer
│   └── debug/qa-hooks.ts      window.__experience (DÉVELOPPEMENT SEULEMENT)
│
├── experience/      LA RÉALISATION (données, pas de logique moteur)
│   ├── chapters.ts            les 12 chapitres + TOUS les canaux (le cœur du récit)
│   ├── shots.ts               les 24 unités cinématiques (un repos = un plan, positions en mètres)
│   ├── world.ts               la composition du monde : échelles, nord, route, véhicules
│   ├── config.ts              réglages techniques + CONTACT.inbox (destination des demandes)
│   ├── copy.ts                textes de narration (jamais un fait commercial)
│   ├── media.ts               registre des médias lourds (modèles 3D, environnement)
│   ├── rendezvous.ts          calendrier réel + assemblage du courriel
│   └── boot.ts                câblage : crée les couches, branche les médias, lance la scène
│
├── scenes/          LES COUCHES WebGL (chacune possède ses objets et les libère)
│   ├── sky/sky-layer.ts       l'univers : HDRI fourni, sol (terrain projeté + eau), brume — uniformes partagés
│   ├── shared/night-glsl.ts   SKY_GLSL + GROUND_GLSL : la nuit commune, et la projection du terrain au sol
│   ├── map/map-layer.ts       la France (96 départements) et le 06 en volume, falaises, miroir
│   ├── clouds/cloud-layer.ts  mer de nuages + bancs bas
│   ├── beacon/beacon-layer.ts la colonne de lumière (« chez vous »)
│   ├── vehicle/vehicle-layer.ts   un modèle 3D fourni : salissure, relevé, vernis, ombre de contact, avance
│   ├── vehicle/vehicle-light.ts   l'environnement de nuit + 2 directionnelles, POUR LES VÉHICULES SEULS
│   └── road/road-layer.ts     la chaussée, les marquages de durée, les feux du C-HR, le tracé vu du ciel
│
├── domain/          LA VÉRITÉ COMMERCIALE (facts.ts, property.ts, services.ts, rental.ts)
├── ui/              Astro : ExperienceTrack, Chapter, SiteHeader, Tabs, MobileBar, BrandIcon, Rendezvous
├── pages/index.astro  le document complet, lisible sans script ; monte les chapitres et les légendes
├── styles/          tokens.css (couleurs, typo), experience.css (mise en scène), formats.css, base.css
└── lab/ + pages/lab/engine.astro   banc d'essai du moteur, HORS du site (à retirer avant publication)
```

**Règle de décision rapide :**

| Je veux changer… | Je touche… |
|---|---|
| la durée d'un chapitre, un point d'arrêt, l'apparition d'un texte | `src/experience/chapters.ts` |
| un cadrage, une focale, un mouvement de caméra | `src/experience/shots.ts` |
| la position d'un objet dans le monde, une échelle | `src/experience/world.ts` |
| une couleur, une police, une taille de texte | `src/styles/tokens.css` |
| un texte de récit (titre, phrase d'accroche) | `src/experience/copy.ts` |
| un prix, une prestation, une condition | `src/domain/` (avec statut et source) |
| la matière d'un véhicule (salissure, reflets, scan) | `src/scenes/vehicle/vehicle-layer.ts` |
| le halo des sources, le grain, la vignette, l'étalonnage | `src/experience/config.ts` → `STAGE.post` |
| la lumière des véhicules | `src/scenes/vehicle/vehicle-light.ts` + `ENVIRONMENT` dans `config.ts` |
| la route, les marquages, les feux | `src/scenes/road/road-layer.ts` |
| le ciel, le sol mouillé, la brume | `src/scenes/sky/sky-layer.ts` + `src/scenes/shared/night-glsl.ts` |
| la mise en page d'une légende | `src/styles/experience.css` |
| le formulaire de rendez-vous | `src/ui/Rendezvous.astro` + `src/experience/rendezvous.ts` |

---

## 4. Le récit : 12 chapitres, 24 unités

Un chapitre a une **longueur de scroll** (`span`, en centièmes de hauteur d'écran, par format), des **repos**
(`rests`, positions locales 0→1 où la caméra se pose et où un pas guidé s'arrête) et des **fenêtres de légende**
(`panels`, où chaque texte apparaît et disparaît).

| # | Chapitre | Univers | span (bureau / mobile) | Repos | Ce qu'on voit |
|---|---|---|---|---|---|
| 1 | `matiere` | cleaning | 170 / 180 | 0 · 0,55 | Trop près pour comprendre : une laque noire, puis des étoiles dedans |
| 2 | `revelation` | cleaning | 150 / 150 | 0,5 | Le recul : c'était une voiture, et elle tient le ciel |
| 3 | `ciel` | bridge | 240 / 240 | 0,45 · 0,9 | On sort par le reflet : l'univers, au-dessus d'une mer de nuages |
| 4 | `territoire` | territory | 280 / 280 | 0,4 · 0,88 | La France en volume, un seul point allumé, puis le 06 |
| 5 | `avant` | cleaning | 240 / 250 | 0,42 · 0,88 | La balise, puis la même laque éteinte par la poussière |
| 6 | `intervention` | cleaning | 300 / 310 | 0,18 · 0,56 · 0,9 | L'optique, la ligne d'or qui traverse, le flanc verni |
| 7 | `transformation` | cleaning | 250 / 260 | 0,35 · 0,85 | **La rime** (le plan de l'unité 3, gagné), puis l'habitacle |
| 8 | `prestations` | cleaning | 260 / 280 | 0,25 · 0,55 · 0,85 | Le tour du véhicule, le métier, la formule |
| 9 | `bascule` | bridge | 220 / 220 | 0,9 | Chute verrouillée : la route monte à notre rencontre |
| 10 | `location` | rental | 440 / 460 | 0,18 · 0,44 · 0,7 · 0,93 | On rattrape, on double, il s'éloigne, il s'arrête |
| 11 | `rendezvous` | action | 240 / 280 | 0,5 | **Le seul écran sans 3D** : calendrier et demande |
| 12 | `contact` | action | 160 / 170 | 0,6 | Le bord du 06, la galaxie, un seul geste |

Le détail des 24 unités (intention, sujet, conséquence) est dans `docs/MOBILE_CINEMATIC_GRAMMAR.md` § 4.

L'`universe` d'un chapitre pilote l'accent de couleur (`html[data-universe]`) : jaune pour le nettoyage et le
territoire, **rouge** pour `rental` et `bridge`. Le chapitre affiché est aussi écrit sur `<html data-scene>` (utilisé
pour effacer la barre d'action pendant le rendez-vous). ⚠️ `data-chapter` est **réservé aux sections mesurées** : ne
jamais le poser sur `<html>` (cela casse le contrôle « chapitres dans l'ordre » de la QA).

---

## 5. Les 22 plans caméra

Positions en **mètres**, dans le monde décrit au §6. Chaque plan a une variante **portrait** (téléphone et tablette) :
focale plus ouverte, décalage vers le haut pour laisser la légende en bas.

| Plan | Chapitre @ position | Intention |
|---|---|---|
| `univers` | arrivee @ 0 | Le premier écran, toujours : la Voie lactée |
| `france` | zone @ 0,45 | La France entière, un seul point allumé |
| `territoire` | zone @ 0,88 | Le 06 seul, la balise au milieu |
| `balise` | avant @ 0,42 | Le véhicule au pied de la colonne de lumière |
| `poussiere` | avant @ 0,86 | **Macro** : l'aile arrière, la roue, la poussière |
| `capot` | intervention @ 0,18 | **Macro** : l'optique avant, ce que la ligne va traverser |
| `scan` | intervention @ 0,55 | Le véhicule entier, la ligne d'or au milieu |
| `verni` | intervention @ 0,9 | Plan rasant le long du flanc verni |
| `reflets` | transformation @ 0,35 | Trois quarts avant, la laque reprend le ciel |
| `habitacle` | transformation @ 0,85 | **Assis à la place du conducteur** |
| `recul` | prestations @ 0,25 | Le véhicule propre entier, la liste à gauche |
| `trois-quarts` | prestations @ 0,55 | L'autre côté, la suite de la liste |
| `offre` | prestations @ 0,85 | Recul dans la nuit, la formule et le prix |
| `ascension` | univers @ 0,42 | Montée verticale à travers les nuages |
| `cap` | univers @ 0,85 | Cap au nord sur le cœur de la galaxie |
| `route` | bascule @ 0,9 | Descente verrouillée : on se pose dans la voie |
| `un-jour` | location @ 0,18 | Derrière le C-HR, « 1 JOUR » peint au sol |
| `sept-jours` | location @ 0,44 | **On le double**, trois quarts arrière rapproché |
| `quinze-jours` | location @ 0,7 | Il s'éloigne, deux points rouges sous la galaxie |
| `conditions` | location @ 0,93 | Il s'arrête au bord du 06, place aux tarifs |
| `agenda` | rendezvous @ 0,5 | Caméra immobile ; la carte couvre l'écran |
| `horizon` | contact @ 0,6 | La mer de nuit et la galaxie devant |

**Règle de cadrage en portrait (la plus utile à retenir) :** l'écran fait un rapport 0,46. Avec une focale verticale
de 50°, la largeur visible vaut ≈ 0,43 × distance. **Un véhicule de 5 m n'entre donc dans le cadre qu'à partir de
13 m.** Plus près, il faut assumer une macro (une aile, une roue, une optique) plutôt qu'un plan large rogné.
Vérifier `referenceAspect` dans `config.ts` : les focales sont écrites pour 1,6 (bureau), 0,75 (tablette), 0,46
(mobile) et le moteur les ouvre si l'écran est plus étroit.

Vocabulaire d'un plan (`ShotDefinition`) : `position` (où est l'œil), `target` (ce qu'on regarde) **ou** `look`
(azimut + élévation : verrouille la direction, utilisé quand la galaxie doit rester au même point de l'image), `fov`,
`shift` (décalage optique pour laisser la place au texte), `via` (points de passage du vol), `pace` (fenêtre et
courbe), `lead` (anticipation), `flight` (l'enveloppe du vol : coup de focale, roulis, plongée, turbulence).

---

## 6. Le monde (`world.ts`)

Un seul espace à l'échelle, en mètres, traversé sans coupure.

| Élément | Valeur | Remarque |
|---|---|---|
| Nord | `-π/2` (vers les z négatifs) | **Tout le voyage regarde le nord** |
| Rotation du ciel | `skyYaw = 1,32` rad, **constante** | Regarder au nord = regarder le cœur de la Voie lactée |
| Le 06 | contour IGN, 1 unité de carte = 1 m (≈ 1 km × 1,1 km) | Plateau à y = 0, falaises d'or de 40 m |
| Ancre de la carte | `[400, 900]` du viewBox posée à l'origine | C'est là qu'est le véhicule de la démonstration |
| La France | `map-france.json` (96 départements, 53 Ko) | Calée sur la boîte du 06 : **même échelle, même endroit** |
| Véhicule du nettoyage | longueur 4,99 m, en `[0, 0]`, cap 0 (capot vers l'est) | Ne bouge jamais |
| Véhicule de location | longueur 4,36 m, en `[0, −240]`, cap nord | Avance le long de la route (canal `chrTravel`) |
| Route | origine `[1,7, −240]`, cap nord, **longueur 420 m** | La voie de la caméra est en x = 0 ; s'arrête au bord du plateau |
| Marquages | 1 JOUR à 100 m, 7 JOURS à 200 m, 15 JOURS à 300 m | Repère local le long de la route |
| Balise | colonne de 2 600 m | Visible depuis l'orbite de la France |
| Nuages | mer à 1 500 m (percée d'une trouée), bancs bas à 420 m | Moins nombreux et plus gros au téléphone |

Correspondance utile pour la location : la caméra passe par **60, 78, 180, 296 et 390 m** le long de la route
(`shots.ts`), le C-HR par **84, 104, 186, 345 et 398 m** (`chrTravel` dans `chapters.ts`). C'est l'écart entre ces
deux suites qui fait qu'on le rattrape, qu'on le double, puis qu'il s'échappe. **Changer l'un sans l'autre casse la
scène.**

---

## 7. Les canaux (`chapters.ts` → `definition.channels`)

Un canal est une valeur nommée, fonction de la progression, écrite par des clés `{chapter, at, value, pace}` et lue
par les scènes. C'est **l'unique moyen** de relier le scroll à ce qu'on voit.

| Canal | Lu par | Rôle |
|---|---|---|
| `carLight` | vehicle (RS6), vehicle-light | Présence du véhicule du nettoyage (0 → 1 à l'arrivée, 0 dans l'univers) |
| `dirt` | vehicle (RS6) | Épaisseur de la poussière (1 avant, 0 après le relevé) |
| `scan` | vehicle (RS6) | Position de la ligne de lumière le long de la caisse (0 → 1) |
| `polish` | vehicle (RS6) | Retour du vernis derrière la ligne |
| `clean`, `gauge` | CSS (jauge Avant/Après) | Remplissage et présence de la jauge |
| `chrLight` | vehicle (C-HR), road (feux) | Présence du véhicule de location |
| `chrTravel` | vehicle (C-HR), road (feux) | Son avance en mètres le long de la route |
| `beacon` | beacon | Intensité de la colonne de lumière |
| `skyLight` | toutes les couches (uniforme partagé) | Intensité générale de la nuit |
| `skyYaw` | sky | Rotation du ciel (constante : un seul ciel) |
| `skySway` | sky | Léger balancement à l'ouverture seulement |
| `fog` | sky, road, map | Densité du noir au loin (transparent en altitude, dense au sol) |
| `clouds` | clouds | Densité des nuages |
| `mapReveal` | map | La vague de lumière qui parcourt le 06 |
| `roadDraw`, `roadTrail` | road | Le tracé rouge qui se dessine vu du ciel |
| `roadLight` | road | Allumage de la chaussée et amorçage des feux |
| `bloom` | passe d'image (webgl-stage) | Combien les sources débordent. 1 partout, retenu dans la galaxie |

**Pour ajouter un effet piloté par le scroll :** créer un canal ici, le lire dans la couche concernée, ne jamais
lire une horloge.

---

## 8. Les véhicules 3D

### Pipeline
Les modèles bruts sont fournis par le porteur dans `tools/3d/` (hors build). `npm run media:3d`
(`scripts/media-3d.mjs`) les allège avec `@gltf-transform/cli` (textures WebP 1024, quantification, compression
meshopt) vers `public/models/` :

| Modèle | Brut | Publié | Rôle |
|---|---|---|---|
| `tools/3d/RS6/2020_audi_rs6_avant.glb` | 13 Mo, 217 018 triangles, 26 matériaux | `public/models/rs6.glb` — **3,0 Mo** | Le véhicule de la démonstration |
| `tools/3d/TOYOTA/source/MDL14246_reversed.glb` | 1,8 Mo, 201 073 triangles, 5 matériaux | `public/models/chr.glb` — **1,7 Mo** | Le véhicule de location |

Prérequis : `npm run media:setup` (installe les outils dans `scripts/media-tools`, jamais installés par Cloudflare).
Décodage au navigateur par `MeshoptDecoder` (three/addons), chargé avec le modèle.

### Ce que fait `vehicle-layer.ts`
Ce n'est pas « poser un objet dans une scène » : la couche **réécrit les matériaux du modèle** (`onBeforeCompile`) et
y injecte trois notions pilotées par les canaux :

- **la salissure** (`dirt`) : plus épaisse sur ce qui regarde le ciel et dans le bas de caisse, bruitée ; elle ternit
  la couleur, matifie la laque (rugosité 0,93) et éteint le métal ;
- **le relevé** (`scan`) : une abscisse le long de la caisse ; devant la ligne, rien n'a changé ; derrière, la
  poussière n'existe plus. La ligne elle-même est un trait d'or émissif serré, avec un halo et une lueur mourante ;
- **le vernis** (`polish`) : la rugosité tombe à 35 % derrière la ligne, les reflets reviennent.

Autres décisions importantes : les vitres en **transmission** sont converties en verre sombre translucide (une passe
de rendu de moins par image : rédhibitoire au téléphone) ; une **ombre de contact** (empreinte sombre, plus dense sous
les trains) empêche le modèle de flotter sur le sol réfléchissant ; les matériaux dont le nom contient
`badge|plate|logo|emblem` sont **masqués** au chargement ; le modèle est mis à l'échelle sur sa longueur réelle, roues
au sol, orienté selon son cap.

### La lumière (`vehicle-light.ts`)
`scene.environment` reçoit un **PMREM de nuit pré-calculé** (`/env/night-128.hdr` 447 Ko au téléphone,
`night-256.hdr` 1,7 Mo au bureau), tourné du même `skyYaw` que le ciel visible, plus deux directionnelles (clé froide,
contre-jour chaud). Intensité pilotée par la présence des véhicules.

> ⚠️ **Piège historique.** Le 17/09, un PMREM appliqué à toute la scène avait blanchi la chaussée. Le reste du monde
> (ciel, sol, route, carte) est en **shaders maison** et ignore `scene.environment` et les lumières : seuls les
> `MeshStandardMaterial` des véhicules les reçoivent. Ne jamais remettre un `MeshStandardMaterial` sur la route ou le
> sol.

---

## 9. Le rendez-vous (le seul écran sans 3D)

- Markup : `src/ui/Rendezvous.astro` ; comportement : `src/experience/rendezvous.ts` ; style : section
  « Rendez-vous » de `src/styles/experience.css`.
- **14 jours régénérés à partir d'aujourd'hui** par le script (un site statique ne doit jamais proposer une date
  passée ; la version sans script affiche les dates de la construction). Les dimanches sont signalés, jamais refusés.
- Champs : date, créneau (Matin / Midi / Après-midi / Soir), nom, téléphone, commune, véhicule, besoin (liste
  construite depuis `src/domain/`), précisions. Nom, téléphone et commune sont obligatoires.
- **La demande part par courriel préparé** (`mailto:`) vers `CONTACT.inbox` = `nexodevnice@gmail.com`, sujet et corps
  déjà remplis. Aucun serveur, aucune base, aucune donnée transmise à un tiers : le client relit et envoie depuis sa
  messagerie. Sans script, le lien courriel reste écrit dans la page.
- **Vérité :** les créneaux sont ceux que **demande** le client, jamais des disponibilités annoncées (aucun horaire
  d'ouverture n'est confirmé). Le texte le dit : « Disponibilités confirmées par l'entreprise ».
- Pendant ce chapitre, la nuit s'éteint derrière la carte (`[data-active-chapter='rendezvous'] .stage__veil`) et la
  barre d'action du téléphone s'efface (`html[data-scene='rendezvous']`).

**Pour changer la destination des demandes :** `CONTACT.inbox` dans `src/experience/config.ts`, un seul endroit.

---

## 10. Direction artistique et données commerciales

**Relevée à la pipette sur les deux flyers**, rien d'inventé : noir `#000`, blanc, **jaune `#fdc727`** (nettoyage et
territoire), **rouge `#fb1220`** (location). Typographie Barlow / Barlow Condensed. Composants portés du flyer :
badges à filet, prix en pastille pleine, pastilles d'icônes au trait (`src/ui/BrandIcon.astro`), cadre de tarifs à
liseré néon rouge, signature manuscrite en italique. Onglets **NETTOYAGE / LOCATION** (`src/ui/Tabs.astro`) : de vrais
liens vers les chapitres, l'onglet actif suit l'univers à l'écran.

Faits commerciaux (`src/domain/`) — extrait des statuts :

| Fait | Valeur | Statut |
|---|---|---|
| Formule intérieur + extérieur | 50 € | **TO_CONFIRM** (portée et actualité) |
| Location C-HR | 70 € / jour, 400 € / 7 j, 700 € / 15 j | CONFIRMED (flyer LOC) |
| Conditions location | assurance comprise, kilométrage illimité, hybride économe, confort & sécurité, 7J/7 | CONFIRMED |
| Prestations | intérieur, extérieur, finition premium, produits professionnels | CONFIRMED |
| Zone | « Déplacement dans tout le 06 » | CONFIRMED (communes précises : UNKNOWN, ne jamais en citer) |
| Canal de contact | Instagram `car_service06` | CONFIRMED (téléphone, courriel, adresse : UNKNOWN) |
| Horaires, statut légal, caution, procédure de réservation | — | **UNKNOWN** : jamais affichés |

---

## 11. Vérifier, déployer

```bash
npm run typecheck          # astro sync && tsc --noEmit
npm run build              # site statique dans dist/
npm run dev                # serveur de développement, port 4321
npm run qa:engine          # 60 contrôles navigateur (piste, état, caméra, GPU, a11y) — ~4 min
node scripts/qa-shots.mjs qa-out/x http://localhost:4321   # une capture par pas guidé
npm run content:check      # tout ce qui n'est pas CONFIRMED, droits des médias
npm run deploy             # build + publication du Worker Cloudflare
node scripts/qa-live.mjs https://carservice.nexodevnice.workers.dev   # parcours du site publié
```

**Pièges qui font perdre une heure :**

1. **Les crochets QA (`window.__experience`) n'existent qu'en développement.** `astro preview` (port 4322) sert le
   build de production : `qa-shots` y échoue avec un « timeout ». Toujours capturer contre `npm run dev` (4321).
2. **Jamais deux navigateurs 3D sans écran en même temps** : lancer `qa:engine` en tâche de fond et attendre.
3. `QA_ONLY=mobile|desktop` pour restreindre, `QA_MID=1` pour capturer aussi le **milieu des vols** (c'est là que les
   défauts de trajectoire se voient).
4. Les captures se prennent après avoir désactivé l'accroche : `scroll-snap-type: none` (les scripts le font déjà).
5. **Windows** : écrire les correctifs de fichiers comme scripts `.mjs` ou Python (les heredocs bash avec accents et
   backticks cassent), forcer les fins de ligne **LF**, et passer par le shell pour les exécutables `.cmd`.
6. `npm run deploy` utilise **`wrangler@4.42.0` épinglé** (les versions suivantes verrouillent un cache miniflare).
7. La production Cloudflare **ignore les requêtes Range**.

---

## 12. Recettes de correction (symptôme → geste)

| Symptôme | Où regarder | Geste |
|---|---|---|
| « Le véhicule est coupé / trop près » (téléphone) | `shots.ts`, variante `portrait` du plan | Reculer la `position` ou ouvrir la `fov` — viser ≥ 13 m pour une voiture entière (§5) |
| « On ne voit rien à cet endroit » | `chapters.ts` (canaux de présence) + `shots.ts` | Vérifier que le canal `…Light` vaut 1 à cette position, et que le sujet est devant la caméra |
| « La transition est brutale / molle » | `shots.ts` : `via`, `pace`, `lead`, `flight` | Ajouter un point de passage, élargir la fenêtre `pace`, augmenter `flight.fov` pour un coup de focale |
| « Le texte apparaît trop tôt / trop tard » | `chapters.ts` → `panels[].in/out` | Décaler la fenêtre (positions locales du chapitre) |
| « C'est trop long / trop court à scroller » | `chapters.ts` → `span` par format | Augmenter ou réduire (centièmes de hauteur d'écran) |
| « La voiture ne semble pas sale / pas assez brillante » | `vehicle-layer.ts` (`carDust`, `roughnessFactor`) | Ajuster les facteurs de poussière et de vernis |
| « La carrosserie est plate, sans reflet » | `config.ts` → `ENVIRONMENT.intensity`, `vehicle-light.ts` (intensités) | Monter l'environnement avant de monter les directionnelles : ce sont les reflets qui font la laque |
| « Le véhicule flotte » | `vehicle-layer.ts`, l'ombre de contact | Augmenter `uStrength` ou la taille du plan d'ombre |
| « Les feux du C-HR sont mal placés » | `road-layer.ts`, position des sprites + `tail.offset` dans `boot.ts` | Ajuster hauteur et écartement (repère local : x le long de la route) |
| « On ne voyage pas assez dans la location » | `chapters.ts` → `chrTravel` **et** `shots.ts` → les `lane(...)` | Déplacer les deux suites ensemble (§6) ; garder la route dans ses 420 m |
| « Les lumières bavent / l'image est laiteuse » | `config.ts` → `STAGE.post.bloom`, `threshold` | Monter le seuil AVANT de baisser le halo : c'est le tri des sources qui fait la propreté |
| « Cette unité est trop lumineuse depuis la passe d'image » | `chapters.ts` → canal `bloom` | Le retenir sur ce chapitre seulement (c'est ce qui est fait dans la galaxie) |
| « La couleur est fausse » | `styles/tokens.css` | Une seule source pour toutes les couleurs |
| « Un prix / un texte commercial est faux » | `src/domain/` | Corriger la donnée **et** son statut ; ne jamais écrire un fait dans une page |
| « Le formulaire n'envoie pas au bon endroit » | `config.ts` → `CONTACT.inbox` | Un seul endroit |
| Page blanche, scène absente | Console du navigateur + `window.__experience.info()` en dev | `stageStatus` dit pourquoi (WebGL absent, erreur de module, repli statique) |
| Contrôle QA « chapitres dans l'ordre » en échec | `scripts/qa-engine.mjs` (liste attendue) | Mettre la liste à jour quand on ajoute un chapitre, et ne jamais poser `data-chapter` sur `<html>` |

---

## 13. Défauts connus et travaux restants

**À trancher avec le porteur**

1. **Droits des modèles 3D** : `vehicle-cleaning` et `vehicle-rental` sont marqués `TO_CONFIRM` — l'origine et la
   licence des deux GLB fournis ne sont pas connues. À confirmer avant toute publication réelle.
2. **Emblèmes visibles** : sur le C-HR, un seul matériau couvre toute la caisse — impossible d'en isoler l'emblème ni
   la plaque (vierge). Ils ne sont jamais mis en avant par un plan, et le pied de page rappelle l'absence
   d'affiliation, mais ce n'est pas un masquage.
3. **Faits `UNKNOWN`** à fournir avant publication : téléphone, courriel de l'entreprise, adresse, statut légal et
   mentions légales, horaires, caution et procédure de réservation, photos réelles du véhicule loué.

**Dette technique**

4. `src/pages/lab/engine.astro` et `src/lab/` (banc d'essai du moteur) sont **publiés** : à retirer avant mise en
   production réelle. Ils utilisent encore le pipeline vidéo (`media.generated.json`, `SEQUENCE_BUDGET`, les fichiers
   `public/media/*`), seule raison pour laquelle ce pipeline existe encore.
5. Le paquet publié pèse ~24 Mo, dont la vidéo et la séquence d'images qui ne servent plus qu'au laboratoire.
6. `scripts/media-passage.mjs` et `scripts/lib/align.mjs` (recalage des images avant/après) ne servent plus au site.

**Pistes d'amélioration identifiées, non faites**

7. Reflet du véhicule sur la chaussée mouillée (aujourd'hui seuls les feux se reflètent).
8. Sons (aucun pour l'instant), et une vraie prise de rendez-vous côté serveur si le porteur veut un suivi.
9. **Les quatre anneaux du constructeur sont lisibles sur la calandre du RS6** (plan `avant`, unité 10). Ce n'est pas
   un détail de rendu : c'est une entorse à la règle 2 du §2. Le filtre de `vehicle-layer.ts` masque les matériaux
   nommés `badge|logo|emblem` — et il masque bien `BadgeA_Material1` — mais les anneaux visibles à l'écran sont une
   géométrie portée par un matériau `Grille*A`, que le nom ne trahit pas. Les identifier demande de masquer les
   meshes de calandre un par un et de regarder ; les masquer tous crèverait la calandre. **À lever avant toute
   publication réelle.**

---

## 14. Historique : ce qui a été fait, dans l'ordre

| Commit | Ce qui a changé |
|---|---|
| `12b539b` | **Socle** : moteur d'expérience (scroll → progression → état, phases, canaux, plans, pas guidés), registre média, domaine commercial typé, déploiement Cloudflare Worker |
| `e0085f3` | **Mise en ligne** : en-tête mobile, QA en production, `npm run deploy` |
| `bb87c1e` | **Maquette complète** : univers HDRI, preuve vidéo avant/après pilotée par le scroll, passage de l'eau, route de la location |
| `7f67321` | **Un seul monde traversé** : sol mouillé infini analytique, nuages, le 06 en volume, vols continus, scroll en glissade (fin du scroll « mou ») |
| `8e9a10b` | **Le voyage** : ciel → 06 → véhicule → univers → route ; relevé d'or ; un seul ciel (rotation constante, le nord regarde la galaxie) |
| `a4340eb` | **DA des flyers** (jaune/rouge, badges, icônes, onglets), **France en 3D** (96 départements à l'échelle du 06), relevé recalé, prestations complètes, mobile d'abord |
| `20f9479` | **Les véhicules 3D fournis** remplacent la vidéo (salissure → relevé → vernis → habitacle), **le C-HR** roule dans la location (rattrapé, doublé, échappé, arrêté), **le rendez-vous** par courriel, profondeur retravaillée pour le portrait |

**Ce qui a été supprimé le 18/09/2026 — et ne doit pas revenir :** le monolithe de preuve, la vidéo pilotée par le
scroll, la séquence d'images du téléphone, le passage de l'eau et le recalage des deux images. Raison : demande du
porteur (« supprime la partie où la vidéo avant/après passe avec le scan, ce n'est pas beau ») et remplacement par de
la vraie 3D, plus nette et plus légère au téléphone. Le code correspondant (`src/scenes/evidence/`) a été retiré du
dépôt.

---

## 15. Documents liés

| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Règles du code, comment déployer, comment vérifier (lu en premier par l'IA) |
| `00_CONTROL_PLANE/CLAUDE.md` | Contrat de mission : priorités, règles anti-template, règle de vérité |
| `docs/ARCHITECTURE.md` | Architecture détaillée du moteur, budgets par format, résultats de validation |
| `docs/DECISIONS.md` | **Journal des décisions** : chaque choix, sa raison, ce qui a été mesuré. À lire pour comprendre « pourquoi c'est comme ça » |
| `docs/EXPERIENCE_GRAMMAR.md` | La grammaire du récit : ce qu'un chapitre, un repos, un vol veulent dire |
| `docs/MEDIA_INVENTORY.md` | Inventaire mesuré de chaque source (flyers, vidéo, HDRI, modèles 3D) avec droits et rôle |
| `docs/REFERENTIEL.md` | **Ce document** : la trace complète et le mode d'emploi des corrections |
