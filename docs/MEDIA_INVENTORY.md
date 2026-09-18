# CAR SERVICE 06 — Inventaire média (mesuré)

Relevé du 17/09/2026. Mesures reproductibles : `npm run media:inspect` → `docs/media-inventory.json`.
Sources dans `tools/` (hors version, jamais modifiées). Dérivés publiables : `npm run media:video`, `npm run media:env`.

Mise à jour du 18/09/2026 : le porteur a fourni **deux modèles 3D de véhicules** (`tools/3d/RS6`, `tools/3d/TOYOTA`).
Ils remplacent la preuve vidéo dans le récit ; la vidéo reste dans `tools/` et ne sert plus qu'au banc du laboratoire.
Dérivés publiables : `npm run media:3d`.

---

## 1. `tools/flyers/MAIN.png` — flyer nettoyage

| | |
|---|---|
| Type | Capture d'écran iPhone d'une story Snapchat (compte « Car-service06 », « il y a 4h ») |
| Dimensions | 1170 × 2532, PNG RGB, 2,64 Mio |
| Accent mesuré | or `#f9b926` (logo), `#fed136` (aplat « 50€ ») |
| Image | composition publicitaire générée (berline noire couverte de mousse, logo constructeur visible, laveur, local éclairé) — **pas une photo du service réel** |

Contenu commercial relevé (source de vérité) :

- CAR SERVICE06 — NETTOYAGE AUTO PREMIUM — « Votre voiture mérite le meilleur ! »
- INTÉRIEUR + EXTÉRIEUR — **50€** — **DÉPLACEMENT DANS TOUT LE 06** (pictogramme utilitaire, carte du 06)
- Nettoyage intérieur : sièges · tapis · plastiques · aspiration
- Lavage extérieur : mousse active · séchage soin
- Finition premium : brillance longue durée
- Produits professionnels : respect de votre véhicule & de l'environnement
- « Un véhicule propre, c'est un plaisir au quotidien ! » — « À votre service dans tout le 06 ! »
- Icônes Instagram et Facebook + « CAR SERVICE06 » (aucun identifiant lisible)

**Rôle retenu : source de vérité commerciale uniquement.** Jamais affiché : interface Snapchat, avatar, image générée,
logo constructeur, texte incrusté.

## 2. `tools/flyers/LOC.png` — flyer location

| | |
|---|---|
| Type | Capture d'écran iPhone d'une story Snapchat (« il y a 5 jours ») |
| Dimensions | 1170 × 2532, PNG RGB, 1,56 Mio |
| Accent mesuré | rouge `#f20313` / `#fa020f` |
| Image | Toyota C-HR gris sur sol mouillé, ville de nuit — rendu/composition, logo et monogramme visibles — **pas une photo du véhicule loué** |

Contenu relevé : CARSERVICE06 — NETTOYAGE AUTO PROFESSIONNEL — Toyota C-HR — 70€/jour · 400€/7J · 700€/15J —
assurance comprise · kilométrage illimité · hybride économe · confort & sécurité · disponible 7J/7 — Instagram
`car_service06`.

**Rôle retenu : source de vérité commerciale uniquement.** Aucune image réelle du véhicule loué n'existe : à fournir.

## 3. `tools/3d/RS6/2020_audi_rs6_avant.glb` — véhicule de la démonstration

| Mesure | Valeur |
|---|---|
| Source | fournie par le porteur (18/09/2026) |
| Brut | glTF binaire, 13,0 Mio, 217 018 triangles, 26 matériaux, 38 images |
| Publié | `public/models/rs6.glb` — **3,0 Mio** (`npm run media:3d` : WebP 1024, quantification + meshopt) |
| Droits | **TO_CONFIRM** — origine et licence du modèle à confirmer auprès du porteur (usage de démonstration) |

Rôle : le véhicule sali puis relevé, verni, et visité de l'intérieur (chapitres avant → prestations). Les matériaux
d'emblème, de badge et de plaque sont masqués au chargement ; aucun plan ne met une marque en avant.

## 4. `tools/3d/TOYOTA/source/MDL14246_reversed.glb` — véhicule de location

