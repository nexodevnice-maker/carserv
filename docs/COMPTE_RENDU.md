# CAR SERVICE 06 — compte rendu

En ligne : **https://carservice.nexodevnice.workers.dev** · 60/60 aux contrôles automatiques
Arrêté au 19/09/2026.

---

## 1. Le récit, défilement par défilement

Trente unités. Une unité = un défilement = une chose racontée.

| # | Chapitre | Ce qu'on voit |
| --- | --- | --- |
| 1 | Galaxie | Le héros : le cœur de la galaxie en haut du cadre, les étoiles détachées, le titre sur un ciel noir. **Une étoile filante traverse au premier défilement.** |
| 2 | Galaxie | **On monte** au-dessus du disque : on le voit enfin comme un plan d'étoiles, pas comme un fond. |
| 3 | Galaxie | **On traverse** en plein dedans : les étoiles proches défilent, les lointaines tiennent. La parallaxe est réelle. |
| 4 | Descente | **La carte du 06** : le contour officiel extrudé, la côte en or, le numéro, la Méditerranée. |
| 5 | Ville | On se pose : la place vue d'en haut, îlot éclairé par ses trois candélabres. |
| 6 | Arrivée | La place, le véhicule **entier** dans le cadre, garé entre deux lignes. |
| 7 | Arrivée | **Le devant** — calandre, boucliers, optiques. |
| 8 | Arrivée | **La portière** — le « passage de portes » de la grille. |
| 9 | Arrivée | **La roue** — jante, étrier, passage de roue. |
| 10 | Arrivée | **Retour devant, à hauteur de phare.** La face entière, la laque éteinte par la poussière. |
| 11-13 | Intervention | **Le relevé**, plan fixe au centimètre près, la voiture entière : la ligne d'or traverse, la poussière disparaît derrière elle, **les optiques s'allument**. |
| 14-15 | Transformation | La laque rend le ciel. Puis l'habitacle. |
| 16-19 | Prestations | Le tour du véhicule propre, des deux côtés de la place. |
| 20-23 | **Tarifs** | **Une formule par défilement** — 40 / 75 / 90 / 110 € — dans une case encadrée, la caméra tournant d'un quart autour de la voiture à chaque palier. |
| 24-28 | Bascule / Location | La route, le C-HR qu'on rattrape et qu'on double. |
| 29-30 | Rendez-vous / Contact | Le formulaire, puis le seul canal confirmé. |

