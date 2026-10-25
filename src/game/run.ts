// One level attempt-by-attempt: wraps the physics with goals, level scripts,
// stars and the anonymous learning log. No Three.js: the scene and HUD read it.

import { G, PUMP_LIFT } from '../sim/constants';
import { sAtY, type Collectible, type LevelDef } from '../sim/levels';
import { Sim, type Energies, type HeatKind, type SimEvent } from '../sim/physics';
import { evalPiece } from '../sim/track';

export type Phase = 'ready' | 'riding' | 'predict' | 'result' | 'done';
export type Prediction = 'higher' | 'same' | 'lower';

export interface RunSummary {
  ok: boolean;
  reason: 'goal' | 'short' | 'rest' | 'bail' | 'pit' | 'overshoot' | 'runDone';
  e0: number;
  work: number;
  heatBy: Partial<Record<HeatKind, number>>;
  heat: number;
  maxY: number;
  ledgeSpeed: number | null;
  startIndex: number;
  mass: number;
  turnY: number | null;
  vMax: number;
  trail: Sim['trail'];
  lane: number;
}

export interface Feedback {
  kind:
    | 'pump'
    | 'scrub'
    | 'short'
    | 'goal'
    | 'bail'
    | 'star'
    | 'land'
    | 'ollie'
    | 'surface'
    | 'laneBlocked'
    | 'pumpUnlocked'
    | 'hintPump'
    | 'bonk'
    | 'launch'
    | 'drop'
    | 'trick';
  text?: string;
  value?: number;
  x?: number;
  y?: number;
}

export interface LogEntry {
  level: string;
  attempt: number;
  action: string;
  outcome?: string;
  value?: number | string;
  hinted: boolean;
  t: number;
}

const LOG_KEY = 'halfpipe-joule-log-v1';
const PUMP_BUFFER = 0.3;

export class LevelRun {
  readonly level: LevelDef;
  readonly sim: Sim;
  phase: Phase = 'ready';
  attempt = 1;
  fails = 0;
  startIndex: number;
  mass: number;
  backpack = false;
  pumpLocked = false;
  timeScale = 1;
  collected = new Set<string>();
  collectibles: Collectible[] = [];
  feedback: Feedback[] = [];
  summaries: RunSummary[] = [];
  lastSummary: RunSummary | null = null;
  prediction: Prediction | null = null;
  /** Mass level: results of the light and heavy runs. */
  massRuns: RunSummary[] = [];
  tricks = 0;
  /** Set by the scene while the ollie hop animation plays (tricks are allowed). */
  hopping = false;
  trickSpin = 0;
  stars = 0;
  /** Has the player chosen a different start/lane since the level began (for first-choice tracking). */
  firstChoice: number | null = null;
  passesWithoutPump = 0;
  hintPumpShown = false;
  slowmoUsed = false;
  ledgeSpeed: number | null = null;
  vMax = 0;
  private maxX = -Infinity;
  private maxYEnd = -Infinity;
  private turnY: number | null = null;
  private log: LogEntry[] = [];
  private clock = 0;

  constructor(level: LevelDef) {
    this.level = level;
    this.startIndex = level.firstStart;
    this.mass = level.mass;
    this.sim = new Sim(level.track, { mass: level.mass, floorY: level.floorY, laneSwitch: level.laneSwitch });
    if (level.script === 'mass') this.setupStars();
    this.reset();
  }

  /** Mass level stars: one just under the height a run can reach, one well above it. */
  private setupStars() {
    const probe = new Sim(this.level.track, { mass: this.level.mass, floorY: this.level.floorY });
    const st = this.level.starts[0];
    probe.place(st.lane, st.piece, st.s, st.dir);
    probe.drop();
    let turnY = 0;
    for (let i = 0; i < 60 * 6 && turnY === 0; i++) {
      probe.step(1 / 60);
      for (const e of probe.drainEvents()) if (e.type === 'turn') turnY = e.y;
    }
    const p = this.level.track.lanes[0].pieces[0];
    const sLow = sAtY(p, turnY - 0.15, p.length * 0.6, p.length);
    const sHigh = sAtY(p, turnY + 0.45, p.length * 0.6, p.length);
    this.collectibles = [
      { id: 'star', piece: 0, s: sLow, lane: null },
      { id: 'high', piece: 0, s: sHigh, lane: null, high: true },
    ];
  }

