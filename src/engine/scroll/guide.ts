import type { Timeline } from '../timeline/timeline';

/**
 * Pas guidés (repris de MECA RIVIERA, `motion/guide.ts`, validé au doigt et à la molette) : un geste, un plan.
 * - Tactile : points d'accroche natifs (`scroll-snap-type: y mandatory`, `scroll-snap-stop: always`) posés sur chaque
 *   repos de l'expérience — un élan ne traverse jamais plusieurs plans ; le défilement reste natif.
 * - Molette, pavé tactile, clavier : un cran (ou un geste, élan compris) mène au point suivant dans le sens du geste.
 * - Liens internes : trajet direct, sans pas intermédiaires ; l'adresse ne prend pas d'ancre (un rechargement ramène
 *   toujours au début du récit).
 * - Au-delà du dernier point (pied de page), défilement libre.
 * La caméra rejoint chaque point avec l'amorti ou le ressort du moteur : la lecture se fait à l'arrêt.
 */
export interface GuideOptions {
  track: HTMLElement;
  timeline: Timeline;
  rests: () => readonly number[];
  /** Pendant l'entrée : aucun pas. */
  locked?: () => boolean;
  /**
   * Défilement des pas et des liens. `instant` : la page saute, le moteur seul anime la progression (glissade du
   * suivi) — un seul mouvement maîtrisé par geste, sans double lissage navigateur + moteur.
   */
  scrollBehavior?: () => ScrollBehavior;
}

