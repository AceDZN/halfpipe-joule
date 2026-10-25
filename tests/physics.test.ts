import { describe, expect, test } from 'vitest';
import { G, MU, PUMP_LIFT } from '../src/sim/constants';
import { buildLevels } from '../src/sim/levels';
import { Sim } from '../src/sim/physics';
import { ProfileBuilder } from '../src/sim/track';
import { ringParts } from '../src/ui/ring';
import { runBot } from './bot';

const levels = buildLevels();

/** A symmetric halfpipe: flat 2 m between two 3 m-radius transitions up to 80°. */
function halfpipe() {
  const b = new ProfileBuilder(-5, 3, -80).surf('smooth');
  b.line(0.4).arc(3, 80).line(2).arc(3, 80).line(0.4);
  return { lanes: [b.build('hp', 0, 3).lane] };
}

describe('energy bookkeeping', () => {
  test('Ep + Ek + heat = E0 + work at every sampled frame, in every level and strategy', () => {
    const strategies = [{}, { pump: true }, { pump: true, maxPumps: 1 }];
    for (const level of levels) {
      for (let st = 0; st < level.starts.length; st++) {
        for (const o of strategies) {
          let worst = 0;
          let lastHeat = 0;
          runBot(level, {
            ...o,
            start: st,
            maxT: 25,
            onStep: (sim) => {
              const e = sim.energies();
              worst = Math.max(worst, Math.abs(e.total - (e.e0 + e.work)));
              expect(e.heat).toBeGreaterThanOrEqual(lastHeat - 1e-9);
              lastHeat = e.heat;
            },
          });
          expect(worst, `${level.id} start ${st}`).toBeLessThan(0.05);
        }
      }
    }
  });

  test('energies() are exactly m·g·h and ½·m·v² of the simulated state', () => {
    const sim = runBot(levels[0], { maxT: 1.3 }).sim;
    const e = sim.energies();
    expect(e.ep).toBeCloseTo(sim.mass * G * sim.y, 9);
    expect(e.ek).toBeCloseTo(0.5 * sim.mass * (sim.vx ** 2 + sim.vy ** 2), 9);
    expect(e.hMax).toBeCloseTo((e.ep + e.ek) / (sim.mass * G), 9);
  });

  test('the ring shows the physics module numbers (rounded joules) and arc shares', () => {
    for (const t of [0.4, 0.9, 1.6, 2.5]) {
      const sim = runBot(levels[0], { maxT: t }).sim;
      const e = sim.energies();
      const parts = ringParts(e.ep, e.ek, e.heat, true);
      expect(parts[0].label).toBe(`▲ ${Math.round(e.ep)} J`);
      expect(parts[1].label).toBe(`» ${Math.round(e.ek)} J`);
      expect(parts[2].label).toBe(`🔥 ${Math.round(e.heat)} J`);
      const sum = parts.reduce((s, p) => s + p.frac, 0);
      expect(sum).toBeCloseTo(1, 9);
      expect(parts[0].frac).toBeCloseTo(e.ep / e.total, 9);
    }
  });

  test('numbers can be hidden (transfer level) but arcs stay', () => {
    const parts = ringParts(500, 300, 200, false);
    expect(parts.map((p) => p.label)).toEqual(['▲', '»', '🔥']);
    expect(parts[0].frac).toBeCloseTo(0.5, 9);
  });
});

describe('conservation without friction', () => {
  test('a skater never rises above the release height, and returns to it', () => {
    const track = halfpipe();
    const sim = new Sim(track, { mass: 50, friction: 0 });
    const p = track.lanes[0].pieces[0];
    // Release at 2.0 m on the left wall.
    let s = 0;
    for (; s < p.length; s += 0.001) {
      sim.place(0, 0, s, 1);
      if (sim.y <= 2.0) break;
    }
    sim.place(0, 0, s, 1);
    const h0 = sim.y;
    sim.drop();
    const turns: number[] = [];
    for (let i = 0; i < 60 * 12; i++) {
      sim.step(1 / 60);
      for (const e of sim.drainEvents()) if (e.type === 'turn') turns.push(e.y);
      expect(sim.y).toBeLessThanOrEqual(h0 + 1e-6);
    }
    expect(turns.length).toBeGreaterThan(4);
    for (const y of turns) expect(y).toBeCloseTo(h0, 4);
  });

  test('speed at the bottom is √(2gh) and does not depend on mass', () => {
    for (const m of [30, 50, 100]) {
      const track = halfpipe();
      const sim = new Sim(track, { mass: m, friction: 0 });
      let s = 0;
      for (; s < 10; s += 0.0005) {
        sim.place(0, 0, s, 1);
        if (sim.y <= 2.0) break;
      }
      sim.place(0, 0, s, 1);
      const h0 = sim.y;
      sim.drop();
      let vmax = 0;
      let yLow = Infinity;
      for (let i = 0; i < 120; i++) {
        sim.step(1 / 60);
        vmax = Math.max(vmax, sim.energies().speed);
        yLow = Math.min(yLow, sim.y);
      }
      // Speed depends only on the height dropped: v = √(2·g·Δh).
      expect(vmax).toBeCloseTo(Math.sqrt(2 * G * (h0 - yLow)), 3);
    }
  });

  test('doubling the speed quadruples Ek', () => {
    const ek = (m: number, v: number) => 0.5 * m * v * v;
    expect(ek(50, 8) / ek(50, 4)).toBeCloseTo(4, 12);
  });
});

describe('friction and work', () => {
  test('rough surfaces turn more energy into heat per metre (asphalt and sand vs smooth)', () => {
    const heatPerMetre = (surf: 'smooth' | 'asphalt' | 'sand') => {
      const b = new ProfileBuilder(0, 0, 0).surf(surf).line(40);
      const sim = new Sim({ lanes: [b.build('f', 0, 2).lane] }, { mass: 50 });
      sim.place(0, 0, 1, 1);
      sim.drop();
      // Give it 400 J of speed by work, then roll 1 s.
      (sim as unknown as { addKinetic(e: number): void }).addKinetic(400);
      const x0 = sim.x;
      sim.step(0.5);
      return sim.heat / (sim.x - x0);
    };
    const smooth = heatPerMetre('smooth');
    expect(smooth).toBeCloseTo(MU.smooth * 50 * G, 6);
    expect(heatPerMetre('asphalt')).toBeGreaterThan(smooth * 4);
    expect(heatPerMetre('sand')).toBeGreaterThan(smooth * 15);
  });

  test('a well-timed pump (climbing a curve) adds exactly m·g·0.3 m of work; mistimed pumps scrub speed into heat', () => {
    const r = runBot(levels[3], { pump: true, maxPumps: 1 });
    expect(r.sim.work).toBeCloseTo(50 * G * PUMP_LIFT, 9);
    const sim = new Sim(levels[3].track, { mass: 50 });
    const st = levels[3].starts[0];
    sim.place(st.lane, st.piece, st.s, st.dir);
    sim.drop();
    sim.step(0.15); // rolling DOWN the curve: in the zone but not climbing, so not the moment
    expect(sim.climbing()).toBe(false);
    expect(sim.zoneAvailable()).toBe(false);
    const before = sim.mechanical();
    expect(sim.pump()).toBe('scrub');
    expect(sim.mechanical()).toBeLessThan(before);
    expect(sim.heatBy.scrub).toBeGreaterThan(0);
  });
});
