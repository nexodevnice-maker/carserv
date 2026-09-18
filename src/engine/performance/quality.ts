/**
 * Définition adaptative (repris tel quel de MECA RIVIERA, `3d/quality.ts` — validé sur téléphone bridé à 30 i/s et
 * processeur ÷4) : la fluidité d'abord, sans jamais sacrifier la netteté pour rien.
 * - Un cran de moins seulement quand les images ratent durablement le rythme de l'écran — jamais parce que l'écran est
 *   bridé (mode économie d'énergie : 30 images par seconde régulières ne sont pas une surcharge). Rythme de l'écran :
 *   le plus court intervalle récent entre deux images.
 * - Plancher : le dernier cran de `steps`.
 * - Un cran de plus dès que l'aisance revient, sans va-et-vient : une remontée aussitôt démentie double le délai
 *   avant la suivante.
 */
export function createQuality(steps: readonly number[], onChange: () => void) {
  let level = 0;
  const gaps = new Float32Array(90);
  let gapAt = 0;
  const slow = new Uint8Array(120);
  let slowAt = 0;
  let since = 0;
  let changedAt = 0;
  let raisedAt = -Infinity;
  let wait = 6000;

  const change = (next: number, now: number) => {
    if (next > level && now - raisedAt < 10000) wait = Math.min(wait * 2, 60000);
    if (next < level) raisedAt = now;
    level = next;
    since = 0;
    slow.fill(0);
    changedAt = now;
    onChange();
  };

  return {
    /** Rapport de pixels du cran actuel. */
    get ratio() {
      return steps[level] ?? 1;
    },
    get level() {
      return level;
    },
    /** `dt` (s) depuis l'image précédente ; `drawn` : cette image a été rendue ; `now` : horloge (ms). */
    tick(dt: number, drawn: boolean, now: number) {
      // Un blocage (décodage d'image, envoi d'une texture au GPU, compilation) n'est pas un problème de rythme : il
      // arrive une fois et ne se reproduit pas. On ne le compte pas, ET on repart d'une fenêtre propre — sinon une
      // seule secousse fait retomber la définition pour tout le reste de la visite.
      if (dt > 0.12) {
        slow.fill(0);
        since = 0;
        return;
      }
      if (!(dt > 0 && dt < 0.25)) return;
      gaps[gapAt++ % gaps.length] = dt;
      if (!drawn) return;
      let screen = Infinity;
      for (const gap of gaps) if (gap > 0 && gap < screen) screen = gap;
      slow[slowAt++ % slow.length] = dt > Math.max(screen * 1.6, 0.025) ? 1 : 0;
      since++;
      if (raisedAt >= changedAt && now - raisedAt > 20000) wait = 6000;
      let recent = 0;
      for (let k = 1; k <= Math.min(20, since); k++) recent += slow[(slowAt - k + slow.length) % slow.length] ?? 0;
      if (since >= 20 && recent >= 12 && level < steps.length - 1 && now - changedAt > 1500) {
        change(level + 1, now);
        return;
      }
      if (level > 0 && since >= slow.length && now - changedAt > wait) {
        let total = 0;
        for (const s of slow) total += s;
        if (total <= 4) change(level - 1, now);
      }
    },
  };
}

export type Quality = ReturnType<typeof createQuality>;
