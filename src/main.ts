import './style.css';
import * as THREE from 'three';
import { Sound } from './audio';
import { LevelRun, type Feedback, type RunSummary } from './game/run';
import { buildLevelVisual, starMesh, type LevelVisual, type Placement } from './render/ramps';
import { SkaterVisual } from './render/skater';
import { dashTexture, softDot } from './render/textures';
import { buildWorld, loadModel, type World } from './render/world';
import { G, MU, SURFACE_HE } from './sim/constants';
import { buildLevels, type LevelDef } from './sim/levels';
import { evalPiece, type Surface } from './sim/track';
import { el, Hud, J, ltr } from './ui/hud';
import { drawRing, hintPill } from './ui/ring';

// ------------------------------------------------------------------ setup
const PLACEMENTS: Record<string, Placement> = {
  'first-drop': { x: 0, z: 0, yaw: 0 },
  'same-height': { x: -30, z: 0, yaw: 0 },
  'bad-surfaces': { x: 75, z: 22, yaw: Math.PI },
  'bowl-pump': { x: 30, z: 0, yaw: 0 },
  'speed-squared': { x: -66, z: 0, yaw: 0 },
  'promenade-line': { x: 82, z: 44, yaw: Math.PI },
};

const TAKEAWAY: Record<string, string> = {
  'first-drop':
    'אנרגיית גובה ⇄ אנרגיית תנועה. בכל מעבר קצת אנרגיה הופכת ל<b>חום</b> בגלל החיכוך — לכן לא חוזרים לאותו גובה. <b>שאיבה</b> היא עבודה של השרירים שמוסיפה אנרגיה.',
  'same-height': `יותר מסה = יותר ג'ולים, אבל גם צריך יותר ג'ולים לכל מטר גובה. המסה מתקצרת: ${ltr('m·g·h = ½·m·v²')} — אותה מהירות ואותו גובה.`,
  'bad-surfaces':
    'כוח החיכוך הופך אנרגיית תנועה לחום. על משטח מחוספס (אספלט, חול) החיכוך גדול יותר, ולכן בכל מטר הולכים יותר ג\'ולים לחום.',
  'bowl-pump':
    'אי אפשר לעלות מעל האנרגיה שיש לכם — אלא אם מוסיפים אנרגיה. כל שאיבה היא עבודה: אנרגיה כימית מהשרירים הופכת לאנרגיה מכנית.',
  'speed-squared': `פי 2 מהירות = פי 4 אנרגיית תנועה (${ltr('Ek = ½·m·v²')}) = מגדל גבוה פי 4. וגם מרחק הבלימה גדל פי 4!`,
  'promenade-line':
    'בחרתם קו חלק וניצלתם את הקערות לשאיבה: מעט אנרגיה הלכה לחום, והעבודה מהשרירים השלימה את החסר.',
};

/** One line under the stars on the done card: how to earn all three. */
const STAR_RULES: Record<LevelDef['script'], string> = {
  firstDrop: '★ סיום · ★ בלי לנסות שוב · ★ עם 3 שאיבות לכל היותר',
  mass: '★ שתי הריצות · ★ ניחוש נכון · ★ כוכב בשתי הריצות',
  surfaces: '★ סיום · ★ בניסיון הראשון · ★ כמעט בלי חום מחול ואספלט',
  pump: '★ סיום · ★ בלי לנסות שוב · ★ עם 8 שאיבות לכל היותר',
  gap: '★ סיום · ★ המגדל הנכון בבחירה הראשונה · ★ עד ניסיון שגוי אחד',
  transfer: '★ סיום · ★ בניסיון הראשון · ★ הקו הנכון כבר בבחירה הראשונה',
};

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const og = overlay.getContext('2d')!;
const hud = new Hud(document.getElementById('ui')!);
const sound = new Sound();
const levels = buildLevels();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1200);
camera.position.set(0, 3, 14);

const palmSpots: THREE.Vector3[] = [];
for (let x = -130; x <= 140; x += 11) palmSpots.push(new THREE.Vector3(x + ((x * 7) % 5), 0, -13.5 - ((x * 3) % 3)));
for (let x = -60; x <= 140; x += 14) palmSpots.push(new THREE.Vector3(x, 0, 33 + ((x * 5) % 3)));
for (let x = -60; x <= 140; x += 16) palmSpots.push(new THREE.Vector3(x + 5, 0, 56));
const towerSpots = [-70, -10, 45, 105].map((x) => new THREE.Vector3(x, -0.35, -33));
const world: World = buildWorld(scene, palmSpots, towerSpots);

// Tripo kiosk + bench set pieces along the promenade.
loadModel('kiosk').then((m) => {
    if (!m) return;
    for (const [x, z, r] of [
      [16, -9, 0.2],
      [52, 33, -0.3],
      [-48, -8, 0.1],
    ] as const) {
      const k = m.clone();
      k.scale.setScalar(4.2);
      k.position.set(x, 0, z);
      k.rotation.y = r;
      k.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
      });
      scene.add(k);
    }
});

const visuals = new Map<string, LevelVisual>();
for (const l of levels) {
  const v = buildLevelVisual(l, PLACEMENTS[l.id]);
  scene.add(v.group);
  visuals.set(l.id, v);
}

const skater = new SkaterVisual();
scene.add(skater.root);

// Energy line: a dashed glowing strip.
const dash = dashTexture();
const energyLine = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 0.09),
  new THREE.MeshBasicMaterial({ map: dash, transparent: true, depthWrite: false, color: 0xffe27a }),
);
energyLine.renderOrder = 5;
scene.add(energyLine);

// Replay path: white dots and red heat bars.
const replay = new THREE.Group();
scene.add(replay);

// Particles.
interface Particle {
  s: THREE.Sprite;
  v: THREE.Vector3;
  life: number;
  max: number;
  grow: number;
}
const particles: Particle[] = [];
const dotTex = softDot();
function spawn(pos: THREE.Vector3, color: number, n: number, speed: number, life: number, size: number, grow = 0, up = 1) {
  if (document.body.classList.contains('reduced')) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.setScalar(size);
    const v = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * up, (Math.random() - 0.5) * speed);
    scene.add(s);
    particles.push({ s, v, life: life * (0.7 + Math.random() * 0.6), max: life, grow });
  }
}
function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.s);
      p.s.material.dispose();
      particles.splice(i, 1);
      continue;
    }
    p.v.y -= 3 * dt;
    p.s.position.addScaledVector(p.v, dt);
    p.s.scale.multiplyScalar(1 + p.grow * dt);
    p.s.material.opacity = Math.min(1, p.life / (p.max * 0.5));
  }
}

