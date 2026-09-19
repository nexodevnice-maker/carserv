# CAR SERVICE 06 — compte rendu

En ligne : **https://carservice.nexodevnice.workers.dev** · 60/60 aux contrôles automatiques
Arrêté au 19/09/2026, passe d'image et allègement du paquet compris.

---

## 1. Le récit, défilement par défilement

Trente-deux unités. Une unité = un défilement = une chose racontée.

| # | Chapitre | Ce qu'on voit |
| --- | --- | --- |
| 1 | Galaxie | Le héros : la galaxie en bande dans le haut du cadre, le titre sur un ciel noir. **Une étoile filante traverse au premier défilement.** |
| 2 | Galaxie | **On monte** au-dessus du disque : on le voit pour ce qu'il est, un plan d'étoiles. |
| 3 | Galaxie | **On traverse** en plein dedans : les étoiles proches défilent, les lointaines tiennent. |
| 4 | Descente | **La carte du 06** : le contour IGN, la côte en or, le numéro, la Méditerranée. |
| 5 | Ville | On se pose : la place vue d'en haut, îlot éclairé par ses candélabres. |
| 6 | Arrivée | La place, le véhicule **entier** dans le cadre, garé entre deux lignes. |
| 7 | Arrivée | **Le devant** — calandre, boucliers, optiques. |
| 8 | Arrivée | **La portière** — le « passage de portes » de la grille. |
| 9 | Arrivée | **La roue** — jante, étrier, passage de roue. |
| 10 | Arrivée | **Retour devant, à hauteur de phare.** La laque éteinte par la poussière. |
| 11-13 | Intervention | **Le relevé en UN SEUL geste**, plan fixe au centimètre, voiture entière : la ligne d'or traverse, la poussière disparaît derrière elle, **les optiques s'allument au passage**. |
| 14 | Transformation | **De face, propre, phares allumés** — même distance qu'avant. Et la case **PRIX APRÈS NETTOYAGE →**. |
| 15-16 | Transformation | La laque rend le ciel. Puis l'habitacle, LED allumées. |
| 17-20 | Prestations | Le tour du véhicule propre, des deux côtés de la place. |
| 21-24 | **Tarifs** | **Une formule par défilement** — 40 / 75 / 90 / 110 € — dans une case encadrée, la caméra tournant d'un quart autour de la voiture à chaque palier. |
| 25-29 | Bascule / Location | Le circuit : vibreurs, feux encastrés, gradins, mâts. Le C-HR roule. |
| 30-32 | Rendez-vous / Contact | Le formulaire, puis le seul canal confirmé. |

### Le décor
- **La place** : mur d'enceinte en béton sali, **« CAR SERVICE 06 » tagué à la bombe** (halo de
  surpulvérisation, coulures, lettres posées à la main, sur deux lignes), **un second tag : la carte
  de la Côte** (le littoral, Cannes, Antibes, Nice, Saint-Jean-Cap-Ferrat, Beaulieu, Menton),
  candélabres à cône de brume, marquage usé (peinture écaillée, traces de pneus, taches d'huile,
  numéros, flèche), butoirs, bornes, grille d'égout, panneau, **une route d'accès** avec son
  marquage peint par le nuanceur, et une file de lampadaires qui part vers l'horizon.
- **Le fond** : votre photographie de ville, posée sur un cylindre qui fait **le tour complet**, en
  quatre copies miroir — aucune couture, aucune répétition reconnaissable.
- **Le ciel** : étoiles, **Voie lactée** avec son renflement et ses voiles de poussière, deux
  planètes avec leur phase, une lune qui éclaire réellement le fond. Tout est calculé, donc présent
  aussi dans l'enrobé mouillé et dans la carrosserie.
- **Le véhicule** : laque noire imposée, plaque **« CAR SERVICE | 06 »**, optiques xénon dont seules
  les lentilles éclairent, **faisceaux dans l'air, nappe de lumière au sol, halos**, LED d'habitacle,
  et une **ombre portée** qui le pose au sol.
