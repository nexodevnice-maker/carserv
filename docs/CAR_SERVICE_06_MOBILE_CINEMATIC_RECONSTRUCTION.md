# CAR SERVICE 06 — MOBILE CINEMATIC RECONSTRUCTION
## MASTER PROMPT — SCROLL AS CINEMATIC UNITS

Tu travailles UNIQUEMENT sur le MOBILE.

Le résultat mobile actuel est insuffisant :
- univers visuel flou ;
- profondeur faible ;
- scènes qui semblent séparées ;
- transitions génériques ;
- impression de WebGL posé sur une page ;
- manque de maîtrise du mouvement ;
- manque d'identité ;
- sensation de "site web" au lieu d'une expérience ;
- plusieurs éléments semblent décoratifs plutôt que narratifs.

Tu dois donc effectuer une **reconstruction profonde de l'expérience mobile**.

Ce n'est PAS une amélioration cosmétique.
Ce n'est PAS une optimisation responsive.
Ce n'est PAS une nouvelle couche d'effets.

C'est une reconstruction de la mise en scène mobile.

---

# 01 — RÈGLE ABSOLUE
# UN SCROLL = UNE UNITÉ CINÉMATOGRAPHIQUE

C'est désormais l'une des règles fondamentales de l'expérience.

Chaque geste de scroll doit être considéré comme :

**UNE UNITÉ D'ACTION.**

Peu importe :
- la longueur du geste ;
- sa vitesse ;
- sa force ;
- son accélération ;
- sa direction.

Le système doit transformer chaque progression de scroll en une action cinématographique maîtrisée.

Conceptuellement :

SCROLL 01
→ UNE ACTION
→ UNE IDÉE
→ UNE CONSÉQUENCE

SCROLL 02
→ UNE ACTION
→ UNE IDÉE
→ UNE CONSÉQUENCE

SCROLL 03
→ UNE ACTION
→ UNE IDÉE
→ UNE CONSÉQUENCE

Le visiteur ne doit jamais avoir la sensation que plusieurs événements arbitraires se déclenchent simultanément pendant qu'il fait défiler.

Chaque unité doit raconter **UNE chose**.

---

# 02 — MAIS LES UNITÉS NE SONT PAS INDÉPENDANTES

Attention :

scroll 01
scroll 02
scroll 03

ne doivent surtout pas devenir une succession de mini-scènes.

Elles doivent former UNE CINÉMATIQUE CONTINUE.

Chaque action doit provoquer ou préparer la suivante.

Exemple :

SCROLL 01
La caméra découvre une matière.

↓ conséquence

SCROLL 02
Le mouvement révèle que cette matière appartient à une voiture.

↓ conséquence

SCROLL 03
Le reflet de cette voiture révèle le ciel.

↓ conséquence

SCROLL 04
Le ciel descend dans la carrosserie.

↓ conséquence

SCROLL 05
Le reflet devient le territoire.

↓ conséquence

SCROLL 06
Le territoire devient le 06.

↓ conséquence

SCROLL 07
Le 06 devient une route.

↓ conséquence

SCROLL 08
La route devient un déplacement.

↓ conséquence

SCROLL 09
Le déplacement révèle le C-HR.

Le système narratif doit fonctionner comme une **chaîne de transformations**.

Pas comme des sections.

---

# 03 — LA FORCE DU SCROLL NE DOIT PAS DÉTRUIRE L'ACTION

Un geste de doigt très rapide ne doit pas simplement faire :

animation 0% → animation 100%

et détruire la cinématique.

Un geste très lent ne doit pas non plus laisser une scène molle et sans intention.

Le système doit conserver l'action narrative.

La progression utilisateur peut modifier la vitesse de traversée, mais le comportement cinématographique doit rester contrôlé.

Le scroll doit donc être traité comme une commande de cinéma :

INPUT
↓
INTERPRÉTATION
↓
ACTION CINÉMATOGRAPHIQUE
↓
ÉTAT MAÎTRISÉ