// ------------------------------------------------------------------ state
const PROGRESS_KEY = 'halfpipe-joule-progress-v1';
let progress: Record<string, number> = {};
try {
  progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
} catch {
  progress = {};
}
function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

let levelIndex = 0;
let run: LevelRun = new LevelRun(levels[0]);
let vis: LevelVisual = visuals.get(levels[0].id)!;
let paused = false;
let inMenu = true;
let manualTime = false;
let shake = 0;
let cardFor: string | null = null;
let starMeshes: { mesh: THREE.Object3D; id: string; high: boolean }[] = [];
const camPos = new THREE.Vector3(0, 3, 14);
const camLook = new THREE.Vector3(0, 1.4, 0);
let camSnap = true;
let introT = 0;
let lastSurf: Surface | null = null;
let smokeClock = 0;
const keysDown = new Set<string>();

// ------------------------------------------------------------------ helpers
function level(): LevelDef {
  return run.level;
}

function skaterWorld(lift = 0): THREE.Vector3 {
  const s = run.sim;
  const lane = s.lane;
  if (s.mode === 'ground' || s.mode === 'ready') {
    const p = s.point();
    return vis.toWorld(p.x - Math.sin(p.th) * lift, p.y + Math.cos(p.th) * lift, lane);
  }
  return vis.toWorld(s.x, s.y + lift, lane);
}

function project(v: THREE.Vector3) {
  const p = v.clone().project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * overlay.clientWidth,
    y: (-p.y * 0.5 + 0.5) * overlay.clientHeight,
    behind: p.z > 1,
  };
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  overlay.width = Math.round(w * dpr);
  overlay.height = Math.round(h * dpr);
  og.setTransform(dpr, 0, 0, dpr, 0, 0);
  camSnap = true;
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ level flow
function startLevel(i: number) {
  levelIndex = i;
  const l = levels[i];
  run = new LevelRun(l);
  vis = visuals.get(l.id)!;
  inMenu = false;
  document.body.classList.remove('in-menu');
  showGoalBanner(l);
  paused = false;
  hud.hideScreen();
  hud.hideCard();
  hud.clearLabels();
  cardFor = null;
  clearReplay();
  hud.setTitle(i + 1, l.nameHe);
  hud.setStars(progress[l.id] ?? 0);
  hud.setObjective(l.goalHe);
  introT = 0;
  camSnap = true;
  // Stars for the mass level.
  starMeshes.forEach((s) => scene.remove(s.mesh));
  starMeshes = run.collectibles.map((c) => {
    const p = evalPiece(l.track.lanes[0].pieces[c.piece], c.s);
    const m = starMesh(c.high);
    m.position.copy(vis.toWorld(p.x - Math.sin(p.th) * 0.8, p.y + Math.cos(p.th) * 0.8, 0));
    scene.add(m);
    return { mesh: m, id: c.id, high: !!c.high };
  });
  skater.setPose('ready');
}

/** The goal, big in the middle of the screen for a moment at the start of a level. */
function showGoalBanner(l: LevelDef) {
  const how = l.pumpAllowed ? 'רווח / הקשה = יוצאים, ואז שואבים בעקומה הזהובה' : l.starts.length > 1 ? 'בחרו ← → ואז רווח / הקשה = יוצאים' : 'רווח / הקשה = יוצאים';
  const b = el('div', 'goal-banner', `<small>שלב ${levelIndex + 1}</small>${l.goalHe}<small>${how}</small>`);
  hud.floats.append(b);
  setTimeout(() => b.remove(), 3200);
}

function retry() {
  if (run.phase === 'done') {
    startLevel(levelIndex);
    return;
  }
  run.retry();
  hud.hideCard();
  cardFor = null;
  clearReplay();
  skater.setPose('ready');
}

function nextLevel() {
  if (levelIndex + 1 < levels.length) startLevel(levelIndex + 1);
  else showMenu(true);
}

// ------------------------------------------------------------------ replay
function clearReplay() {
  replay.clear();
  hud.replayTag.hidden = true;
}

function showReplay(sum: RunSummary) {
  clearReplay();
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const barMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.85 });
  const dotGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const trail = sum.trail;
  const step = Math.max(1, Math.floor(trail.length / 120));
  for (let i = 0; i < trail.length; i += step) {
    const t = trail[i];
    const d = new THREE.Mesh(dotGeo, dotMat);
    d.position.copy(vis.toWorld(t.x, t.y + 0.05, t.lane));
    replay.add(d);
  }
  // Heat bars every ~0.25 s, height ∝ heat made in that stretch.
  const k = 5;
  const total = Math.max(1, sum.e0 + sum.work);
  for (let i = k; i < trail.length; i += k) {
    const a = trail[i - k];
    const b = trail[i];
    const dh = b.heat - a.heat;
    if (dh < total * 0.003) continue;
    const h = Math.min(3, (dh / total) * 18);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.07), barMat);
    bar.position.copy(vis.toWorld((a.x + b.x) / 2, (a.y + b.y) / 2 + h / 2, b.lane));
    replay.add(bar);
  }
  hud.replayTag.hidden = false;
}

// ------------------------------------------------------------------ cards
function heatBreakdown(sum: RunSummary) {
  const parts: string[] = [];
  const kinds = Object.entries(sum.heatBy).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  for (const [k, v] of kinds) {
    if (!v || v < 1) continue;
    const name =
      k in SURFACE_HE ? SURFACE_HE[k as Surface] : k === 'landing' ? 'נחיתות' : k === 'bump' ? 'מכות בקיר' : k === 'scrub' ? 'שאיבה לא בזמן' : 'נפילה';
    parts.push(`${name}: ${J(v)}`);
  }
  return parts.join(' · ');
}

function stackBar(sum: RunSummary, numbers = true) {
  const s = run.sim;
  const en = s.energies();
  const total = Math.max(1, sum.e0 + sum.work);
  const ep = Math.max(0, en.ep);
  const ek = en.ek;
  const heatSeg = Object.entries(sum.heatBy)
    .filter(([, v]) => (v ?? 0) > total * 0.01)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const seg = (cls: string, v: number, label: string) =>
    v / total > 0.004 ? `<div class="${cls}" style="width:${(v / total) * 100}%">${v / total > 0.12 && numbers ? label : ''}</div>` : '';
  return `
    <div class="stack">
      ${seg('s-ep', ep, `▲ ${Math.round(ep)} J`)}
      ${seg('s-ek', ek, `» ${Math.round(ek)} J`)}
      ${heatSeg.map(([k, v]) => seg(`s-heat ${k}`, v ?? 0, `🔥 ${Math.round(v ?? 0)} J`)).join('')}
    </div>
    <div class="legend"><span>▲ אנרגיית גובה ${J(ep)}</span><span>» אנרגיית תנועה ${J(ek)}</span><span>🔥 חום ${J(sum.heat)}</span>${sum.work > 0 ? `<span>💪 עבודה ${J(sum.work)}</span>` : ''}</div>
    <p style="font-size:15px">${heatBreakdown(sum)}</p>`;
}

