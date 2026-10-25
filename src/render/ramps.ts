// Builds the visible ramps of a level from the same authored profiles the
// physics uses (the meshes are never colliders).

import * as THREE from 'three';
import type { LevelDef } from '../sim/levels';
import { evalPiece, type Lane, type Piece, type Surface } from '../sim/track';
import { graffitiTexture, surfaceTexture } from './textures';

export interface Placement {
  x: number;
  z: number;
  yaw: number;
}

export interface LevelVisual {
  group: THREE.Group;
  zones: { mesh: THREE.Mesh; lane: number; index: number }[];
  stars: { mesh: THREE.Object3D; id: string }[];
  targets: THREE.Object3D[];
  toWorld: (x: number, y: number, lane: number, lateral?: number) => THREE.Vector3;
  forward: THREE.Vector3;
  side: THREE.Vector3;
}

const surfMats = new Map<Surface, THREE.MeshStandardMaterial>();
function surfaceMaterial(s: Surface) {
  let m = surfMats.get(s);
  if (!m) {
    const rough: Record<Surface, number> = { smooth: 0.45, concrete: 0.8, wood: 0.7, asphalt: 0.95, sand: 1, brake: 0.9 };
    m = new THREE.MeshStandardMaterial({
      map: surfaceTexture(s),
      roughness: rough[s],
      metalness: 0,
      // Flat runs sit exactly on the promenade floor: always win the depth test.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    surfMats.set(s, m);
  }
  return m;
}

const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6ded2, roughness: 0.85 });
const copingMat = new THREE.MeshStandardMaterial({ color: 0xc9d2da, metalness: 0.9, roughness: 0.25 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0xffa500, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 });

/** Splits a piece into runs of constant surface for separate materials. */
function surfaceRuns(p: Piece) {
  const runs: { surf: Surface; s0: number; s1: number }[] = [];
  for (const seg of p.segs) {
    const last = runs[runs.length - 1];
    if (last && last.surf === seg.surf) last.s1 = seg.s0 + seg.len;
    else runs.push({ surf: seg.surf, s0: seg.s0, s1: seg.s0 + seg.len });
  }
  return runs;
}

function ribbon(p: Piece, s0: number, s1: number, z0: number, z1: number, lift = 0, ds = 0.1) {
  const n = Math.max(2, Math.ceil((s1 - s0) / ds) + 1);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / (n - 1);
    const q = evalPiece(p, s);
    const nx = -Math.sin(q.th) * lift;
    const ny = Math.cos(q.th) * lift;
    pos.push(q.x + nx, q.y + ny, z0, q.x + nx, q.y + ny, z1);
    uv.push(s / 2, z0 / 2, s / 2, z1 / 2);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Solid side wall under a piece's profile, down to the ground. */
function sideWall(p: Piece, z: number, facing: 1 | -1, floor: number) {
  const pts = p.poly;
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, floor);
  for (const q of pts) shape.lineTo(q.x, Math.max(q.y, floor));
  shape.lineTo(pts[pts.length - 1].x, floor);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape, 1);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 3);
  if (facing < 0) {
    // Flip winding so the face points to -z.
    const idx = g.getIndex()!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    g.computeVertexNormals();
  }
  g.translate(0, 0, z);
  return g;
}

let graffitiSeed = 1;

