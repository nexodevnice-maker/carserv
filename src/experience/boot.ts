import { installQaHooks } from '../engine/debug/qa-hooks';
import { createExperience } from '../engine/experience';
import { createMediaRegistry } from '../engine/media/media-registry';
import { definition } from './chapters';
import { ENGINE, MEDIA_POLICY } from './config';
import { media } from './media';

/**
 * Démarrage de CAR SERVICE 06 sur la page d'accueil.
 * Socle : piste, état maître, registre média, écritures DOM et crochets de QA. Les scènes (vidéo, WebGL, typographie
 * spatiale) se branchent ici au vertical slice, chacune avec `experience.use(phase, …)` et `registry.bind(id, …)`.
 * Sans script, la page reste le document complet (chapitres, textes, affiches).
 */
export function boot() {
  const track = document.querySelector<HTMLElement>('[data-track]');
  if (!track) return null;
  document.documentElement.classList.add('has-experience');

  const experience = createExperience(definition, ENGINE, {
    track,
    viewport: track.querySelector<HTMLElement>('[data-stage]'),
  });
  const registry = createMediaRegistry(media, {
    capabilities: experience.capabilities,
    chapterIndex: (id) => experience.timeline.indexOf(id),
    policy: (format) => MEDIA_POLICY[format],
    wake: experience.invalidate,
  });
  experience.use('media', (state) => {
    registry.update(state.chapter.index, state.format);
  });

  installQaHooks(experience, { media: () => registry.snapshot() });

  const dispose = () => {
    registry.dispose();
    experience.dispose();
  };
  addEventListener('pagehide', (event) => {
    if (!event.persisted) dispose();
  });
  return { experience, registry, dispose };
}