function failText(sum: RunSummary): string {
  const l = level();
  switch (sum.reason) {
    case 'short': {
      if (l.script === 'transfer') {
        const big = Object.entries(sum.heatBy).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
        const name = big && big[0] in SURFACE_HE ? SURFACE_HE[big[0] as Surface] : '';
        return sum.work > 0
          ? `לא הגעתם. הכי הרבה אנרגיה הלכה לחום על ${name}. נסו קו אחר?`
          : `לא הגעתם. הכי הרבה אנרגיה הלכה לחום על ${name}. אולי אפשר להוסיף אנרגיה בדרך?`;
      }
      return `האנרגיה לא הספיקה: ${J(sum.heat)} הפכו לחום בדרך. ${l.script === 'surfaces' ? 'נסו נתיב חלק יותר ← →' : ''}`;
    }
    case 'pit': {
      if (!l.gapNeed) return 'נפילה! כל אנרגיית התנועה הפכה בבת אחת לחום ולקול.';
      const v = sum.ledgeSpeed ?? 0;
      const need = l.gapNeed.v;
      return `<b>נפלתם לחול — צריך מגדל גבוה יותר!</b><br>בקצה הייתה מהירות ${ltr(`v = ${v.toFixed(1)} m/s`)} (${ltr(`Ek = ${Math.round(0.5 * sum.mass * v * v)} J`)}). צריך ${ltr(`${need} m/s`)} — בערך פי ${(need / Math.max(0.1, v)).toFixed(1)} יותר מהר. כמה פעמים יותר אנרגיית תנועה צריך? בחרו מגדל ← →`;
    }
    case 'overshoot': {
      const v = sum.ledgeSpeed ?? 0;
      return `יותר מדי! ${ltr(`v = ${v.toFixed(1)} m/s`)} — עפתם מעבר לרמפת הנחיתה ונחתם חזק על הרצפה. מגדל נמוך יותר?`;
    }
    case 'bail':
      return 'נפילה! כל אנרגיית התנועה הפכה בבת אחת לחום ולקול.';
    case 'stalled':
      return 'בלי שאיבה כל מעבר מאבד קצת אנרגיה לחום — והגובה רק יורד. לחצו <b>רווח</b> (או הקישו) בכל פעם שאתם בעקומה הזהובה.';
    case 'rest':
      return 'נעצרתם — כל אנרגיית התנועה הפכה לחום.';
    case 'runDone':
      return 'לא אספתם את הכוכב. נסו שוב!';
    default:
      return '';
  }
}

function showResultCard() {
  const sum = run.lastSummary!;
  sound.fail();
  showReplay(sum);
  const c = hud.showCard(
    `<h2>לאן הלכו הג'ולים?</h2>${stackBar(sum)}<p>${failText(sum)}</p>
     <button class="btn" data-a="retry">↻ שוב</button>`,
  );
  c.querySelector('[data-a=retry]')!.addEventListener('click', () => retry());
  cardFor = 'result';
}

function showPredictCard() {
  const l = level();
  const light = run.massRuns[0];
  const c = hud.showCard(
    `<h2>עכשיו עם תיק כבד 🎒</h2>
     <p>בריצה הקודמת הגעתם לגובה ${ltr(`${(light.turnY ?? 0).toFixed(2)} m`)}.</p>
     <p>עכשיו יש על הגב תיק של ${ltr(`${l.backpack} kg`)}, ולכן המסה היא ${ltr(`${l.mass + (l.backpack ?? 0)} kg`)} — ויש יותר ג'ולים בהתחלה.</p>
     <p><b>לאיזה גובה תגיעו הפעם?</b></p>
     <div class="choices">
       <button class="btn ghost" data-p="higher">גבוה יותר</button>
       <button class="btn ghost" data-p="same">אותו גובה</button>
       <button class="btn ghost" data-p="lower">נמוך יותר</button>
     </div>`,
  );
  c.querySelectorAll('[data-p]').forEach((b) =>
    b.addEventListener('click', () => {
      sound.click();
      run.setPrediction((b as HTMLElement).dataset.p as 'higher' | 'same' | 'lower');
      hud.hideCard();
      cardFor = null;
      skater.setPose('ready');
    }),
  );
  cardFor = 'predict';
}

function showDoneCard() {
  const l = level();
  const stars = run.stars;
  progress[l.id] = Math.max(progress[l.id] ?? 0, stars);
  saveProgress();
  hud.setStars(stars);
  sound.goal();
  let extra = '';
  if (l.script === 'mass') {
    const [a, b] = run.massRuns;
    const pr = run.prediction === 'same' ? '✔ ניחשתם נכון!' : 'הפתעה? בדקו את הטבלה:';
    extra = `<p>${pr}</p><table class="compare">
      <tr><th></th><th>בלי תיק</th><th>עם תיק</th></tr>
      <tr><td>מסה</td><td>${ltr(`${a.mass} kg`)}</td><td>${ltr(`${b.mass} kg`)}</td></tr>
      <tr><td>אנרגיה בהתחלה</td><td>${J(a.e0)}</td><td>${J(b.e0)}</td></tr>
      <tr><td>מהירות מרבית</td><td>${ltr(`${a.vMax.toFixed(2)} m/s`)}</td><td>${ltr(`${b.vMax.toFixed(2)} m/s`)}</td></tr>
      <tr><td>גובה מרבי</td><td>${ltr(`${(a.turnY ?? 0).toFixed(2)} m`)}</td><td>${ltr(`${(b.turnY ?? 0).toFixed(2)} m`)}</td></tr>
    </table>`;
  } else if (l.script === 'gap') {
    const s = run.sim;
    const brakeX = l.xMarks.brake;
    const d = Math.max(0, s.x - brakeX);
    const v = run.lastSummary?.ledgeSpeed ?? 0;
    const d2 = d / 4;
    extra = `<p>מהירות בקצה: ${ltr(`${v.toFixed(1)} m/s`)} · מרחק בלימה ברצועה: ${ltr(`${d.toFixed(1)} m`)}</p>
      <p style="font-size:16px">מרחק הבלימה תלוי ב־${ltr('v²')}: בחצי מהמהירות הייתם נעצרים אחרי רבע מהמרחק (בערך ${ltr(`${d2.toFixed(1)} m`)}).</p>`;
  } else if (l.script === 'transfer') {
    extra = `<div>${stackBar(run.lastSummary!)}</div>`;
  } else {
    const sum = run.lastSummary!;
    extra = `<p style="font-size:16px">חום: ${J(sum.heat)}${sum.work > 0 ? ` · עבודה מהשרירים: ${J(sum.work)}` : ''}</p>`;
  }
  const last = levelIndex === levels.length - 1;
  const total = levels.reduce((n, lv) => n + (progress[lv.id] ?? 0), 0);
  const c = hud.showCard(
    `<h2>${last ? 'סיימתם את הטיילת! 🏁' : 'יש! 🎉'} <span style="color:var(--gold)">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></h2>
     ${extra}
     <p style="font-size:14px;color:var(--muted)">${STAR_RULES[l.script]}</p>
     <div class="takeaway">${TAKEAWAY[l.id]}</div>
     ${last ? `<p>סך הכול ${total} / ${levels.length * 3} כוכבים</p>` : ''}
     <button class="btn" data-a="next">${last ? 'לתפריט' : 'לשלב הבא ←'}</button>
     <button class="btn ghost" data-a="again">↻ שוב</button>`,
  );
  c.querySelector('[data-a=next]')!.addEventListener('click', () => nextLevel());
  c.querySelector('[data-a=again]')!.addEventListener('click', () => startLevel(levelIndex));
  cardFor = 'done';
}

