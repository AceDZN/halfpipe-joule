import { describe, expect, test } from 'vitest';
import { LevelRun } from '../src/game/run';
import { buildLevels } from '../src/sim/levels';
import { evalPiece } from '../src/sim/track';
import { runBot } from './bot';

const L = buildLevels();
const [l1, l2, l3, l4, l5, l6] = L;

describe('1 · First Drop', () => {
  test('without pumping you fall short of the higher deck (friction)', () => {
    const r = runBot(l1, { maxT: 20 });
    expect(r.result).not.toBe('goal');
    expect(r.turnYs[0]).toBeLessThan(l1.goal!.yMin - 0.15);
  });
  test('pumping after the first miss makes it', () => {
    const r = runBot(l1, { pump: true, pumpAfterTurns: 1 });
    expect(r.result).toBe('goal');
    expect(r.sim.pumps).toBeLessThanOrEqual(3);
  });
  test('one key: a press before the curve arms the pump and it fires while climbing', () => {
    const run = new LevelRun(l4);
    run.drop();
    run.update(0.05);
    run.pump(); // still rolling down the wall: arms
    expect(run.armedAt).not.toBeNull();
    for (let i = 0; i < 120 && run.sim.pumps === 0; i++) run.update(1 / 60);
    expect(run.sim.pumps).toBe(1);
    expect(run.sim.scrubs).toBe(0);
  });
  test('the level controller: first pass locked, then pump → done', () => {
    const run = new LevelRun(l1);
    run.drop();
    let pumpedWhileLocked = false;
    for (let i = 0; i < 60 * 30 && run.phase === 'riding'; i++) {
      if (run.sim.zoneAvailable()) {
        if (run.pumpLocked) pumpedWhileLocked = true;
        run.pump();
      }
      run.update(1 / 60);
    }
    expect(pumpedWhileLocked).toBe(true); // the zone was there on the first pass, but locked
    expect(run.phase).toBe('done');
    expect(run.sim.pumps).toBeGreaterThan(0);
  });
});

describe('2 · Same height, any mass', () => {
  test('light and heavy riders turn at the same height with the same top speed', () => {
    const a = runBot(l2, { maxT: 3 });
    const b = runBot(l2, { maxT: 3, mass: 75 });
    expect(b.turnYs[0]).toBeCloseTo(a.turnYs[0], 6);
    expect(b.maxSpeed).toBeCloseTo(a.maxSpeed, 6);
    expect(b.sim.e0).toBeCloseTo(a.sim.e0 * 1.5, 6);
  });
  test('both runs collect the star; the high star is unreachable', () => {
    const run = new LevelRun(l2);
    for (const pred of ['higher', null] as const) {
      run.drop();
      for (let i = 0; i < 600 && run.phase === 'riding'; i++) run.update(1 / 60);
      expect(run.collected.has('star')).toBe(true);
      if (pred) {
        expect(run.phase).toBe('predict');
        run.setPrediction('same');
      }
    }
    expect(run.phase).toBe('done');
    expect(run.massRuns.map((r) => r.mass)).toEqual([50, 75]);
    expect(run.stars).toBe(3);
  });
});

describe('3 · Bad surfaces', () => {
  test('the all-smooth lane reaches the ramp', () => {
    expect(runBot(l3, { start: 2 }).result).toBe('goal');
  });
  test('the asphalt lane and the lane with a sand patch fail', () => {
    for (const start of [0, 1]) expect(runBot(l3, { start, maxT: 25 }).result, `lane ${start}`).not.toBe('goal');
  });
  test('the first (default) lane is the rough one, so a straight drop shows the lesson', () => {
    expect(l3.starts[l3.firstStart].lane).toBe(1);
  });
});

