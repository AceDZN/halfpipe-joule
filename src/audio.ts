// Procedural WebAudio: rolling wheels (louder and grittier on rough ground),
// pump whoosh, star chime, landing thump, bail, cheer, sea ambience.
// Starts only after the first user gesture.

import type { Surface } from './sim/track';

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rollGain: GainNode | null = null;
  private rollFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Rolling loop.
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.rollFilter = ctx.createBiquadFilter();
    this.rollFilter.type = 'bandpass';
    this.rollFilter.frequency.value = 600;
    this.rollFilter.Q.value = 0.8;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    src.connect(this.rollFilter).connect(this.rollGain).connect(this.master);
    src.start();
    // Sea ambience.
    const sea = ctx.createBufferSource();
    sea.buffer = this.noise;
    sea.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const sg = ctx.createGain();
    sg.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain).connect(sg.gain);
    lfo.start();
    sea.connect(lp).connect(sg).connect(this.master);
    sea.start();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  roll(speed: number, surf: Surface | null, airborne: boolean) {
    if (!this.ctx || !this.rollGain || !this.rollFilter) return;
    const t = this.ctx.currentTime;
    const on = !airborne && surf !== null && speed > 0.2;
    const rough = surf === 'asphalt' ? 1.9 : surf === 'sand' ? 1.3 : surf === 'brake' ? 1.6 : 1;
    const g = on ? Math.min(0.32, speed * 0.035 * rough) : 0;
    this.rollGain.gain.setTargetAtTime(g, t, 0.05);
    const f = surf === 'sand' ? 260 : surf === 'asphalt' ? 900 + speed * 60 : 380 + speed * 70;
    this.rollFilter.frequency.setTargetAtTime(f, t, 0.08);
    this.rollFilter.Q.value = surf === 'asphalt' ? 0.5 : 1.2;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slide?: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, freq: number, vol: number, when = 0, type: BiquadFilterType = 'bandpass', sweepTo?: number) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  pump() {
    this.burst(0.35, 400, 0.35, 0, 'bandpass', 2400);
    this.tone(330, 0.18, 'triangle', 0.18, 0, 660);
  }
  scrub() {
    this.burst(0.18, 2500, 0.2, 0, 'highpass');
  }
  drop() {
    this.burst(0.4, 300, 0.25, 0, 'lowpass', 1200);
  }
  land(heat: number) {
    this.tone(90, 0.18, 'sine', Math.min(0.5, 0.15 + heat / 300), 0, 50);
    this.burst(0.12, 800, 0.15);
  }
  star() {
    [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.2, i * 0.07));
  }
  goal() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.22, i * 0.1));
    this.burst(1.2, 1600, 0.14, 0.15, 'bandpass');
  }
  bail() {
    this.tone(160, 0.35, 'sawtooth', 0.12, 0, 60);
    this.burst(0.3, 500, 0.3);
  }
  bonk() {
    this.tone(220, 0.12, 'square', 0.08, 0, 110);
  }
  click() {
    this.tone(660, 0.06, 'sine', 0.1);
  }
  fail() {
    this.tone(392, 0.25, 'triangle', 0.15, 0);
    this.tone(330, 0.4, 'triangle', 0.15, 0.2);
  }
}
