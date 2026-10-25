// The energy ring: a donut around the skater split into Ep (top, blue),
// Ek (orange) and heat (red), each arc proportional to its share of the total
// energy, with icon + number pills. Drawn on a 2D overlay canvas.

export interface RingInput {
  cx: number;
  cy: number;
  r: number;
  ep: number;
  ek: number;
  heat: number;
  numbers: boolean;
  alpha: number;
}

export const COLORS = {
  ep: '#2fa8ff',
  epHi: '#6fd3ff',
  ek: '#ff9a1f',
  ekHi: '#ffc35a',
  heat: '#ff3b3b',
  heatHi: '#ff8a7a',
};

function pill(g: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, size: number) {
  g.font = `700 ${size}px Rubik, sans-serif`;
  g.direction = 'ltr';
  const w = g.measureText(text).width + size * 1.1;
  const h = size * 1.6;
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 12;
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y + 1);
}

export function fmtJ(v: number) {
  return `${Math.round(v)} J`;
}

/** The three arcs (fraction of the full circle) and their pill labels. Pure: tested. */
export function ringParts(ep: number, ek: number, heat: number, numbers: boolean) {
  const total = Math.max(1, Math.max(0, ep) + Math.max(0, ek) + Math.max(0, heat));
  return [
    { key: 'ep', v: Math.max(0, ep), icon: '▲' },
    { key: 'ek', v: Math.max(0, ek), icon: '»' },
    { key: 'heat', v: Math.max(0, heat), icon: '🔥' },
  ].map((p) => ({ ...p, frac: p.v / total, label: numbers ? `${p.icon} ${fmtJ(p.v)}` : p.icon }));
}

export function drawRing(g: CanvasRenderingContext2D, o: RingInput) {
  const rp = ringParts(o.ep, o.ek, o.heat, o.numbers);
  const width = Math.max(9, o.r * 0.13);
  g.save();
  g.globalAlpha = o.alpha;
  // Faint base ring.
  g.strokeStyle = 'rgba(111,211,255,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
  g.stroke();
  const tone = [
    [COLORS.ep, COLORS.epHi],
    [COLORS.ek, COLORS.ekHi],
    [COLORS.heat, COLORS.heatHi],
  ];
  const parts = rp.map((p, i) => ({ ...p, c: tone[i][0], hi: tone[i][1] }));
  const gap = 0.05;
  const epA = parts[0].frac * Math.PI * 2;
  let a = -Math.PI / 2 - epA / 2;
  const labels: { x: number; y: number; text: string; c: string }[] = [];
  for (const p of parts) {
    const span = p.frac * Math.PI * 2;
    if (span > gap * 2) {
      g.lineCap = 'round';
      g.strokeStyle = p.c;
      g.shadowColor = p.c;
      g.shadowBlur = 16;
      g.lineWidth = width;
      g.beginPath();
      g.arc(o.cx, o.cy, o.r, a + gap, a + span - gap);
      g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = p.hi;
      g.lineWidth = Math.max(2, width * 0.22);
      g.beginPath();
      g.arc(o.cx, o.cy, o.r - width * 0.18, a + gap, a + span - gap);
      g.stroke();
    }
    if (p.frac > 0.035) {
      const mid = a + span / 2;
      const rr = o.r + width * 0.2;
      labels.push({
        x: o.cx + Math.cos(mid) * rr,
        y: o.cy + Math.sin(mid) * rr,
        text: p.label,
        c: p.c,
      });
    }
    a += span;
  }
  const size = Math.max(12, Math.min(18, o.r * 0.16));
  for (const l of labels) pill(g, l.x, l.y, l.text, l.c, size);
  g.restore();
}

/** Small dark pill with gold border (pump hint, energy-line label). */
export function hintPill(g: CanvasRenderingContext2D, x: number, y: number, text: string, strong: boolean, rtl = true) {
  const size = strong ? 22 : 16;
  g.save();
  g.font = `700 ${size}px Rubik, sans-serif`;
  g.direction = rtl ? 'rtl' : 'ltr';
  const w = g.measureText(text).width + size * 1.4;
  const h = size * 1.7;
  g.fillStyle = 'rgba(20,24,36,0.85)';
  g.strokeStyle = strong ? '#ffd23f' : 'rgba(255,210,63,0.7)';
  g.lineWidth = strong ? 3 : 1.5;
  if (strong) {
    g.shadowColor = '#ffd23f';
    g.shadowBlur = 18;
  }
  g.beginPath();
  g.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.fill();
  g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = strong ? '#ffd23f' : '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y + 1);
  g.restore();
}
