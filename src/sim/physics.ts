// Point-mass skater on authored ramp curves. Energy bookkeeping is the source
// of truth on the ground: mechanical energy (Ep + Ek) only changes by friction
// heat and by work from the rider, so Ep + Ek + heat = E0 + work always holds.
// No Three.js here: the scene and the HUD read these numbers.

import { BAIL_VN, BOUNCE_E, G, MU, OLLIE_POP, PUMP_LIFT, REST_TAN, SCRUB_LIFT, SUBSTEP } from './constants';
import { evalPiece, type Lane, type Piece, type Surface, type Track, type TrackPoint } from './track';

export type Mode = 'ready' | 'ground' | 'air' | 'bailed';
export type HeatKind = Surface | 'landing' | 'bump' | 'scrub' | 'bail';

export type SimEvent =
  | { type: 'drop' }
  | { type: 'pump'; work: number }
  | { type: 'scrub'; heat: number }
  | { type: 'ollie'; work: number }
  | { type: 'launch'; speed: number }
  | { type: 'land'; vn: number; heat: number }
  | { type: 'bail'; reason: 'hard-landing' | 'pit' }
  | { type: 'bonk'; heat: number }
  | { type: 'turn'; y: number }
  | { type: 'rest' }
  | { type: 'lane'; lane: number }
  | { type: 'laneBlocked' }
  | { type: 'surface'; surf: Surface };

export interface TrailPoint {
  t: number;
  lane: number;
  x: number;
  y: number;
  heat: number;
  surf: Surface | null;
}

export interface Energies {
  ep: number;
  ek: number;
  heat: number;
  work: number;
  e0: number;
  /** Ep + Ek + heat — equals e0 + work. */
  total: number;
  /** Highest height the current mechanical energy could reach. */
  hMax: number;
  speed: number;
  height: number;
}

export interface SimOptions {
  mass: number;
  floorY?: number;
  /** 'free' = carve between lanes where the ground matches; 'start' = only before dropping in. */
  laneSwitch?: 'free' | 'start';
  /** Multiplier on every friction coefficient (0 = frictionless, for experiments and tests). */
  friction?: number;
}

export class Sim {
  readonly track: Track;
  mass: number;
  floorY: number;
  laneSwitch: 'free' | 'start';
  friction: number;

  mode: Mode = 'ready';
  lane = 0;
  piece = 0;
  s = 0;
  dir: 1 | -1 = 1;
  speed = 0;
  resting = true;
  /** Air state (also kept in sync on the ground). */
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;

  heat = 0;
  work = 0;
  e0 = 0;
  heatBy: Partial<Record<HeatKind, number>> = {};
  pumps = 0;
  scrubs = 0;
  time = 0;
  airTime = 0;
  maxY = -Infinity;
  events: SimEvent[] = [];
  trail: TrailPoint[] = [];

  private zoneUsed = new Set<string>();
  private inZone: number | null = null;
  private lastSurf: Surface | null = null;
  private trailClock = 0;
  private acc = 0;

  constructor(track: Track, opts: SimOptions) {
    this.track = track;
    this.mass = opts.mass;
    this.floorY = opts.floorY ?? -2;
    this.laneSwitch = opts.laneSwitch ?? 'free';
    this.friction = opts.friction ?? 1;
  }

  get laneObj(): Lane {
    return this.track.lanes[this.lane];
  }

  get pieceObj(): Piece {
    return this.laneObj.pieces[this.piece];
  }

  point(): TrackPoint {
    return evalPiece(this.pieceObj, this.s);
  }

