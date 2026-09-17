/**
 * Mouvement réduit, suivi en direct (le réglage système peut changer page ouverte).
 * Politique du moteur (experience.ts) : aucune interpolation — la progression affichée se pose sur le repos le plus
 * proche (plan caméra, palier de chapitre) ; les médias montrent des images fixes ; toute l'information reste présente.
 * `?motion=reduce|full` force la préférence (QA).
 */
export function watchReducedMotion(onChange: (reduced: boolean) => void) {
  const query = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = new URLSearchParams(location.search).get('motion');
  const read = () => (forced === 'reduce' ? true : forced === 'full' ? false : query.matches);
  let reduced = read();
  const listener = () => {
    const next = read();
    if (next === reduced) return;
    reduced = next;
    onChange(next);
  };
  query.addEventListener('change', listener);
  document.documentElement.classList.toggle('is-reduced-motion', reduced);
  return {
    get reduced() {
      return reduced;
    },
    dispose() {
      query.removeEventListener('change', listener);
    },
  };
}
