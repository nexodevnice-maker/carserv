/**
 * Textes de narration (ce que montrent les images, ce que fait le récit). Les faits commerciaux — prestations, prix,
 * zone, conditions, canaux — ne sont jamais écrits ici : ils viennent de src/domain avec leur statut.
 */
export const copy = {
  scroll: 'Faites défiler',
  hero: { script: 'Un véhicule propre, c’est un plaisir au quotidien !' },
  /** Unité 1 : on ne nomme pas ce qu'on regarde. Une annotation, pas un titre. */
  matiere: {
    note: 'Regardez de près.',
    alt: 'Très gros plan sur la carrosserie noire et vernie d’un véhicule, la nuit : la Voie lactée s’y reflète.',
  },
  /** Unité 4 et 5 : aucun texte à l'écran, seulement pour qui ne voit pas la scène. */
  ciel: {
    title: 'Le ciel de la Côte d’Azur',
    text: 'On quitte la carrosserie par son reflet : la caméra s’élève, traverse une mer de nuages et se retrouve face au cœur de la Voie lactée — le ciel de nuit réel (image 360° HDRI).',
  },
  zone: { index: '01', title: 'Dans tout le 06', sea: 'Mer Méditerranée' },
  avant: {
    index: '02',
    title: 'Avant',
    text: 'La même laque, éteinte par la poussière : elle ne renvoie plus rien. C’est l’état dans lequel on prend un véhicule.',
  },
  passage: { index: '03', title: 'Le passage', after: 'Derrière la ligne : plus une trace.' },
  apres: {
    index: '04',
    title: 'Après',
    reflets: 'La laque reprend le ciel. C’est exactement l’image du début — sauf qu’on sait maintenant ce qu’il a fallu pour l’obtenir.',
    interieur: 'Et dedans : sièges, tableau de bord, plastiques, vitres.',
  },
  prestations: { index: '05', title: 'Prestations', offer: 'La formule', script: 'À votre service dans tout le 06 !' },
  bascule: { index: '06', title: 'Une autre route', text: 'CAR SERVICE 06 propose aussi un véhicule à la location.' },
  location: { index: '07', terms: 'Conditions' },
  rendezvous: {
    index: '08',
    title: 'Prendre rendez-vous',
    text: 'Choisissez une date et un créneau : votre demande part par courriel, tout est déjà rempli.',
    date: 'Date souhaitée',
    slot: 'Créneau souhaité',
    send: 'Envoyer la demande',
    note: 'Demande sans engagement. Disponibilités confirmées par l’entreprise.',
    fallback: 'Pas de messagerie sur cet appareil ?',
  },
  contact: { index: '09', title: 'Réserver ou demander un nettoyage', channel: 'Écrire sur Instagram' },
  /** Ce que montre la scène 3D, pour qui ne la voit pas. */
  scene:
    'Modèle 3D d’un véhicule posé dans la nuit : d’abord couvert de poussière, puis parcouru par une ligne de lumière qui le laisse propre et verni, reflets rendus à la carrosserie ; enfin son habitacle, vu de la place du conducteur.',
};