describe('4 · Bowl pump', () => {
  test('the coping is higher than the start: no pumping never makes it', () => {
    expect(l4.goal!.yMin).toBeGreaterThan(l4.starts.length && 1.5);
    expect(runBot(l4, { maxT: 40 }).result).not.toBe('goal');
  });
  test('pumping in every pass reaches it', () => {
    expect(runBot(l4, { pump: true }).result).toBe('goal');
  });
  test('mashing pump all the time does not win', () => {
    // Press every 0.1 s regardless of timing.
    let t = 0;
    const r = runBot(l4, {
      maxT: 40,
      onStep: (sim) => {
        t += 1 / 60;
        if (t > 0.1) {
          t = 0;
          sim.pump();
        }
      },
    });
    expect(r.result).not.toBe('goal');
  });
});

describe('5 · Speed squared', () => {
  test('towers 1× and 2× fall in the pit, 4× lands, 8× overshoots — for any mass', () => {
    for (const mass of [50, 75]) {
      const out = [0, 1, 2, 3].map((i) => runBot(l5, { start: i, mass }));
      expect(out.map((o) => o.result)).toEqual(['bail', 'bail', 'goal', 'bail']);
      const v = out.map((o) => o.launchSpeed!);
      expect(v[0]).toBeLessThan(l5.gapNeed!.v);
      expect(v[1]).toBeLessThan(l5.gapNeed!.v);
      expect(v[2]).toBeGreaterThan(l5.gapNeed!.v);
      // 4× the height gives about twice the speed of the smallest tower.
      expect(v[2] / v[0]).toBeGreaterThan(1.9);
      expect(v[2] / v[0]).toBeLessThan(2.2);
    }
  });
  test('controller: the forced first run is from the smallest tower and fails in the pit', () => {
    const run = new LevelRun(l5);
    run.steer(1);
    expect(run.startIndex).toBe(0);
    run.drop();
    for (let i = 0; i < 600 && run.phase === 'riding'; i++) run.update(1 / 60);
    expect(run.lastSummary!.reason).toBe('pit');
    run.retry();
    run.steer(1);
    run.steer(1);
    expect(run.startIndex).toBe(2);
    run.drop();
    for (let i = 0; i < 1200 && run.phase === 'riding'; i++) run.update(1 / 60);
    expect(run.phase).toBe('done');
  });
});

describe('6 · Transfer: the promenade line (no hints)', () => {
  test('hints are off', () => {
    expect(l6.hints).toEqual({ energyLine: false, ringNumbers: false, pumpGlow: false, formulas: false });
  });
  test('only the bowls line works, and only with pumping', () => {
    for (const mass of [50, 75]) {
      expect(runBot(l6, { start: 1, pump: true, maxPumps: 1, mass }).result).toBe('goal');
      expect(runBot(l6, { start: 1, mass, maxT: 30 }).result).not.toBe('goal');
    }
  });
  test('"just go fast" (straight asphalt line) and the sandy shortcut fail even with every pump', () => {
    for (const start of [0, 2]) {
      expect(runBot(l6, { start, pump: true, maxT: 45 }).result).not.toBe('goal');
      expect(runBot(l6, { start, maxT: 30 }).result).not.toBe('goal');
    }
  });
});

describe('2 · star placement', () => {
  test('the star sits on the far wall just below the reachable height', () => {
    const run = new LevelRun(l2);
    const c = run.collectibles[0];
    const p = evalPiece(l2.track.lanes[0].pieces[c.piece], c.s);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(1.5);
    expect(p.y).toBeLessThan(1.85);
  });
});

describe('one-key flow', () => {
  test('a pump level ends quickly when the player stops pumping (no minute of rocking)', () => {
    for (const l of [l1, l4]) {
      const run = new LevelRun(l);
      run.drop();
      let t = 0;
      for (; t < 60 && run.phase === 'riding'; t += 1 / 60) run.update(1 / 60);
      expect(run.phase, l.id).toBe('result');
      expect(run.lastSummary!.reason).toBe('stalled');
      expect(t, l.id).toBeLessThan(16);
    }
  });
});
