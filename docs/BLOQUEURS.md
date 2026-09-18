# CAR SERVICE 06 — CE QUI BLOQUE UN VRAI RENDU CINÉMATOGRAPHIQUE

Document demandé par le porteur le 18/09/2026 : « fais-moi parvenir tous les soucis qui t'empêchent de vraiment me
donner un résultat digne de ce nom avec un vrai rendu premium cinématographique ».

Chaque point dit : **le problème**, **ce que ça coûte de le lever**, **ce que ça rapporte**, et **ma recommandation**.
Les points 1, 2 et 3 sont, de loin, les plus importants.

---

## 1. L'image 360° fournie ne peut pas être traversée (le blocage principal)

**Ce que j'en fais déjà — tout le temps, partout :**

| Usage | Où ça se voit |
|---|---|
| Le ciel entier, tel qu'il a été photographié (aucun étalonnage) | toutes les unités |
| La **lumière** des véhicules (PMREM du même fichier) | c'est votre nuit qui se reflète dans la laque |
| Le **reflet** du sol mouillé et de la chaussée | le sol renvoie votre ciel |
| Le **sol** : la moitié basse du panorama projetée au pied de la caméra | les roches et la terre autour du véhicule |

**Le problème.** Un HDR est une photographie prise depuis **un seul point**. Tous ses pixels sont à l'infini. Donc :

- si la caméra avance de 1 m ou de 10 km, **l'image ne change pas d'un pixel** — aucune parallaxe ;
- on ne peut pas passer **devant**, **derrière** ou **entre** les montagnes : rien ne masque rien ;
- on ne peut pas **s'approcher** d'un sommet : il garde exactement la même taille.

C'est précisément ce qui donne la sensation de « décor peint » et de « je ne vois aucun changement ». Ce n'est pas un
défaut de votre image : c'est la nature d'une photographie.

**Votre question : « il aurait fallu l'exporter en GLB ? »** — Non, ça ne changerait rien : un GLB fabriqué à partir de
l'HDR ne serait que la même image collée sur une sphère. Un HDR ne contient aucune géométrie ; il n'y a rien à
exporter. Ce qu'il faut, c'est de la **géométrie** :

