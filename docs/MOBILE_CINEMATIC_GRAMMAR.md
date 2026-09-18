# CAR SERVICE 06 — GRAMMAIRE CINÉMATIQUE MOBILE

Le téléphone est le format de référence du projet. Ce document est la **règle du jeu** de la mise en scène mobile :
il dit ce qu'est une unité, ce qu'elle doit contenir, comment elle s'enchaîne à la suivante, et ce qu'on s'interdit.
Il complète `docs/REFERENTIEL.md` (où vit quoi) et `docs/EXPERIENCE_GRAMMAR.md` (le vocabulaire du moteur).

---

## 1. La règle absolue

**UN SCROLL = UNE UNITÉ CINÉMATOGRAPHIQUE.**

Une unité raconte **une** chose : une action, une idée, une conséquence. Quelle que soit la force du geste — un
effleurement ou un grand balayage — le système exécute la même chorégraphie ; seule la vitesse de traversée change.

> Le doigt donne l'ordre. Le système réalise le plan.

Techniquement : chaque unité est un **repos** (`rests` dans `chapters.ts`) auquel correspond **un plan** (`shots.ts`).
Le pas guidé amène la page exactement d'un repos au suivant ; la caméra, elle, y va en vol continu. Aucune animation
n'est pilotée par une horloge : tout se reconstruit depuis la position de scroll, à l'aller comme au retour.

## 2. Ce que doit contenir une unité

Toute unité déclare les neuf champs suivants — et si un mouvement ne sert aucun d'eux, il est supprimé :

```
UNITÉ
├── intention          ce que le visiteur doit comprendre
├── sujet              ce qui occupe le cadre (UN seul)
├── mouvement caméra   ce que fait l'œil
├── mouvement sujet    ce que fait la matière ou le véhicule
├── lumière            ce qui révèle
├── profondeur         ce qui est proche / loin dans le cadre
├── entrée             d'où l'on vient (la fin de l'unité précédente)
├── sortie             ce qu'on emporte vers la suivante
└── conséquence        pourquoi la suivante existe
```

## 3. La chaîne (les unités ne sont pas des sections)

L'enchaînement n'est pas « une section puis une autre » : c'est **une suite de transformations**. Chaque unité est la
conséquence de la précédente. Si une unité pouvait être déplacée ailleurs sans que rien ne change, la liaison est
ratée.

```
LAQUE  →  REFLET  →  VOITURE  →  CIEL  →  TERRITOIRE  →  06  →  BALISE
   →  LE MÊME VÉHICULE, SALE  →  LUMIÈRE  →  PROPRE  →  HABITACLE  →  MÉTIER
   →  ROUTE  →  DÉPLACEMENT  →  C-HR  →  DÉSIR  →  PRIX  →  RENDEZ-VOUS
```

La transition idéale ne dit jamais « voici une nouvelle scène », elle fait dire :

> « je comprends maintenant que ce que je regardais était autre chose. »

**La rime.** L'unité 2 (le ciel apparaît dans une laque parfaite) et l'unité 13 (le ciel revient dans la laque qu'on
vient de nettoyer) sont le même plan à deux moments du récit. C'est la promesse, puis la preuve.

## 4. Les 24 unités

