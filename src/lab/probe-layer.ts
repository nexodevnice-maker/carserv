import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { CameraRig } from '../engine/camera/camera-rig';
import { createPose } from '../engine/camera/camera-rig';
import { createNightEnvironment } from '../engine/webgl/night-environment';
import type { WebGLLayer } from '../engine/webgl/webgl-stage';

/**
 * LABORATOIRE — couche de contrôle, pas une scène : un volume de référence (dimensions d'un SUV compact), un vernis et
 * un chrome pour lire l'environnement de nuit pré-calculé, et la trajectoire réelle de la caméra dessinée dans la
 * scène (reconstruite à chaque mesure ou changement de format) avec ses plans.
 */
export function createProbeLayer(options: { rig: CameraRig; version: () => number }) {
  const root = new Group();
  root.name = 'probe';
  const abort = new AbortController();
  let builtVersion = -1;
  let envLoaded = false;
  const trajectory = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xe3b449 }));
  const markers = new Group();
  const markerGeometry = new SphereGeometry(0.08, 12, 8);
  const markerMaterial = new MeshStandardMaterial({ color: 0xd6252b, emissive: 0x551010 });

  const rebuild = () => {
    const pose = createPose();
    const samples = 240;
    const points = new Float32Array(samples * 3);
    for (let k = 0; k < samples; k++) {
      options.rig.evaluate(k / (samples - 1), pose);
      points.set(pose.position, k * 3);
    }
    trajectory.geometry.dispose();
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    trajectory.geometry = geometry;
    markers.clear();
    for (const p of options.rig.rests()) {
      options.rig.evaluate(p, pose);
      const marker = new Mesh(markerGeometry, markerMaterial);
      marker.position.set(...pose.position);
      markers.add(marker);
    }
    builtVersion = options.version();
  };

  const layer: WebGLLayer & { info(): Record<string, unknown> } = {
    id: 'probe',
    root,
    async init(ctx) {
      const grid = new GridHelper(40, 40, 0x3a3a40, 0x1d1d22);
      const body = new Mesh(
        new BoxGeometry(1.8, 0.9, 4.4),
        new MeshPhysicalMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03 }),
      );
      body.position.y = 0.75;
      const cabin = new Mesh(
        new BoxGeometry(1.6, 0.55, 2.2),
        new MeshPhysicalMaterial({ color: 0x0c0d10, metalness: 0.2, roughness: 0.05, clearcoat: 1 }),
      );
      cabin.position.set(0, 1.45, -0.3);
      const chrome = new Mesh(new SphereGeometry(0.35, 48, 32), new MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 }));
      chrome.position.set(1.6, 0.35, 2.6);
      root.add(grid, body, cabin, chrome, trajectory, markers);
      rebuild();
      // MÊME environnement que le site : la nuit CALCULÉE, sans aucun fichier. Le laboratoire chargeait encore une
      // photographie 360° qui n'existe plus depuis que l'HDRI est sorti du projet — il mesurait donc un éclairage
      // que la scène n'utilise plus, et échouait à le charger.
      const env = createNightEnvironment(ctx.renderer);
      if (env) {
        ctx.scene.environment = env;
        envLoaded = true;
      } else root.add(new HemisphereLight(0x8899bb, 0x111111, 1.2));
    },
    update() {
      if (builtVersion === options.version()) return false;
      rebuild();
      return true;
    },
    dispose() {
      abort.abort();
      markerGeometry.dispose();
      markerMaterial.dispose();
    },
    info: () => ({ envLoaded, trajectoryPoints: trajectory.geometry.getAttribute('position')?.count ?? 0, markers: markers.children.length }),
  };
  return layer;
}