- **Le circuit** : vibreurs rouge et blanc, feux encastrés dans la chaussée, gradins gradués et
  couverts, mâts d'éclairage.

---

## 2. Les défauts corrigés

| Ce qui n'allait pas | La cause réelle |
| --- | --- |
| « ça scroll tout seul » | `scroll-snap-type: y mandatory` sur chacun des repos : au doigt, chaque relâchement était happé. L'accrochage ne vaut plus que pour la molette et le clavier. |
| « **ça nous renvoie au début** » | Pendant l'entrée, le site **remettait la page à zéro** à chaque tentative de défilement, jusqu'à 4,5 s. Sur un téléphone lent, la scène met justement plus longtemps. Le moindre geste lève désormais le rideau sur-le-champ. |
| « ça crash » | À la perte du contexte 3D, bascule **immédiate** en page statique : la scène disparaissait, la mise en page changeait, le défilement sautait — et même contexte rétabli, plus aucune image n'était dessinée. On attend maintenant quatre secondes, et au retour tout est redessiné. |
| « on passe derrière le mur » | Deux plans reculaient au-delà du mur (x = −5,2). L'un repasse du côté ouvert, l'autre est supprimé. |
| « tout est kaki » | Les modèles fournis sont peints en gris clair : sous une lampe chaude, un gris clair devient kaki. La laque est imposée. |
| Deux défilements noirs | Les plans de descente visaient encore l'emplacement de la ville supprimée. |
| Onglet LOCATION rouge pendant la descente | Chapitre déclaré dans le mauvais univers. |
| La caméra traversait la voiture | Une courbe de caméra coupe au plus court : il fallait des points de passage. |
| Le « C » du tag coupé | La taille se calcule sur la largeur mesurée, mais une lettre penchée et son ombre débordent de leur boîte. |
| Les phares restaient éteints | Three.js met les programmes de nuanceur en cache d'après les **paramètres** du matériau : l'optique héritait du programme de la carrosserie, sans la ligne qui l'allume. |
| Un grand rectangle blanc sur l'horizon | Mes fondus gardaient le ciel de crépuscule de la photo, saturé par le rallumage des lumières. |
| L'ombre faisait un trou rectangulaire | Le panneau de l'ombre n'avait pas de bordure fondue — une ombre n'a jamais de bord droit. |
| Un « 15 » géant en travers de la route | La durée de location était peinte sur la chaussée et répétait le panneau. Supprimée, code compris. |
| Halos gris grands comme le pare-brise | Traîne trop large sur les halos de phares et de mâts. |
| Habitacle crème | Garnitures claires du modèle : assombries, ce sont les LED qui éclairent. |

---

## 3. L'optimisation, mesurée

Outil : `npm run qa:perf` — coût par image, unité par unité.

| | Avant | Après |
| --- | --- | --- |
| Triangles (plans du nettoyage) | 126 800 | **90 600** |
| Appels de dessin (idem) | 74 | **16 à 64 selon l'unité** |
| Modèle RS6 | 116 000 triangles, textures 1024 | **~79 000**, textures **512** |
| Nuages au téléphone | 92 panneaux transparents | **33** |
| Crans de définition | plancher 1,5 | **1,5 → 1,25 → 1** |
| Médiane sur l'ensemble du récit | — | **17,5 ms** |
| À télécharger | — | **1,5 Mo de moins** |

Les gestes qui ont compté :
1. **Le modèle de la voiture** pesait les trois quarts du coût de tous les plans du nettoyage.
2. **Les seize objets de la place fondus par matière** : quatre appels au lieu de seize. Sur un
   téléphone, un appel de dessin coûte plus cher que les quelques triangles qu'il porte.
3. **Le ciel détaillé n'est plus calculé que quand il se voit** : le sol mouillé l'appelle pour son
   reflet, la brume l'appelle à son tour — étoiles et Voie lactée se payaient deux ou trois fois par
   pixel d'écran, y compris sur de l'asphalte sec.
4. **Les nuages** : ce n'est pas le nombre de triangles qui coûte, c'est le nombre de fois que le
   même pixel est repeint.
