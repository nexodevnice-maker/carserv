import { fact } from './facts';

/**
 * Identité de l'entreprise (la « propriété » du site) : marque, promesse, zone, canaux.
 * Tout vient des deux flyers ; rien n'est ajouté.
 */
export const property = {
  name: fact('CAR SERVICE 06', 'CONFIRMED', 'flyer-main', 'Écrit « CAR SERVICE06 » sur les deux flyers.'),
  /** Les deux flyers ne portent pas le même sous-titre. */
  descriptors: {
    cleaning: fact('Nettoyage auto premium', 'CONFIRMED', 'flyer-main'),
    rental: fact('Nettoyage auto professionnel', 'CONFIRMED', 'flyer-loc', 'Sous-titre du flyer location.'),
  },
  taglines: [
    fact('Votre voiture mérite le meilleur !', 'CONFIRMED', 'flyer-main'),
    fact('Un véhicule propre, c’est un plaisir au quotidien !', 'CONFIRMED', 'flyer-main'),
  ],
  coverage: fact(
    'Déplacement dans tout le 06',
    'CONFIRMED',
    'flyer-main',
    'Aussi « À votre service dans tout le 06 ! ». Communes précises : UNKNOWN — ne jamais en citer.',
  ),
  servicePromise: fact('À votre service dans tout le 06 !', 'CONFIRMED', 'flyer-main'),
  /** Le nettoyage se fait chez le client (déplacement) ; aucun local n'est indiqué. */
  mobileService: fact(true, 'CONFIRMED', 'flyer-main', 'Pictogramme utilitaire + « Déplacement ». Adresse d’un local : UNKNOWN.'),
  channels: {
    instagram: fact('car_service06', 'CONFIRMED', 'flyer-loc'),
    snapchat: fact('Car-service06', 'TO_CONFIRM', 'flyer-main', 'Nom de compte visible dans l’interface Snapchat ; identifiant exact à confirmer.'),
    facebook: fact(null as string | null, 'UNKNOWN', 'flyer-main', 'Icône Facebook présente, sans identifiant.'),
    phone: fact(null as string | null, 'UNKNOWN', 'none'),
    whatsapp: fact('07 46 56 49 15', 'CONFIRMED', 'price-list', 'Écrit « WhatsApp 0746564915 » sur la grille tarifaire.'),
    email: fact(null as string | null, 'UNKNOWN', 'none'),
  },
  /** L'adresse apparaît sur la grille tarifaire. Elle ne contredit pas le déplacement : c'est le point de rattachement. */
  address: fact('62 boulevard Paul Montel, 06200 Nice', 'CONFIRMED', 'price-list', 'Écrit « 62 boulevard Paul montel 06200 ». Ville déduite du code postal.'),
  payment: fact(['Espèces', 'Carte bancaire'] as readonly string[], 'CONFIRMED', 'price-list'),
  legal: fact(null as string | null, 'UNKNOWN', 'none', 'Forme juridique et SIREN : à fournir avant publication.'),
  hours: fact(null as string | null, 'UNKNOWN', 'none', '« Disponible 7J/7 » concerne la location (flyer LOC), pas le nettoyage.'),
};