et non :

delta scroll
↓
tout bouge proportionnellement

---

# 04 — VITESSE CINÉMATOGRAPHIQUE

Les plans doivent pouvoir :

- ralentir ;
- presque s'arrêter ;
- repartir ;
- accélérer ;
- changer de rythme ;
- respirer ;
- reprendre de la vitesse.

Le rythme doit être intentionnel.

Exemple :

SCROLL
████████████████

CAMÉRA
──────→
       ──→
          ───────→
                    →→→→

Le scroll utilisateur n'est donc PAS directement la vitesse visuelle.

Il pilote une trajectoire cinématographique.

Utilise les techniques de contrôle de progression déjà maîtrisées dans le moteur existant pour obtenir ce comportement.

Ne reconstruis pas inutilement un nouveau moteur si le moteur actuel permet de le faire correctement.

---

# 05 — CHAQUE UNITÉ DOIT AVOIR UNE FONCTION

Pour chaque unité cinématique, définis explicitement :

UNIT
├── intention
├── sujet principal
├── mouvement caméra
├── mouvement sujet
├── lumière
├── profondeur
├── transition d'entrée
├── transition de sortie
└── conséquence narrative

Si une animation ne sert aucune de ces fonctions :

**SUPPRIME-LA.**

---

# 06 — INTERCONNEXION TOTALE

Aucune scène ne doit commencer "à zéro".

La fin de l'action précédente doit fournir la matière de l'action suivante.

Utilise autant que possible :

- continuité de lumière ;
- continuité de mouvement ;
- continuité de perspective ;
- continuité de profondeur ;
- continuité de matière ;
- continuité de caméra ;
- continuité de couleur ;
- continuité de direction.

Exemple :

REFLET
→ devient lumière

LUMIÈRE
→ devient ciel

CIEL
→ devient reflet

REFLET
→ devient territoire

TERRITOIRE
→ devient 06

06
→ devient route

ROUTE
→ devient déplacement

La transition idéale n'est pas :

> "voici une nouvelle scène"

mais :

> "je comprends maintenant que ce que je regardais était autre chose."

---

# 07 — RECONSTRUCTION TOTALE DE L'UNIVERS MOBILE

Ne conserve aucune composition simplement parce qu'elle existe déjà.

Inspecte chaque élément.

Pour chacun :

GARDER
MODIFIER
REPLACER
SUPPRIMER

Pose la question :

> Est-ce que cet élément appartient réellement à l'univers CAR SERVICE 06 ?

Si la réponse est non :

**SUPPRIME-LE.**

---

# 08 — LE MOBILE DOIT AVOIR UN NOUVEL UNIVERS

Le mobile actuel étant visuellement flou et faible, ne tente pas de simplement augmenter :
- contraste ;
- netteté ;
- luminosité ;
- résolution ;
- effets.

Le problème est structurel.

Recompose :

PREMIER PLAN
Matières automobiles très proches.

PLAN MOYEN
Véhicule.

PROFONDEUR
Atmosphère / lumière / environnement.

ARRIÈRE-PLAN
Ciel / territoire / espace.

HORS-CHAMP
Éléments volontairement invisibles jusqu'à leur révélation.

Le téléphone doit avoir une vraie profondeur spatiale.

---

# 09 — MACRO → RECUL → RÉVÉLATION

Première grande séquence.

Commencer dans une proximité presque abstraite :

peinture
↓
reflet
↓
carrosserie
↓
détail

Puis :

recul
↓
compréhension
↓
révélation du véhicule

Le visiteur doit d'abord voir une matière avant de comprendre son origine.

La caméra doit effectuer un véritable travelling/retrait spatial.

Pas simplement zoomer.

---

# 10 — REFLET → CIEL

Le reflet de la carrosserie doit devenir un élément narratif.

Au départ :
reflet discret

Puis :
reflet plus profond

