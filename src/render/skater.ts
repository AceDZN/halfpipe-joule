// The skater on the board. Uses the rigged Tripo skater when it loads
// (AnimationMixer clips), otherwise a simple procedural rider.

import * as THREE from 'three';
import { loadModel } from './world';

export type Pose = 'ready' | 'ride' | 'crouch' | 'air' | 'bail' | 'cheer' | 'push';

const CLIP_KEYS: Record<Pose, string[]> = {
  ready: ['idle', 'stand'],
  // The Tripo `surf` clip puts the feet off the deck; ride on `idle` and bend the knees in code.
  ride: ['idle', 'stand'],
  crouch: ['idle', 'stand'],
  air: ['ollie', 'jump'],
  bail: ['bail', 'fall', 'die', 'death', 'knock'],
  cheer: ['cheer', 'celebrat', 'victory', 'dance'],
  push: ['push', 'skate', 'walk'],
};

export class SkaterVisual {
  readonly root = new THREE.Group();
  readonly board = new THREE.Group();
  readonly rider = new THREE.Group();
  private boardPivot = new THREE.Group();
  private riderPivot = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<Pose, THREE.AnimationAction>();
  private current: Pose | null = null;
  private placeholder: THREE.Group;
  private legs: THREE.Mesh[] = [];
  private torso: THREE.Group;
  private arms: THREE.Mesh[] = [];
  private crouch = 0;
  private crouchTarget = 0;
  private bailT = 0;
  private boardSpin = 0;
  hasRig = false;