export function buildLevelVisual(level: LevelDef, at: Placement): LevelVisual {
  const group = new THREE.Group();
  group.name = `level-${level.id}`;
  group.position.set(at.x, 0, at.z);
  group.rotation.y = -at.yaw;
  const forward = new THREE.Vector3(Math.cos(at.yaw), 0, Math.sin(at.yaw));
  const side = new THREE.Vector3(-Math.sin(at.yaw), 0, Math.cos(at.yaw));
  const toWorld = (x: number, y: number, lane: number, lateral = 0) => {
    const lz = level.track.lanes[lane]?.z ?? 0;
    return new THREE.Vector3(at.x, 0, at.z)
      .addScaledVector(forward, x)
      .addScaledVector(side, -lz - lateral)
      .setY(y);
  };
  const zones: LevelVisual['zones'] = [];
  const lanes = level.track.lanes;
  const zMin = Math.min(...lanes.map((l) => -l.z - l.width / 2));
  const zMax = Math.max(...lanes.map((l) => -l.z + l.width / 2));

  lanes.forEach((lane: Lane, li) => {
    const zc = -lane.z;
    const z0 = zc - lane.width / 2;
    const z1 = zc + lane.width / 2;
    lane.pieces.forEach((p) => {
      for (const run of surfaceRuns(p)) {
        const mesh = new THREE.Mesh(ribbon(p, run.s0, run.s1, z0, z1), surfaceMaterial(run.surf));
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        group.add(mesh);
      }
      // Side walls: outer walls get graffiti, walls between lanes are plain.
      for (const [z, facing] of [
        [z1, 1],
        [z0, -1],
      ] as const) {
        const outer = (facing === 1 && Math.abs(z - zMax) < 0.01) || (facing === -1 && Math.abs(z - zMin) < 0.01);
        const needed = outer || level.laneSwitch === 'start';
        if (!needed) continue;
        const mat = outer
          ? new THREE.MeshStandardMaterial({ map: graffitiTexture(graffitiSeed++ % 9, 2), roughness: 0.85 })
          : wallMat;
        const wall = new THREE.Mesh(sideWall(p, z, facing, 0), mat);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
      }
      // Back fence where a deck ends.
      for (const end of [0, 1] as const) {
        const type = end === 0 ? p.startEnd : p.finishEnd;
        if (type !== 'bounce') continue;
        const q = evalPiece(p, end === 0 ? 0 : p.length);
        if (Math.abs(q.th) > 0.3) continue;
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, lane.width), copingMat);
        rail.position.set(q.x, q.y + 0.5, zc);
        rail.castShadow = true;
        group.add(rail);
      }
    });
    // Pump zones: a golden band on the ramp surface.
    lane.pumpZones.forEach((zn, zi) => {
      const p = lane.pieces[zn.piece];
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd23f,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(ribbon(p, zn.s0, zn.s1, z0 + 0.15, z1 - 0.15, 0.015, 0.08), mat);
      mesh.renderOrder = 2;
      group.add(mesh);
      zones.push({ mesh, lane: li, index: zi });
    });
    // Painted kerb lines between lanes where you can carve.
    if (level.laneSwitch === 'free' && lanes.length > 1 && li < lanes.length - 1) {
      const p = lane.pieces[0];
      const line = new THREE.Mesh(
        ribbon(p, 0, p.length, z1 - 0.06, z1 + 0.06, 0.012),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
      );
      group.add(line);
    }
  });

  // Copings: steel tubes; the target glows gold with a flag.
  const targets: THREE.Object3D[] = [];
  for (const c of level.copings) {
    const width = zMax - zMin;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, width, 12), c.target ? goldMat : copingMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(c.x, c.y + 0.03, (zMin + zMax) / 2);
    tube.castShadow = true;
    group.add(tube);
    if (c.target) {
      const flag = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), copingMat);
      pole.position.y = 0.8;
      const cloth = new THREE.Mesh(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0.7, 1.4, 0), new THREE.Vector3(0, 1.15, 0)]),
        new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb000, emissiveIntensity: 0.8, side: THREE.DoubleSide }),
      );
      cloth.geometry.computeVertexNormals();
      flag.add(pole, cloth);
      flag.position.set(c.x + 0.9, c.y, zMin + 0.4);
      flag.traverse((o) => (o.castShadow = true));
      group.add(flag);
      const glow = new THREE.PointLight(0xffb23a, 4, 6, 1.5);
      glow.position.set(c.x, c.y + 0.4, (zMin + zMax) / 2);
      group.add(glow);
      targets.push(tube, flag);
    }
  }

  // Sand pit under a gap.
  if (level.script === 'gap') {
    const lx = level.xMarks.ledge;
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(3.4, zMax - zMin + 1), new THREE.MeshStandardMaterial({ map: surfaceTexture('sand'), roughness: 1 }));
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(lx + 1.3, 0.02, (zMin + zMax) / 2);
    pit.receiveShadow = true;
    group.add(pit);
  }

  return { group, zones, stars: [], targets, toWorld, forward, side };
}

/** A chunky five-point star for collectibles. */
export function starMesh(high = false) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.13 : 0.3;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  g.center();
  const m = new THREE.MeshStandardMaterial({
    color: high ? 0xb58cff : 0xffd23f,
    emissive: high ? 0x7a3cff : 0xffa000,
    emissiveIntensity: 0.9,
    metalness: 0.5,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}
