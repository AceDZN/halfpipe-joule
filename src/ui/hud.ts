// DOM HUD: top bar, objective, key hint, energy bank, formula card, cards,
// floating texts, projected labels and touch controls. Hebrew RTL; numbers,
// units and formulas are LTR spans.

import type { Energies } from '../sim/physics';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export const ltr = (s: string) => `<bdi class="ltr" dir="ltr">${s}</bdi>`;
export const J = (v: number) => ltr(`${Math.round(v)} J`);

export class Hud {
  readonly root: HTMLElement;
  readonly title = el('div', 'title');
  readonly stars = el('div', 'stars');
  readonly objective = el('div', 'objective');
  readonly keyhint = el('div', 'keyhint');
  readonly bank = el('div', 'bank');
  readonly floats = el('div');
  readonly labels = el('div');
  readonly cardHost = el('div');
  readonly screenHost = el('div');
  readonly replayTag = el('div', 'replay-tag', '▶ ריפליי');
  readonly btnMute: HTMLButtonElement;
  readonly btnPause: HTMLButtonElement;
  readonly btnRestart: HTMLButtonElement;
  readonly btnMenu: HTMLButtonElement;
  readonly touch = el('div', 'touch');
  readonly tLeft = el('button', 'tbtn t-left interactive', '<span dir="ltr">◀</span>');
  readonly tRight = el('button', 'tbtn t-right interactive', '<span dir="ltr">▶</span>');
  /** The one game button (touch): drop in, then pump. */
  readonly tGo = el('button', 'tbtn t-go interactive', 'יוצאים!');
  private bankParts: { ep: HTMLElement; ek: HTMLElement; heat: HTMLElement; vals: HTMLElement[]; read: HTMLElement; work: HTMLElement; formula: HTMLElement; note: HTMLElement };
  private labelPool = new Map<string, HTMLElement>();

  constructor(root: HTMLElement) {
    this.root = root;
    const top = el('div', 'topbar interactive');
    const btns = el('div', 'btns');
    this.btnMenu = el('button', 'round', '☰');
    this.btnMenu.title = 'תפריט';
    this.btnRestart = el('button', 'round', '↻');
    this.btnRestart.title = 'שוב (R)';
    this.btnPause = el('button', 'round', '❚❚');
    this.btnPause.title = 'השהיה (P)';
    this.btnMute = el('button', 'round', '🔊');
    this.btnMute.title = 'צליל (M)';
    btns.append(this.btnMenu, this.btnRestart, this.btnPause, this.btnMute);
    top.append(this.title, this.stars, btns);
    root.append(top, this.objective, this.keyhint);

    // Energy bank: Ep | Ek | heat (blue, orange, red), readouts, formula card.
    this.bank.innerHTML = `
      <h3><span class="bolt">⚡</span> בנק אנרגיה</h3>
      <div class="cols">
        <div class="col ep"><span class="icon">▲ <small>גובה</small></span><div class="fill"></div><span class="val"></span></div>
        <div class="col ek"><span class="icon">» <small>תנועה</small></span><div class="fill"></div><span class="val"></span></div>
        <div class="col heat"><span class="icon">🔥 <small>חום</small></span><div class="fill"></div><span class="val"></span></div>
      </div>
      <div class="hidden-note" hidden>המספרים מוסתרים בשלב הזה</div>
      <div class="readouts"></div>
      <div class="work"></div>
      <div class="formula" hidden></div>`;
    const q = (s: string) => this.bank.querySelector(s) as HTMLElement;
    this.bankParts = {
      ep: q('.ep .fill'),
      ek: q('.ek .fill'),
      heat: q('.heat .fill'),
      vals: [q('.ep .val'), q('.ek .val'), q('.heat .val')],
      read: q('.readouts'),
      work: q('.work'),
      formula: q('.formula'),
      note: q('.hidden-note'),
    };
    root.append(this.bank, this.labels, this.floats, this.replayTag, this.cardHost);
    this.replayTag.hidden = true;
    this.touch.append(this.tLeft, this.tRight, this.tGo);
    root.append(this.touch, this.screenHost);
  }

  setTitle(n: number, name: string) {
    this.title.innerHTML = `שלב ${n} · ${name}`;
  }

  setStars(earned: number, show = true) {
    this.stars.hidden = !show;
    this.stars.innerHTML = [0, 1, 2].map((i) => `<span class="${i < earned ? '' : 'off'}">★</span>`).join('');
  }