  /** Put the skater at rest at a spot, held until drop(). */
  place(lane: number, piece: number, s: number, dir: 1 | -1) {
    this.mode = 'ready';
    this.lane = lane;
    this.piece = piece;
    this.s = s;
    this.dir = dir;
    this.speed = 0;
    this.resting = true;
    this.heat = 0;
    this.work = 0;
    this.heatBy = {};
    this.pumps = 0;
    this.scrubs = 0;
    this.time = 0;
    this.airTime = 0;
    this.events = [];
    this.trail = [];
    this.zoneUsed.clear();
    this.inZone = null;
    this.acc = 0;
    this.trailClock = 0;
    this.syncFromGround();
    this.e0 = this.mechanical();
    this.maxY = this.y;
    this.lastSurf = this.point().surf;
    this.recordTrail();
  }

  setMass(m: number) {
    // Only allowed while waiting at the start: energies are rescaled.
    if (this.mode !== 'ready') return;
    this.mass = m;
    this.e0 = this.mechanical();
  }

  drop() {
    if (this.mode !== 'ready') return;
    this.mode = 'ground';
    this.resting = false;
    this.events.push({ type: 'drop' });
  }

  energies(): Energies {
    const ep = this.mass * G * this.y;
    const v2 = this.vx * this.vx + this.vy * this.vy;
    const ek = 0.5 * this.mass * v2;
    return {
      ep,
      ek,
      heat: this.heat,
      work: this.work,
      e0: this.e0,
      total: ep + ek + this.heat,
      hMax: (ep + ek) / (this.mass * G),
      speed: Math.sqrt(v2),
      height: this.y,
    };
  }

  mechanical(): number {
    return this.mass * G * this.y + 0.5 * this.mass * (this.vx * this.vx + this.vy * this.vy);
  }