// ------------------------------------------------------------------ menu
function showMenu(fromEnd = false) {
  inMenu = true;
  document.body.classList.add('in-menu');
  paused = false;
  hud.hideCard();
  cardFor = null;
  const next = Math.max(0, levels.findIndex((l) => !progress[l.id]));
  const grades: Record<number, string> = { 7: 'כיתה ז׳', 8: 'כיתה ח׳', 9: 'כיתה ט׳' };
  const s = hud.showScreen(`
    <h1 class="logo">ג<span class="j">'ו</span>ל ברמפה</h1>
    <p class="tagline">${fromEnd ? 'כל הכבוד! אפשר לשפר כוכבים בכל שלב.' : 'סקייטבורד בטיילת של תל אביב — ורואים את האנרגיה. אי אפשר לעלות גבוה יותר ממה שהאנרגיה שלכם מאפשרת.'}</p>
    <button class="btn" data-play>▶ ${next > 0 ? 'המשיכו' : 'שחקו'}</button>
    <p class="one-key">🎮 מקש אחד: <kbd>רווח</kbd> או הקשה על המסך — יוצאים לדרך, ואז שואבים</p>
    <div class="levels">
      ${levels
        .map(
          (l, i) => `<button class="lvl" data-l="${i}"><span class="n">שלב ${i + 1}</span> <span class="tag">${grades[l.grade]}${l.script === 'transfer' ? ' · מבחן בלי רמזים' : ''}</span>
          <span class="nm">${l.nameHe}</span><span class="st">${'★'.repeat(progress[l.id] ?? 0)}${'☆'.repeat(3 - (progress[l.id] ?? 0))}</span></button>`,
        )
        .join('')}
    </div>
    <div class="toggles">
      <label><input type="checkbox" data-t="mute" ${sound.muted ? 'checked' : ''}> בלי צליל</label>
      <label><input type="checkbox" data-t="reduced" ${document.body.classList.contains('reduced') ? 'checked' : ''}> פחות תנועה</label>
    </div>
    <p class="controls-help">מקש אחד: <kbd>רווח</kbd> (או הקשה על המסך) — יוצאים לדרך, ואז שואבים בעקומה הזהובה. <kbd>←</kbd><kbd>→</kbd> רק כדי לבחור מסלול לפני היציאה. <kbd>R</kbd> שוב</p>`);
  s.querySelector('[data-play]')!.addEventListener('click', () => {
    sound.unlock();
    startLevel(next);
  });
  s.querySelectorAll('[data-l]').forEach((b) =>
    b.addEventListener('click', () => {
      sound.unlock();
      startLevel(Number((b as HTMLElement).dataset.l));
    }),
  );
  s.querySelector('[data-t=mute]')!.addEventListener('change', (e) => setMuted((e.target as HTMLInputElement).checked));
  s.querySelector('[data-t=reduced]')!.addEventListener('change', (e) => document.body.classList.toggle('reduced', (e.target as HTMLInputElement).checked));
}

function setMuted(m: boolean) {
  sound.setMuted(m);
  hud.btnMute.textContent = m ? '🔇' : '🔊';
}

function togglePause() {
  if (inMenu) return;
  paused = !paused;
  hud.btnPause.textContent = paused ? '▶' : '❚❚';
  if (paused) {
    const s = hud.showScreen(`<h2 class="logo" style="font-size:56px">הפסקה</h2>
      <button class="btn" data-r>▶ המשיכו</button> <button class="btn ghost" data-m>תפריט</button>`);
    s.querySelector('[data-r]')!.addEventListener('click', () => togglePause());
    s.querySelector('[data-m]')!.addEventListener('click', () => {
      paused = false;
      showMenu();
    });
  } else hud.hideScreen();
}

// ------------------------------------------------------------------ input
type Act = 'go' | 'left' | 'right' | 'retry' | 'pause' | 'mute';

/** The one game key: Space / Enter / ↑ / ↓ / tap. Drop in, then pump; on a card, continue. */
function go() {
  if (inMenu) {
    (hud.screenHost.querySelector('[data-play]') as HTMLElement | null)?.click();
    return;
  }
  if (cardFor === 'result') return retry();
  if (cardFor === 'done') return nextLevel();
  if (cardFor === 'predict') return;
  if (run.phase === 'ready') {
    run.drop();
    hud.floats.querySelectorAll('.goal-banner').forEach((b) => b.remove());
  } else if (run.phase === 'riding') run.pump();
}

function action(a: Act) {
  sound.unlock();
  if (a === 'mute') return setMuted(!sound.muted);
  if (a === 'pause') return togglePause();
  if (paused) {
    if (a === 'go') togglePause();
    return;
  }
  if (a === 'go') return go();
  if (inMenu) return;
  if (a === 'retry') {
    if (cardFor === 'done') startLevel(levelIndex);
    else retry();
    return;
  }
  // ← → only choose a start (tower / line / lane) before dropping in.
  if (!cardFor && run.phase === 'ready' && level().starts.length > 1) {
    run.steer(a === 'left' ? -1 : 1);
    sound.click();
  }
}