  setObjective(text: string) {
    this.objective.innerHTML = text;
    this.objective.hidden = !text;
  }

  setKeyHint(html: string, pulse = true) {
    this.keyhint.innerHTML = html;
    this.keyhint.hidden = !html;
    this.keyhint.classList.toggle('pulse', pulse && !document.body.classList.contains('reduced'));
  }

  updateBank(en: Energies, o: { mass: number; numbers: boolean; formulas: boolean; scale: number }) {
    const b = this.bankParts;
    const scale = Math.max(1, o.scale);
    const pct = (v: number) => `${Math.max(0, Math.min(1, v / scale)) * 82}px`;
    b.ep.style.height = pct(en.ep);
    b.ek.style.height = pct(en.ek);
    b.heat.style.height = pct(en.heat);
    const vals = [en.ep, en.ek, en.heat];
    b.vals.forEach((v, i) => (v.textContent = o.numbers ? `${Math.round(vals[i])} J` : '?'));
    b.note.hidden = o.numbers;
    b.read.innerHTML = o.numbers
      ? `<div>m = ${o.mass} kg</div><div>h = ${en.height.toFixed(1)} m</div><div>v = ${en.speed.toFixed(1)} m/s</div>`
      : `<div>m = ${o.mass} kg</div><div>h = ?</div><div>v = ?</div>`;
    b.work.innerHTML = en.work > 0.5 && o.numbers ? `💪 עבודה מהשרירים: ${J(en.work)}` : '';
    b.formula.hidden = !o.formulas;
    if (o.formulas) {
      const h = Math.max(0, en.height);
      b.formula.innerHTML =
        `<div><i>E</i><sub>p</sub> = <i>m·g·h</i> = ${o.mass}·10·${h.toFixed(2)} = <span class="r-ep">${Math.round(en.ep)} J</span></div>` +
        `<div><i>E</i><sub>k</sub> = ½·<i>m·v</i>² = ½·${o.mass}·${en.speed.toFixed(2)}² = <span class="r-ek">${Math.round(en.ek)} J</span></div>`;
    }
  }

  floatText(x: number, y: number, html: string, cls = '') {
    const f = el('div', `float ${cls}`, html);
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    this.floats.append(f);
    setTimeout(() => f.remove(), 1500);
  }

  bubble(x: number, y: number, text: string) {
    const f = el('div', 'bubble', text);
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    this.floats.append(f);
    setTimeout(() => f.remove(), 1700);
  }

  /** Projected label in the scene, reused by key. `start` makes it a tappable start choice. */
  label(key: string, x: number, y: number, html: string, cls = '', visible = true, start?: number) {
    let l = this.labelPool.get(key);
    if (!l) {
      l = el('div', 'label3d');
      this.labelPool.set(key, l);
      this.labels.append(l);
    }
    if (start !== undefined) l.dataset.start = String(start);
    l.className = `label3d ${cls}`;
    if (l.innerHTML !== html) l.innerHTML = html;
    // Keep labels on screen (pinned to the edges) and below the top bar.
    const W = this.root.clientWidth;
    const H = this.root.clientHeight;
    const half = Math.min(110, l.offsetWidth / 2 || 60);
    l.style.left = `${Math.min(Math.max(x, half + 6), W - half - 6)}px`;
    l.style.top = `${Math.min(Math.max(y, 112), H - 80)}px`;
    l.hidden = !visible;
  }

  hideLabels(prefix?: string) {
    for (const [k, l] of this.labelPool) if (!prefix || k.startsWith(prefix)) l.hidden = true;
  }

  clearLabels() {
    this.labelPool.forEach((l) => l.remove());
    this.labelPool.clear();
  }

  showCard(html: string, center = false): HTMLElement {
    this.cardHost.innerHTML = '';
    const c = el('div', `card${center ? ' center' : ''} interactive`, html);
    this.cardHost.append(c);
    return c;
  }

  hideCard() {
    this.cardHost.innerHTML = '';
  }

  get cardOpen() {
    return this.cardHost.childElementCount > 0;
  }

  showScreen(html: string): HTMLElement {
    this.screenHost.innerHTML = '';
    const s = el('div', 'screen', `<div class="box">${html}</div>`);
    this.screenHost.append(s);
    return s;
  }

  hideScreen() {
    this.screenHost.innerHTML = '';
  }

  get screenOpen() {
    return this.screenHost.childElementCount > 0;
  }
}
