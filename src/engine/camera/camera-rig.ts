import { clamp01, lerp } from '../math/scalar';

const LOOK_DISTANCE = 100;
const aim = (out: MutableVec3, position: Vec3, azimuth: number, elevation: number) => {
  const c = Math.cos(elevation);
  out[0] = position[0] + Math.cos(azimuth) * c * LOOK_DISTANCE;
  out[1] = position[1] + Math.sin(elevation) * LOOK_DISTANCE;
  out[2] = position[2] + Math.sin(azimuth) * c * LOOK_DISTANCE;
  return out;
};
const lerpAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
import type { MutableVec3, Vec3 } from '../math/vec3';
import { paced, type Pace } from '../motion/pace';
import { merged, pick, type Format, type Responsive } from '../responsive/formats';
import { resolveKeys, segmentAt, type KeyPlacement, type Segment } from '../timeline/keys';
import type { Timeline } from '../timeline/timeline';
import { createPath, type Path } from './path';

/**
 * La caméra comme une vraie caméra : des plans posés dans les chapitres, et entre deux plans un mouvement qui a une
 * fenêtre (palier de lecture, puis déplacement), une courbe (départ, accélération, arrivée), une trajectoire (arc par
 * points de passage) et un regard qui peut précéder le déplacement (`lead` : l'opérateur panote vers sa destination
 * avant de s'y rendre).
 *
 * Évaluation pure : la pose ne dépend que de la progression — tout état visuel se reconstruit depuis p (retour
 * arrière, saut, rechargement). Aucun Three.js ici : le même rig pilote la 3D, un recadrage de vidéo ou du DOM.
 * Unités : mètres pour une scène 3D ; pour un plan 2D (vidéo), l'unité est celle du plan. Rien en pixels d'écran.
 */
export interface Framing {
  position: Vec3;
  /** Point regardé. Ignoré si `look` est donné. */
  target?: Vec3;
  /**
   * Regard par direction : [azimut, élévation] (radians ; azimut = atan2(z, x), −π/2 regarde vers −z). Entre deux plans
   * qui visent ainsi, la direction est interpolée en angles, indépendamment de la trajectoire : un repère lointain
   * (une étoile, un horizon) reste verrouillé au même point de l'image pendant que la caméra voyage.
   */
  look?: readonly [number, number];
  /** Champ vertical (degrés). */
  fov: number;
  /**
   * Décalage optique de l'image (part de la largeur vers la droite, part de la hauteur vers le haut) : libère une zone
   * de texte sans tourner la caméra.
   */
  shift?: readonly [number, number];
  /** Roulis (radians). */
  roll?: number;
}

export interface ShotDefinition extends KeyPlacement {
  id: string;
  /** Intention du plan, écrite : un plan sans intention n'entre pas. */
  intent: string;
  framing: Framing;
  tablet?: Partial<Framing>;
  mobile?: Partial<Framing>;
  /** Comment la caméra rejoint ce plan depuis le précédent. */
  pace?: Pace;
  /** Points de passage de la position depuis le plan précédent. */
  via?: Responsive<readonly Vec3[]>;
  /** Points de passage du regard depuis le plan précédent. */
  targetVia?: Responsive<readonly Vec3[]>;
  /** Avance du regard sur le déplacement (part du segment, 0–0,3). */
  lead?: number;
  /**
   * Enveloppe du vol qui mène à ce plan : nulle aux deux repos, maximale au milieu du trajet (sin π·u), quel que soit
   * le format ou la longueur du chapitre. fov : degrés en plus (vitesse) ; roll : inclinaison (virage) ; pitch : plongée
   * du regard (radians) ; shake : turbulence (unités de l'objectif de la scène).
   */
  flight?: { fov?: number; roll?: number; pitch?: number; shake?: number };
}

export interface CameraPose {
  position: MutableVec3;
  target: MutableVec3;
  fov: number;
  shiftX: number;
  shiftY: number;
  roll: number;
  /** Tangage ajouté (radians), après la visée. */
  pitch: number;
  /** Intensité de turbulence. */
  shake: number;
  /** Plan de départ du segment courant. */
  shot: number;
  /** Avancement rythmé dans le segment (0–1). */
  travel: number;
}

export const createPose = (): CameraPose => ({
  position: [0, 0, 0],
  target: [0, 0, 0],
  fov: 35,
  shiftX: 0,
  shiftY: 0,
  roll: 0,
  pitch: 0,
  shake: 0,
  shot: 0,
  travel: 0,
});