  reset() {
    const st = this.level.starts[this.startIndex];
    this.sim.mass = this.mass;
    this.sim.place(st.lane, st.piece, st.s, st.dir);
    this.phase = 'ready';
    this.pumpLocked = this.level.script === 'firstDrop' && this.attempt === 1 && this.fails === 0;
    this.timeScale = 1;
    this.collected.clear();
    this.tricks = 0;
    this.trickSpin = 0;
    this.turnY = null;
    this.ledgeSpeed = null;
    this.vMax = 0;
    this.pumpQueued = null;
    this.maxX = -Infinity;
    this.maxYEnd = -Infinity;
    this.passesWithoutPump = 0;
  }

  // ---------------------------------------------------------------- input
  drop() {
    if (this.phase !== 'ready') return;
    if (this.firstChoice === null) this.firstChoice = this.startIndex;
    this.sim.drop();
    this.phase = 'riding';
    this.record('drop', undefined, this.level.script === 'transfer' || this.level.script === 'gap' ? this.startIndex : undefined);
  }

  /** A press slightly early still counts: it waits up to PUMP_BUFFER s for the curve. */
  private pumpQueued: number | null = null;

  pump() {
    if (this.phase !== 'riding' || !this.level.pumpAllowed || this.pumpLocked) return;
    if (this.sim.zoneAvailable()) {
      this.doPump();
      return;
    }
    if (this.pumpQueued !== null) {
      // A second press while one is waiting: the first was mistimed.
      this.resolveQueued(false);
    }
    this.pumpQueued = this.clock;
  }

  private doPump() {
    const r = this.sim.pump();
    this.pumpQueued = null;
    if (r === 'pump') {
      this.passesWithoutPump = 0;
      this.timeScale = 1;
      this.record('pump', 'good');
    } else if (r === 'scrub') this.record('pump', 'mistimed');
  }

  private resolveQueued(allowPump: boolean) {
    if (this.pumpQueued === null) return;
    if (allowPump && this.sim.zoneAvailable()) {
      this.doPump();
      return;
    }
    this.pumpQueued = null;
    if (this.sim.pump() === 'scrub') this.record('pump', 'mistimed');
  }

  ollie() {
    if (this.phase === 'ready') {
      this.drop();
      return;
    }
    if (this.phase !== 'riding') return;
    if (this.sim.ollie()) this.record('ollie');
  }

  trick() {
    if (this.phase !== 'riding') return;
    if (this.sim.mode !== 'air' && !this.hopping) return;
    this.trickSpin += 1;
    this.tricks++;
    this.feedback.push({ kind: 'trick', text: 'טריק!' });
  }

  /** ← / → : before the drop picks a start (towers, lines); while riding carves lanes. */
  steer(delta: -1 | 1) {
    if (this.phase === 'ready') {
      const n = this.level.starts.length;
      if (n > 1) {
        if (this.mustUseFirstTower) {
          this.feedback.push({ kind: 'laneBlocked' });
          return;
        }
        const next = Math.min(n - 1, Math.max(0, this.startIndex + delta));
        if (next !== this.startIndex) {
          this.startIndex = next;
          this.reset();
        }
        return;
      }
      this.sim.setLane(this.sim.lane + delta);
      return;
    }
    if (this.phase === 'riding') this.sim.setLane(this.sim.lane + delta);
  }

  setPrediction(p: Prediction) {
    if (this.phase !== 'predict') return;
    this.prediction = p;
    this.record('predict', p === 'same' ? 'correct' : 'wrong', p);
    this.backpack = true;
    this.mass = this.level.mass + (this.level.backpack ?? 0);
    this.attempt++;
    this.reset();
  }

  retry() {
    if (this.phase === 'done') return;
    if (this.phase === 'riding' || this.phase === 'ready') this.record('restart');
    this.attempt++;
    this.reset();
  }

  // ---------------------------------------------------------------- update
  update(dt: number) {
    if (this.phase !== 'riding') return;
    this.clock += dt;
    this.sim.step(dt * this.timeScale);
    if (this.pumpQueued !== null) {
      if (this.sim.zoneAvailable()) this.resolveQueued(true);
      else if (this.clock - this.pumpQueued > PUMP_BUFFER) this.resolveQueued(false);
    }
    const en = this.sim.energies();
    this.vMax = Math.max(this.vMax, en.speed);
    for (const e of this.sim.drainEvents()) this.onEvent(e);
    if (this.phase !== 'riding') return;
    this.checkCollectibles();
    this.checkTutorial();
    this.checkEnd(en);
  }