Puis :
le ciel apparaît

Puis :
le ciel prend progressivement possession du reflet

La carrosserie devient une surface de transition.

---

# 11 — LE CIEL DESCEND

Cette idée est maintenant une séquence majeure.

Le ciel ne doit plus seulement être "derrière" la voiture.

Il doit sembler :

**DESCENDRE DANS LA CARROSSERIE.**

Construis une perception progressive :

CIEL
↓
REFLET
↓
CARROSSERIE
↓
REFLET DE PLUS EN PLUS PROFOND
↓
LE CIEL SEMBLE DESCENDRE
↓
LA CARROSSERIE DEVIENT UNE PORTE

Le ciel doit donner l'impression de pénétrer dans le monde automobile.

Ce doit être une transformation de perception.

Pas un overlay.
Pas un background.
Pas une texture plaquée.

---

# 12 — CIEL → TERRITOIRE → 06

Une fois le ciel installé dans le reflet :

CIEL
↓
horizon
↓
territoire
↓
06

Le 06 doit apparaître comme une conséquence de la découverte.

Pas comme un logo.
Pas comme un objet décoratif.

Le visiteur doit comprendre progressivement :

> cette voiture évolue dans ce territoire.

---

# 13 — 06 → ROUTE

Le 06 doit ensuite donner naissance à la route.

La route peut apparaître depuis :
- une ligne ;
- une perspective ;
- une découpe ;
- un déplacement ;
- une extension du territoire.

Puis la caméra suit cette route.

06
↓
route
↓
perspective
↓
mouvement

Cela doit donner une vraie sensation de déplacement.

---

# 14 — LE NETTOYAGE

Le nettoyage doit devenir une transformation cinématographique.

Pas :

effet doré
↓
voiture propre

Mais :

AVANT
↓
observation
↓
intervention
↓
lumière
↓
transformation
↓
APRÈS

La lumière doit parcourir la matière.

Elle révèle progressivement la différence.

Le changement doit être compréhensible même sans texte.

---

# 15 — LA LUMIÈRE EST UNE MATIÈRE

La lumière ne doit pas être un simple éclairage.

Elle doit avoir une fonction narrative.

Elle peut :
- révéler ;
- cacher ;
- guider ;
- transformer ;
- créer une transition ;
- faire apparaître une surface ;
- modifier la perception du véhicule.

Mais reste physiquement crédible.

Pas de science-fiction gratuite.

---

# 16 — LE VÉHICULE EST UN ACTEUR

Le véhicule doit parfois :
- rester immobile pendant que la caméra bouge ;
- avancer pendant que la caméra reste stable ;
- traverser le cadre ;
- disparaître ;
- réapparaître ;
- tourner légèrement ;
- être révélé progressivement.

Ne fais pas bouger tout simultanément.

Le contraste entre mouvement caméra et mouvement véhicule doit créer la mise en scène.

---

# 17 — LA ROUTE DEVIENT LE LIEN ENTRE LES MONDES

La route doit assurer une continuité :

NETTOYAGE
↓
TERRITOIRE
↓
DÉPLACEMENT
↓
LOCATION

Elle ne doit jamais sembler ajoutée simplement parce qu'il faut une section supplémentaire.

---

# 18 — ARRIVÉE DU TOYOTA C-HR

Le C-HR doit apparaître comme la conséquence naturelle du voyage.

Pas :

fin de section
↓
nouvelle carte location

Mais :

route
↓
distance
↓
mouvement
↓
silhouette
↓
C-HR
↓
présence
↓
désir
↓
prix

Les informations commerciales arrivent ensuite.

---

# 19 — COMMERCIAL APRÈS LE CINÉMA

Ne casse jamais une séquence forte avec :
- gros bloc de prix ;
- bouton énorme ;
- carte ;
- liste ;
- formulaire.

Le contenu commercial doit apparaître lorsque la narration l'a rendu pertinent.

Ordre :

