# CAR SERVICE 06 — Première grammaire d'expérience (provisoire)

Dérivée de l'inspection du corpus (`docs/MEDIA_INVENTORY.md`), pas de la séquence candidate seule. Rien n'est validé
tant que le vertical slice n'a pas passé `06_QUALITY/VALIDATION_PROTOCOL.md`. Données : `src/experience/chapters.ts`.

## Thèse

**La preuve avant l'adjectif.** Le corpus ne contient qu'une vraie image du métier : un même SUV, poussiéreux puis
brillant, filmé par l'entreprise. Tout part de là. Le site ne dit pas « premium » ; il montre la poussière, puis le
reflet des arbres dans le même capot.

Deuxième idée structurante : **la même marque, deux routes.** Le nettoyage (or) rend un véhicule désirable ; la
location (rouge) rend un véhicule disponible. La bascule est un changement de lumière, pas un changement de site.

## Séquence

| # | Chapitre | Univers | Émotion | Matière | Ce qui se passe |
|---|---|---|---|---|---|
| 1 | Arrivée — « Avant » | nettoyage | curiosité, tension | poussière réelle (0–7,5 s) | noir ; la vidéo émerge sur la texture de la poussière du capot ; la marque, rien d'autre |
| 2 | Le passage | nettoyage | tension → libération | eau comme **matériau de transition** (non filmée) | une ligne humide franchit le panneau ; derrière elle, le même panneau propre — coupe masquée, jamais un fondu |
| 3 | « Après » | nettoyage | satisfaction | capot brillant, flanc brillant | les arbres reviennent dans la peinture ; paires de panneaux capot ↔ capot, flanc ↔ flanc |
| 4 | Prestations | nettoyage | confiance | texte, affiche « après » | intérieur, extérieur, finition, produits — conséquences de ce qui vient d'être vu ; 50 € (TO_CONFIRM) ; déplacement dans tout le 06 |
| 5 | Bascule | pont | respiration | lumière | le véhicule propre quitte la lumière ; l'or s'éteint ; le rouge de la route apparaît |
| 6 | Location | location | désir → projection | typographie spatiale (aucune photo réelle) | une durée qui s'allonge — 1 jour, 7, 15 — plutôt qu'une grille ; conditions comme faits |
| 7 | Contact | action | action | — | un seul geste : Instagram |

Écarts assumés avec la séquence candidate : **pas d'INTÉRIEUR** (aucune image d'habitacle), **pas d'EAU/MOUSSE
filmée** (aucune image de lavage), **pas de RENTAL REVEAL photographique** (aucune photo du véhicule loué). Ils
reviennent dès que les médias existent : un chapitre est une ligne de données.

## Composition par format

| | Bureau | Tablette | Mobile |
|---|---|---|---|
| Preuve vidéo | colonne portrait dans une composition spatiale (la vidéo n'est jamais étirée en paysage) ; texte à côté | colonne réduite, texte dessous | **plein écran natif** (la source est portrait) ; légendes en bas |
| Transition « passage » | shader sur deux textures (avant/après) | idem, amplitude réduite | séquence + masque 2D ou shader léger — à mesurer |
| Caméra | caméra virtuelle sur le plan vidéo : poussée à focale variable, décalage optique pour le texte | amplitude réduite | cadrages fixes par pas, ressort |
| Location | typographie spatiale, durée comme axe | idem | pile éditoriale, une durée par écran |

## Couleur

Système principal : nuit + blanc chaud. Accent par univers, jamais les deux à pleine intensité :
or (dérivé de `#f9b926`, flyer nettoyage) pour le nettoyage ; rouge (dérivé de `#f20313`, flyer location) pour la
location ; la bascule est le seul endroit où l'un s'éteint pendant que l'autre paraît. Les valeurs de `tokens.css`
sont provisoires.

## Rôle de la 3D (à prouver, sinon retirée)

Candidats **avec intention** : la ligne d'eau du « passage » (réfraction, bord humide, reflet — une matière, pas des
particules) ; éventuellement une macro de vernis sous l'environnement de nuit (perlage d'eau = « brillance longue
durée »). Si une vidéo ou un masque 2D produit le même effet à moindre coût, la 3D sort.

## Test anti-template (à repasser sur le rendu)

- héros générique → non : on ouvre sur de la poussière, pas sur une promesse ;
- cartes de services → non : les prestations sont des conséquences, pas une grille ;
- grille de prix → non : la durée est un axe ;
- voiture 3D qui tourne → aucune voiture 3D ;
- dégradés, glow, verre dépoli, particules → aucun sans fonction physique ;
- fondu → glissé → zoom → aucune transition qui ne soit motivée par la matière (eau, lumière).
