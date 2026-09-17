import { fact, type Fact } from './facts';

/**
 * Univers 2 — location de véhicule (flyer LOC).
 * Flotte et tarifs sont des listes : un deuxième véhicule ou une nouvelle durée s'ajoutent ici, sans toucher au moteur.
 * La marque et le modèle désignent le véhicule loué, jamais un partenariat (aucune affiliation constructeur).
 */
export interface RentalRate {
  days: number;
  price: Fact<{ amount: number; currency: 'EUR' }>;
  /** Libellé du flyer. */
  label: string;
}

export interface RentalVehicle {
  id: string;
  model: Fact<string>;
  energy: Fact<string>;
  rates: readonly RentalRate[];
  /** Photographies du véhicule réellement loué : aucune fournie (l'image du flyer est une composition, logo visible). */
  photos: Fact<readonly string[]>;
}

const loc = 'flyer-loc' as const;

export const rentalFleet: readonly RentalVehicle[] = [
  {
    id: 'toyota-c-hr',
    model: fact('Toyota C-HR', 'CONFIRMED', loc),
      energy: fact('Hybride', 'CONFIRMED', loc, '« Hybride économe ». Consommation chiffrée : UNKNOWN.'),
    rates: [
      { days: 1, label: '/jour', price: fact({ amount: 70, currency: 'EUR' }, 'CONFIRMED', loc) },
      { days: 7, label: '/7J', price: fact({ amount: 400, currency: 'EUR' }, 'CONFIRMED', loc) },
      { days: 15, label: '/15J', price: fact({ amount: 700, currency: 'EUR' }, 'CONFIRMED', loc) },
    ],
    photos: fact([], 'UNKNOWN', 'none', 'À fournir : photos du véhicule réel (extérieur, intérieur).'),
  },
];

/** Conditions affichées sur le flyer, communes à la flotte telle qu'elle est connue. */
export const rentalTerms = {
  /** Libellé exact du flyer LOC (« HYBRIDE ÉCONOME ») : aucune consommation chiffrée. */
  economy: fact('Hybride économe', 'CONFIRMED', loc),
  insurance: fact('Assurance comprise', 'CONFIRMED', loc, 'Nature et franchise : UNKNOWN.'),
  mileage: fact('Kilométrage illimité', 'CONFIRMED', loc),
  comfort: fact('Confort & sécurité', 'CONFIRMED', loc),
  availability: fact('Disponible 7J/7', 'CONFIRMED', loc),
  deposit: fact(null as string | null, 'UNKNOWN', 'none', 'Caution, âge minimal, permis, livraison : à fournir.'),
  booking: fact(null as string | null, 'UNKNOWN', 'none', 'Procédure de réservation : à fournir (canal connu : Instagram).'),
};
