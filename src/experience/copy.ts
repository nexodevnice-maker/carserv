/**
 * Textes de narration (ce que montrent les images, ce que fait le récit). Les faits commerciaux — prestations, prix,
 * zone, conditions, canaux — ne sont jamais écrits ici : ils viennent de src/domain avec leur statut.
 */
export const copy = {
  scroll: 'Faites défiler',
  hero: { script: 'Un véhicule propre, c’est un plaisir au quotidien !' },
  zone: { index: '01', title: 'Dans tout le 06', sea: 'Mer Méditerranée' },
  avant: {
    index: '02',
    title: 'Avant',
    text: 'Poussière sur la laque, reflets éteints, chromes ternis. L’état dans lequel on prend un véhicule.',
  },
  passage: { index: '03', title: 'Le passage', after: 'Derrière la ligne : plus une trace.' },
  apres: {
    index: '04',
    title: 'Après',
    reflets: 'La laque reprend le ciel : c’est à ça qu’on voit un nettoyage fini.',
    interieur: 'Et dedans : sièges, tableau de bord, plastiques, vitres.',
  },
  prestations: { index: '05', title: 'Prestations', offer: 'La formule', script: 'À votre service dans tout le 06 !' },
  univers: {
    title: 'Vers la location',
    text: 'Ciel de nuit en image de synthèse 360° (HDRI) : on monte à travers les nuages jusqu’à la Voie lactée, puis on redescend face à elle jusqu’à la route.',
  },
  arrivee: 'Ciel de nuit en image de synthèse 360° (HDRI) : la Voie lactée au-dessus d’une mer de nuages ; en dessous, le contour des Alpes-Maritimes.',
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
