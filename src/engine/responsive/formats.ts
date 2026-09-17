/**
 * Trois formats, trois compositions — le mobile n'est pas un bureau réduit.
 * Source unique : la feuille `styles/formats.css` pose `--format` sur :root par media queries. Le moteur la lit au
 * redimensionnement (jamais par image) : CSS et JS ne peuvent pas diverger, et la mise en page sans script suit les
 * mêmes seuils.
 */
export type Format = 'desktop' | 'tablet' | 'mobile';
export const FORMATS: readonly Format[] = ['desktop', 'tablet', 'mobile'];

/** Valeur qui peut changer selon le format. La tablette et le mobile héritent du bureau quand ils ne précisent rien. */
export type Responsive<T> = T | { desktop: T; tablet?: T; mobile?: T };

const isVariants = <T>(value: Responsive<T>): value is { desktop: T; tablet?: T; mobile?: T } =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && 'desktop' in value;

export function pick<T>(value: Responsive<T>, format: Format): T {
  if (!isVariants(value)) return value;
  return (format === 'desktop' ? value.desktop : value[format]) ?? value.desktop;
}

/** Objet de base (bureau) complété par la surcharge partielle du format. */
export function merged<T extends object>(base: T, overrides: { tablet?: Partial<T>; mobile?: Partial<T> }, format: Format): T {
  if (format === 'desktop') return base;
  const extra = overrides[format];
  return extra ? { ...base, ...extra } : base;
}

export function readFormat(): Format {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--format').trim();
  return value === 'mobile' || value === 'tablet' ? value : 'desktop';
}

/** Suit le format courant ; `onChange` n'est appelé qu'au changement effectif. */
export function watchFormat(onChange: (format: Format) => void) {
  let current = readFormat();
  let frame = 0;
  const check = () => {
    frame = 0;
    const next = readFormat();
    if (next === current) return;
    current = next;
    onChange(next);
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(check);
  };
  addEventListener('resize', schedule);
  return {
    get current() {
      return current;
    },
    dispose() {
      removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    },
  };
}
