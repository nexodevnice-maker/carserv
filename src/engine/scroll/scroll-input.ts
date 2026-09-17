import { dampFactor } from '../math/scalar';

/**
 * Entrée unique : le défilement natif. Aucun détournement du toucher ni de la molette, aucune bibliothèque de
 * défilement : l'élan, l'accessibilité clavier, la recherche dans la page et l'ancrage des liens restent ceux du
 * navigateur.
 * L'événement `scroll` ne fait que réveiller la boucle ; la position est lue une fois par image (`sample`).
 *
 * Zoom au pincement (repris de MECA RIVIERA, `motion/guide.ts`) : tant que la page est agrandie, la position est tenue
 * — la scène ne bouge pas pendant qu'on se déplace dans l'image agrandie — puis rétablie exactement au retour à
 * l'échelle 1.
 */
export interface ScrollSample {
  y: number;
  /** px/s, lissée. */
  velocity: number;
  direction: -1 | 0 | 1;
  held: boolean;
}

export function createScrollInput(invalidate: () => void) {
  const sample: ScrollSample = { y: window.scrollY, velocity: 0, direction: 0, held: false };
  let previous = sample.y;
  let hold: number | null = null;

  const onScroll = () => invalidate();
  const onViewport = () => {
    const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
    if (zoomed && hold === null) hold = window.scrollY;
    else if (!zoomed && hold !== null) {
      const y = hold;
      hold = null;
      window.scrollTo({ top: y, behavior: 'instant' });
    }
    invalidate();
  };
  addEventListener('scroll', onScroll, { passive: true });
  window.visualViewport?.addEventListener('resize', onViewport);

  return {
    /** Lecture de l'image (phase `input`) : une seule lecture de `scrollY` par image. */
    read(dt: number): ScrollSample {
      const y = hold ?? window.scrollY;
      const instant = dt > 0 ? (y - previous) / dt : 0;
      sample.velocity += (instant - sample.velocity) * dampFactor(14, dt);
      if (Math.abs(sample.velocity) < 1) sample.velocity = 0;
      sample.direction = y > previous ? 1 : y < previous ? -1 : sample.direction;
      sample.y = y;
      sample.held = hold !== null;
      previous = y;
      return sample;
    },
    get current() {
      return sample;
    },
    dispose() {
      removeEventListener('scroll', onScroll);
      window.visualViewport?.removeEventListener('resize', onViewport);
    },
  };
}

export type ScrollInput = ReturnType<typeof createScrollInput>;