| Mesure | Valeur |
|---|---|
| Source | fournie par le porteur (18/09/2026) |
| Brut | glTF binaire, 1,8 Mio, 201 073 triangles, 5 matériaux, 10 images |
| Publié | `public/models/chr.glb` — **1,7 Mio** |
| Droits | **TO_CONFIRM** — origine et licence du modèle à confirmer auprès du porteur |

Rôle : le véhicule qui roule devant nous sur la route du 06 (chapitres bascule → location). Un seul matériau couvre
toute la caisse : les emblèmes ne peuvent pas en être isolés, aucun plan ne les met en avant.

## 5. `tools/3d/ScreenRecording_09-16-2026 22-57-08_1.mp4` — vidéo avant/après (retirée du site le 18/09/2026)

| Mesure | Valeur |
|---|---|
| Nature | **Enregistrement d'écran iPhone d'une story Snapchat** (« Car-service06 », « il y a 5 mois ») |
| Conteneur / codec | MP4 (mp42), HEVC Main (`hvc1`), yuvj420p plage complète, BT.709 |
| Dimensions | 1170 × 2532 (portrait) ; zone d'image utile lignes 141 → 2212 |
| Durée | 22,96 s |
| Cadence | 60 nominal, **57,65 moyenne, variable** (intervalles 15 → 148 ms) |
| Images | 1 322 ; B-frames : 2 ; **1 image clé par seconde** (23) |
| Débit / poids | 15,3 Mb/s ; 41,8 Mio |
| Audio | AAC stéréo 44,1 kHz, ~2 kb/s effectifs (silence) |

### Contenu, seconde par seconde

| Source (s) | Contenu | Utilisable |
|---|---|---|
| 0,0 – 7,55 | SUV gris foncé **couvert de poussière** : portière et marchepied, aile, capot (texture de poussière très lisible, reflets éteints), optique avant, calandre | **oui — « avant »** (logo calandre 6,4–7,0) |
| 7,67 – 8,4 | filé rapide vers l'arrière | non |
| 8,2 – 9,5 | arrière : **plaque d'immatriculation lisible** | **non — donnée personnelle** |
| 9,6 – 14,6 | flanc et aile, état ambigu (en partie propre) | non (preuve ambiguë) |
| 14,6 – 17,7 | **capot brillant, reflets nets des arbres** | **oui — « après »** (logo capot 16,4–17,2) |
| 17,7 – 18,1 | filé | non |
| 18,1 – 19,6 | **flanc et marchepied brillants** | **oui — « après »** |
| 19,7 – 21,7 | idem, mais **plaque d'un utilitaire tiers lisible** en arrière-plan | **non — donnée personnelle** |
| 21,73 – 21,95 | photo fixe arrière du véhicule propre, **plaque lisible** | non |
| 21,95 → fin | centre de contrôle iOS (fin de l'enregistrement) | non |

Incrustations sur toute la durée : barre d'état, barre de progression et en-tête du compte Snapchat (haut), champ
« Répondre… » et réactions (bas), coins arrondis.

Lecture : tournage à la main, en extérieur, de jour, sur une allée gravillonnée avec bâche et clôture. Aucune image
de lavage (eau, mousse), aucune image d'habitacle. Même véhicule, même lieu, même lumière : **les panneaux se
répondent** (capot poussiéreux ↔ capot brillant ; flanc poussiéreux ↔ flanc brillant) mais les cadrages ne sont pas
superposables — une comparaison masquée au pixel près est impossible, une comparaison de panneau à panneau l'est.

### Aptitudes (décision du 17/09/2026)

| Traitement | Verdict |
|---|---|
| Scrub piloté par le scroll | **oui** après ré-encodage (source : 1 image clé/s, B-frames, HEVC non lu partout, cadence variable) |
| Révélation masquée / comparaison | **par paire de panneaux**, pas au pixel |
| Lecture linéaire | possible, sans intérêt narratif (caméra à la main, 22 s dont 10 inutilisables) |
| Arrière-plan plein écran bureau | **non** : 1170 px de large en portrait, recadrage paysage = 1170 × 658 agrandi |
| Plein écran mobile | **oui** : portrait natif, c'est son format |
| Intégration spatiale bureau | colonne portrait dans la composition (≈ 900 × 1424 affichés sans agrandissement) |

### Dérivés publiés (`public/media/transformation/`)

Seules les plages marquées « oui » sont encodées : aucune plaque, aucune interface, aucun centre de contrôle dans un
fichier publié. Recadrage `1170 × 1850 @ (0, 320)`.

| Fichier | Format | Poids |
|---|---|---|
| `scrub-desktop.mp4` | H.264 High, 900 × 1424, 30 i/s constants, GOP 5, 0 B-frame, faststart, sans audio, CRF 27 — 365 images, 12,17 s | 6,2 Mio |
| `scrub-mobile.mp4` | idem, 720 × 1138, CRF 28 (comparaison ; le mobile utilise la séquence) | 4,0 Mio |
| `sequence-540.bin` | séquence 12 i/s, 540 × 854, 146 images WebP q68 **regroupées en un fichier** (positions dans `media.generated.json`, lecture par requêtes Range) | 3,9 Mio (27 Kio/image) |
| `before-{desktop,mobile}.{avif,webp}` | affiche « avant » (source 5,5 s) | 33–60 Kio |
| `after-{desktop,mobile}.{avif,webp}` | affiche « après » (source 15,6 s) | 22–37 Kio |

Plages dans les fichiers publiés : `before` 0 → 7,567 s ; `after-hood` 7,567 → 10,667 s ; `after-flank` 10,667 → 12,167 s
(`src/experience/media.generated.json`).

Mesure du ré-encodage (plage « avant », 900 px) : recette Agenceeimoo avec `-tune fastdecode` CRF 22 = 8,9 Mio ;
sans fastdecode CRF 22 = 7,1 ; CRF 25 = 5,0 ; **CRF 27 = 4,0 Mio, SSIM 0,977**, identique à l'œil (la source est déjà
recompressée par Snapchat).

