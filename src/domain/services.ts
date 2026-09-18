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

/**
 * LES FORMULES DE LA GRILLE TARIFAIRE (tools/flyers/PRICE.png, transmise par le porteur le 18/09/2026).
 * Quatre paliers, du plus simple au plus complet. L'ordre est celui de la grille : il dit la montée en gamme, et
 * c'est lui que la section reprend.
 *
 * Une seule mention accompagne obligatoirement les prix : « Les prix varient selon la taille du véhicule ». Elle est
 * dans la grille, elle est donc affichée partout où un prix l'est — un prix sans sa condition serait un prix inventé.
 */
export interface CleaningPack {
  id: string;
  name: Fact<string>;
  price: Fact<{ amount: number; currency: 'EUR' }>;
  lines: Fact<readonly string[]>;
  /** Le palier mis en avant : celui qui couvre intérieur ET extérieur. */
  highlight?: boolean;
}

export const cleaningPacks: readonly CleaningPack[] = [
  {
    id: 'basic',
    name: fact('Pack Basic', 'CONFIRMED', 'price-list'),
    price: fact({ amount: 40, currency: 'EUR' }, 'CONFIRMED', 'price-list'),
    lines: fact(
      ['Nettoyage intérieur', 'Aspiration habitacle', 'Nettoyage plastique', 'Passage de portes', 'Coffre · vitres'],
      'CONFIRMED',
      'price-list',
    ),
  },
  {
    id: 'standard',
    name: fact('Pack Standard', 'CONFIRMED', 'price-list'),
    price: fact({ amount: 75, currency: 'EUR' }, 'CONFIRMED', 'price-list'),
    lines: fact(
      ['Nettoyage intérieur', 'Shampoing des sièges', 'Aspiration habitacle', 'Nettoyage plastique', 'Passage de portes', 'Coffre · vitres'],
      'CONFIRMED',
      'price-list',
    ),
  },
  {
    id: 'full-interieur',
    name: fact('Pack Full Intérieur', 'CONFIRMED', 'price-list'),
    price: fact({ amount: 90, currency: 'EUR' }, 'CONFIRMED', 'price-list'),
    lines: fact(
      ['Nettoyage intérieur', 'Shampoing des sièges', 'Aspiration habitacle', 'Shampoing moquette', 'Passage de portes', 'Coffre · vitres'],
      'CONFIRMED',
      'price-list',
    ),
  },
  {
    id: 'concession',
    name: fact('Pack Concession', 'CONFIRMED', 'price-list'),
    price: fact({ amount: 110, currency: 'EUR' }, 'CONFIRMED', 'price-list'),
    lines: fact(
      [
        'Nettoyage intérieur / extérieur',
        'Shampoing des sièges',
        'Shampoing des tapis / moquette',
        'Plastique',
        'Passage de portes',
        'Coffre · vitres',
      ],
      'CONFIRMED',
      'price-list',
    ),
    highlight: true,
  },
];

/** La condition qui accompagne TOUS les prix. Elle est dans la grille : elle ne se détache jamais d'eux. */
export const priceCondition = fact('Les prix varient selon la taille du véhicule', 'CONFIRMED', 'price-list');

/** L'argument technique de la grille : l'intervention ne demande rien au client. */
export const autonomy = fact('100 % autonome en eau et en électricité', 'CONFIRMED', 'price-list');

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