const GO_KEYS = new Set([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S']);
window.addEventListener('keydown', (e) => {
  const k = e.key;
  if (e.repeat && k !== 'ArrowLeft' && k !== 'ArrowRight') {
    if (GO_KEYS.has(k)) e.preventDefault();
    return;
  }
  keysDown.add(e.code);
  let handled = true;
  if (GO_KEYS.has(k)) action('go');
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') action('left');
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') action('right');
  else if (k === 'r' || k === 'R') action('retry');
  else if (k === 'p' || k === 'P' || k === 'Escape') action('pause');
  else if (k === 'm' || k === 'M') action('mute');
  else handled = false;
  if (handled) e.preventDefault();
});
window.addEventListener('keyup', (e) => keysDown.delete(e.code));
// Auto-pause when the tab goes to the background (not under deterministic test stepping).
const autoPause = () => {
  if (!manualTime && !inMenu && !paused && run.phase === 'riding') togglePause();
};
window.addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => document.hidden && autoPause());

hud.btnMute.addEventListener('click', () => action('mute'));
hud.btnPause.addEventListener('click', () => action('pause'));
hud.btnRestart.addEventListener('click', () => action('retry'));
hud.btnMenu.addEventListener('click', () => showMenu());
const tap = (b: HTMLElement, a: Act) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    b.classList.add('active');
    action(a);
  });
  const up = () => b.classList.remove('active');
  b.addEventListener('pointerup', up);
  b.addEventListener('pointerleave', up);
};
tap(hud.tLeft, 'left');
tap(hud.tRight, 'right');
tap(hud.tGo, 'go');
// Tapping or clicking anywhere on the scene is the same as the game key.
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  action('go');
});
// Start labels (towers, lines, lanes) are tappable choices.
hud.labels.addEventListener('pointerdown', (e) => {
  const t = (e.target as HTMLElement).closest('[data-start]') as HTMLElement | null;
  if (!t) return;
  e.stopPropagation();
  sound.unlock();
  run.selectStart(Number(t.dataset.start));
  sound.click();
});
if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('is-touch');
window.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (e.pointerType === 'touch') document.body.classList.add('is-touch');
});
if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.body.classList.add('reduced');

// Gamepad (polled).
const padPrev: boolean[] = [];
let padAxisPrev = 0;
function pollPad() {
  const pads = navigator.getGamepads?.() ?? [];
  const p = pads.find((x) => x);
  if (!p) return;
  const pressed = p.buttons.map((b) => b.pressed);
  const edge = (i: number) => pressed[i] && !padPrev[i];
  if (edge(0) || edge(1) || edge(2) || edge(7)) action('go');
  if (edge(3)) action('retry');
  if (edge(9)) action('pause');
  if (edge(14)) action('left');
  if (edge(15)) action('right');
  const ax = p.axes[0] ?? 0;
  const dir = ax < -0.6 ? -1 : ax > 0.6 ? 1 : 0;
  if (dir !== padAxisPrev && dir !== 0) action(dir < 0 ? 'left' : 'right');
  padAxisPrev = dir;
  pressed.forEach((v, i) => (padPrev[i] = v));
}