## 4. `tools/3d/rogland_clear_night_4k.hdr` — HDRI

Les référentiels le nomment `.exr` : le fichier fourni est un **Radiance `.hdr`**.

| Mesure | Valeur |
|---|---|
| Format | Radiance RGBE (RLE), équirectangulaire |
| Dimensions | 4096 × 2048 ; 26,6 Mio ; 128 Mio une fois décodé en flottants |
| Provenance | probablement Poly Haven « Rogland Clear Night » (CC0) — **à confirmer** |
| Contenu | ciel étoilé et Voie lactée en pose longue au-dessus d'un **paysage semi-désertique rocailleux** (arbustes, rochers) ; halo orangé à l'horizon |
| Luminance | médiane 0,085 ; p95 0,43 ; p99,9 1,19 ; max 497 (point brillant à azimut −11°, élévation 34°) |
| Énergie | hémisphère haut 0,148 / bas 0,026 (≈ 6 : 1) ; bande la plus claire 10–40° d'élévation |
| Sources ponctuelles | ~1 000 pixels > 50 × la médiane (étoiles) |

Aptitudes :

- **Décor visible : non.** Un paysage désertique sans rapport avec le 06 ni avec le métier ; et en arrière-plan, une
  équirectangulaire 4K ne donne que ≈ 340 px pour 30° de champ (flou).
- **Lumière de reflets : possible.** Un dôme doux, une ligne d'horizon claire, des étoiles qui scintillent dans un
  vernis — cohérent pour une matière de carrosserie de nuit, **si** une scène 3D de finition est retenue.

Dérivés (`public/env/`, `npm run media:env`) : PMREM CubeUV pré-calculé — `night-128.hdr` 384 × 512, **447 Kio** ;
`night-256.hdr` 768 × 1024, **1,7 Mio** (le bruit d'étoiles empêche la compression RLE). Vérifié dans le laboratoire :
chargement, orientation (ciel en haut), reflets sur chrome et vernis, survie à une perte de contexte.

## 5. Manques bloquants pour la narration candidate

| Manque | Conséquence |
|---|---|
| Aucune image d'habitacle | pas de chapitre INTÉRIEUR filmé ; le nettoyage intérieur reste dit |
| Aucune image de lavage (eau, mousse) | l'eau n'est qu'un matériau de transition, jamais une preuve |
| Aucune photo du véhicule loué | la location est typographique/spatiale tant qu'elles manquent |
| Aucun modèle 3D | aucune voiture 3D ; la 3D n'a de rôle possible que matière/lumière/transition |
| Aucun contact direct (téléphone, e-mail) | l'action mène à Instagram, seul canal confirmé |
