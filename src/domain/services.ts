import { fact, type Fact } from './facts';

/**
 * Univers 1 — nettoyage automobile premium (flyer MAIN).
 * Les prestations sont des données : en ajouter une n'exige aucune modification du moteur ni des scènes.
 */
export interface CleaningService {
  id: string;
  /** Surface du véhicule concernée : relie la prestation aux preuves (plans vidéo) et aux plans caméra. */
  surface: 'interior' | 'exterior' | 'finish' | 'products';
  title: Fact<string>;
  details: Fact<readonly string[]>;
}

export const cleaningServices: readonly CleaningService[] = [
  {
    id: 'interieur',
    surface: 'interior',
    title: fact('Nettoyage intérieur', 'CONFIRMED', 'flyer-main'),
    details: fact(['Sièges', 'Tapis', 'Plastiques', 'Aspiration'], 'CONFIRMED', 'flyer-main'),
  },
  {
    id: 'exterieur',
    surface: 'exterior',
    title: fact('Lavage extérieur', 'CONFIRMED', 'flyer-main'),
    details: fact(['Mousse active', 'Séchage soin'], 'CONFIRMED', 'flyer-main'),
  },
  {
    id: 'finition',
    surface: 'finish',
    title: fact('Finition premium', 'CONFIRMED', 'flyer-main'),
    details: fact(['Brillance longue durée'], 'CONFIRMED', 'flyer-main', 'Aucune durée chiffrée : ne jamais en donner.'),
  },
  {
    id: 'produits',
    surface: 'products',
    title: fact('Produits professionnels', 'CONFIRMED', 'flyer-main'),
    details: fact(['Respect de votre véhicule', 'Respect de l’environnement'], 'CONFIRMED', 'flyer-main', 'Aucune certification ni label : ne jamais en afficher.'),
  },
];

export interface CleaningOffer {
  id: string;
  label: Fact<string>;
  price: Fact<{ amount: number; currency: 'EUR' }>;
  includes: readonly string[];
}

export const cleaningOffers: readonly CleaningOffer[] = [
  {
    id: 'interieur-exterieur',
    label: fact('Intérieur + extérieur', 'CONFIRMED', 'flyer-main'),
    price: fact(
      { amount: 50, currency: 'EUR' },
      'TO_CONFIRM',
      'flyer-main',
      '« 50€ » en grand sous « Intérieur + Extérieur » ; portée exacte (formule, taille du véhicule, déplacement inclus) et actualité à confirmer. Absent de BUSINESS_TRUTH.md.',
    ),
    includes: ['interieur', 'exterieur'],
  },
];
