import { Sim } from '../src/sim/physics';
import type { LevelDef } from '../src/sim/levels';

export interface BotOpts {
  start?: number;
  mass?: number;
  /** Pump whenever a zone is available (optionally only after n turns, at most maxPumps). */
  pump?: boolean;
  pumpAfterTurns?: number;
  maxPumps?: number;
  /** Lane to be in as a function of x. */
  route?: (x: number) => number;
  maxT?: number;
  /** Called every substep chunk for invariant checks. */
  onStep?: (sim: Sim) => void;
}

export interface BotResult {
  result: 'goal' | 'rest' | 'bail' | 'timeout';
  sim: Sim;
  maxY: number;
  turns: number;
  turnYs: number[];
  /** Highest speed seen and speed when leaving the ground for the first time. */
  maxSpeed: number;
  launchSpeed: number | null;
  t: number;
}

export function inGoal(level: LevelDef, sim: Sim) {
  const g = level.goal;
  return !!g && sim.mode === 'ground' && sim.x >= g.xMin && sim.x <= g.xMax && sim.y >= g.yMin;
}

export function runBot(level: LevelDef, o: BotOpts = {}): BotResult {
  const st = level.starts[o.start ?? level.firstStart];
  const sim = new Sim(level.track, { mass: o.mass ?? level.mass, floorY: level.floorY, laneSwitch: level.laneSwitch });
  sim.place(st.lane, st.piece, st.s, st.dir);
  sim.drop();
  let turns = 0;
  const turnYs: number[] = [];
  let maxSpeed = 0;
  let launchSpeed: number | null = null;
  const dt = 1 / 60;
  const maxT = o.maxT ?? 60;
  for (let t = 0; t < maxT; t += dt) {
    if (o.route && sim.mode === 'ground') {
      const want = o.route(sim.x);
      if (want !== sim.lane) sim.setLane(want > sim.lane ? sim.lane + 1 : sim.lane - 1);
    }
    if (o.pump && level.pumpAllowed && sim.zoneAvailable() && turns >= (o.pumpAfterTurns ?? 0) && sim.pumps < (o.maxPumps ?? 999)) sim.pump();
    sim.step(dt);
    for (const e of sim.drainEvents()) {
      if (e.type === 'turn') {
        turns++;
        turnYs.push(e.y);
      }
      if (e.type === 'launch' && launchSpeed === null) launchSpeed = e.speed;
    }
    maxSpeed = Math.max(maxSpeed, sim.energies().speed);
    o.onStep?.(sim);
    if (inGoal(level, sim)) return { result: 'goal', sim, maxY: sim.maxY, turns, turnYs, maxSpeed, launchSpeed, t };
    if (sim.mode === 'bailed') return { result: 'bail', sim, maxY: sim.maxY, turns, turnYs, maxSpeed, launchSpeed, t };
    if (sim.mode === 'ground' && sim.resting) return { result: 'rest', sim, maxY: sim.maxY, turns, turnYs, maxSpeed, launchSpeed, t };
  }
  return { result: 'timeout', sim, maxY: sim.maxY, turns, turnYs, maxSpeed, launchSpeed, t: maxT };
}