  private onEvent(e: SimEvent) {
    const s = this.sim;
    switch (e.type) {
      case 'pump':
        this.feedback.push({ kind: 'pump', value: e.work, text: `+${Math.round(e.work)} J` });
        break;
      case 'scrub':
        this.feedback.push({ kind: 'scrub', value: e.heat, text: 'לא בזמן' });
        break;
      case 'launch':
        if (this.ledgeSpeed === null) this.ledgeSpeed = e.speed;
        this.feedback.push({ kind: 'launch', value: e.speed });
        break;
      case 'ollie':
        this.feedback.push({ kind: 'ollie', value: e.work });
        break;
      case 'land':
        if (this.trickSpin > 0) this.feedback.push({ kind: 'land', text: 'נחיתה נקייה!', value: e.heat });
        else this.feedback.push({ kind: 'land', value: e.heat });
        this.trickSpin = 0;
        break;
      case 'bail':
        this.feedback.push({ kind: 'bail', text: 'אוי!' });
        this.finish(false, e.reason === 'pit' ? 'pit' : this.level.script === 'gap' && (this.ledgeSpeed ?? 0) > this.level.gapNeed!.v ? 'overshoot' : 'bail');
        break;
      case 'bonk':
        if (e.heat > 5) this.feedback.push({ kind: 'bonk', value: e.heat });
        break;
      case 'surface':
        this.feedback.push({ kind: 'surface', text: e.surf });
        break;
      case 'laneBlocked':
        this.feedback.push({ kind: 'laneBlocked' });
        break;
      case 'turn':
        this.onTurn(e.y);
        break;
      default:
        break;
    }
    void s;
  }

  private onTurn(y: number) {
    const lvl = this.level;
    const x = this.sim.x;
    const goal = lvl.goal;
    const farSide = x > 0;
    if (this.turnY === null && farSide) this.turnY = y;
    if (lvl.pumpAllowed && farSide) this.passesWithoutPump++;
    switch (lvl.script) {
      case 'firstDrop':
        if (farSide && goal && y < goal.yMin) {
          const short = goal.yMin - y;
          this.feedback.push({ kind: 'short', value: short, text: `חסרו ${Math.round(short * 100)} ס״מ`, x, y });
          if (this.pumpLocked) {
            this.pumpLocked = false;
            this.feedback.push({ kind: 'pumpUnlocked' });
          }
        }
        break;
      case 'mass':
        if (farSide) this.finish(true, 'runDone');
        break;
      case 'surfaces':
      case 'transfer':
        if (goal && x > goal.xMin - 6 && y < goal.yMin) {
          this.feedback.push({ kind: 'short', value: goal.yMin - y, text: `חסרו ${Math.round((goal.yMin - y) * 100)} ס״מ`, x, y });
          this.finish(false, 'short');
        }
        break;
      default:
        break;
    }
  }

  private checkTutorial() {
    const lvl = this.level;
    if (lvl.script === 'firstDrop' && !this.pumpLocked && this.sim.pumps === 0 && !this.slowmoUsed) {
      if (this.sim.zoneAvailable()) {
        this.timeScale = 0.3;
        this.slowmoUsed = true;
      }
    }
    if (this.slowmoUsed && this.timeScale < 1 && !this.sim.zoneAvailable()) this.timeScale = 1;
    if (lvl.pumpAllowed && !this.pumpLocked && this.passesWithoutPump >= 3 && !this.hintPumpShown) {
      this.hintPumpShown = true;
      this.feedback.push({ kind: 'hintPump' });
      this.record('hint', 'pump');
    }
  }

  private checkCollectibles() {
    for (const c of this.collectibles) {
      if (this.collected.has(c.id)) continue;
      if (this.sim.mode !== 'ground' || this.sim.piece !== c.piece) continue;
      if (c.lane !== null && this.sim.lane !== c.lane) continue;
      if (this.sim.s >= c.s) {
        this.collected.add(c.id);
        const p = evalPiece(this.sim.pieceObj, c.s);
        this.feedback.push({ kind: 'star', text: c.high ? 'כוכב־על!' : '★', x: p.x, y: p.y });
      }
    }
  }