5. **L'ombre portée est cuite une fois** (méthode reprise de MECA RIVIERA) : coût par image, zéro.

---

## 4. Ce que je conseille pour la suite

### Fait le 19/09, après ce compte rendu
1. **Le traitement d'image est là.** Les sources débordent — lampes, phares, ligne d'or, liseré des
   tarifs, feux du circuit, étoiles — plus un tramage qui efface les bandes du ciel, un étalonnage
   (ombres froides, lumières ambrées) et une vignette d'angle. Mesuré sur les 31 unités :
   **+7,5 % de lumière**, et les demi-teintes qui portent le relief en hausse partout (la location
   passe de 4,9 % à 11,5 % de l'image). Coût réel : **+6 appels de dessin**, soit sous le bruit de
   la mesure. **L'occlusion ambiante, elle, n'est pas faite** — c'est le morceau cher.
2. **Les anneaux du constructeur ont quitté la calandre.** Ils étaient lisibles en plein centre d'un
   plan de face, ce que la règle du projet interdit. Ils n'avaient pas de matériau à eux : effacés
   par la géométrie, à la mesure. Panneau lisse, chromes et inserts intacts.
3. **Le laboratoire n'est plus en ligne.** Il était accessible à qui connaissait l'adresse, avec les
   quinze mégaoctets de vidéo dont il est le seul consommateur. Il reste en développement — la QA
   s'appuie dessus — mais il est retiré du paquet. **Paquet publié : 23 Mo → 8,1 Mo.**
4. **Le bandeau des tribunes ne barre plus le ciel** du circuit.

### Ce qui manque encore, par ordre d'effet
5. **Les roues ne tournent pas.** Le C-HR parcourt trois cents mètres, roues figées. Le modèle fourni
   est fusionné en **cinq maillages par matériau**, roues comprises dans la caisse : il n'y a rien à
   faire tourner sans recouper le modèle hors ligne.
6. **L'occlusion ambiante** : le dernier morceau de cinéma qui manque.
7. **Le micro-relief de carrosserie** : les exports Sketchfab n'ont pas le grain d'une vraie tôle,
   et ça se voit en gros plan. Une carte de normales générée corrigerait ça.
8. **La descente** (unités 4 et 5) reste le passage le plus faible : entre l'univers et la place, il
   manque de la matière.
9. **Le calendrier côté serveur** : il demande une base (KV ou D1) sur le Worker et une clé d'API
   d'envoi de courriel. **Je ne manipule jamais vos clés** — vous les posez avec
   `wrangler secret put`. Sans ça, l'écran de rendez-vous envoie par courriel.

### Avant toute publication réelle — il n'y a que vous pour ça
10. **10 faits commerciaux non confirmés** (`npm run content:check`) : téléphone, courriel, horaires,
    caution, permis, procédure de réservation, photos réelles du C-HR.
11. **Droits des médias** : les deux modèles 3D, la galaxie et **la photographie de ville** sont en
    `TO_CONFIRM`. Il faut pouvoir justifier leur usage.
12. **Mentions légales**, forme juridique, SIREN.
13. ~~Retirer le laboratoire~~ **fait** (voir plus haut).

### Une remarque de méthode
Ma machine de test sature après de longues séries de captures : certaines unités à 16 appels de
dessin tombaient à 22 i/s, ce qui est impossible. Les chiffres **structurels** (appels de dessin,
triangles, programmes, poids) restent fiables ; pour la **fluidité réelle**, c'est votre iPhone le
juge. Une capture d'écran de votre téléphone quand quelque chose cloche vaut dix de mes mesures.

### Les outils laissés dans le dépôt
- `scripts/qa-perf.mjs` — coût par image, unité par unité.
- `scripts/qa-frame.mjs` — relève la caméra réelle d'une progression et la capture : on recopie au
  lieu de deviner.
- `scripts/qa-boot.mjs` — taux de réussite du démarrage (« ça crash » ne se voit pas sur une capture
  réussie).
- `scripts/media-tools/probe-glb.mjs` — relevé d'un modèle fourni : où est le haut, où est la base,
  que contient-il vraiment.