export function createCameraRig(shots: readonly ShotDefinition[]) {
  if (!shots.length) throw new Error('[camera] aucun plan');
  let framings: Framing[] = [];
  let positions = new Float64Array(0);
  let positionPath: Path;
  let targetPath: Path;
  /** Indice, dans les trajectoires, du point de chaque plan. */
  let positionNodes: number[] = [];
  let targetNodes: number[] = [];
  const segment: Segment = { index: 0, fraction: 0 };

  const build = (format: Format) => {
    framings = shots.map((shot) => merged(shot.framing, { tablet: shot.tablet, mobile: shot.mobile }, format));
    const positionPoints: Vec3[] = [];
    const targetPoints: Vec3[] = [];
    positionNodes = [];
    targetNodes = [];
    shots.forEach((shot, k) => {
      if (k > 0) {
        positionPoints.push(...(shot.via ? pick(shot.via, format) : []));
        targetPoints.push(...(shot.targetVia ? pick(shot.targetVia, format) : []));
      }
      const framing = framings[k] as Framing;
      const target: Vec3 = framing.look ? aim([0, 0, 0], framing.position, framing.look[0], framing.look[1]) : (framing.target ?? framing.position);
      positionNodes.push(positionPoints.push(framing.position) - 1);
      targetNodes.push(targetPoints.push(target) - 1);
    });
    positionPath = createPath(positionPoints);
    targetPath = createPath(targetPoints);
  };

  return {
    shots,
    /** À chaque mesure de la piste et à chaque changement de format. */
    resolve(timeline: Timeline, format: Format) {
      positions = resolveKeys(shots, timeline);
      build(format);
    },
    /** Progression globale de chaque plan : les repos du mouvement réduit. */
    rests(): number[] {
      return [...positions];
    },
    evaluate(p: number, out: CameraPose = createPose()): CameraPose {
      segmentAt(positions, p, segment);
      const k = segment.index;
      const from = framings[k] as Framing;
      const nextShot = shots[k + 1];
      const to = framings[k + 1];
      if (!nextShot || !to || segment.fraction <= 0) {
        positionPath.at(out.position, positionPath.distanceOf(positionNodes[k] ?? 0));
        if (from.look) aim(out.target, out.position, from.look[0], from.look[1]);
        else targetPath.at(out.target, targetPath.distanceOf(targetNodes[k] ?? 0));
        out.fov = from.fov;
        out.shiftX = from.shift?.[0] ?? 0;
        out.shiftY = from.shift?.[1] ?? 0;
        out.roll = from.roll ?? 0;
        out.pitch = 0;
        out.shake = 0;
        out.shot = k;
        out.travel = 0;
        return out;
      }
      const u = paced(segment.fraction, nextShot.pace);
      const look = nextShot.lead ? paced(clamp01(segment.fraction + nextShot.lead), nextShot.pace) : u;
      const pa = positionPath.distanceOf(positionNodes[k] ?? 0);
      const pb = positionPath.distanceOf(positionNodes[k + 1] ?? 0);
      const ta = targetPath.distanceOf(targetNodes[k] ?? 0);
      const tb = targetPath.distanceOf(targetNodes[k + 1] ?? 0);
      positionPath.at(out.position, lerp(pa, pb, u));
      if (from.look && to.look) aim(out.target, out.position, lerpAngle(from.look[0], to.look[0], look), lerp(from.look[1], to.look[1], look));
      else targetPath.at(out.target, lerp(ta, tb, look));
      out.fov = lerp(from.fov, to.fov, u);
      out.shiftX = lerp(from.shift?.[0] ?? 0, to.shift?.[0] ?? 0, u);
      out.shiftY = lerp(from.shift?.[1] ?? 0, to.shift?.[1] ?? 0, u);
      out.roll = lerp(from.roll ?? 0, to.roll ?? 0, u);
      const envelope = Math.sin(Math.PI * u);
      const flight = nextShot.flight;
      out.fov += (flight?.fov ?? 0) * envelope;
      out.roll += (flight?.roll ?? 0) * envelope;
      out.pitch = (flight?.pitch ?? 0) * envelope;
      out.shake = (flight?.shake ?? 0) * envelope;
      out.shot = k;
      out.travel = u;
      return out;
    },
  };
}

export type CameraRig = ReturnType<typeof createCameraRig>;
