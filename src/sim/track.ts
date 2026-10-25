// Authored ramp profiles: each lane is a list of pieces, each piece a chain of
// exact line / circular-arc segments in a vertical plane (x along the line,
// y up, metres). Physics evaluates positions analytically; rendering and
// landing tests use a sampled polyline.

export type Surface = 'smooth' | 'concrete' | 'asphalt' | 'sand' | 'wood' | 'brake';
export type EndType = 'wall' | 'launch' | 'bounce';

export interface Segment {
  kind: 'line' | 'arc';
  s0: number;
  len: number;
  x0: number;
  y0: number;
  th0: number;
  k: number; // curvature 1/R (positive = curving up when moving +s), 0 for lines
  surf: Surface;
}

export interface Piece {
  id: string;
  segs: Segment[];
  length: number;
  startEnd: EndType;
  finishEnd: EndType;
  poly: { x: number; y: number; s: number }[];
}

export interface PumpZone {
  piece: number;
  s0: number;
  s1: number;
}

export interface Lane {
  id: string;
  z: number; // lateral offset of the lane centre (m)
  width: number;
  pieces: Piece[];
  pumpZones: PumpZone[];
}

export interface Track {
  lanes: Lane[];
}

export interface TrackPoint {
  x: number;
  y: number;
  th: number;
  k: number;
  surf: Surface;
}

const POLY_DS = 0.05;

export function evalPiece(p: Piece, s: number): TrackPoint {
  const segs = p.segs;
  let lo = 0;
  let hi = segs.length - 1;
  if (s <= 0) lo = hi = 0;
  else if (s >= p.length) lo = hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid].s0 <= s) lo = mid;
    else hi = mid - 1;
  }
  const g = segs[lo];
  const u = Math.min(Math.max(s - g.s0, 0), g.len);
  if (g.kind === 'line') {
    return { x: g.x0 + u * Math.cos(g.th0), y: g.y0 + u * Math.sin(g.th0), th: g.th0, k: 0, surf: g.surf };
  }
  const th = g.th0 + g.k * u;
  return {
    x: g.x0 + (Math.sin(th) - Math.sin(g.th0)) / g.k,
    y: g.y0 - (Math.cos(th) - Math.cos(g.th0)) / g.k,
    th,
    k: g.k,
    surf: g.surf,
  };
}

/** Builds one lane's pieces from line/arc commands. Angles in degrees. */
export class ProfileBuilder {
  private pieces: Piece[] = [];
  private segs: Segment[] = [];
  private s = 0;
  private x: number;
  private y: number;
  private th: number;
  private surface: Surface = 'smooth';
  private startEnd: EndType = 'wall';
  private pieceId = 'p0';
  private zones: PumpZone[] = [];
  private zoneStart: number | null = null;
  private marks = new Map<string, { piece: number; s: number; x: number; y: number }>();

  constructor(x: number, y: number, thDeg = 0) {
    this.x = x;
    this.y = y;
    this.th = (thDeg * Math.PI) / 180;
  }

  surf(s: Surface): this {
    this.surface = s;
    return this;
  }

  line(len: number): this {
    this.segs.push({ kind: 'line', s0: this.s, len, x0: this.x, y0: this.y, th0: this.th, k: 0, surf: this.surface });
    this.x += len * Math.cos(this.th);
    this.y += len * Math.sin(this.th);
    this.s += len;
    return this;
  }

  /** Horizontal-or-sloped line until x reaches the given value. */
  lineToX(x: number): this {
    const len = (x - this.x) / Math.cos(this.th);
    if (len <= 1e-9) return this;
    return this.line(len);
  }

  /** Arc of radius r turning by dDeg (positive = curving upward when moving +x). */
  arc(r: number, dDeg: number): this {
    const d = (dDeg * Math.PI) / 180;
    const k = Math.sign(d) / r;
    const len = Math.abs(d) * r;
    this.segs.push({ kind: 'arc', s0: this.s, len, x0: this.x, y0: this.y, th0: this.th, k, surf: this.surface });
    const th1 = this.th + d;
    this.x += (Math.sin(th1) - Math.sin(this.th)) / k;
    this.y -= (Math.cos(th1) - Math.cos(this.th)) / k;
    this.th = th1;
    this.s += len;
    return this;
  }

  /** Arc turning until the tangent reaches the absolute angle thDeg. */
  arcTo(r: number, thDeg: number): this {
    return this.arc(r, thDeg - (this.th * 180) / Math.PI);
  }

  pumpOn(): this {
    this.zoneStart = this.s;
    return this;
  }

  pumpOff(): this {
    if (this.zoneStart !== null) {
      this.zones.push({ piece: this.pieces.length, s0: this.zoneStart, s1: this.s });
      this.zoneStart = null;
    }
    return this;
  }

  /** Remember the current position (piece index + arc length) under a name. */
  mark(name: string): this {
    this.marks.set(name, { piece: this.pieces.length, s: this.s, x: this.x, y: this.y });
    return this;
  }

  /** End the current piece and start a new one at (x, y, thDeg) — a gap. */
  gapTo(x: number, y: number, thDeg: number, finishEnd: EndType, startEnd: EndType = 'wall', id?: string): this {
    this.closePiece(finishEnd);
    this.x = x;
    this.y = y;
    this.th = (thDeg * Math.PI) / 180;
    this.startEnd = startEnd;
    this.pieceId = id ?? `p${this.pieces.length}`;
    return this;
  }

  get pos() {
    return { x: this.x, y: this.y, th: (this.th * 180) / Math.PI, s: this.s };
  }

  private closePiece(finishEnd: EndType) {
    if (this.zoneStart !== null) this.pumpOff();
    const piece: Piece = {
      id: this.pieceId,
      segs: this.segs,
      length: this.s,
      startEnd: this.startEnd,
      finishEnd,
      poly: [],
    };
    const n = Math.max(2, Math.ceil(piece.length / POLY_DS) + 1);
    for (let i = 0; i < n; i++) {
      const s = (piece.length * i) / (n - 1);
      const p = evalPiece(piece, s);
      piece.poly.push({ x: p.x, y: p.y, s });
    }
    this.pieces.push(piece);
    this.segs = [];
    this.s = 0;
  }

  build(id: string, z: number, width: number, finishEnd: EndType = 'wall') {
    this.closePiece(finishEnd);
    const lane: Lane = { id, z, width, pieces: this.pieces, pumpZones: this.zones };
    return { lane, marks: this.marks };
  }
}

/** Point on the lane where x matches, if the lane has ground there. */
export function findOnLaneAtX(lane: Lane, x: number, nearY: number): { piece: number; s: number; y: number } | null {
  let best: { piece: number; s: number; y: number } | null = null;
  lane.pieces.forEach((p, pi) => {
    for (let i = 0; i < p.poly.length - 1; i++) {
      const a = p.poly[i];
      const b = p.poly[i + 1];
      if ((a.x - x) * (b.x - x) > 0) continue;
      const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
      const s = a.s + t * (b.s - a.s);
      const pt = evalPiece(p, s);
      if (!best || Math.abs(pt.y - nearY) < Math.abs(best.y - nearY)) best = { piece: pi, s, y: pt.y };
    }
  });
  return best;
}