  constructor() {
    this.boardPivot.add(this.board);
    this.riderPivot.add(this.rider);
    this.root.add(this.boardPivot, this.riderPivot);
    // Board placeholder: deck + wheels.
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.6 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 0.22), deckMat);
    deck.position.y = 0.09;
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.4 });
    this.board.add(deck);
    for (const x of [-0.28, 0.28])
      for (const z of [-0.08, 0.08]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.035, z);
        this.board.add(w);
      }
    this.board.traverse((o) => (o.castShadow = true));
    loadModel('board').then((m) => {
      if (!m) return;
      // The Tripo board stands on its tail, tilted 30°: measured principal axes
      // (long axis, width, wheel side) mapped to +X length, +Z width, -Y wheels.
      const b = m.clone();
      const along = new THREE.Vector3(0, 0.866, -0.5);
      const up = new THREE.Vector3(0, 0.5, 0.866);
      const width = new THREE.Vector3().crossVectors(along, up);
      const basis = new THREE.Matrix4().makeBasis(along, up, width).transpose();
      b.quaternion.setFromRotationMatrix(basis);
      const holder = new THREE.Group();
      holder.add(b);
      b.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(b);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      b.position.set(-centre.x, -box.min.y, -centre.z);
      const s = 0.82 / size.x;
      holder.scale.setScalar(s);
      holder.position.y = 0.0;
      holder.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      holder.userData.isGlb = true;
      this.board.clear();
      this.board.add(holder);
      this.boardModel = holder;
    });

    this.placeholder = new THREE.Group();
    this.torso = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xe0a77d, roughness: 0.7 });
    const tee = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.8 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x1fb5a8, roughness: 0.8 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xe23b3b, roughness: 0.6 });
    const helmet = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    for (const z of [-0.14, 0.14]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.62, 4, 8), shorts);
      leg.position.set(0, 0.48, z);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoe);
      foot.position.set(0.02, 0.14, z * 1.2);
      this.placeholder.add(leg, foot);
      this.legs.push(leg);
    }
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), tee);
    body.position.y = 0.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
    head.position.y = 0.72;
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.8), helmet);
    helm.position.y = 0.74;
    this.torso.add(body, head, helm);
    for (const z of [-0.24, 0.24]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.5, 4, 8), skin);
      arm.position.set(0, 0.32, z);
      arm.rotation.x = z > 0 ? -0.9 : 0.9;
      this.torso.add(arm);
      this.arms.push(arm);
    }
    this.torso.position.y = 0.8;
    this.placeholder.add(this.torso);
    this.placeholder.traverse((o) => (o.castShadow = true));
    // Stand sideways on the board (regular stance), facing +z (the camera in side views).
    this.placeholder.rotation.y = 0;
    this.rider.add(this.placeholder);

    loadModel('skater').then((m) => this.useRig(m));
  }

  boardModel: THREE.Object3D | null = null;
  private model: THREE.Object3D | null = null;
  private modelBaseY = 0;
  private ankleY = 0;
  private legBones: Record<'upL' | 'upR' | 'legL' | 'legR' | 'footL' | 'footR', THREE.Object3D> | null = null;
  /** Knee-bend direction for this rig (+1 bends the knees forward). */
  kneeSign = 1;
  private backpack: THREE.Object3D | null = null;
  private wantBackpack = false;

  /** The heavy red backpack (mass level). Rides on the spine bone when rigged. */
  setBackpack(on: boolean) {
    if (on === this.wantBackpack && (!on || this.backpack)) return;
    this.wantBackpack = on;
    if (!on) {
      if (this.backpack) this.backpack.visible = false;
      return;
    }
    if (this.backpack) {
      this.backpack.visible = true;
      return;
    }
    loadModel('backpack').then((m) => {
      if (!m || this.backpack) return;
      const pack = m.clone();
      const holder = new THREE.Group();
      holder.add(pack);
      // Place it on the back in rider space (the rider faces +Z), then hand it to the
      // spine bone keeping that world pose, so it follows the torso.
      pack.rotation.y = Math.PI;
      holder.scale.setScalar(0.62);
      holder.position.set(0.05, 0.92, -0.24);
      this.rider.add(holder);
      let spine: THREE.Object3D | null = null;
      this.rider.traverse((o) => {
        if (!spine && /spine2$/i.test(o.name)) spine = o;
      });
      if (spine) {
        this.root.updateMatrixWorld(true);
        (spine as THREE.Object3D).attach(holder);
      }
      holder.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      this.backpack = holder;
      holder.visible = this.wantBackpack;
    });
  }

  private useRig(m: THREE.Group | null) {
    if (!m) return;
    const clips = (m.userData.animations ?? []) as THREE.AnimationClip[];
    const model = m;
    const box = new THREE.Box3().setFromObject(model);
    const h = box.max.y - box.min.y;
    const s = 1.62 / (h || 1);
    model.scale.setScalar(s);
    model.position.y = 0.11 - box.min.y * s;
    // Tripo characters face +Z; skaters stand sideways: face +Z = toward the side camera.
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
      }
    });
    this.rider.remove(this.placeholder);
    this.rider.add(model);
    this.hasRig = true;
    this.model = model;
    this.modelBaseY = model.position.y;
    const bone = (n: string) => {
      let b: THREE.Object3D | null = null;
      model.traverse((o) => {
        if (!b && o.name.toLowerCase().endsWith(n)) b = o;
      });
      return b as THREE.Object3D | null;
    };
    const parts = ['leftupleg', 'rightupleg', 'leftleg', 'rightleg', 'leftfoot', 'rightfoot'].map(bone);
    if (parts.every(Boolean)) {
      const [upL, upR, legL, legR, footL, footR] = parts as THREE.Object3D[];
      this.legBones = { upL, upR, legL, legR, footL, footR };
      // Ankle height in the bind pose (soles on the deck).
      this.root.updateMatrixWorld(true);
      this.ankleY = Math.min(this.rider.worldToLocal(footL.getWorldPosition(new THREE.Vector3())).y, this.rider.worldToLocal(footR.getWorldPosition(new THREE.Vector3())).y);
    }
    this.mixer = new THREE.AnimationMixer(model);
    for (const pose of Object.keys(CLIP_KEYS) as Pose[]) {
      const clip = CLIP_KEYS[pose].map((k) => clips.find((c) => c.name.toLowerCase().includes(k))).find(Boolean);
      if (!clip) continue;
      const a = this.mixer.clipAction(clip);
      if (pose === 'bail' || pose === 'air') {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions.set(pose, a);
    }
    const cur = this.current;
    this.current = null;
    if (cur) this.setPose(cur);
  }

  setPose(p: Pose) {
    if (p === 'crouch') this.crouchTarget = 1;
    else if (p === 'ride' || p === 'ready' || p === 'push') this.crouchTarget = 0.25;
    else if (p === 'air') this.crouchTarget = 0.6;
    if (p === 'bail' && this.current !== 'bail') this.bailT = 0;
    if (p === this.current) return;
    this.current = p;
    if (!this.mixer) return;
    const next = this.actions.get(p) ?? this.actions.get('ride') ?? this.actions.get('ready');
    if (!next) return;
    for (const [, a] of this.actions) if (a !== next) a.fadeOut(0.18);
    next.reset().fadeIn(0.18).play();
  }

  private facing = 0;

  /** Board follows the ramp; the rider leans only part of the way (balance). */
  setSlope(th: number) {
    this.boardPivot.rotation.z = th;
    this.riderPivot.rotation.set(0, 0, 0);
    // Feet stay on the deck: the rider stands perpendicular to the ramp like the board.
    this.riderPivot.rotateZ(th);
    this.riderPivot.rotateY(this.facing);
  }

  /** Extra yaw for the rider: 0 = sideways stance facing the side camera. */
  setFacing(a: number) {
    this.facing = a;
  }

  get pose() {
    return this.current;
  }

  private hopT = -1;

  /** Visual ollie hop (the physics keeps the board on its line). */
  hop() {
    this.hopT = 0;
  }

  /** Bend the knees by the crouch amount and keep both feet planted on the deck. */
  private plantFeet() {
    const b = this.legBones;
    const m = this.model;
    if (!b || !m) return;
    const grounded = this.current === 'ride' || this.current === 'crouch' || this.current === 'ready' || this.current === null;
    m.position.y = this.modelBaseY;
    if (!grounded) return;
    const c = this.crouch * this.kneeSign;
    b.upL.rotation.x -= c * 0.9;
    b.upR.rotation.x -= c * 0.9;
    b.legL.rotation.x += c * 1.6;
    b.legR.rotation.x += c * 1.6;
    b.footL.rotation.x -= c * 0.7;
    b.footR.rotation.x -= c * 0.7;
    this.root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const low = Math.min(this.rider.worldToLocal(b.footL.getWorldPosition(v)).y, this.rider.worldToLocal(b.footR.getWorldPosition(v)).y);
    m.position.y += this.ankleY - low;
  }

  /** Spin the board for a trick (radians to add). */
  kickflip() {
    this.boardSpin += Math.PI * 2;
  }

  update(dt: number) {
    this.mixer?.update(dt);
    this.crouch += (this.crouchTarget - this.crouch) * Math.min(1, dt * 10);
    this.plantFeet();
    if (!this.hasRig) {
      const c = this.crouch;
      for (const l of this.legs) {
        l.scale.y = 1 - c * 0.35;
        l.position.y = 0.48 - c * 0.12;
      }
      this.torso.position.y = 0.8 - c * 0.24;
      this.torso.rotation.z = -c * 0.25;
      const cheer = this.current === 'cheer';
      this.arms.forEach((a, i) => {
        const base = i ? -0.9 : 0.9;
        a.rotation.x = cheer ? (i ? -2.6 : 2.6) : base + Math.sin(performance.now() / 300 + i) * 0.05;
      });
    }
    if (this.current === 'bail') {
      this.bailT += dt;
      this.rider.rotation.z = Math.min(this.bailT * 5, Math.PI / 2);
      this.rider.position.y = Math.max(-0.1, 0.1 - this.bailT * 0.6);
      this.board.position.x = Math.min(this.bailT * 3, 2.5);
      this.board.rotation.z = this.bailT * 9;
    } else {
      this.rider.rotation.z = 0;
      let hy = 0;
      if (this.hopT >= 0) {
        this.hopT += dt;
        const k = this.hopT / 0.45;
        hy = k < 1 ? Math.sin(k * Math.PI) * 0.45 : 0;
        if (k >= 1) this.hopT = -1;
      }
      this.rider.position.y = hy;
      this.board.position.set(0, hy * 0.85, 0);
      if (this.boardSpin > 0) {
        const step = Math.min(this.boardSpin, dt * 18);
        this.boardSpin -= step;
        this.board.rotation.x += step;
      } else this.board.rotation.x = 0;
      this.board.rotation.z = 0;
    }
  }
}