ÉMOTION
↓
CURIOSITÉ
↓
DÉCOUVERTE
↓
DÉSIR
↓
INFORMATION
↓
ACTION

---

# 20 — TYPOGRAPHIE

Repenser entièrement la typographie mobile.

Le texte doit participer à la cinématique.

Utilise :
- repères ;
- petites annotations ;
- titres courts ;
- mots isolés ;
- informations contextuelles ;
- positionnement spatial.

Évite le gros titre centré sur chaque écran.

Le texte ne doit jamais être le protagoniste lorsque la voiture doit l'être.

---

# 21 — RYTHME GLOBAL

Construis une vraie composition musicale.

CALME
↓
APPROCHE
↓
SUSPENSION
↓
RÉVÉLATION
↓
ACCÉLÉRATION
↓
TRANSFORMATION
↓
RESPIRATION
↓
MOUVEMENT
↓
NOUVELLE RÉVÉLATION
↓
ACTION

Toutes les unités n'ont pas besoin d'avoir la même durée.

Certaines doivent être longues.
Certaines très courtes.
Certaines doivent ralentir fortement.
Certaines doivent accélérer.

Le contraste est obligatoire.

---

# 22 — AUCUN SCROLL NE DOIT ÊTRE "VIDE"

Chaque unité doit produire une perception claire.

Mais attention :

**vide ≠ respiration.**

Une respiration peut être intentionnelle.

Un scroll sans conséquence ne l'est pas.

Chaque unité doit donc avoir une conséquence visible ou perceptible.

---

# 23 — AUCUN SCROLL NE DOIT ÊTRE SURCHARGÉ

Inversement :

caméra
+
voiture
+
lumière
+
texte
+
06
+
route
+
particules
+
effets

simultanément est interdit.

Une unité = une idée principale.

Le reste sert cette idée.

---

# 24 — VITESSE VARIABLE

Construis des courbes de progression capables de produire :

rapide
→
ralenti
→
quasi-arrêt
→
reprise
→
accélération
→
arrêt narratif

Le résultat doit ressembler à une vraie direction de caméra.

Le doigt donne l'ordre.

Le système réalise la chorégraphie.

---

# 25 — DIRECTION ARTISTIQUE

Repars du principe que l'univers mobile actuel peut être mauvais.

Ne cherche pas à le sauver par accumulation.

Recompose :
- lumière ;
- contraste ;
- profondeur ;
- matière ;
- atmosphère ;
- échelle ;
- cadrage ;
- espace négatif ;
- typographie ;
- densité.

Le résultat doit être :

**automobile + Côte d'Azur + premium + mouvement + matière + territoire**

sans tomber dans :

**automobile + template + effets WebGL.**

---

# 26 — ANTI-GÉNÉRIQUE ABSOLU

Supprime ou reconstruis tout ce qui évoque :
- landing page ;
- template automobile ;
- site SaaS ;
- cartes ;
- sections classiques ;
- fade-in ;
- slide ;
- zoom générique ;
- glassmorphism ;
- gradient artificiel ;
- glow ;
- particules décoratives ;
- parallax standard ;
- 3D décorative ;
- UI surchargée.

Le résultat doit être identifiable comme une expérience conçue spécifiquement pour CAR SERVICE 06.

---

# 27 — UTILISER LE MEILLEUR DU MOTEUR EXISTANT

Tu disposes déjà d'un moteur ayant fait ses preuves.

Réutilise ses meilleures capacités :
- scroll normalisé ;
- caméra ;
- WebGL ;
- états déterministes ;
- gestion du DPR ;
- architecture engine/experience ;
- responsive ;
- optimisation.

Mais ne laisse pas l'architecture existante dicter une mauvaise direction artistique.

Si une partie du système empêche la nouvelle expérience :

**refactore-la.**

Si elle est bonne :

**conserve-la.**

---

# 28 — PRIORITÉ DE TRAVAIL