// ------------------------------------------------------------------ feedback
let lastFizzle = -1e9;
function onFeedback(f: Feedback) {
  // Above the energy ring, so pop-ups don't cover its labels.
  const head = project(skaterWorld(2.7));
  const body = skaterWorld(0.7);
  switch (f.kind) {
    case 'pump':
      sound.pump();
      skater.setPose('crouch');
      setTimeout(() => skater.pose === 'crouch' && skater.setPose('ride'), 220);
      hud.floatText(head.x, head.y, `💪 ${ltr(f.text ?? '')}`, 'work');
      spawn(body, 0xb9f58a, 14, 2.5, 0.6, 0.18, 1.5);
      break;
    case 'scrub':
      sound.scrub();
      if (level().pumpAllowed) hud.floatText(head.x, head.y, 'שואבים רק בעקומה הזהובה', 'bad');
      spawn(skaterWorld(0.1), 0xbbbbbb, 6, 1, 0.5, 0.25, 1.5);
      break;
    case 'short': {
      const p = project(vis.toWorld(f.x ?? 0, (f.y ?? 0) + 1.6, run.sim.lane));
      hud.floatText(p.x, p.y, f.text ?? '', 'bad');
      break;
    }
    case 'pumpUnlocked':
      break;
    case 'armed':
      // The yellow button / key hint light up instead of more floating text.
      break;
    case 'fizzle':
      if (performance.now() - lastFizzle > 3000) {
        lastFizzle = performance.now();
        hud.floatText(head.x, head.y, 'שואבים רק בעקומה הזהובה', 'bad');
      }
      break;
    case 'hintPump':
      hud.floatText(overlay.clientWidth / 2, overlay.clientHeight * 0.32, 'רווח בכל עקומה זהובה = שאיבה!', 'work');
      break;
    case 'star':
      sound.star();
      hud.floatText(head.x, head.y, f.text ?? '★', 'star');
      spawn(body, 0xffd23f, 24, 3, 0.8, 0.15, 0);
      break;
    case 'land':
      sound.land(f.value ?? 0);
      spawn(skaterWorld(0.05), 0xe8d8c0, 10, 1.5, 0.5, 0.3, 2);
      if (f.text) hud.floatText(head.x, head.y, f.text, 'work');
      shake = Math.min(0.25, (f.value ?? 0) / 300);
      break;
    case 'bail':
      sound.bail();
      skater.setPose('bail');
      hud.bubble(head.x, head.y - 10, 'אוי!');
      spawn(skaterWorld(0.1), 0xe8d8c0, 22, 2.5, 0.8, 0.35, 2);
      shake = 0.5;
      break;
    case 'goal':
      sound.goal();
      skater.setPose('cheer');
      spawn(skaterWorld(1.2), 0xffd23f, 30, 5, 1.4, 0.16, 0, 1.6);
      spawn(skaterWorld(1.2), 0x21d4c8, 20, 5, 1.4, 0.16, 0, 1.6);
      spawn(skaterWorld(1.2), 0xff4fa3, 20, 5, 1.4, 0.16, 0, 1.6);
      hud.floatText(head.x, head.y - 20, 'יש!', 'big');
      break;
    case 'launch':
      skater.setPose('air');
      break;
    case 'ollie':
      skater.hop();
      run.hopping = true;
      setTimeout(() => (run.hopping = false), 450);
      hud.floatText(head.x, head.y, `💪 ${ltr(`${Math.round(f.value ?? 0)} J`)} → 🔥`, 'bad');
      break;
    case 'trick':
      hud.floatText(head.x, head.y, 'קיקפליפ!', 'star');
      break;
    case 'bonk':
      sound.bonk();
      break;
    case 'laneBlocked':
      sound.bonk();
      break;
    case 'drop':
      sound.drop();
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ per-frame
function updateGame(dt: number) {
  const prevPhase = run.phase;
  run.update(dt);
  for (const f of run.drainFeedback()) onFeedback(f);
  const s = run.sim;
  // Skater pose.
  if (run.phase === 'riding') {
    if (s.mode === 'air') skater.setPose('air');
    else if (s.mode === 'ground' && skater.pose !== 'crouch' && skater.pose !== 'bail')
      skater.setPose(run.level.pumpAllowed && s.zoneAvailable() && !run.pumpLocked ? 'crouch' : 'ride');
  }
  // Surfaces: smoke on sand/asphalt.
  if (s.mode === 'ground' && run.phase === 'riding') {
    const surf = s.point().surf;
    const sp = s.energies().speed;
    smokeClock += dt;
    if ((surf === 'asphalt' || surf === 'sand' || surf === 'brake') && sp > 1 && smokeClock > 0.06) {
      smokeClock = 0;
      spawn(skaterWorld(0.05), surf === 'sand' ? 0xe2bf82 : 0x9a9590, 2, 0.8, 0.7, 0.3, 2.2);
      if (surf === 'asphalt' && Math.random() < 0.5) spawn(skaterWorld(0.05), 0xffa040, 2, 2, 0.25, 0.06, 0);
    }
    if (surf !== lastSurf) lastSurf = surf;
  }
  sound.roll(s.energies().speed, s.mode === 'ground' ? s.point().surf : null, s.mode === 'air');
  // Phase transitions → cards.
  if (prevPhase === 'riding' && run.phase !== 'riding') {
    if (run.phase === 'result') setTimeout(() => run.phase === 'result' && !cardFor && showResultCard(), 700);
    if (run.phase === 'predict') setTimeout(() => run.phase === 'predict' && !cardFor && showPredictCard(), 500);
    if (run.phase === 'done') {
      if (level().script === 'mass' || level().script === 'gap') skater.setPose('cheer');
      setTimeout(() => run.phase === 'done' && !cardFor && showDoneCard(), 1100);
    }
  }
}

function updateCamera(dt: number) {
  const l = level();
  const s = run.sim;
  const p = skaterWorld(0.8);
  const desiredPos = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const pl = PLACEMENTS[l.id];
  if (l.camera === 'side') {
    const [x0, x1] = l.extentX;
    const cx = (x0 + x1) / 2;
    const width = x1 - x0 + 2;
    const vfov = (camera.fov * Math.PI) / 180;
    const hfovHalf = Math.atan(Math.tan(vfov / 2) * camera.aspect);
    let dist = width / 2 / Math.tan(hfovHalf);
    // Portrait phones: pull back further so both decks stay in view.
    const maxDist = camera.aspect < 1 ? 27 : 22;
    const follow = dist > maxDist ? 0.85 : 0.3;
    dist = Math.min(dist, maxDist);
    dist = Math.max(dist, 9);
    const tx = cx + (s.x - cx) * follow;
    const laneZ = l.track.lanes[s.lane].z;
    const look = vis.toWorld(tx, 1.3, s.lane).addScaledVector(vis.side, laneZ);
    desiredLook.copy(look);
    desiredPos
      .copy(look)
      .addScaledVector(vis.side, dist)
      .addScaledVector(vis.forward, -dist * 0.12)
      .setY(2.6 + dist * (camera.aspect < 1 ? 0.14 : 0.06));
  } else {
    const fwd = vis.forward.clone();
    const ready = run.phase === 'ready';
    if (ready && introT < 3.2) {
      // Overview of the whole line before the drop.
      const mid = vis.toWorld((l.extentX[0] + l.extentX[1]) / 2, 0, 1);
      desiredLook.copy(mid).setY(1);
      desiredPos.copy(vis.toWorld(l.extentX[0] - 6, 0, 1)).setY(9);
    } else if (run.phase !== 'riding' && !ready) {
      // Run over: swing to the side so the ramp and the skater's height read clearly.
      desiredLook.copy(p).addScaledVector(fwd, -1).setY(Math.max(1.2, p.y * 0.7));
      desiredPos.copy(p).addScaledVector(vis.side, -9).addScaledVector(fwd, -5).setY(p.y + 2.2);
    } else {
      desiredPos.copy(p).addScaledVector(fwd, -5.4).setY(p.y + 1.6);
      desiredLook.copy(p).addScaledVector(fwd, 7).setY(p.y * 0.6 + 0.6);
      if (s.mode === 'air' || s.y > 1.5) desiredPos.y = Math.max(desiredPos.y, p.y + 1.2);
    }
    void pl;
  }
  const k = camSnap ? 1 : 1 - Math.exp(-dt * 4);
  camPos.lerp(desiredPos, k);
  camLook.lerp(desiredLook, k);
  camSnap = false;
  camera.position.copy(camPos);
  if (shake > 0 && !document.body.classList.contains('reduced')) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    shake = Math.max(0, shake - dt * 1.5);
  }
  camera.lookAt(camLook);
}

function updateVisuals(dt: number) {
  const l = level();
  const s = run.sim;
  // Skater transform: board along the track tangent, standing on the normal.
  let th = 0;
  if (s.mode === 'ground' || s.mode === 'ready') th = s.point().th;
  else th = Math.atan2(s.vy, Math.abs(s.vx) + 1e-6) * Math.sign(s.vx || 1) * 0.5;
  const pos = s.mode === 'air' || s.mode === 'bailed' ? vis.toWorld(s.x, s.y, s.lane) : skaterWorld(0);
  skater.root.position.copy(pos);
  const yaw = PLACEMENTS[l.id].yaw;
  skater.root.rotation.set(0, -yaw, 0);
  // Chase levels: turn the rider toward the direction of travel so the camera sees their back.
  skater.setFacing(l.camera === 'chase' ? Math.PI : 0);
  skater.setSlope(th);
  skater.setBackpack(run.backpack);
  skater.update(dt);
  // Pump zones glow.
  const t = performance.now() / 1000;
  for (const z of vis.zones) {
    const mat = z.mesh.material as THREE.MeshBasicMaterial;
    const isCur = z.lane === s.lane;
    const lockedOrHidden = !l.hints.pumpGlow || run.pumpLocked || !l.pumpAllowed;
    const avail = isCur && s.zoneAvailable();
    // Visible from the first pass (dimmer while level 1 keeps pumping locked).
    const hidden = !l.hints.pumpGlow || !l.pumpAllowed;
    mat.opacity = hidden ? 0 : run.pumpLocked ? 0.3 : avail ? 0.75 + Math.sin(t * 10) * 0.15 : 0.45 + Math.sin(t * 3) * 0.06;
    z.mesh.visible = !hidden;
    void lockedOrHidden;

  }
  // Stars.
  for (const st of starMeshes) {
    st.mesh.visible = !run.collected.has(st.id);
    st.mesh.rotation.y += dt * 2;
  }
  // Energy line.
  const en = s.energies();
  energyLine.visible = l.hints.energyLine && s.mode !== 'bailed' && run.phase !== 'done';
  if (energyLine.visible) {
    const [x0, x1] = l.extentX;
    const w = x1 - x0;
    const lane = l.track.lanes[s.lane];
    const front = l.camera === 'side' ? lane.width / 2 + 0.02 : 0;
    const a = vis.toWorld((x0 + x1) / 2, en.hMax, s.lane, -front);
    energyLine.position.copy(a);
    energyLine.scale.set(w, 1, 1);
    energyLine.rotation.set(0, -PLACEMENTS[l.id].yaw, 0);
    dash.repeat.set(w / 0.5, 1);
    if (l.camera === 'chase') {
      // Across the target ramp, facing the rider.
      const gx = l.goal ? l.goal.xMin - 2 : x1;
      energyLine.position.copy(vis.toWorld(gx, en.hMax, 1));
      energyLine.scale.set(8, 1, 1);
      energyLine.rotation.set(0, -PLACEMENTS[l.id].yaw + Math.PI / 2, 0);
      dash.repeat.set(16, 1);
    }
  }
  updateParticles(dt);
  world.update(dt, pos);
  void G;
  void MU;
}

function speedLines(W: number, H: number, speed: number) {
  if (document.body.classList.contains('reduced') || speed < 6) return;
  const a = Math.min(0.5, (speed - 6) * 0.12);
  const t = performance.now() / 1000;
  og.save();
  og.strokeStyle = `rgba(255,255,255,${a})`;
  og.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const ang = i * 2.39996 + Math.floor(t * 12 + i) * 0.7;
    const r0 = Math.max(W, H) * (0.42 + ((t * 3 + i * 0.37) % 1) * 0.12);
    const cx = W / 2;
    const cy = H * 0.45;
    og.beginPath();
    og.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.6);
    og.lineTo(cx + Math.cos(ang) * (r0 + 120), cy + Math.sin(ang) * (r0 + 120) * 0.6);
    og.stroke();
  }
  og.restore();
}