| # | Unité | Chapitre @ repos | Intention (une phrase) | Conséquence |
|---|---|---|---|---|
| 1 | `matiere` | matiere @ 0 | Une surface noire et mouillée, trop près pour être identifiée : de la matière | Quelque chose vit dedans |
| 2 | `reflet` | matiere @ 0,55 | La caméra glisse le long de la surface : des étoiles apparaissent dans la laque | Ce reflet vient d'ailleurs |
| 3 | `carrosserie` | revelation @ 0,5 | Vrai recul : c'était une voiture, et elle est parfaite | D'où vient cette perfection ? |
| 4 | `ciel` | ciel @ 0,45 | Le regard remonte le long du reflet et quitte la voiture par le ciel | Le ciel est un lieu |
| 5 | `univers` | ciel @ 0,9 | L'univers entier, au-dessus d'une mer de nuages | Ce ciel couvre un pays |
| 6 | `france` | territoire @ 0,4 | La France en volume ; un seul point est allumé | Ce point a un nom |
| 7 | `zone` | territoire @ 0,88 | Le 06 seul, de la mer aux montagnes, la balise au milieu | On descend |
| 8 | `arrivee` | avant @ 0,42 | On se pose au pied de la colonne : un véhicule attend, terne | Il est sale |
| 9 | `poussiere` | avant @ 0,88 | Au ras du sol : la poussière sur l'aile, la roue, le reflet éteint | Il faut intervenir |
| 10 | `capot` | intervention @ 0,18 | À hauteur d'optique : ce que la lumière va traverser | La lumière arrive |
| 11 | `scan` | intervention @ 0,56 | Une ligne d'or traverse la caisse ; derrière elle, la poussière n'est plus | La matière a changé |
| 12 | `verni` | intervention @ 0,9 | Plan rasant : la laque est vernie, le noir est profond | Le reflet peut revenir |
| 13 | `reflets` | transformation @ 0,35 | **La rime** : le ciel redescend dans la carrosserie (plan de l'unité 3, gagné) | On peut entrer |
| 14 | `habitacle` | transformation @ 0,85 | Assis à la place du conducteur : l'intérieur aussi | C'est un métier complet |
| 15 | `prestations-1` | prestations @ 0,25 | Le véhicule entier, la première moitié du métier | … |
| 16 | `prestations-2` | prestations @ 0,55 | L'autre côté, la seconde moitié | … |
| 17 | `offre` | prestations @ 0,85 | Recul dans la nuit : la formule et le déplacement | Le déplacement est un mouvement |
| 18 | `route` | bascule @ 0,9 | Le regard ne quitte pas la galaxie ; la route monte à notre rencontre | On roule |
| 19 | `poursuite` | location @ 0,18 | Un véhicule devant nous, ses feux allumés, « 1 JOUR » sous nos roues | On le rattrape |
| 20 | `doubler` | location @ 0,44 | On se déporte et on le double au ras | C'est un C-HR |
| 21 | `distance` | location @ 0,7 | Il reprend la tête et s'éloigne vers la galaxie | Combien de temps ? |
| 22 | `arret` | location @ 0,93 | Il s'arrête au bord du 06 ; tarifs et conditions | Il faut demander |
| 23 | `agenda` | rendezvous @ 0,5 | **Le seul écran sans 3D** : la nuit s'éteint, le calendrier prend l'écran | Une date suffit |
| 24 | `horizon` | contact @ 0,6 | Le bord du territoire, la galaxie devant : un seul geste | — |

## 5. Rythme : le contraste est obligatoire

Toutes les unités n'ont pas la même durée. Les longueurs (`span`, en centièmes de hauteur d'écran) composent une
partition :

```
CALME      matiere        180   deux unités très lentes, presque immobiles
RÉVÉLATION revelation     150   une seule unité, courte et nette : le recul
SUSPENSION ciel           240   la montée, longue, sans texte
RESPIRATION territoire    280   le pays, puis le département
APPROCHE   avant          240   le piqué puis le détail
ACTION     intervention   300   la plus longue : c'est le métier
RETOUR     transformation 250   la rime, puis l'habitacle
MÉTIER     prestations    280   trois arrêts posés
BASCULE    bascule        220   une seule chute verrouillée
COURSE     location       460   la plus longue de toutes : on voyage vraiment
ARRÊT      rendezvous     280   plus de 3D, plus de mouvement
FIN        contact        170   court
```

