// Authored challenge lines. Heights in metres above the lowest ground of each
// spot (the zero level for Ep). All numbers here are checked by tests.

import { evalPiece, ProfileBuilder, type Lane, type Piece, type Surface, type Track } from './track';

export interface StartSpot {
  lane: number;
  piece: number;
  s: number;
  dir: 1 | -1;
  label?: string;
  /** Drop height label for tower choices (m). */
  dropH?: number;
}

export interface Goal {
  xMin: number;
  xMax: number;
  yMin: number;
}

export interface Collectible {
  id: string;
  piece: number;
  s: number;
  /** Collected when the skater passes this arc length on this piece (any lane if null). */
  lane: number | null;
  high?: boolean;
}

export interface Hints {
  energyLine: boolean;
  ringNumbers: boolean;
  pumpGlow: boolean;
  formulas: boolean;
}

export interface LevelDef {
  id: string;
  area: number;
  grade: 7 | 8 | 9;
  nameHe: string;
  goalHe: string;
  track: Track;
  mass: number;
  backpack?: number;
  starts: StartSpot[];
  /** Index into starts for the first run. */
  firstStart: number;
  goal: Goal | null;
  collectibles: Collectible[];
  hints: Hints;
  camera: 'side' | 'chase';
  floorY: number;
  laneSwitch: 'free' | 'start';
  pumpAllowed: boolean;
  /** Level-specific script handled by the run controller. */
  script: 'firstDrop' | 'mass' | 'surfaces' | 'pump' | 'gap' | 'transfer';
  /** Coping / target marker positions for the scene. */
  copings: { x: number; y: number; target: boolean }[];
  /** Gap requirement shown on a sign (speed in m/s at the ledge). */
  gapNeed?: { x: number; v: number };
  extentX: [number, number];
  /** Named x positions (e.g. where the flat starts) for the scene and tests. */
  xMarks: Record<string, number>;
}

const DEG = Math.PI / 180;

