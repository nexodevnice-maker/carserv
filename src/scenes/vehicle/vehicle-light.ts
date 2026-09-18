import { DirectionalLight, Euler, Group, type Texture } from 'three';
import type { ExperienceState } from '../../engine/state/experience-state';
import { loadBakedEnvironment } from '../../engine/webgl/environment';
import type { LayerUpdate, StageContext, WebGLLayer } from '../../engine/webgl/webgl-stage';

/**
 * La lumière des véhicules, et d'eux seuls : l'environnement de nuit pré-calculé (PMREM encodé par
 * scripts/media-env.mjs, même ciel que celui qu'on voit) plus deux directionnelles qui dessinent les arêtes.
 * Le reste du monde (ciel, sol, chaussée, carte) est en shaders maison et ignore ces lumières : rien d'autre ne
 * change, et le blanchiment qu'un PMREM provoquait sur la chaussée ne peut pas revenir (docs/DECISIONS.md).
 *
 * Sans reflet d'environnement, une carrosserie noire dans la nuit n'est qu'une silhouette : c'est cet
 * environnement qui lui rend sa laque, ses vitres et le halo des étoiles dans les ailes.
 * L'intensité suit la présence des véhicules (canaux `carLight`, `chrLight`) : dans l'univers, plus rien n'est allumé.
 */
export function createVehicleLightLayer(options: {
  url: string;
  intensity: number;
  /** Rotation du ciel (rad) : les reflets doivent montrer la même nuit que celle qu'on voit. */
  yaw: number;
  channels: readonly string[];
  /** Canal multiplicateur du reflet : les plans de matière (unités 1 à 3) veulent un vrai miroir, pas une nuit polie. */
  boost?: string;
  chapters?: readonly string[];
}) {
  const root = new Group();
  root.name = 'vehicle-light';
  // Clé froide venue d'en haut à gauche (la nuit), contre-jour chaud venu du nord (la galaxie est de ce côté).
  const key = new DirectionalLight(0xbcd0f0, 0);
  key.position.set(-6, 9, 7);
  const rim = new DirectionalLight(0xffdca6, 0);
  rim.position.set(5, 1.6, -9);
  root.add(key, rim);
  let ctx: StageContext | null = null;
  let env: Texture | null = null;
  let loading: Promise<void> | null = null;
  let last = -1;

  const layer: WebGLLayer & { ensure(): Promise<void> } = {
    id: 'vehicle-light',
    chapters: options.chapters,
    root,
    init(context: StageContext) {
      ctx = context;
    },
    /** Chargement à la demande : l'environnement n'arrive qu'à l'approche des véhicules. */
    ensure() {
      loading ??= (async () => {
        const texture = await loadBakedEnvironment(options.url);
        if (!texture || !ctx) return;
        env = texture;
        ctx.scene.environment = texture;
        // Même rotation que le ciel visible : les reflets montrent la Voie lactée là où elle est vraiment.
        ctx.scene.environmentRotation = new Euler(0, options.yaw, 0);
        // L'environnement arrive APRÈS la première mise à jour : sans cette remise à zéro du dernier état, la couche
        // croirait n'avoir rien à faire et le niveau de reflet resterait à zéro — une carrosserie noire dans le noir.
        last = -1;
        ctx.invalidate();
      })().catch((error: unknown) => {
        loading = null;
        console.warn('[vehicle-light]', error instanceof Error ? error.message : error);
      });
      return loading;
    },
    update(state: Readonly<ExperienceState>, context: StageContext): LayerUpdate {
      let presence = 0;
      for (const channel of options.channels) presence = Math.max(presence, state.channels[channel] ?? 0);
      const boost = options.boost ? (state.channels[options.boost] ?? 1) : 1;
      const level = presence * boost;
      if (level === last) return false;
      last = level;
      key.intensity = presence * 0.55;
      rim.intensity = presence * 1.05;
      root.visible = presence > 0.001;
      if (env) context.scene.environmentIntensity = level * options.intensity;
      return true;
    },
    dispose() {
      if (ctx && env) {
        ctx.scene.environment = null;
        env.dispose();
      }
    },
  };
  return layer;
}

export type VehicleLightLayer = ReturnType<typeof createVehicleLightLayer>;