1. UNIVERS MOBILE
2. CAMÉRA
3. UNITÉS DE SCROLL
4. INTERCONNEXION DES UNITÉS
5. PROFONDEUR
6. LUMIÈRE
7. REFLETS
8. CIEL
9. TERRITOIRE / 06
10. ROUTE
11. VÉHICULES
12. TRANSFORMATION NETTOYAGE
13. LOCATION
14. TYPOGRAPHIE
15. MICRO-INTERACTIONS
16. DÉTAILS

Ne commence PAS par les détails.

---

# 29 — ARCHITECTURE DOCUMENTAIRE

Avant de modifier profondément le code, mets à jour les référentiels `.md`.

Ils doivent désormais contenir une véritable **Mobile Cinematic Grammar**.

Documente notamment :

MOBILE_DA
MOBILE_CAMERA
SCROLL_UNITS
SCROLL_RHYTHM
SCROLL_TRANSITIONS
MATERIAL_LANGUAGE
LIGHT_LANGUAGE
REFLECTION_LANGUAGE
TERRITORY_LANGUAGE
VEHICLE_LANGUAGE
MOBILE_TYPOGRAPHY
MOBILE_PERFORMANCE

Ne crée pas une nouvelle forêt documentaire inutile.

Complète l'architecture existante lorsque possible.

---

# 30 — NE PAS RECONSTRUIRE INUTILEMENT LE MOTEUR

Tu n'as pas pour mission de réinventer le système technique.

Tu as pour mission de produire le meilleur résultat visuel possible avec le système.

Réutilise ce qui est solide.

Refactore seulement ce qui limite réellement l'expérience.

---

# 31 — TEST VISUEL PRINCIPAL

Sur téléphone portrait réel :

cache mentalement :
- menu ;
- texte ;
- boutons ;
- prix.

Regarde uniquement :

CAMÉRA
+
VOITURE
+
MATIÈRE
+
LUMIÈRE
+
CIEL
+
REFLET
+
06
+
ROUTE

Si cela ressemble à un film interactif :

continue.

Si cela ressemble à un site WebGL :

retravaille.

---

# 32 — TEST "UN SCROLL"

Prends chaque unité individuellement.

Pour chacune demande :

### Qu'est-ce que je viens de faire ?

Une réponse unique doit être possible.

Exemples :

> "J'ai découvert la carrosserie."

> "J'ai compris que c'était une voiture."

> "Le ciel est apparu dans son reflet."

> "Le reflet est devenu le territoire."

> "Le territoire est devenu une route."

> "La voiture s'est mise en mouvement."

Si une unité raconte trois choses différentes :

**simplifie-la.**

---

# 33 — TEST "CHAÎNE"

Lis ensuite les unités ensemble.

A → B → C → D → E → F

Chaque unité doit donner envie de voir la suivante.

Et surtout :

**B doit être la conséquence de A.**

Si B pourrait être déplacé ailleurs sans que rien ne change :

la connexion est insuffisante.

---

# 34 — TEST "CINÉMA"

Le mouvement doit pouvoir être regardé sans connaître le site.

Demande :

> Est-ce que la caméra semble dirigée par quelqu'un ?

> Est-ce que le rythme semble intentionnel ?

> Est-ce que certaines images restent en mémoire ?

> Est-ce que les transitions semblent physiques ?

> Est-ce que le monde possède une profondeur réelle ?

Si non :

corrige.

---

# 35 — TEST "15 SECONDES"

Les 15 premières secondes doivent déjà montrer la nouvelle identité.

Sans lire :

automobile
+
matière
+
Côte d'Azur
+
lumière
+
profondeur
+
cinéma

doivent être immédiatement perceptibles.

---

# 36 — TEST "PAS UN TEMPLATE"

Demande-toi :

> Si je retire le logo CAR SERVICE 06, est-ce que cette expérience possède quand même une identité propre ?

Si la réponse est non :

retravaille la direction artistique.

---