  /** Is the skater inside a pump zone right now? Returns its index. */
  currentZone(): number | null {
    if (this.mode !== 'ground') return null;
    const zones = this.laneObj.pumpZones;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (z.piece === this.piece && this.s >= z.s0 && this.s <= z.s1) return i;
    }
    return null;
  }

  /** Climbing a concave curve: that's when straightening your legs does work. */
  climbing(): boolean {
    if (this.mode !== 'ground') return false;
    return this.dir * Math.sin(this.point().th) > 0.03;
  }

  zoneAvailable(): boolean {
    const z = this.currentZone();
    return z !== null && !this.zoneUsed.has(`${this.lane}:${z}`) && this.speed > 0.5 && this.climbing();
  }

  /** Rider straightens their legs. Adds work inside a pump zone, scrubs outside. */
  pump(): 'pump' | 'scrub' | 'none' {
    if (this.mode !== 'ground' || this.speed < 0.5) return 'none';
    const z = this.currentZone();
    if (z !== null && this.zoneAvailable()) {
      const w = this.mass * G * PUMP_LIFT;
      this.zoneUsed.add(`${this.lane}:${z}`);
      this.addKinetic(w);
      this.work += w;
      this.pumps++;
      this.events.push({ type: 'pump', work: w });
      return 'pump';
    }
    const want = this.mass * G * SCRUB_LIFT;
    const ek = 0.5 * this.mass * this.speed * this.speed;
    const loss = Math.min(want, ek);
    this.addKinetic(-loss);
    this.addHeat('scrub', loss);
    this.scrubs++;
    this.events.push({ type: 'scrub', heat: loss });
    return 'scrub';
  }

  /**
   * A hop: the legs do work ½·m·v_pop² and the landing turns exactly that into
   * heat and sound. The board stays on its line (no free airtime above rough
   * ground), so an ollie never changes Ep + Ek.
   */
  ollie(): boolean {
    if (this.mode !== 'ground' || this.resting || this.speed < 0.3) return false;
    const w = 0.5 * this.mass * OLLIE_POP * OLLIE_POP;
    this.work += w;
    this.addHeat('landing', w);
    this.events.push({ type: 'ollie', work: w });
    return true;
  }

  setLane(target: number) {
    if (target < 0 || target >= this.track.lanes.length || target === this.lane) return;
    if (this.mode === 'ready') {
      const p = this.point();
      const hit = this.matchOnLane(target, p.x, p.y, p.th);
      if (!hit) {
        this.events.push({ type: 'laneBlocked' });
        return;
      }
      const m = this.mass;
      const dir = this.dir;
      this.place(target, hit.piece, hit.s, dir);
      this.mass = m;
      this.events.push({ type: 'lane', lane: target });
      return;
    }
    if (this.laneSwitch !== 'free' || this.mode !== 'ground') {
      this.events.push({ type: 'laneBlocked' });
      return;
    }
    const p = this.point();
    const hit = this.matchOnLane(target, p.x, p.y, p.th);
    if (!hit) {
      this.events.push({ type: 'laneBlocked' });
      return;
    }
    // Keep Ep + Ek exactly: any tiny height difference is paid from (or added to) speed.
    const eMech = this.mechanical();
    const q = evalPiece(this.track.lanes[target].pieces[hit.piece], hit.s);
    const ek = eMech - this.mass * G * q.y;
    if (ek < 0) {
      this.events.push({ type: 'laneBlocked' });
      return;
    }
    this.lane = target;
    this.piece = hit.piece;
    this.s = hit.s;
    this.speed = Math.sqrt((2 * ek) / this.mass);
    this.inZone = null;
    this.syncFromGround();
    this.events.push({ type: 'lane', lane: target });
  }

  private matchOnLane(target: number, x: number, y: number, th: number) {
    const lane = this.track.lanes[target];
    for (let pi = 0; pi < lane.pieces.length; pi++) {
      const pc = lane.pieces[pi];
      for (let i = 0; i < pc.poly.length - 1; i++) {
        const a = pc.poly[i];
        const b = pc.poly[i + 1];
        if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
        const t = (x - a.x) / (b.x - a.x);
        // Refine s so that x matches exactly.
        let s = a.s + t * (b.s - a.s);
        for (let it = 0; it < 4; it++) {
          const q = evalPiece(pc, s);
          const c = Math.cos(q.th);
          if (Math.abs(c) < 1e-6) break;
          s += (x - q.x) / c;
        }
        const q = evalPiece(pc, s);
        if (Math.abs(q.y - y) < 0.02 && Math.abs(Math.sin(q.th - th)) < 0.06) return { piece: pi, s };
      }
    }
    return null;
  }

  /** Advance the simulation by dt seconds (fixed substeps). */
  step(dt: number) {
    this.acc += dt;
    while (this.acc >= SUBSTEP) {
      this.acc -= SUBSTEP;
      this.substep(SUBSTEP);
    }
  }

  private substep(h: number) {
    if (this.mode === 'ready' || this.mode === 'bailed') return;
    this.time += h;
    if (this.mode === 'ground') this.groundStep(h);
    else this.airStep(h);
    if (this.y > this.maxY) this.maxY = this.y;
    this.trailClock += h;
    if (this.trailClock >= 0.05) {
      this.trailClock = 0;
      this.recordTrail();
    }
  }

  private groundStep(h: number) {
    const m = this.mass;
    const p0 = this.point();
    const piece = this.pieceObj;
    const sinT = Math.sin(p0.th);
    if (this.speed === 0) {
      if (Math.abs(Math.tan(p0.th)) <= Math.max(REST_TAN, MU[p0.surf] * this.friction)) {
        if (!this.resting) {
          this.resting = true;
          this.events.push({ type: 'rest' });
        }
        return;
      }
      this.dir = sinT > 0 ? -1 : 1;
    }
    this.resting = false;
    const v = this.dir * this.speed;
    const a = -G * sinT;
    let ds = v * h + 0.5 * a * h * h;
    // Turned around inside this step: move forward and let the energy check find where.
    if (this.speed > 0 && ds * this.dir < 0) ds = v * h;
    let s1 = this.s + ds;
    let hitEnd: 0 | 1 | null = null;
    if (s1 >= piece.length) {
      s1 = piece.length;
      hitEnd = 1;
    } else if (s1 <= 0) {
      s1 = 0;
      hitEnd = 0;
    }
    ds = s1 - this.s;
    const pm = evalPiece(piece, this.s + ds / 2);
    const normalAcc = G * Math.cos(pm.th) + this.speed * this.speed * pm.k;
    if (normalAcc < 0) {
      // The ramp curves away faster than gravity can hold the board: airborne.
      this.launch(p0);
      return;
    }
    const loss = MU[pm.surf] * this.friction * m * normalAcc * Math.abs(ds);
    const eMech0 = m * G * p0.y + 0.5 * m * this.speed * this.speed;
    const p1 = evalPiece(piece, s1);
    const ek1 = eMech0 - loss - m * G * p1.y;
    if (ek1 < 0) {
      // Stopped (turned around) somewhere in this step: find where exactly.
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const pt = evalPiece(piece, this.s + ds * mid);
        const f = eMech0 - loss * mid - m * G * pt.y;
        if (f >= 0) lo = mid;
        else hi = mid;
      }
      const sStop = this.s + ds * lo;
      const pt = evalPiece(piece, sStop);
      this.addHeat(pm.surf, eMech0 - m * G * pt.y);
      this.s = sStop;
      this.speed = 0;
      this.events.push({ type: 'turn', y: pt.y });
      this.syncFromGround();
      return;
    }
    this.addHeat(pm.surf, loss);
    this.s = s1;
    this.speed = Math.sqrt((2 * ek1) / m);
    if (p1.surf !== this.lastSurf) {
      this.lastSurf = p1.surf;
      this.events.push({ type: 'surface', surf: p1.surf });
    }
    this.syncFromGround();
    const z = this.currentZone();
    if (z !== this.inZone) {
      if (this.inZone !== null) this.zoneUsed.delete(`${this.lane}:${this.inZone}`);
      this.inZone = z;
    }
    if (hitEnd !== null) this.pieceEnd(hitEnd === 1 ? piece.finishEnd : piece.startEnd);
  }

  private pieceEnd(end: 'wall' | 'launch' | 'bounce') {
    const m = this.mass;
    const ek = 0.5 * m * this.speed * this.speed;
    if (end === 'launch') {
      this.launch(this.point());
      return;
    }
    if (end === 'bounce') {
      const lost = ek * (1 - BOUNCE_E * BOUNCE_E);
      this.addHeat('bump', lost);
      this.speed *= BOUNCE_E;
      this.dir = this.dir === 1 ? -1 : 1;
      this.events.push({ type: 'bonk', heat: lost });
      this.syncFromGround();
      return;
    }
    this.addHeat('bump', ek);
    this.speed = 0;
    this.events.push({ type: 'bonk', heat: ek });
    this.syncFromGround();
  }

  private launch(p: TrackPoint) {
    this.vx = Math.cos(p.th) * this.dir * this.speed;
    this.vy = Math.sin(p.th) * this.dir * this.speed;
    this.x = p.x;
    this.y = p.y;
    this.mode = 'air';
    this.airTime = 0;
    this.events.push({ type: 'launch', speed: this.speed });
  }

  private airStep(h: number) {
    const x0 = this.x;
    const y0 = this.y;
    // Exact ballistic update (no drag): Ep + Ek is conserved in the air.
    const x1 = x0 + this.vx * h;
    const y1 = y0 + this.vy * h - 0.5 * G * h * h;
    const vy1 = this.vy - G * h;
    this.airTime += h;
    const hit = this.findLanding(x0, y0, x1, y1);
    if (hit) {
      this.land(hit.piece, hit.s, y0, this.vx, this.vy, hit.t * h);
      return;
    }
    if (y1 <= this.floorY) {
      const before = this.mechanical();
      this.x = x1;
      this.y = this.floorY;
      this.bailFrom(before, 'pit');
      return;
    }
    this.x = x1;
    this.y = y1;
    this.vy = vy1;
  }

  private findLanding(x0: number, y0: number, x1: number, y1: number) {
    const lane = this.laneObj;
    let best: { piece: number; s: number; t: number } | null = null;
    for (let pi = 0; pi < lane.pieces.length; pi++) {
      const poly = lane.pieces[pi].poly;
      for (let i = 0; i < poly.length - 1; i++) {
        const a = poly[i];
        const b = poly[i + 1];
        const minx = Math.min(a.x, b.x) - 1e-9;
        const maxx = Math.max(a.x, b.x) + 1e-9;
        if (Math.max(x0, x1) < minx || Math.min(x0, x1) > maxx) continue;
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        // Previous point must be on the open side (left of +s direction).
        const side0 = ex * (y0 - a.y) - ey * (x0 - a.x);
        const side1 = ex * (y1 - a.y) - ey * (x1 - a.x);
        if (side0 < -1e-9 || side1 > 0) continue;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        const t = ((a.x - x0) * ey - (a.y - y0) * ex) / den;
        const u = ((a.x - x0) * dy - (a.y - y0) * dx) / den;
        if (t <= 1e-9 || t > 1 || u < 0 || u > 1) continue;
        if (!best || t < best.t) best = { piece: pi, s: a.s + u * (b.s - a.s), t };
      }
    }
    return best;
  }

  private land(piece: number, s: number, ya: number, vx: number, vy0: number, tHit: number) {
    const m = this.mass;
    const before = m * G * ya + 0.5 * m * (vx * vx + vy0 * vy0);
    const vy = vy0 - G * tHit;
    const pc = this.laneObj.pieces[piece];
    const p = evalPiece(pc, s);
    const tx = Math.cos(p.th);
    const ty = Math.sin(p.th);
    const vt = vx * tx + vy * ty;
    const vn = -(vx * -ty + vy * tx); // speed into the surface
    this.piece = piece;
    this.s = s;
    if (vn > BAIL_VN) {
      this.x = p.x;
      this.y = p.y;
      this.bailFrom(before);
      return;
    }
    let speed = Math.abs(vt);
    let after = m * G * p.y + 0.5 * m * speed * speed;
    if (after > before) {
      speed = Math.sqrt(Math.max(0, (2 * (before - m * G * p.y)) / m));
      after = m * G * p.y + 0.5 * m * speed * speed;
    }
    const lost = before - after;
    this.addHeat('landing', lost);
    this.dir = vt >= 0 ? 1 : -1;
    this.speed = speed;
    this.mode = 'ground';
    this.resting = false;
    this.inZone = null;
    this.zoneUsed.clear();
    this.events.push({ type: 'land', vn: Math.max(0, vn), heat: lost });
    this.syncFromGround();
    this.lastSurf = p.surf;
  }

  /** All motion energy turns into heat and sound in the tumble. */
  private bailFrom(mechBefore: number, reason: 'hard-landing' | 'pit' = 'hard-landing') {
    const ep = this.mass * G * this.y;
    this.addHeat('bail', mechBefore - ep);
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.mode = 'bailed';
    this.events.push({ type: 'bail', reason });
    this.recordTrail();
  }

  private addKinetic(dE: number) {
    const ek = 0.5 * this.mass * this.speed * this.speed + dE;
    this.speed = Math.sqrt(Math.max(0, (2 * ek) / this.mass));
    if (this.speed > 0) this.resting = false;
    this.syncFromGround();
  }

  private addHeat(kind: HeatKind, e: number) {
    if (e <= 0) return;
    this.heat += e;
    this.heatBy[kind] = (this.heatBy[kind] ?? 0) + e;
  }

  private syncFromGround() {
    const p = this.point();
    this.x = p.x;
    this.y = p.y;
    this.vx = Math.cos(p.th) * this.dir * this.speed;
    this.vy = Math.sin(p.th) * this.dir * this.speed;
  }

  private recordTrail() {
    this.trail.push({
      t: this.time,
      lane: this.lane,
      x: this.x,
      y: this.y,
      heat: this.heat,
      surf: this.mode === 'ground' || this.mode === 'ready' ? this.point().surf : null,
    });
  }

  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