function drawOverlay() {
  const W = overlay.clientWidth;
  const H = overlay.clientHeight;
  og.clearRect(0, 0, W, H);
  if (inMenu) return;
  const l = level();
  const s = run.sim;
  const en = s.energies();
  if (l.camera === 'chase' && run.phase === 'riding') speedLines(W, H, en.speed);
  // Energy ring around the skater.
  const c = project(skaterWorld(0.85));
  const edge = project(skaterWorld(0.85).add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(1.15)));
  const r = Math.max(72, Math.min(150, Math.hypot(edge.x - c.x, edge.y - c.y)));
  if (!c.behind && s.mode !== 'bailed' && !paused && !hud.screenOpen)
    drawRing(og, { cx: c.x, cy: c.y, r, ep: en.ep, ek: en.ek, heat: en.heat, numbers: l.hints.ringNumbers || run.phase === 'done', alpha: run.phase === 'result' ? 0.4 : 0.95 });
  // Energy line label.
  if (energyLine.visible) {
    const [, x1] = l.extentX;
    const lp = project(l.camera === 'side' ? vis.toWorld(x1 - 1.6, en.hMax + 0.25, s.lane, -1.7) : vis.toWorld((l.goal?.xMin ?? x1) - 2, en.hMax + 0.3, 1, -3));
    if (!lp.behind) hintPill(og, lp.x, lp.y, 'קו אנרגיה', false);
  }
  // Pump hint pill over the zone.
  if (l.pumpAllowed && l.hints.pumpGlow && !run.pumpLocked && run.phase === 'riding') {
    const lane = l.track.lanes[s.lane];
    lane.pumpZones.forEach((z, i) => {
      const p = lane.pieces[z.piece];
      const mid = evalPiece(p, (z.s0 + z.s1) / 2);
      const pp = project(vis.toWorld(mid.x, mid.y - 0.35, s.lane, -lane.width / 2 - 0.3));
      const avail = s.currentZone() === i && s.zoneAvailable();
      if (!pp.behind) hintPill(og, pp.x, pp.y, avail ? 'עכשיו! 💪' : 'שאיבה 💪', avail);
    });
  }
}