# 37 — TEST DE NETTETÉ

Le mobile actuel étant jugé flou et laid :

inspecte spécialement :
- résolution des assets ;
- rendu des textures ;
- antialiasing ;
- DPR ;
- filtrage ;
- profondeur ;
- contraste ;
- éclairage ;
- fog ;
- caméra ;
- composition.

Mais ne corrige pas uniquement techniquement.

Un rendu net d'une mauvaise composition reste mauvais.

---

# 38 — PERFORMANCE

Le résultat doit rester ambitieux sur smartphone réel.

Utilise intelligemment :
- DPR adaptatif ;
- niveaux de détail ;
- chargement progressif ;
- textures adaptées ;
- géométrie adaptée ;
- limitation des coûts ;
- cleanup ;
- une architecture de rendu cohérente.

Le budget doit être dépensé sur les moments cinématographiques importants.

---

# 39 — REDUCED MOTION

Conserve la narration avec une version réduite.

Le visiteur doit toujours comprendre :

matière
→ voiture
→ transformation
→ territoire
→ déplacement
→ action

même avec les mouvements fortement réduits.

---

# 40 — RÈGLE DE CRÉATION FINALE

Ne cherche pas à faire :

> "un site mobile impressionnant."

Cherche à faire :

> **une caméra que l'utilisateur contrôle avec son doigt.**

Chaque scroll :

**UNE ACTION.**

Chaque action :

**UNE IDÉE.**

Chaque idée :

**UNE CONSÉQUENCE.**

Chaque conséquence :

**PRÉPARE LA SUIVANTE.**

Et l'ensemble :

**UNE SEULE CINÉMATIQUE CONTINUE.**

---

# 41 — RÉSULTAT ATTENDU

À la fin, le mobile doit avoir été entièrement repensé autour de cette logique :

DOIGT
 ↓
SCROLL
 ↓
ACTION
 ↓
CAMÉRA
 ↓
MATIÈRE
 ↓
LUMIÈRE
 ↓
REFLET
 ↓
CIEL
 ↓
TERRITOIRE
 ↓
06
 ↓
ROUTE
 ↓
MOUVEMENT
 ↓
VÉHICULE
 ↓
DÉSIR
 ↓
ACTION

Pas :

SCROLL
↓
SECTION
↓
SECTION
↓
SECTION
↓
CARTE
↓
BOUTON

---

# 42 — LIVRABLE FINAL

Le travail doit produire :

- une nouvelle expérience mobile ;
- une DA mobile réellement reconstruite ;
- une grammaire cinématique documentée ;
- des unités de scroll clairement définies ;
- une action maîtrisée par unité ;
- des unités totalement interconnectées ;
- des ralentissements et accélérations intentionnels ;
- macro → recul → révélation ;
- reflet → ciel ;
- ciel descendant dans la carrosserie ;
- ciel → territoire → 06 ;
- 06 → route ;
- nettoyage comme transformation physique ;
- véhicule comme acteur ;
- route → déplacement ;
- déplacement → C-HR ;
- commercial retardé ;
- nouvelle typographie mobile ;
- profondeur réellement perceptible ;
- suppression des éléments génériques ;
- expérience mobile dédiée ;
- performance mobile maîtrisée.

Ne passe PAS à une nouvelle phase après cela.

Le mobile doit d'abord être suffisamment fort pour devenir la référence qualitative du projet.

# RÈGLE ABSOLUE

**NE RÉPARE PAS L'ANCIEN MOBILE.**

**RECONSTRUIS-LE.**

En utilisant ce qui fonctionne déjà techniquement.

En supprimant ce qui est générique.

En reconstruisant totalement la mise en scène.

Et surtout :

## UN SCROLL = UNE ACTION.
## UNE ACTION = UNE HISTOIRE.
## UNE HISTOIRE = UNE CONSÉQUENCE.
## TOUTES LES CONSÉQUENCES = UNE SEULE CINÉMATIQUE.
