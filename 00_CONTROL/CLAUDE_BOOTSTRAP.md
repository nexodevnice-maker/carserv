# CLAUDE BOOTSTRAP — CAR SERVICE 06

Tu travailles maintenant sur le projet `/carservice`.

MISSION : construire l'architecture réelle du nouveau site CAR SERVICE 06 à partir des sources présentes localement.

NE COMMENCE PAS par fabriquer une landing page générique.

## GATE 0 — INVENTAIRE OBLIGATOIRE

Avant toute implémentation :

1. Lis les fichiers présents dans `/carservice/tools/flyers`.
2. Lis et inspecte tous les fichiers présents dans `/carservice/tools/3d`.
3. Inspecte particulièrement :
   - `rogland_clear_night_4k.exr`
   - `ScreenRecording_09-16-2026 22-57-08_1`
4. Mesure réellement les vidéos et médias.
5. Inspecte les modèles 3D : format, triangles, textures, matériaux, dimensions, poids.
6. Produis un inventaire dans `docs/MEDIA_INVENTORY.md`.

Ne devine pas le rôle d'un asset sans l'avoir inspecté.

## GATE 1 — ARCHITECTURE

Construis ensuite l'architecture du projet en séparant clairement :

- experience
- motion
- camera
- media
- webgl
- scenes
- content
- ui
- responsive
- accessibility
- QA

Utilise une progression de scroll normalisée unique.

Réutilise les patterns d'ingénierie qui ont déjà été validés sur le projet MECA RIVIERA lorsqu'ils sont pertinents, mais NE COPIE PAS son identité visuelle, ses scènes, ses textes, ses timings ou sa direction artistique.

## GATE 2 — PREMIER SQUELETTE

Le projet doit :
- démarrer proprement ;
- charger son environnement ;
- posséder un scene registry ;
- posséder un media registry ;
- posséder une camera rig ;
- posséder le normalized progress ;
- posséder les états de scène ;
- posséder les fallbacks ;
- posséder reduced-motion ;
- être responsive.

Ne construis pas encore tout le site.

## CONTRAINTES

- Ne pas ajouter de bibliothèque sans justification.
- Ne pas installer une usine à gaz.
- Ne pas créer de cards immobilières / SaaS / template.
- Ne pas utiliser du 3D simplement parce que c'est possible.
- Ne pas inventer de services.
- Ne pas inventer de lieux, certifications, avis, performances ou engagements commerciaux.
- Les prix et caractéristiques de location doivent venir des flyers.
- Le site doit rester compréhensible sans les effets.

## PREMIÈRE GRAMMAIRE À TESTER

À confirmer après inspection des médias :

ARRIVAL
→ WATER / FOAM
→ TRANSFORMATION
→ FINISH
→ INTERIOR
→ RENTAL REVEAL
→ ACTION

Les timings sont provisoires.

## VALIDATION

Après chaque couche importante :

BUILD → INSPECT → CRITIQUE → CORRECT → RE-INSPECT

Ne considère jamais le build comme validation visuelle.

À la fin de cette étape, donne :
1. architecture créée ;
2. fichiers créés/modifiés ;
3. dépendances réellement nécessaires ;
4. inventaire média ;
5. décisions créatives provisoires ;
6. risques ;
7. tests effectués ;
8. prochaine étape strictement nécessaire.

Ne commence pas automatiquement le catalogue complet.
