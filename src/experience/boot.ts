import { installQaHooks } from '../engine/debug/qa-hooks';
import { createDomWriter } from '../engine/dom/dom-writer';
import { createExperience } from '../engine/experience';
import { createMediaRegistry } from '../engine/media/media-registry';
import { createGuide } from '../engine/scroll/guide';
import type { WebGLStage } from '../engine/webgl/webgl-stage';
import type { VehicleLayer } from '../scenes/vehicle/vehicle-layer';
import type { VehicleLightLayer } from '../scenes/vehicle/vehicle-light';
import { chapters, definition } from './chapters';
import { ENGINE, ENVIRONMENT, MEDIA_POLICY, STAGE } from './config';
import { copy } from './copy';
import { media } from './media';
import { ROAD_ASPHALT } from './config';
import map06 from './map-06.json';
import france from './map-france.json';
import { WORLD } from './world';

/**
 * Démarrage de CAR SERVICE 06.
 * Entrée (technique MECA RIVIERA) : l'écran d'entrée couvre la préparation de la première scène et se lève à la
 * première image WebGL (au plus tôt 1,2 s, au plus tard 4,5 s ; sans WebGL : sur l'affiche). Pendant l'entrée, la page
 * reste en haut et aucun pas n'est pris. Page restaurée ou rechargée : toujours au début, sur l'univers.
 * Puis : moteur (scroll → progression → état), pas guidés, registre média (les deux modèles 3D et l'environnement de
 * nuit, chargés à l'approche de leur chapitre), scène WebGL chargée en différé — un seul monde : l'univers (ciel et
 * sol mouillé), les nuages, la France et le 06 en volume, la balise, le véhicule de la démonstration, la route et le
 * véhicule de location —, repli statique à tout moment.
 */
