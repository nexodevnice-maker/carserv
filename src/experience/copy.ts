/**
 * Textes de narration (ce que montrent les images, ce que fait le récit). Les faits commerciaux — prestations, prix,
 * zone, conditions, canaux — ne sont jamais écrits ici : ils viennent de src/domain avec leur statut.
 */
export const copy = {
  scroll: 'Faites défiler',
  avant: {
    index: '01',
    title: 'Avant',
    text: 'Poussière sur la carrosserie, reflets éteints. Un vrai véhicule, filmé avant le nettoyage.',
  },
  passage: { index: '02', title: 'Le passage', after: 'Même véhicule. Même capot.' },
  apres: { index: '03', title: 'Après', reflets: 'Le flanc, les jantes, le marchepied : les reflets reviennent.' },
  prestations: { index: '04', title: 'Prestations', offer: 'Formule' },
  zone: { index: '05', title: 'Dans tout le 06', sea: 'Mer Méditerranée' },
  univers: {
    title: 'Passage',
    text: 'Ciel de nuit en image de synthèse 360° (HDRI) : la Voie lactée au-dessus des collines, qui s’ouvre puis se referme.',
  },
  bascule: { index: '06', title: 'Une autre route', text: 'CAR SERVICE 06 propose aussi un véhicule à la location.' },
  location: { index: '07', terms: 'Conditions' },
  contact: { index: '08', title: 'Réserver ou demander un nettoyage', channel: 'Écrire sur Instagram' },
  video: 'Vidéo : un SUV gris foncé couvert de poussière, puis le même véhicule nettoyé dont le capot et le flanc reflètent les arbres.',
};