/** Arc length on a piece where the height equals y (first crossing between s0 and s1). */
export function sAtY(p: Piece, y: number, s0 = 0, s1 = p.length): number {
  let lo = s0;
  let hi = s1;
  const f0 = evalPiece(p, lo).y - y;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const f = evalPiece(p, mid).y - y;
    if (Math.sign(f) === Math.sign(f0)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Height reached by a transition of concave radius r and convex lip radius rc at angle a. */
function transHeight(r: number, rc: number, aDeg: number) {
  return (r + rc) * (1 - Math.cos(aDeg * DEG));
}

function transWidth(r: number, rc: number, aDeg: number) {
  return (r + rc) * Math.sin(aDeg * DEG);
}

/**
 * A drop-in wall: convex lip down to 40° (a board starting from rest leaves a
 * convex curve past ~48°, so the lip stays below that), a straight wall, then
 * a concave transition back to flat. Returns the straight length and width.
 */
function dropIn(h: number, tiltDeg: number, rc = 0.8, a = 40, r = 2.6) {
  const t = tiltDeg * DEG;
  const A = a * DEG;
  const lipDrop = rc * (Math.cos(t) - Math.cos(A));
  const transDrop = r * (1 - Math.cos(A));
  const len = (h - lipDrop - transDrop) / Math.sin(A);
  const width = rc * (Math.sin(A) - Math.sin(t)) + len * Math.cos(A) + r * Math.sin(A);
  return { rc, a, r, len, width };
}

// ---------------------------------------------------------------- L1
export const L1 = {
  startH: 2.0,
  farH: 2.1,
  angle: 60,
  rc: 0.8,
  flat: 2.0,
};

function buildFirstDrop(): LevelDef {
  const { startH, farH, angle, rc, flat } = L1;
  const r1 = startH / (1 - Math.cos(angle * DEG)) - rc;
  const r2 = farH / (1 - Math.cos(angle * DEG)) - rc;
  void r1;
  const deck = 1.6;
  const tilt = 5;
  const d = dropIn(startH, tilt);
  const x0 = -(flat / 2 + d.width + deck * Math.cos(tilt * DEG));
  // The start deck tilts gently toward the ramp so you always roll back in.
  const b = new ProfileBuilder(x0, startH + deck * Math.sin(tilt * DEG), -tilt).surf('wood').line(deck).mark('lip1');
  b.surf('smooth').arc(d.rc, -(d.a - tilt)).line(d.len).arc(d.r, d.a / 2).pumpOn().arc(d.r, d.a / 2).line(flat);
  b.arc(r2, angle / 2).pumpOff().arc(r2, angle / 2).arc(rc, -angle).mark('lip2');
  const lip2 = b.pos;
  b.surf('wood').line(3.0);
  const { lane, marks } = b.build('main', 0, 3.2, 'bounce');
  lane.pieces[0].startEnd = 'bounce';
  const lip1 = marks.get('lip1')!;
  return {
    id: 'first-drop',
    area: 1,
    grade: 7,
    nameHe: 'הדרופ הראשון',
    goalHe: 'הגיעו למשטח הגבוה עם הדגל',
    track: { lanes: [lane] },
    mass: 50,
    starts: [{ lane: 0, piece: 0, s: lip1.s + 0.12, dir: 1 }],
    firstStart: 0,
    goal: { xMin: lip2.x + 0.25, xMax: lip2.x + 3.0, yMin: farH - 0.02 },
    collectibles: [],
    hints: { energyLine: true, ringNumbers: true, pumpGlow: true, formulas: false },
    camera: 'side',
    floorY: -1,
    laneSwitch: 'free',
    pumpAllowed: true,
    script: 'firstDrop',
    copings: [
      { x: lip1.x, y: startH, target: false },
      { x: lip2.x, y: farH, target: true },
    ],
    extentX: [x0, lip2.x + 3.0],
    xMarks: {},
  };
}

// ---------------------------------------------------------------- L2
export const L2 = { startH: 2.0, angle: 60, rc: 0.8, flat: 2.4, wallR: 3.0, wallTop: 3.2 };

function buildMass(): LevelDef {
  const { startH, angle, rc, flat, wallR } = L2;
  void angle;
  void rc;
  const deck = 1.6;
  const tilt = 5;
  const d = dropIn(startH, tilt);
  const x0 = -(flat / 2 + d.width + deck * Math.cos(tilt * DEG));
  const b = new ProfileBuilder(x0, startH + deck * Math.sin(tilt * DEG), -tilt).surf('wood').line(deck).mark('lip1');
  b.surf('smooth').arc(d.rc, -(d.a - tilt)).line(d.len).arc(d.r, d.a).line(flat);
  // Tall quarter-pipe wall: concave up to 80° then a straight extension.
  b.arc(wallR, 80).line(1.0);
  const top = b.pos;
  const { lane, marks } = b.build('main', 0, 3.2, 'bounce');
  lane.pieces[0].startEnd = 'bounce';
  const lip1 = marks.get('lip1')!;
  return {
    id: 'same-height',
    area: 2,
    grade: 7,
    nameHe: 'כבד או קל?',
    goalHe: 'אספו את הכוכב — פעם בלי תיק ופעם עם תיק כבד',
    track: { lanes: [lane] },
    mass: 50,
    backpack: 25,
    starts: [{ lane: 0, piece: 0, s: lip1.s + 0.12, dir: 1 }],
    firstStart: 0,
    goal: null,
    // Star heights are placed by the level script from the measured turn height.
    collectibles: [],
    hints: { energyLine: true, ringNumbers: true, pumpGlow: false, formulas: false },
    camera: 'side',
    floorY: -1,
    laneSwitch: 'free',
    pumpAllowed: false,
    script: 'mass',
    copings: [
      { x: lip1.x, y: startH, target: false },
      { x: top.x, y: top.y, target: false },
    ],
    extentX: [x0, top.x + 0.5],
    xMarks: {},
  };
}

// ---------------------------------------------------------------- L3
export const L3 = {
  towerH: 3.0,
  flatLen: 34,
  targetH: 2.45,
  lanes: [
    // [surface, length] runs along the flat, per lane (z from right to left)
    [['smooth', 12], ['sand', 10], ['smooth', 12]],
    [['asphalt', 34]],
    [['sand', 6], ['smooth', 20], ['asphalt', 8]],
  ] as [Surface, number][][],
};

function buildSurfaces(): LevelDef {
  const { towerH, targetH } = L3;
  const deck = 2.0;
  const dropR = 4.0;
  const dropRc = 1.0;
  const dropA = 40;
  const qpA = 60;
  const qpRc = 0.8;
  const qpR = targetH / (1 - Math.cos(qpA * DEG)) - qpRc;
  const dropRise = transHeight(dropR, dropRc, dropA);
  // Straight slope fills the rest of the tower height.
  const slopeLen = (towerH - dropRise) / Math.sin(dropA * DEG);
  const lanes: Lane[] = [];
  let goal: LevelDef['goal'] = null;
  let startS = 0;
  let lip2x = 0;
  let flatX0 = 0;
  L3.lanes.forEach((runs, i) => {
    const b = new ProfileBuilder(-deck, towerH, 0).surf('wood').line(deck).mark('lip');
    b.surf('smooth').arc(dropRc, -dropA).line(slopeLen).arc(dropR, dropA);
    flatX0 = b.pos.x;
    for (const [surf, len] of runs) b.surf(surf).line(len);
    b.surf('smooth').arc(qpR, qpA).arc(qpRc, -qpA).mark('lip2');
    lip2x = b.pos.x;
    b.surf('wood').line(3.0);
    const { lane, marks } = b.build(`lane${i}`, (1 - i) * 2.3, 2.2, 'bounce');
    startS = marks.get('lip')!.s + 0.15;
    lanes.push(lane);
  });
  goal = { xMin: lip2x + 0.25, xMax: lip2x + 3, yMin: targetH - 0.02 };
  return {
    id: 'bad-surfaces',
    area: 3,
    grade: 8,
    nameHe: 'משטחים רעים',
    goalHe: 'הגיעו לרמפה בסוף — בחרו את הנתיב החלק',
    track: { lanes },
    mass: 50,
    starts: [{ lane: 1, piece: 0, s: startS, dir: 1 }],
    firstStart: 0,
    goal,
    collectibles: [],
    hints: { energyLine: true, ringNumbers: true, pumpGlow: false, formulas: false },
    camera: 'chase',
    floorY: -1,
    laneSwitch: 'free',
    pumpAllowed: false,
    script: 'surfaces',
    copings: [{ x: lip2x, y: targetH, target: true }],
    extentX: [-deck, lip2x + 3],
    xMarks: { flat: flatX0 },
  };
}

// ---------------------------------------------------------------- L4
export const L4 = { startH: 1.5, targetH: 2.4, wallR: 3.0, flat: 2.0 };

function buildPump(): LevelDef {
  const { startH, targetH, wallR, flat } = L4;
  const rc = 0.8;
  const a = 60;
  const r2 = targetH / (1 - Math.cos(a * DEG)) - rc;
  const wallA = 80;
  const ext = 1.0;
  // Start at the top of the tall left wall, heading down (+x).
  const xTop = -(flat / 2 + wallR * Math.sin(wallA * DEG) + ext * Math.cos(wallA * DEG));
  const yTop = wallR * (1 - Math.cos(wallA * DEG)) + ext * Math.sin(wallA * DEG);
  const b = new ProfileBuilder(xTop, yTop, -wallA).surf('smooth').line(ext);
  b.arc(wallR, wallA / 2).pumpOn().arc(wallR, wallA / 2).line(flat).arc(r2, a / 2).pumpOff().arc(r2, a / 2);
  b.arc(rc, -a).mark('lip2');
  const lip2 = b.pos;
  b.surf('wood').line(3.0);
  const { lane } = b.build('main', 0, 3.4, 'bounce');
  lane.pieces[0].startEnd = 'bounce';
  const p0 = lane.pieces[0];
  const sStart = sAtY(p0, startH, 0, ext + (wallR * wallA * DEG) / 2 + 0.5);
  return {
    id: 'bowl-pump',
    area: 4,
    grade: 7,
    nameHe: 'שאיבה בקערה',
    goalHe: 'הגיעו לשפה הגבוהה — היא גבוהה מנקודת ההתחלה!',
    track: { lanes: [lane] },
    mass: 50,
    starts: [{ lane: 0, piece: 0, s: sStart, dir: 1 }],
    firstStart: 0,
    goal: { xMin: lip2.x + 0.25, xMax: lip2.x + 3, yMin: targetH - 0.02 },
    collectibles: [],
    hints: { energyLine: true, ringNumbers: true, pumpGlow: true, formulas: false },
    camera: 'side',
    floorY: -1,
    laneSwitch: 'free',
    pumpAllowed: true,
    script: 'pump',
    copings: [
      { x: lip2.x, y: targetH, target: true },
      { x: xTop, y: yTop, target: false },
    ],
    extentX: [xTop - 0.5, lip2.x + 3],
    xMarks: {},
  };
}

// ---------------------------------------------------------------- L5
export const L5 = {
  ledgeY: 1.6,
  drops: [0.5, 1.0, 2.0, 4.0],
  gap: 1.6,
  landDrop: 0.45,
  landA: 25,
  needV: 5.4,
};

function buildGap(): LevelDef {
  const { ledgeY, drops, gap, landDrop, landA } = L5;
  const runup = 3.0;
  const lanes: Lane[] = [];
  const starts: StartSpot[] = [];
  const ledgeX = 0;
  const landY = ledgeY - landDrop;
  const landR = 2.0;
  const landLine = (landY - landR * (1 - Math.cos(landA * DEG))) / Math.sin(landA * DEG);
  drops.forEach((dh, i) => {
    const towerA = 40;
    const rc = 0.5;
    const r = 2.5;
    const rise = transHeight(r, rc, towerA);
    const slope = Math.max(0, (dh - rise) / Math.sin(towerA * DEG));
    // Small drops: shrink the transition so its height equals dh.
    let rr = r;
    let rcc = rc;
    if (dh < rise) {
      const scale = dh / rise;
      rr = r * scale;
      rcc = rc * scale;
    }
    const width = transWidth(rr, rcc, towerA) + slope * Math.cos(towerA * DEG);
    const deck = 1.6;
    const xStart = ledgeX - runup - width - deck;
    const b = new ProfileBuilder(xStart, ledgeY + dh, 0).surf('wood').line(deck).mark('lip');
    b.surf('smooth').arc(rcc, -towerA);
    if (slope > 0) b.line(slope);
    b.arc(rr, towerA).lineToX(ledgeX);
    // Landing ramp on the far side of the gap, then a braking strip.
    b.gapTo(ledgeX + gap, landY, -landA, 'launch', 'wall', 'landing');
    b.surf('smooth').line(landLine).arc(landR, landA);
    b.surf('concrete').line(1.5).mark('brake');
    b.surf('brake').line(12);
    const { lane, marks } = b.build(`tower${i}`, (i - 1.5) * 2.6, 2.2, 'bounce');
    lane.pieces[0].startEnd = 'bounce';
    lanes.push(lane);
    starts.push({ lane: i, piece: 0, s: marks.get('lip')!.s + 0.1, dir: 1, dropH: dh, label: `Δh = ${dh} m` });
  });
  const land = lanes[0].pieces[1];
  const landEnd = evalPiece(land, landLine + landR * landA * DEG).x;
  return {
    id: 'speed-squared',
    area: 5,
    grade: 9,
    nameHe: 'מהירות בריבוע',
    goalHe: 'קפצו מעל הפער ונחתו על הרמפה',
    track: { lanes },
    mass: 50,
    starts,
    firstStart: 0,
    goal: { xMin: landEnd, xMax: landEnd + 20, yMin: -0.05 },
    collectibles: [],
    hints: { energyLine: false, ringNumbers: true, pumpGlow: false, formulas: true },
    camera: 'chase',
    floorY: 0.0,
    laneSwitch: 'start',
    pumpAllowed: false,
    script: 'gap',
    copings: [],
    gapNeed: { x: ledgeX, v: L5.needV },
    extentX: [lanes[3].pieces[0].poly[0].x, landEnd + 14],
    xMarks: { ledge: ledgeX, landEnd, brake: lanes[0].pieces[1].poly[0].x },
  };
}

// ---------------------------------------------------------------- L6
export const L6 = {
  startH: 3.5,
  targetH: 3.15,
  endX: 36,
};

function buildTransfer(): LevelDef {
  const { startH, targetH, endX } = L6;
  const deck = 2.0;
  const qpA = 60;
  const qpRc = 0.8;
  const qpR = targetH / (1 - Math.cos(qpA * DEG)) - qpRc;
  const qpW = transWidth(qpR, qpRc, qpA);
  const qpStart = endX - qpW;
  const dropA = 40;
  const dropR = 4;
  const dropRc = 1;
  const rise = transHeight(dropR, dropRc, dropA);
  const slope = (startH - rise) / Math.sin(dropA * DEG);
  const lanes: Lane[] = [];
  let startS = 0;

  const begin = () => {
    const b = new ProfileBuilder(-deck, startH, 0).surf('wood').line(deck).mark('lip');
    b.surf('smooth').arc(dropRc, -dropA).line(slope).arc(dropR, dropA / 2).pumpOn().arc(dropR, dropA / 2);
    return b;
  };
  const finish = (b: ProfileBuilder, id: string, z: number) => {
    b.lineToX(qpStart - 1.5);
    b.surf('smooth').line(1.5).arc(qpR, qpA / 2).pumpOff().arc(qpR, qpA / 2).arc(qpRc, -qpA);
    b.surf('wood').line(3);
    const { lane, marks } = b.build(id, z, 2.4, 'bounce');
    lane.pieces[0].startEnd = 'bounce';
    startS = marks.get('lip')!.s + 0.15;
    return lane;
  };

  // Lane 0 — "the fast line": straight and long on rough asphalt.
  {
    const b = begin();
    b.line(1).pumpOff().surf('asphalt').lineToX(qpStart - 1.5);
    b.pumpOn();
    lanes.push(finish(b, 'fast', 2.6));
  }
  // Lane 1 — "the bowls": smooth concrete with two dips you can pump in.
  {
    const b = begin();
    b.line(1).pumpOff().surf('smooth').line(3);
    for (let d = 0; d < 2; d++) {
      const dipA = 12;
      const cvx = 14;
      const ccv = 4;
      b.arc(cvx, -dipA).line(0.4).arc(ccv, dipA / 2).pumpOn().arc(ccv, dipA / 2).line(0.8);
      b.arc(ccv, dipA / 2).pumpOff().arc(ccv, dipA / 2).line(0.4).arc(cvx, -dipA).line(1.0);
    }
    b.pumpOn();
    lanes.push(finish(b, 'bowls', 0));
  }
  // Lane 2 — "the shortcut": smooth but crosses a sand patch.
  {
    const b = begin();
    b.line(1).pumpOff().surf('smooth').line(8).surf('sand').line(3.5).surf('smooth');
    b.pumpOn();
    lanes.push(finish(b, 'sandy', -2.6));
  }
  const lip2x = endX;
  return {
    id: 'promenade-line',
    area: 6,
    grade: 9,
    nameHe: 'קו הטיילת',
    goalHe: 'בחרו קו אחד שיביא אתכם לרמפה בסוף. בלי רמזים!',
    track: { lanes },
    mass: 50,
    starts: [0, 1, 2].map((lane) => ({ lane, piece: 0, s: startS, dir: 1 as const })),
    firstStart: 1,
    goal: { xMin: lip2x + 0.25, xMax: lip2x + 3, yMin: targetH - 0.02 },
    collectibles: [],
    hints: { energyLine: false, ringNumbers: false, pumpGlow: false, formulas: false },
    camera: 'chase',
    floorY: -1,
    laneSwitch: 'start',
    pumpAllowed: true,
    script: 'transfer',
    copings: [{ x: lip2x, y: targetH, target: true }],
    extentX: [-deck, lip2x + 3],
    xMarks: {},
  };
}

export function buildLevels(): LevelDef[] {
  return [buildFirstDrop(), buildMass(), buildSurfaces(), buildPump(), buildGap(), buildTransfer()];
}