export function boot() {
  const html = document.documentElement;
  const track = document.querySelector<HTMLElement>('[data-track]');
  const stageEl = track?.querySelector<HTMLElement>('[data-stage]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  if (!track || !stageEl || !canvas) return null;
  html.classList.add('has-experience');
  const posterMode = new URLSearchParams(location.search).has('poster');
  if (posterMode) html.classList.add('is-poster');

  const experience = createExperience(definition, ENGINE, { track, viewport: stageEl });
  const { state, timeline, capabilities } = experience;

  // — Les deux fichiers dont dépend la PREMIÈRE image : le modèle du véhicule et la nuit qui s'y reflète. Leur
  // téléchargement part maintenant, avant même le chargement de Three.js et la création de la scène. Sans cela, la
  // requête n'était émise qu'une seconde plus tard, rideau levé sur un cadre vide.
  const heavy = (url: string) =>
    capabilities.webgl2 && !capabilities.saveData
      ? fetch(url).then((response) => {
          if (!response.ok) throw new Error(`${response.status} ${url}`);
          return response.arrayBuffer();
        })
      : undefined;
  const galaxyFile = heavy('/models/galaxy.glb');
  const carFile = heavy('/models/rs6.glb');
  // Une erreur réseau ici n'est pas fatale : la couche retombe sur son propre chargement.
  galaxyFile?.catch(() => undefined);
  carFile?.catch(() => undefined);

  // — Entrée.
  const introStart = performance.now();
  let introDone = !html.classList.contains('is-intro');
  /**
   * LE RIDEAU D'ENTRÉE EST UNE POLITESSE, PAS UNE PRISON.
   * Il tenait la page à zéro tant que la scène n'était pas prête — jusqu'à 4,5 s — en RENVOYANT le défilement à 0 à
   * chaque tentative. Sur un téléphone lent, la scène met justement plus longtemps : le visiteur faisait défiler et
   * se retrouvait au début, encore et encore. C'était le pire défaut du site.
   * Désormais : le moindre geste (doigt, molette, touche, défilement) lève le rideau SUR-LE-CHAMP, et le rideau ne
   * touche plus jamais à la position de la page.
   */
  const lift = (immediate: boolean) => {
    if (introDone) return;
    const wait = immediate ? 0 : Math.max(0, 1200 - (performance.now() - introStart));
    window.setTimeout(() => {
      if (introDone) return;
      introDone = true;
      html.classList.remove('is-intro');
      for (const type of GESTURES) removeEventListener(type, onGesture);
      experience.invalidate();
    }, wait);
  };
  const GESTURES = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  const onGesture = () => lift(true);
  for (const type of GESTURES) addEventListener(type, onGesture, { passive: true });
  const liftIntro = () => lift(false);
  // Filet : si la scène n'arrive jamais, le rideau tombe seul. Deux secondes, pas quatre et demie.
  window.setTimeout(liftIntro, 2200);
  const setIntroProgress = (value: number) => html.style.setProperty('--intro', value.toFixed(3));
  setIntroProgress(0.08);

  const fallback = (reason: string) => {
    html.classList.add('is-static');
    console.warn('[experience] repli statique :', reason);
    liftIntro();
  };

  // — Pas guidés : un geste, un plan.
  const guide = posterMode
    ? null
    : createGuide({
        track,
        timeline,
        rests: experience.rests,
        locked: () => !introDone,
        // Au bureau, la glissade du moteur fait seule le mouvement ; au doigt, défilement natif.
        scrollBehavior: () => (ENGINE.follow[state.format].mode === 'glide' ? 'instant' : 'smooth'),
      });

  // — Médias : les modèles 3D et l'environnement de nuit sont les seuls téléchargements lourds. Ils appartiennent à
  // des couches de la scène : le registre décide QUAND, la couche sait COMMENT (`ensure`). Tant que la scène n'existe
  // pas (WebGL en préparation, ou repli statique), la demande attend sans bloquer le reste.
  const registry = createMediaRegistry(media, {
    capabilities,
    chapterIndex: (id) => timeline.indexOf(id),
    policy: (format) => MEDIA_POLICY[format],
    wake: experience.invalidate,
  });

  let galaxyLayer: { ensure(): Promise<void> } | null = null;
  let cleaningCar: VehicleLayer | null = null;
  let rentalCar: VehicleLayer | null = null;
  let vehicleLight: VehicleLightLayer | null = null;
  let sceneReady: () => void = () => undefined;
  const scene = new Promise<void>((resolve) => {
    sceneReady = resolve;
  });
  const bindLayer = (id: string, layer: () => { ensure(): Promise<void> } | null) =>
    registry.bind(id, {
      async load() {
        await scene;
        await layer()?.ensure();
      },
      // Un modèle chargé reste en mémoire : il est revu plus loin (prestations, location) et le libérer coûterait une
      // recompilation de shaders au pire moment.
      release() {},
    });
  bindLayer('galaxy', () => galaxyLayer);
  bindLayer('vehicle-cleaning', () => cleaningCar);
  bindLayer('vehicle-rental', () => rentalCar);

  // Jauge Avant / Après : deux variables CSS sur la vue épinglée, réécrites seulement si elles changent.
  const dom = createDomWriter();
  const universes = new Map(chapters.map((c) => [c.id, c.universe]));
  experience.use('dom', (s) => {
    dom.setVar(stageEl, '--clean', (s.channels.clean ?? 0).toFixed(4));
    dom.setVar(stageEl, '--gauge', (s.channels.gauge ?? 0).toFixed(3));
    dom.setData(html, 'universe', universes.get(s.chapter.id) ?? 'cleaning');
    // Le chapitre affiché (`data-chapter` reste réservé aux sections mesurées) : certaines parties de l'interface
    // s'effacent quand l'écran appartient à l'une d'elles (rendez-vous).
    dom.setData(html, 'scene', s.chapter.id);
  });

  experience.use('media', (s) => {
    registry.update(s.chapter.index, s.format);
  });

  // — Scène WebGL, en différé.
  let stage: WebGLStage | null = null;
  let stageStatus = 'pending';
  const startStage = () => {
    if (!capabilities.webgl2 || capabilities.saveData) {
      stageStatus = 'static';
      fallback(capabilities.saveData ? 'économie de données' : 'WebGL 2 indisponible');
      sceneReady();
      return;
    }
    setIntroProgress(0.3);
    Promise.all([
      import('../engine/webgl/webgl-stage'),
      import('../scenes/sky/sky-layer'),
      import('../scenes/place/place-layer'),
      import('../scenes/map/map-layer'),
      import('../scenes/surroundings/surroundings-layer'),
      import('../scenes/circuit/circuit-layer'),
      import('../scenes/skyline/skyline-layer'),
      import('../scenes/galaxy/galaxy-layer'),
      import('../scenes/clouds/cloud-layer'),
      import('../scenes/relief/relief-layer'),
      import('../scenes/vehicle/vehicle-layer'),
      import('../scenes/vehicle/vehicle-light'),
      import('../scenes/road/road-layer'),
    ])
      .then(
        async ([
          { createWebGLStage },
          { createSkyLayer },
          { createPlaceLayer },
          { createMapLayer },
          { createSurroundingsLayer },
          { createCircuitLayer },
          { createSkylineLayer },
          { createGalaxyLayer },
          { createCloudLayer },
          { createReliefLayer },
          { createVehicleLayer },
          { createVehicleLightLayer },
          { createRoadLayer },
        ]) => {
          setIntroProgress(0.55);
          const desktop = state.format === 'desktop';
          // L'univers (HDRI fourni), partout : 2048 px d'abord ; 4096 px ensuite sur grand écran.
          const sky = createSkyLayer({
            low: '/env/sky-2048.webp',
            high: desktop ? '/env/sky-4096.webp' : undefined,
            groundY: -WORLD.seaDepth,
            streakTaps: desktop ? 10 : 6,
          });
          // La place : l'endroit où le véhicule est garé. Un vrai lieu de nuit (enrobé mouillé, places peintes,
          // candélabres) plutôt qu'un objet posé sur un sol abstrait.
          const place = createPlaceLayer({ night: sky.uniforms, ...WORLD.place, asphalt: ROAD_ASPHALT });
          // Le DEHORS de la place. Sans lui, on arrive sur une dalle éclairée posée dans du noir : le lieu n'a pas
          // d'extérieur, donc il n'existe pas.
          const around = createSurroundingsLayer({
            night: sky.uniforms,
            ...WORLD.around,
            chapters: ['ville', 'arrivee', 'intervention', 'transformation', 'prestations', 'tarifs', 'bascule'],
          });
          // LE 06 : le territoire qu'on traverse avant de se poser. Son plateau est le sol du monde, ses falaises
          // tombent sur la mer de nuit. Aucune carte de France autour : le canal `franceLight` n'existe pas, donc
          // le pays reste éteint — c'est le département qu'on veut, pas une infographie.
          const territory = createMapLayer(
            {
              data: map06,
              france,
              anchor: WORLD.map.anchor,
              scale: WORLD.map.scale,
              depth: WORLD.map.depth,
              bevel: WORLD.map.bevel,
              labels: { number: '06', numberAt: WORLD.map.numberAt, sea: copy.zone.sea, seaAt: WORLD.map.seaAt },
              font: '"Barlow Condensed", "Arial Narrow", sans-serif',
              chapters: ['galaxie', 'descente', 'ville', 'arrivee'],
              reflection: desktop,
            },
            sky.uniforms,
          );
          // L'univers : le nuage de points fourni. C'est LUI qu'on traverse — une image 360° ne peut pas l'être.
          const galaxy = createGalaxyLayer({ url: '/models/galaxy.glb', buffer: galaxyFile, ...WORLD.galaxy });
          // Le relief : ce qui donne un CORPS au lieu photographié. Sans lui, la caméra peut voler des kilomètres
          // sans que rien ne bouge derrière — une image 360° n'a pas de profondeur.
          const relief = createReliefLayer({ night: sky.uniforms, ...WORLD.relief });
          // Le véhicule de la démonstration : sali, scanné, verni, visité de l'intérieur. Il ne quitte jamais sa place.
          cleaningCar = createVehicleLayer({
            ...WORLD.vehicles.cleaning,
            url: '/models/rs6.glb',
            buffer: carFile,
            channels: { dirt: 'dirt', scan: 'scan', polish: 'polish', light: 'carLight', beam: 'headlight', cabin: 'cabin' },
            tint: { match: /Coloured|Paint/i, color: [0.035, 0.037, 0.046] },
            noise: sky.uniforms.uNoise.value,
            // Les chapitres où la couche est active. 'ville', 'arrivee' et 'tarifs' manquaient : le véhicule
            // disparaissait pendant qu'on lisait la grille tarifaire, alors qu'il est le sujet de ces quatre plans.
            chapters: ['ville', 'arrivee', 'intervention', 'transformation', 'prestations', 'tarifs'],
          });
          // Le véhicule de location : il roule sur la route du 06 (`chrTravel` : son avance en mètres).
          rentalCar = createVehicleLayer({
            ...WORLD.vehicles.rental,
            url: '/models/chr.glb',
            channels: { light: 'chrLight' },
            tint: { match: /Paint/i, color: [0.055, 0.058, 0.068] },
            travel: 'chrTravel',
            noise: sky.uniforms.uNoise.value,
            chapters: ['bascule', 'location', 'rendezvous'],
          });
          vehicleLight = createVehicleLightLayer({
            intensity: ENVIRONMENT.intensity,
            yaw: WORLD.skyYaw,
            channels: ['carLight', 'chrLight'],
            boost: 'gloss',
            // Les deux candélabres les plus proches du véhicule : ce sont eux qui l'éclairent vraiment.
            lamps: WORLD.place.lamps.map(([x, z]) => [x, WORLD.place.lampHeight - 0.4, z] as const),
            lampChannel: 'placeLamp',
          });
          // LE CIRCUIT : la location ne se raconte plus sur une chaussée dans le noir. Le véhicule roule sur une
          // piste, entre des vibreurs, devant des gradins qui lui donnent son échelle.
          const circuit = createCircuitLayer({ night: sky.uniforms, ...WORLD.circuit, chapters: ['bascule', 'location'] });
          // La ville au loin, derrière le mur : c'est elle qui remplit l'horizon pendant tout le nettoyage.
          const skyline = createSkylineLayer({
            night: sky.uniforms,
            url: desktop ? '/media/skyline-2048.webp' : '/media/skyline-1024.webp',
            ...WORLD.skyline,
            chapters: ['ville', 'arrivee', 'intervention', 'transformation', 'prestations', 'tarifs', 'bascule'],
          });
          const road = createRoadLayer({
            placement: WORLD.road,
            night: sky.uniforms,
            // Les feux arrière appartiennent au C-HR : posés sur son pare-chocs, c'est la chaussée qui en fait le reflet.
            tail: { travel: 'chrTravel', light: 'chrLight', offset: -WORLD.vehicles.rental.length / 2 + 0.1 },
          });
          const clouds = createCloudLayer({
            fields: WORLD.clouds[desktop ? 'desktop' : 'mobile'],
            noise: sky.uniforms.uNoise.value,
            far: WORLD.cloudFar,
          });
          galaxyLayer = galaxy;
          // L'environnement des véhicules est calculé (aucun fichier) : on le prépare dès que la scène existe.
          void Promise.resolve().then(() => vehicleLight?.ensure());
          // La ligne d'horizon : une seule image, 61 ko au téléphone. On la charge dès que la scène existe — elle
          // doit être là AVANT qu'on se pose, sinon on arrive une fois de plus devant du vide.
          void Promise.resolve().then(() => skyline.ensure());
          const created = await createWebGLStage({
            experience,
            canvas,
            host: stageEl,
            layers: [sky, galaxy, territory, skyline, relief, around, place, circuit, vehicleLight, cleaningCar, road, rentalCar, clouds],
            config: { ...STAGE, busy: () => registry.busy },
            onReady: () => {
              stageStatus = 'ready';
              html.classList.add('is-3d');
              setIntroProgress(1);
              // L'écran d'entrée couvre la préparation de la PREMIÈRE IMAGE : or la première image du récit est la
              // galaxie elle-même. On ne lève donc pas le rideau sur un cadre vide — on attend le modèle, au plus 3 s
              // (le garde-fou général lève l'entrée à 4,5 s quoi qu'il arrive).
              const subject = registry.get('galaxy');
              if (!subject || subject.status === 'ready' || subject.status === 'error' || subject.status === 'poster') {
                liftIntro();
                return;
              }
              const stop = registry.onChange((entry) => {
                if (entry.descriptor.id !== 'galaxy' || entry.status === 'loading') return;
                stop();
                liftIntro();
              });
              window.setTimeout(() => {
                stop();
                liftIntro();
              }, 3000);
            },
            onFallback: (reason) => {
              stageStatus = `fallback:${reason}`;
              fallback(reason);
            },
          });
          if (!created) {
            sceneReady();
            return;
          }
          stage = created;
          setIntroProgress(0.85);
          // Les couches ont reçu leur contexte : les demandes du registre peuvent partir.
          sceneReady();
        },
      )
      .catch((error: unknown) => {
        stageStatus = `error:${error instanceof Error ? error.message : String(error)}`;
        fallback(stageStatus);
        sceneReady();
      });
  };
  if (document.readyState === 'complete' || !introDone) startStage();
  else addEventListener('load', startStage, { once: true });

  installQaHooks(experience, {
    stage: () => (stage ? stage.info() : stageStatus),
    stageStatus: () => stageStatus,
    media: () => registry.snapshot(),
    vehicle: () => cleaningCar?.debug() ?? null,
    guide: () => guide?.points.length ?? 0,
    intro: () => !introDone,
  });

  const dispose = () => {
    guide?.dispose();
    stage?.dispose();
    registry.dispose();
    experience.dispose();
  };
  addEventListener('pagehide', (event) => {
    if (!event.persisted) dispose();
  });
  // Page restaurée depuis l'historique : état incohérent possible (GPU libéré) — rechargement (MECA RIVIERA).
  addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });
  return { experience, registry, dispose };
}