function updateHud() {
  const l = level();
  const s = run.sim;
  const en = s.energies();
  hud.updateBank(en, {
    mass: run.mass,
    numbers: l.hints.ringNumbers || run.phase === 'done',
    formulas: l.hints.formulas,
    scale: s.e0 + s.work,
  });
  // One game button (touch) + choice arrows only while choosing.
  const choosing = !cardFor && run.phase === 'ready' && l.starts.length > 1 && !run.mustUseFirstTower;
  const canPump = run.phase === 'riding' && l.pumpAllowed && !run.pumpLocked;
  const pumpNow = canPump && (s.zoneAvailable() || run.armedAt !== null);
  hud.tLeft.hidden = hud.tRight.hidden = !choosing;
  hud.tGo.hidden = !!cardFor || !(run.phase === 'ready' || canPump);
  const goText = run.phase === 'ready' ? 'יוצאים!' : 'שאיבה 💪';
  if (hud.tGo.textContent !== goText) hud.tGo.textContent = goText;
  hud.tGo.classList.toggle('ready', pumpNow);
  // Key hint: there is only one game key.
  const K = `<span class="k">${document.body.classList.contains('is-touch') ? 'הקישו' : 'רווח'}</span>`;
  let hint = '';
  if (cardFor || paused) hint = '';
  else if (run.phase === 'ready') {
    const bag = run.backpack ? '🎒 עם תיק · ' : '';
    if (run.mustUseFirstTower) hint = `${K} — נסו קודם מהמגדל הנמוך`;
    else if (choosing)
      hint = document.body.classList.contains('is-touch') ? `בחרו שלט · ואז ${K} — יוצאים!` : `<span class="k">← →</span> או לחיצה על שלט — בחרו · ${K} — יוצאים!`;
    else hint = `${bag}${K} — יוצאים!`;
  } else if (run.phase === 'riding') {
    if (l.script === 'firstDrop' && run.pumpLocked) hint = 'צפו בטבעת: ▲ גובה הופך ל־» תנועה, וחוזר';
    else if (canPump && s.zoneAvailable()) hint = `${K} — עכשיו! 💪`;
    else if (canPump && s.pumps < 3) hint = `${K} כשאתם בעקומה הזהובה = שאיבה 💪`;
  }
  if (hud.keyhint.dataset.h !== hint) {
    hud.keyhint.dataset.h = hint;
    hud.setKeyHint(hint, run.phase === 'ready' || pumpNow);
  }
  // Tower / line labels in the ready phase.
  if (l.starts.length > 1 && (run.phase === 'ready' || cardFor === 'result')) {
    l.starts.forEach((st, i) => {
      const lane = l.track.lanes[st.lane];
      const p = evalPiece(lane.pieces[st.piece], st.s);
      const pp = project(vis.toWorld(p.x - 0.6, p.y + (l.script === "gap" ? 0.35 : 2.2), st.lane));
      const names = l.script === 'surfaces' ? ['בטון + חול', 'אספלט מחוספס', 'בטון חלק'] : ['קו א', 'קו ב', 'קו ג'];
      const text = l.script === 'gap' ? ltr(`Δh = ${st.dropH} m`) : names[i];
      hud.label(`start-${i}`, pp.x, pp.y, text, i === run.startIndex ? 'sel' : '', !pp.behind, i);
    });
  } else hud.hideLabels('start-');
  if (l.camera === 'side' && run.phase !== 'done' && !inMenu) {
    l.copings.forEach((c, i) => {
      if (c.y > 2.9 && !c.target) return;
      const pp = project(vis.toWorld(c.x + (c.target ? 1.2 : -0.9), c.y + (c.target ? 2.0 : 0.45), 0));
      const text = c.target ? `🎯 יעד · ${ltr(`${c.y.toFixed(2)} m`)}` : `התחלה · ${ltr(`${c.y.toFixed(2)} m`)}`;
      hud.label(`deck-${i}`, pp.x, pp.y, text, c.target ? 'need' : '', !pp.behind);
    });
  } else hud.hideLabels('deck-');
  // Mass level: show the bag, and mark the peak of each run.
  if (l.script === 'mass' && !inMenu) {
    const bp = project(skaterWorld(2.2).add(new THREE.Vector3(0, 0, 0)));
    hud.label('bag', bp.x + 70, bp.y, `🎒 ${ltr(`+${l.backpack} kg`)}`, 'need', run.backpack && !bp.behind && run.phase !== 'done');
    const sum = run.lastSummary;
    if (sum && sum.turnX !== null && sum.turnY !== null && run.phase !== 'riding') {
      const pk = project(vis.toWorld(sum.turnX, sum.turnY + 0.5, 0, -1.8));
      hud.label('peak', pk.x, pk.y, `שיא · ${ltr(`${sum.turnY.toFixed(2)} m`)}`, '', !pk.behind);
    } else hud.hideLabels('peak');
  } else {
    hud.hideLabels('bag');
    hud.hideLabels('peak');
  }
  if (l.script === 'gap' && !inMenu) {
    const zp = project(vis.toWorld(l.xMarks.ledge + 1.3, 0.15, 0, -2));
    hud.label('zero', zp.x, zp.y, `${ltr('h = 0 m')} · מישור ייחוס`, '', !zp.behind);
  } else hud.hideLabels('zero');
  if (l.gapNeed && !inMenu) {
    const pp = project(vis.toWorld(l.gapNeed.x + 0.8, 2.6, run.sim.lane));
    hud.label('need', pp.x, pp.y, `צריך ${ltr(`v ≥ ${l.gapNeed.v} m/s`)}`, 'need', !pp.behind);
  } else hud.hideLabels('need');
}

// ------------------------------------------------------------------ loop
let last = performance.now();
let fpsAcc = 0;
let fpsFrames = 0;
let fps = 0;
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fpsAcc += dt;
  fpsFrames++;
  if (fpsAcc > 1) {
    fps = fpsFrames / fpsAcc;
    fpsAcc = 0;
    fpsFrames = 0;
  }
  pollPad();
  if (!manualTime) step(dt);
  render();
  requestAnimationFrame(frame);
}

function step(dt: number) {
  if (!inMenu && !paused) {
    introT += dt;
    updateGame(dt);
  }
  updateVisuals(paused ? 0 : dt);
  updateCamera(dt);
}

function render() {
  renderer.render(scene, camera);
  drawOverlay();
  if (!inMenu) updateHud();
}

renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  hud.showCard('<h2>הגרפיקה נעצרה</h2><p>רעננו את הדף כדי להמשיך.</p>', true);
});

// ------------------------------------------------------------------ test hooks
declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    __game: unknown;
  }
}

window.render_game_to_text = () => {
  const s = run.sim;
  const en = s.energies();
  const l = level();
  return JSON.stringify({
    screen: inMenu ? 'menu' : paused ? 'paused' : 'level',
    level: { index: levelIndex + 1, id: l.id, name: l.nameHe, objective: l.goalHe },
    phase: run.phase,
    card: cardFor,
    skater: {
      mode: s.mode,
      lane: s.lane,
      x: +s.x.toFixed(3),
      y: +s.y.toFixed(3),
      speed: +en.speed.toFixed(3),
      mass: s.mass,
      inPumpZone: s.currentZone() !== null,
      pumpAvailable: l.pumpAllowed && !run.pumpLocked && s.zoneAvailable(),
    },
    energy: {
      Ep: +en.ep.toFixed(2),
      Ek: +en.ek.toFixed(2),
      heat: +en.heat.toFixed(2),
      work: +en.work.toFixed(2),
      E0: +en.e0.toFixed(2),
      hMax: +en.hMax.toFixed(3),
      heatBy: Object.fromEntries(Object.entries(s.heatBy).map(([k, v]) => [k, +(v ?? 0).toFixed(1)])),
    },
    start: run.startIndex,
    pumps: s.pumps,
    collected: [...run.collected],
    lastResult: run.lastSummary ? { ok: run.lastSummary.ok, reason: run.lastSummary.reason } : null,
    stars: run.phase === 'done' ? run.stars : null,
    fps: Math.round(fps),
  });
};

window.advanceTime = (ms: number) => {
  manualTime = true;
  const n = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < n; i++) step(1 / 60);
  render();
};

window.__game = { run: () => run, startLevel, action, levels, skater, scene };

// ------------------------------------------------------------------ boot
resize();
const params = new URLSearchParams(location.search);
if (params.has('level')) startLevel(Math.max(0, Math.min(levels.length - 1, Number(params.get('level')) - 1)));
else {
  startLevel(0);
  showMenu();
}
requestAnimationFrame(frame);
void el;