**Le décor** : un parking de nuit — mur d'enceinte en béton sali avec **« CAR SERVICE 06 » tagué à la
bombe** (halo de surpulvérisation, coulures, lettres posées à la main), candélabres qui éclairent
vers le bas avec leur cône de brume, marquage usé (peinture écaillée, traces de pneus, taches
d'huile, numéros de place, flèche), butoirs, bornes, grille d'égout, regard, panneau.

**Le véhicule** : laque noire imposée, plaque **« CAR SERVICE | 06 »**, optiques xénon dont seules
les lentilles éclairent et qui éblouissent de face.

---

## 2. Les défauts corrigés

| Ce que vous signaliez | La cause réelle |
| --- | --- |
| « ça scroll tout seul » | `scroll-snap-type: y mandatory` posé sur chacun des 21 repos : au doigt, chaque relâchement était happé vers un point. L'accrochage ne vaut plus que pour la molette et le clavier. |
| « **ça nous renvoie carrément au début** » | Pendant l'entrée, le site **remettait la page à zéro** à chaque tentative de défilement, jusqu'à 4,5 s. Sur un téléphone lent, la scène met justement plus longtemps à arriver. Le moindre geste lève désormais le rideau sur-le-champ. |
| « ça crash » | À la perte du contexte 3D (mémoire saturée), le site basculait **immédiatement** en page statique : la scène disparaissait, la mise en page changeait, le défilement sautait. Et même contexte rétabli, plus aucune image n'était dessinée. On attend maintenant quatre secondes, et au retour tout est redessiné. |
| « on passe derrière le mur » | Deux plans reculaient au-delà de x = −5,2 (le mur) : on traversait le béton et on restait dans le noir. L'un repasse du côté ouvert, l'autre est supprimé. |
| « tout est kaki » | Les modèles fournis sont peints en gris clair, et un gris clair sous une lampe chaude devient kaki. La laque est désormais imposée. |
| Deux défilements noirs | Les plans de descente visaient encore l'emplacement de la ville supprimée. |
| Onglet LOCATION rouge pendant la descente | Le chapitre était déclaré dans le mauvais univers. |
| La caméra traversait la voiture | Une courbe de caméra coupe au plus court : il fallait des points de passage. |

---

## 3. L'optimisation, mesurée

Outil : `npm run qa:perf` — coût par image, unité par unité.

| | Avant | Après |
| --- | --- | --- |
| Triangles dessinés (plans du nettoyage) | 126 800 | **89 300** |
| Triangles dessinés (descente) | 170 400 | **103 900** |
| Modèle RS6 | 116 000 triangles, textures 1024 | **~79 000**, textures **512** |
| Nuages au téléphone | 92 panneaux transparents | **33** |
| Crans de définition | plancher à 1,5 | **1,5 → 1,25 → 1** |
| À télécharger | — | **1,5 Mo de moins** (modèle de ville supprimé) |

Le plus gros gain n'était pas là où on l'attendait : **le modèle de la voiture pesait les trois quarts
du coût de tous les plans du nettoyage**, pour un véhicule regardé à cinq mètres sur un écran de
téléphone.

---

## 4. Ce qui reste à faire

### Demandé, pas encore fait

1. **La piste de Formule 1** pour la location — gradins, néons au sol façon piste d'aéroport, et la
   voiture qui **roule** au lieu de se téléporter. C'est une scène entière à écrire (géométrie de
   piste, tribunes instanciées, balisage lumineux, trajectoire du véhicule). **Le plus gros morceau
   restant.**
2. **Le calendrier côté serveur.** Il demande une base (KV ou D1) sur le Worker et une clé d'API
   d'envoi de courriel. **Je ne manipule jamais vos clés** : vous les posez vous-même avec
   `wrangler secret put`. Tant que ce n'est pas fait, l'écran de rendez-vous envoie par courriel.

### Défauts connus que je n'ai pas encore levés

3. **Aucune ombre portée.** Le véhicule ne touche pas le sol — c'est le défaut que l'œil repère en
   premier. Une ombre de contact précalculée coûte presque rien ; une vraie carte d'ombre pour le
   candélabre le plus proche coûte ~1,5 ms par image.
4. **Aucun traitement d'image** : pas de halo autour des sources, pas d'occlusion, pas
   d'étalonnage. C'est le plus gros écart qui reste avec un rendu de cinéma, et c'est une seule
   passe plein écran.
5. **Carrosserie plate en gros plan** : les exports Sketchfab n'ont pas le micro-relief d'une vraie
   tôle. Une carte de normales générée corrigerait ça.
6. **La descente reste sombre.** La carte du 06 se lit, mais l'ensemble manque de matière entre
   l'univers et la place.

### Avant toute publication réelle

7. **13 faits commerciaux non confirmés** (`npm run content:check`) : conditions de location,
   caution, permis, procédure de réservation, horaires du nettoyage.
8. **Droits des modèles 3D** (RS6, C-HR, galaxie) : usage de démonstration, à confirmer.
9. **Mentions légales**, forme juridique, SIREN.
10. **Retirer le laboratoire** (`src/pages/lab`).

---

## 5. Dans quel ordre je continuerais

1. La piste de F1 (c'est ce qui manque au récit).
2. L'ombre de contact sous le véhicule (le défaut le plus visible, le moins cher).
3. Le traitement d'image (halo + étalonnage).
4. Le calendrier serveur, dès que la clé d'envoi est posée.