  private checkEnd(en: Energies) {
    const lvl = this.level;
    const s = this.sim;
    if (lvl.goal && s.mode === 'ground' && s.x >= lvl.goal.xMin && s.x <= lvl.goal.xMax && s.y >= lvl.goal.yMin) {
      if (lvl.script === 'gap') {
        // Let the braking strip stop the rider so the stopping distance shows.
        if (s.resting) this.finish(true, 'goal');
        return;
      }
      this.finish(true, 'goal');
      return;
    }
    // Line levels: rolling back from the final ramp (also after a little hop at the lip) is a miss.
    if ((lvl.script === 'surfaces' || lvl.script === 'transfer') && lvl.goal) {
      this.maxX = Math.max(this.maxX, s.x);
      if (s.x > lvl.goal.xMin - 8) this.maxYEnd = Math.max(this.maxYEnd, s.y);
      if (this.maxX > lvl.goal.xMin - 8 && s.x < this.maxX - 1.5) {
        if (this.turnY === null) this.turnY = this.maxYEnd;
        this.feedback.push({ kind: 'short', value: lvl.goal.yMin - this.turnY, text: 'לא הספיק', x: this.maxX, y: lvl.goal.yMin - 0.4 });
        this.finish(false, 'short');
        return;
      }
    }
    if (s.mode === 'ground' && s.resting) {
      if (lvl.script === 'mass') this.finish(true, 'runDone');
      else this.finish(false, 'rest');
    }
    void en;
  }

  private finish(ok: boolean, reason: RunSummary['reason']) {
    const s = this.sim;
    const sum: RunSummary = {
      ok,
      reason,
      e0: s.e0,
      work: s.work,
      heatBy: { ...s.heatBy },
      heat: s.heat,
      maxY: s.maxY,
      ledgeSpeed: this.ledgeSpeed,
      startIndex: this.startIndex,
      mass: s.mass,
      turnY: this.turnY,
      vMax: this.vMax,
      trail: s.trail.slice(),
      lane: s.lane,
    };
    this.lastSummary = sum;
    this.summaries.push(sum);
    this.timeScale = 1;
    this.record('result', ok ? reason : `fail:${reason}`, Math.round(s.heat));
    if (this.level.script === 'mass') {
      const gotStar = this.collected.has('star');
      sum.ok = gotStar && reason === 'runDone';
      if (!sum.ok) {
        this.fails++;
        this.phase = 'result';
        return;
      }
      this.massRuns.push(sum);
      if (this.massRuns.length === 1) {
        this.phase = 'predict';
        return;
      }
      this.complete();
      return;
    }
    if (ok) {
      this.feedback.push({ kind: 'goal', text: 'יש!' });
      this.complete();
    } else {
      this.fails++;
      this.phase = 'result';
    }
  }

  private complete() {
    this.phase = 'done';
    this.stars = this.computeStars();
    this.record('complete', `${this.stars}★`, this.attempt);
  }

  computeStars(): number {
    let stars = 1;
    const s = this.sim;
    switch (this.level.script) {
      case 'firstDrop':
        if (this.fails === 0) stars++;
        if (s.scrubs === 0) stars++;
        break;
      case 'mass':
        if (this.prediction === 'same') stars++;
        if (this.massRuns.every((r) => r.ok)) stars++;
        break;
      case 'surfaces':
        if (this.fails === 0) stars++;
        if ((s.heatBy.sand ?? 0) + (s.heatBy.asphalt ?? 0) < 30) stars++;
        break;
      case 'pump':
        if (this.fails === 0) stars++;
        if (s.scrubs <= 1) stars++;
        break;
      case 'gap':
        // First run from the smallest tower is a forced demo; the first free choice counts.
        if (this.summaries.filter((r) => r.startIndex !== 0).length === 1) stars++;
        if (this.fails <= 1) stars++;
        break;
      case 'transfer':
        if (this.fails === 0) stars++;
        if (this.firstChoice === 1) stars++;
        break;
    }
    return Math.min(3, stars);
  }

  /** Gap level: after the forced demo from the smallest tower, the player picks freely. */
  get mustUseFirstTower(): boolean {
    return this.level.script === 'gap' && this.summaries.length === 0;
  }

  /** Expected pump work in J for the current rider. */
  get pumpWork(): number {
    return this.mass * G * PUMP_LIFT;
  }

  private record(action: string, outcome?: string, value?: number | string) {
    const entry: LogEntry = {
      level: this.level.id,
      attempt: this.attempt,
      action,
      outcome,
      value,
      hinted: this.hintPumpShown || this.level.hints.energyLine,
      t: Math.round(this.clock * 10) / 10,
    };
    this.log.push(entry);
    try {
      const store = globalThis.localStorage;
      if (store) {
        const all = JSON.parse(store.getItem(LOG_KEY) ?? '[]') as LogEntry[];
        all.push(entry);
        store.setItem(LOG_KEY, JSON.stringify(all.slice(-500)));
      }
    } catch {
      // Storage unavailable (private mode): keep the in-memory log only.
    }
  }

  get learningLog(): LogEntry[] {
    return this.log;
  }

  drainFeedback(): Feedback[] {
    const f = this.feedback;
    this.feedback = [];
    return f;
  }
}