| Option | Ce que ça donne | Coût | Poids |
|---|---|---|---|
| **A. Relief procédural** (fait aujourd'hui) | 4 crêtes concentriques (1,2 → 17 km) + 54 rochers autour du véhicule, éclairés par VOTRE ciel. Vraie parallaxe, premier plan qui passe devant l'objectif | déjà fait | 0 Ko (généré) |
| **B. Le VRAI relief des Alpes-Maritimes** (altitudes IGN / tuiles d'élévation ouvertes) | les montagnes réelles du 06, à l'échelle, sous votre ciel. On survole le vrai territoire, on descend dans la vraie vallée | 1 à 2 jours | ~300 Ko à 1 Mo |
| **C. Un GLB de paysage** (que vous fournissez ou qu'on achète) | un décor modélisé, très contrôlable ; risque de ne pas coller au ciel fourni | selon le modèle | 5 à 50 Mo |

**Ma recommandation : B.** C'est la seule qui soit à la fois cinématographique ET juste pour l'entreprise : on vole
au-dessus des Alpes-Maritimes réelles, pas d'un décor. Votre HDR garde son rôle — le ciel et la lumière — et le sol
devient un vrai relief qu'on traverse. C'est exactement ce que font les cinématiques de jeu : **ciel photographié +
géométrie réelle**.

---

## 2. Le scroll : aucun ScrollTrigger dans ce projet

**Ce qui est en place.** Le site n'utilise ni GSAP ni ScrollTrigger. Le moteur est écrit sur mesure
(`src/engine/`) : le défilement natif est lu une fois par image, converti en progression `p` de 0 à 1, qui alimente des
canaux (lumière, brume, salissure, position du véhicule…) et la caméra. Un « pas guidé » amène la page exactement d'un
repos au suivant. Avantages : aucune dépendance, état reconstructible à l'identique à l'aller comme au retour,
accessibilité et clavier gratuits, 9 Ko de moteur.

**La limite dure, et elle est réelle.** Sur téléphone, l'**inertie du geste appartient au système** (iOS et Android).
On ne peut ni la ralentir, ni l'allonger, ni la reprendre. Conséquence : quand vous lancez un grand balayage, c'est
l'OS qui décide de la vitesse de la « caméra », pas la mise en scène. Un vol pensé pour durer deux secondes peut être
avalé en trois dixièmes. **C'est ça, « le scroll n'est pas maîtrisé ».**

| Option | Ce que ça donne | Coût | Contrepartie |
|---|---|---|---|
| **A. Défilement natif + pas guidés** (aujourd'hui) | rapide, accessible, zéro dépendance | fait | la vitesse reste celle du doigt |
| **B. Défilement virtuel** (Lenis, MIT, ~3 Ko) : on intercepte le geste et on avance la progression nous-mêmes | **maîtrise totale du tempo** : ralentis, quasi-arrêts, accélérations imposés par la mise en scène. C'est ce que font les sites primés | 0,5 à 1 jour | on remplace le défilement du système (il faut soigner l'accessibilité, le clavier, la barre de défilement) |
| **C. GSAP ScrollSmoother** | idem B | licence **payante** (GSAP Business) | dépendance + coût |

**Ma recommandation : B (Lenis).** Même résultat que ScrollSmoother, gratuit, et il se branche exactement là où le
moteur lit déjà le défilement — sans rien réécrire d'autre.

---

## 3. Aucun post-traitement : il manque la couche « pellicule »

Aujourd'hui l'image sort brute du rendu. Il n'y a **ni bloom** (les halos autour des lumières vives), **ni
profondeur de champ**, **ni grain**, **ni vignettage**, **ni flou de mouvement**. C'est, à mon avis, la moitié de
l'écart qui reste avec une image de film : ce sont ces défauts d'objectif qui font qu'un rendu « existe ».

- Coût : une passe plein écran supplémentaire (~2 à 4 ms au téléphone).
- Arbitrage honnête : je préfère **DPR 1,75 + post-traitement** que DPR 2 sans. La netteté seule ne fait pas le cinéma.
- Recommandation : bloom doux + vignettage + grain fin, et profondeur de champ **uniquement** sur les macros.

---

## 4. Les modèles fournis limitent le rendu du véhicule

- **RS6** : textures cuites (la peinture, les emblèmes et les reflets sont peints dans l'image), 25 matériaux, aucune
  carte de vernis séparée. À moins de deux mètres, on voit la texture, pas de la laque. J'ai dû assombrir la
  carrosserie au shader pour qu'elle tienne la nuit.
- **C-HR** : **un seul matériau pour toute la caisse**. Impossible d'en isoler l'emblème ni la plaque (elle reste
  visible, blanche), ni de traiter le vitrage à part.
- Ce qu'il faudrait : des modèles à matériaux séparés (carrosserie / vitrage / optiques / jantes / plaque), ou une
  vraie peinture PBR (couche de base + vernis). Sinon, on plafonne.

---

## 5. Aucun son

Un film sans son n'existe pas. Un souffle de nuit, un passage de lumière, un claquement à la fermeture : trois sons
suffiraient à doubler la valeur perçue. Contrainte technique : les navigateurs interdisent le son avant un geste — il
faut donc un bouton « son » discret. **Il me faut votre accord** (et deux ou trois sons libres de droits).

---

## 6. Aucune ombre portée

Le monde n'a pas de carte d'ombres : rien ne projette d'ombre sur rien. Le véhicule a une empreinte sombre
**simulée** sous lui (sinon il flotterait). Des ombres réelles (véhicule sur le sol, rochers entre eux) ancreraient
tout — coût : une passe d'ombre et un peu de mémoire.

---

## 7. Il n'y a aucune image réelle de l'entreprise

La démonstration entière est en 3D. La « preuve » avant/après est un modèle, pas un chantier de CAR SERVICE 06. Pour
un site qui doit vendre, une seule vraie séquence d'un vrai véhicule traité par vous vaut plus que n'importe quel
rendu. Ce qu'il faudrait : 4 à 6 photos ou une courte vidéo verticale, tournées avec un minimum de soin (nuit ou
lumière douce, voiture mouillée).

---

## 8. Ce que je ne peux pas vérifier moi-même

- Les crochets de contrôle (`window.__experience`) n'existent **qu'en développement** : je mesure donc en local, et la
  production peut différer légèrement.
- Je pilote des défilements **synthétiques** : je ne sens pas l'inertie réelle d'un pouce sur votre téléphone. Depuis
  aujourd'hui j'enregistre une **vidéo** du parcours (`npm run qa:video`) — c'est le seul contrôle qui montre le
  mouvement — mais un essai sur votre appareil reste irremplaçable.
- Aucun accès aux services connectés (Figma, GitHub API, etc.) dans cette session : ils demandent une autorisation de
  votre part.

---

## 9. Budget d'image au téléphone

Mesuré (`npm run qa:perf`, 390 × 844 à DPR 2) : **16,7 ms — 60 i/s — sur 20 unités sur 24**, et 19 à 24 ms sur trois
macros où le véhicule remplit l'écran. Il reste donc de la marge pour le post-traitement, mais pas pour tout : chaque
ajout (ombres, post, son) se paie. L'ordre de dépense que je propose : **post-traitement > relief réel > ombres**.

---

## Ce que je propose, dans l'ordre

1. **Relief réel des Alpes-Maritimes** (option 1-B) : on vole au-dessus du vrai territoire sous votre ciel.
2. **Défilement virtuel** (option 2-B) : le tempo cesse d'appartenir au doigt, chaque unité tient sa durée.
3. **Post-traitement** (point 3) : bloom, vignettage, grain — la couche pellicule.
4. Ombres portées, puis son (avec votre accord), puis vos vraies images.

Dites-moi lesquels vous voulez et dans quel ordre : les trois premiers se font dans la journée.