`pace` (fenêtre + courbe) fait le reste : un vol peut démarrer tard et finir tôt dans son chapitre (la caméra
s'immobilise avant le repos), ou occuper tout l'espace (traversée continue). C'est ainsi qu'on obtient
« rapide → ralenti → quasi-arrêt → reprise » sans jamais lire une horloge.

## 6. Profondeur : quatre plans, toujours

Le téléphone est un cadre étroit et vertical : une vue de trois quarts posée au centre est plate. Chaque cadre doit
contenir au moins **trois** des quatre couches :

```
PREMIER PLAN   matière automobile très proche (une aile, une roue, une arête de capot), ou le sol mouillé
PLAN MOYEN     le véhicule
PROFONDEUR     l'atmosphère : brume, falaise d'or, chaussée qui fuit
ARRIÈRE-PLAN   le ciel, la galaxie, le territoire
```

**Règle de cadrage, mesurée :** l'écran fait un rapport 0,46. À une focale verticale de 50°, la largeur visible vaut
≈ 0,43 × distance. Un véhicule de 5 m n'entre donc dans le cadre **qu'à partir de 13 m**. Entre 0,8 m et 6 m, on ne
fait pas un plan large raté : on fait une **macro assumée**.

Le garde au sol (`STAGE.floor`) vaut **0,32 m** : les plans rasants existent vraiment. À 1,1 m (l'ancienne valeur),
tous les plans bas étaient silencieusement remontés à hauteur d'homme — d'où l'impression de « WebGL posé sur une
page ».

## 6 bis. Le monde EST le panorama fourni

Le lieu du site n'est pas une invention : c'est l'image 360° fournie par le porteur (`tools/3d/rogland_clear_night_4k.hdr`).
Elle contient une nuit complète — Voie lactée, montagnes, collines, roches, sol. **Tout est conservé et tout sert :**

| Ce qui est dans l'image | Où on le voit |
|---|---|
| La Voie lactée et les étoiles | le ciel, d'un bout à l'autre du récit ; en reflet dans la laque et dans le sol mouillé |
| Les montagnes, les collines | l'horizon, à toutes les altitudes |
| Le sol, les roches, le terrain | **le sol du monde**, projeté au pied de la caméra (`groundTerrain`, shared/night-glsl.ts) |
| La lumière de la nuit | l'éclairage des véhicules (PMREM du même fichier), donc la même nuit partout |

La projection au sol (technique dite *grounded skybox*) lit la moitié basse du panorama comme si elle était posée sur
le plan du monde, depuis un centre de projection situé à `uGroundH` mètres au-dessus (9 m : les pierres du premier plan
tombent à quelques mètres de la voiture). Même azimut que le ciel : **les collines du ciel se prolongent dans le sol
sans couture**. Par-dessus, le sol garde son eau : flaques, reflets, grain. Là où il y a de l'eau, le terrain disparaît
sous le miroir — comme dans la réalité.

Ce qui est ajouté au panorama est assumé et sert le récit, jamais la décoration : la mer de nuages, le plateau du 06 et
ses falaises d'or, la route, la balise, les deux véhicules.

## 7. Lumière : une matière, pas un éclairage

- La nuit du monde est **une seule image** (HDRI) partagée par toutes les couches : ciel, sol mouillé, chaussée,
  falaises. Rien n'est éclairé « en plus » : tout renvoie la même nuit.
- Les véhicules sont les **seuls** objets à recevoir un environnement pré-calculé et deux directionnelles
  (`scenes/vehicle/vehicle-light.ts`). Sans ce reflet, une carrosserie noire dans le noir n'est qu'une silhouette.
- La ligne d'or du relevé est la seule lumière **narrative** : elle ne décore pas, elle transforme ce qu'elle
  traverse.
- La balise est une lumière **d'adresse** : elle dit « ici », se voit depuis l'orbite, et s'éteint quand on arrive.

## 8. Reflet : la surface est une porte

Le reflet n'est pas un effet, c'est le moteur du récit :

```
unité 1   la laque ne renvoie presque rien : on ne comprend pas la surface
unité 2   la caméra glisse, le reflet s'ouvre : des étoiles
unité 3   le recul : la voiture entière tient le ciel dans sa laque
unité 4   le regard remonte le reflet et sort par le ciel
…
unité 9   la poussière a TUÉ le reflet (la même surface ne renvoie plus rien)
unité 13  le reflet est rendu : c'est la preuve visible du travail
```

C'est pour cela que la salissure est écrite dans la **rugosité** du matériau et pas dans une texture plaquée :
salir, ici, veut dire **éteindre un reflet**.

## 9. Typographie mobile

Le texte ne doit jamais être le protagoniste quand la voiture doit l'être.

- **Interdit** : un grand titre centré à chaque écran.
- Par défaut : une **annotation** basse, alignée à gauche, en petites capitales espacées (le repère : `01`, `02`…),
  un titre court sur une ou deux lignes, une ligne de texte au plus.
- Les unités purement cinématiques (2, 4, 5, 12, 18, 20) n'ont **aucun texte** : le plan se suffit.
- Le commercial (prix, listes, conditions, formulaire) n'apparaît qu'après l'unité 14, quand la narration l'a rendu
  pertinent : ÉMOTION → CURIOSITÉ → DÉCOUVERTE → DÉSIR → INFORMATION → ACTION.

## 10. Performance : la netteté EST la qualité

Mesuré au format téléphone (390 × 844, DPR 2 — soit 780 × 1 688 pixels réels), sonde `scripts/qa-perf.mjs` :

| | Avant | Après |
|---|---|---|
| Appels de dessin (chapitres véhicule) | **748** | **33** |
| Triangles | 333 000 | 164 000 |
| Image médiane | 17–35 ms (jusqu'à 29 i/s) | **16,7 ms (60 i/s) partout** |
| Définition tenue | tombait à **DPR 1,25** (flou) | **DPR 2** (plancher 1,5) |

Les trois leviers, dans l'ordre d'importance :

1. **Les appels de dessin.** Les modèles fournis sortaient d'un export avec armature : 750 maillages. La chaîne
   `scripts/media-tools/build-3d.mjs` supprime peaux et animations, aplatit, fusionne par matériau, soude et
   simplifie → 25 maillages, moitié moins de triangles, fichier divisé par deux.
2. **Ne jamais juger la fluidité pendant un chargement.** Décoder un modèle bloque le fil principal ~1 s. La
   définition adaptative ignore désormais ces images (`StageConfig.busy`) et repart d'une fenêtre propre après tout
   blocage de plus de 120 ms. Sans cela, une seule secousse faisait retomber la définition pour **tout le reste de la
   visite** : c'était la vraie cause du « flou ».
3. **Payer le coût au repos.** Les deux modèles et l'environnement de nuit sont en priorité `idle` : ils se chargent
   après la page, pendant que le visiteur est sur l'unité 1 où rien ne bouge tant qu'il ne scrolle pas.

## 11. Ce qui est interdit

Landing page, template automobile, mise en page SaaS, grille de cartes comme expérience, fade-in générique,
glassmorphism, dégradé arbitraire, halo décoratif, particules décoratives, parallaxe standard, 3D décorative,
interface surchargée — et tout mouvement qui ne sert aucun des neuf champs du §2.

## 12. Les tests à repasser après chaque modification

1. **Test « une unité »** — pour chaque repos : « qu'est-ce que je viens de faire ? ». Une seule réponse doit exister.
2. **Test « chaîne »** — B est-il la conséquence de A ? Si B pouvait être déplacé ailleurs, la liaison est ratée.
3. **Test « cinéma »** — captures muettes, sans texte : la caméra semble-t-elle dirigée ? le rythme intentionnel ?
4. **Test « 15 secondes »** — automobile + matière + Côte d'Azur + lumière + profondeur + cinéma, sans lire un mot.
5. **Test « pas un template »** — sans le logo, l'expérience garde-t-elle une identité ?
6. **Test de netteté** — `node scripts/qa-perf.mjs` : médiane ≤ 17 ms et définition ≥ 1,75 partout.