export function createGuide({ track, timeline, rests, locked = () => false, scrollBehavior }: GuideOptions) {
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let points: number[] = [];
  let elements: HTMLElement[] = [];
  let end = Infinity;
  let pad = 0;
  let navigating = false;
  let settleTimer = 0;
  let stepLock = 0;
  let wheelSum = 0;

  const update = () => {
    html.classList.toggle('is-guided', !navigating && window.scrollY < end - 2);
  };

  const place = () => {
    pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
    const ys = [...new Set(rests().map((p) => Math.round(timeline.scrollFor(p))))].sort((a, b) => a - b);
    points = ys;
    end = timeline.scrollFor(1) + 2;
    for (const el of elements) el.remove();
    elements = ys.map((y) => {
      const el = document.createElement('i');
      el.className = 'guide-point';
      el.setAttribute('aria-hidden', 'true');
      el.style.top = `${y + pad - timeline.top}px`;
      track.append(el);
      return el;
    });
    update();
  };

  const behavior = (): ScrollBehavior => scrollBehavior?.() ?? (reduced.matches ? 'auto' : 'smooth');

  const stepTo = (dir: number) => {
    const y = window.scrollY;
    const stops = [...points, end];
    const next = dir > 0 ? stops.find((s) => s > y + 2) : stops.filter((s) => s < y - 2).pop();
    if (next === undefined) return false;
    window.scrollTo({ top: next, behavior: behavior() });
    return true;
  };

  const active = (dir: number) => {
    if (navigating || locked() || !points.length) return false;
    const y = window.scrollY;
    return dir > 0 ? y < end - 2 : y <= end + 2;
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    const dir = Math.sign(event.deltaY);
    if (!dir || !active(dir)) return;
    event.preventDefault();
    const now = performance.now();
    // Les crans qui suivent (élan du pavé, molette qui tourne encore) appartiennent au même geste.
    // Essayé et ÉCARTÉ : prolonger le verrou à 450 ms pour absorber une molette tournée longtemps. Mesuré, le
    // résultat allait dans le mauvais sens (trois unités au lieu de deux) et variait d'un essai à l'autre — ce
    // réglage-là n'est pas la bonne prise. Un geste délibéré vaut une unité, c'est vérifié sur les trente.
    if (now < stepLock) {
      stepLock = Math.max(stepLock, now + 200);
      return;
    }
    wheelSum += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    if (Math.abs(wheelSum) < 20) return;
    wheelSum = 0;
    if (stepTo(dir)) stepLock = now + 700;
  };

  const KEYS: Record<string, number> = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };
  const onKey = (event: KeyboardEvent) => {
    let dir = KEYS[event.key];
    if (!dir || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    if (event.key === ' ' && event.shiftKey) dir = -1;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === ' ' && target?.closest('button, summary, a')) return;
    if (!active(dir)) return;
    event.preventDefault();
    const now = performance.now();
    if (now < stepLock) return;
    if (stepTo(dir)) stepLock = now + 450;
  };

  const settle = () => {
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      navigating = false;
      update();
    }, 220);
  };

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
    const id = link?.hash.slice(1);
    const target = id ? document.getElementById(decodeURIComponent(id)) : null;
    if (!link || !target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - pad;
    // Section à pas : jusqu'à son premier palier, s'il est à portée.
    const first = points.find((y) => y >= top - 1 && y <= top + window.innerHeight * 2.5);
    navigating = true;
    update();
    window.scrollTo({ top: Math.max(0, first ?? top), behavior: behavior() });
    settle();
  };

  const onScroll = () => {
    if (navigating) settle();
    update();
  };
  /**
   * AU DOIGT : UN GESTE, UN PLAN — QUELLE QUE SOIT LA FORCE.
   *
   * C'était le défaut de fond, et il ne se voyait pas à la molette : il n'existait AUCUN pas guidé pour le tactile.
   * Le doigt était laissé au défilement natif, et donc à l'INERTIE du navigateur : un geste vif lançait la page sur
   * plusieurs centaines de pixels après le relâchement, traversant trois ou quatre cinématiques. L'accroche CSS ne
   * pouvait rien : `proximity` n'attire que de près, et `scroll-snap-stop` n'est honoré ni partout ni toujours
   * pendant une lancée.
   *
   * La seule réponse sûre est de ne PAS laisser le navigateur défiler : `touch-action: pinch-zoom` (styles) coupe le
   * panoramique vertical — donc l'inertie — et on lit le geste nous-mêmes. Au relâchement, un pas, un seul, dans le
   * sens du geste. La VITESSE ET L'AMPLITUDE N'ENTRENT PAS DANS LE CALCUL : c'est exactement ce qui est demandé.
   * Le pincement reste possible, et tout ce qui est interactif (champ, lien, bouton, bande de dates) garde la main.
   */
  const SEUIL_DOIGT = 26;
  let touchY: number | null = null;
  /**
   * UN BALAYAGE N'EST PAS UN CLIC.
   *
   * Depuis qu'on coupe le panoramique natif (`touch-action`), plus aucun défilement du navigateur ne vient annuler
   * le clic à la fin d'un geste : un balayage parti sur un lien l'ACTIVE. C'est ce qui renvoyait brutalement en
   * arrière au milieu du récit — le logo du bandeau fixe est un lien, il occupe le haut de l'écran, et le pouce
   * passe dessus. Mesuré : neuf mille cinq cents pixels en arrière d'un seul geste.
   * On note donc l'instant du dernier balayage et on avale le clic qui le suit. Une tape, elle, ne franchit jamais
   * le seuil : les liens, les onglets et les champs répondent exactement comme avant.
   */
  let balayageA = -1;
  /**
   * CE QUI GARDE LA MAIN SUR LE GESTE : seulement ce qui défile TOUT SEUL dans une autre direction (la bande de
   * dates du rendez-vous). Rien d'autre.
   * Première version : on rendait la main dès que le geste partait d'un lien, d'un champ ou d'un bouton. Mauvais
   * réflexe — sur l'écran de rendez-vous le formulaire occupe TOUT le cadre, donc plus aucun balayage n'avançait et
   * on restait bloqué à l'avant-dernier plan. Un BALAYAGE n'est pas une TAPE : le seuil de vingt-six pixels les
   * sépare déjà, et les champs comme les boutons continuent de répondre au doigt posé.
   */
  const gereSonGeste = (target: EventTarget | null) => Boolean((target as Element | null)?.closest?.('.rdv__days'));

  const onTouch = (event: TouchEvent) => {
    if (navigating) {
      navigating = false;
      update();
    }
    touchY = event.touches.length === 1 && !gereSonGeste(event.target) ? (event.touches[0]?.clientY ?? null) : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const depart = touchY;
    touchY = null;
    // Un doigt restant (pincement en cours) : ce n'est pas un geste de défilement.
    if (depart === null || event.touches.length > 0) return;
    const fin = event.changedTouches[0]?.clientY;
    if (fin === undefined) return;
    const delta = depart - fin;
    // Sous le seuil, c'est une tape ou un tremblement : on ne bouge pas.
    if (Math.abs(delta) < SEUIL_DOIGT) return;
    balayageA = performance.now();
    const dir = Math.sign(delta);
    if (!active(dir)) return;
    stepTo(dir);
  };
  /** Avale le clic né d'un balayage. En capture : avant tout autre écouteur, et avant le navigateur. */
  const onClickCapture = (event: MouseEvent) => {
    if (performance.now() - balayageA > 500) return;
    balayageA = -1;
    event.preventDefault();
    event.stopPropagation();
  };

  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('touchstart', onTouch, { passive: true });
  addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('click', onClick);
  const unmeasure = timeline.onMeasure(place);
  place();

  return {
    get points() {
      return points as readonly number[];
    },
    refresh: place,
    dispose() {
      removeEventListener('wheel', onWheel);
      removeEventListener('keydown', onKey);
      removeEventListener('scroll', onScroll);
      removeEventListener('touchstart', onTouch);
      removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('click', onClick);
      unmeasure();
      for (const el of elements) el.remove();
      html.classList.remove('is-guided');
    },
  };
}
