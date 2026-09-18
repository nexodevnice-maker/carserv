# Ce qui bloque un vrai rendu premium

Mis à jour le 18/09/2026, après le passage « la ville disparaît, la place devient un vrai lieu ».
Document destiné au porteur **et à toute IA qui reprend le projet** : chaque point dit le symptôme, la cause réelle,
et le geste qui le lève.

---

## 1. Les modèles 3D fournis ne sont pas des décors

**C'est le blocage principal, et c'est lui qui a fait échouer la ville.**

`city.glb` a été mesuré à la sonde (`scripts/media-tools/probe-glb.mjs`) :

| ce qu'on croyait | ce que c'est réellement |
| --- | --- |
| une ville de nuit | **14 immeubles**, 8,5 m × 5,4 m d'emprise |
| un décor | un **accessoire**, livré avec son propre sol et son propre dôme de ciel |
| des gratte-ciel | des cubes de 0,6 à 4,8 m, texturés avec des **façades photographiées de JOUR** |

Un accessoire ne devient pas un horizon. Les deux seules issues étaient :

- le **répéter** (fait : 24 exemplaires instanciés, 14 appels de dessin) → on voit la répétition, et le quartier
  reste une grappe de cubes ;
- le **grossir** → des tours d'un kilomètre qui passent au-dessus du parking, exactement ce que vous avez vu.

→ **Décision prise :** la ville sort du récit. Tout le budget visuel va sur la place.
→ **Ce qu'il faudrait pour une vraie ville :** soit un modèle de quartier réel (plusieurs milliers d'immeubles,
  ~50 Mo, hors budget téléphone), soit un générateur procédural de bâtiments écrit pour le projet (2 à 3 jours).

La galaxie (`galaxy.glb`) a le problème inverse : c'est un **nuage de 50 000 points**. On la traverse très bien,
mais on ne peut rien y poser et elle n'a aucune surface. Elle reste, comme univers de départ.

---

## 2. Aucune ombre portée dans toute la scène

Chaque objet a `castShadow = false`. Conséquence directe : **le véhicule ne touche pas le sol**. C'est le défaut que
l'œil repère en premier, avant la lumière, avant la matière.

→ **Geste :** une ombre de contact précalculée sous la caisse (une image, coût nul) + une seule carte d'ombre pour le
  candélabre le plus proche. Environ 1,5 ms par image au téléphone — mesurable avec `npm run qa:perf`.
→ **Pourquoi ce n'est pas encore fait :** chaque carte d'ombre est une passe de rendu de plus, et la définition
  maximale (DPR 2) au téléphone est ce qui a été le plus dur à obtenir. À faire en mesurant, pas à l'aveugle.

---

## 3. Aucun traitement d'image (bloom, occlusion, étalonnage)

Une nuit cinématographique tient sur trois choses qu'on n'a pas :

1. le **halo** (bloom) autour des sources — c'est lui qui fait qu'une lampe « brûle » ;
2. l'**occlusion ambiante** — c'est elle qui creuse les jonctions (roue/aile, mur/sol) ;
3. l'**étalonnage** — actuellement `NeutralToneMapping`, exposition 1, **aucune courbe**. L'image est juste, elle
   n'est pas *tenue*.

→ **Geste :** une passe de post-traitement unique (bloom seuillé + courbe + vignette légère). C'est, de loin, le
  meilleur rapport effet/coût qui reste.
→ **Coût :** une passe plein écran, ~2 ms au téléphone. C'est le prochain grand levier.

---

## 4. Les matériaux des modèles sont faits pour le jour

Les deux véhicules sont des exports Sketchfab : carrosserie **peinte en gris clair**, textures éclairées en plein
jour, et des faces de caisse sans relief de tôle.

- Sous une lampe chaude, un gris clair vire au **kaki**. C'est exactement ce que vous avez vu pendant des heures.
- Corrigé : la laque est désormais **imposée** (noir profond, métallique 0,92) au lieu d'être atténuée.
- **Reste :** en gros plan, les panneaux de caisse sont plats — il manque le micro-relief qu'a une vraie tôle. Une
  carte de normales générée corrigerait ça (une demi-journée).

---

## 5. Le coût d'une boucle de vérification

Je ne vois pas l'écran. Pour juger UNE modification :

serveur de dev → navigateur sans affichage → 21 captures → lecture des images = **2 à 4 minutes**.

C'est pour ça que ça avance par à-coups, et c'est aussi pourquoi certaines erreurs ont duré : une erreur de signe
dans un nuanceur (les candélabres éclairaient **vers le ciel**) ne se voit sur aucune compilation, seulement sur une
image. `npm run qa:video` permet de juger le mouvement, mais coûte une minute de plus.

→ **Ce qui aiderait vraiment :** que vous me renvoyiez une capture d'écran de votre téléphone quand quelque chose
  cloche. Ce que je vois en 780×1688 et ce que vous voyez ne sont pas toujours la même chose.

---

## 6. Pièges techniques déjà rencontrés (à ne pas refaire)

| Symptôme | Cause réelle |
| --- | --- |
| La ville mesure « 2 m » quoi qu'on fasse | Géométrie **quantifiée** : `geometry.applyMatrix4()` réécrit les sommets à travers la normalisation et les rabat dans [-1, 1]. **Transformer la boîte, jamais les sommets.** |
| Une échelle ou une position sans aucun effet | Un nœud glTF peut avoir `matrixAutoUpdate = false` : sa matrice vient du fichier. |
| Tout l'écran vire au sépia | Environnement à 3,4 + lampes à 190 : plus aucun noir dans l'image. |
| Le parking flotte au-dessus du vide | Le sol du monde était 40 m plus bas que la place. |
| Un mur uniformément crème | Les candélabres éclairaient sans cône : autant de lumière en haut du mur qu'à ses pieds. |
| Une erreur de syntaxe dans un nuanceur | Une **apostrophe inversée** dans un commentaire français ferme le gabarit de chaîne JavaScript. |

---

## 7. Ce qui n'est pas technique

- **Le calendrier côté serveur n'existe toujours pas.** Il demande une base (KV ou D1) sur le Worker et une clé
  d'API d'envoi de courriel. **Je ne manipule jamais vos clés** : vous les posez vous-même avec
  `wrangler secret put`. Tant que ce n'est pas fait, l'écran de rendez-vous reste un envoi par courriel.
- **Les faits commerciaux manquants** restent marqués `TO_CONFIRM` dans `src/domain/` (horaires, tarifs, zone
  exacte). Je n'en invente aucun.

---

## Dans quel ordre je lèverais ça

1. **Post-traitement** (bloom + étalonnage) — le plus gros écart visuel restant.
2. **Ombre de contact** sous le véhicule — le défaut que l'œil voit en premier.
3. **Micro-relief de carrosserie** — pour que les gros plans tiennent.
4. **Calendrier serveur** — dès que vous aurez posé la clé d'envoi.
