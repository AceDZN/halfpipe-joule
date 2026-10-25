// Procedural canvas textures: surfaces must read clearly different at a glance
// (smooth concrete vs rough asphalt vs sand), plus graffiti and promenade tiles.

import * as THREE from 'three';
import type { Surface } from '../sim/track';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(c: HTMLCanvasElement, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function noise(g: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], size: [number, number], seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size[0] + r() * (size[1] - size[0]);
    g.globalAlpha = 0.25 + r() * 0.5;
    g.fillRect(r() * w, r() * h, s, s);
  }
  g.globalAlpha = 1;
}

const cache = new Map<string, THREE.Texture>();

/** Texture for a riding surface. 1 texture repeat = 2 m. */
export function surfaceTexture(surf: Surface): THREE.Texture {
  const key = `surf-${surf}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, g] = canvas(256, 256);
  switch (surf) {
    case 'smooth': {
      const grad = g.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#efe9e1');
      grad.addColorStop(1, '#e4ddd3');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      noise(g, 256, 256, 900, ['#d9d1c6', '#f7f3ee', '#cfc6ba'], [1, 2.5], 3);
      g.strokeStyle = 'rgba(150,140,128,0.25)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 1);
      g.lineTo(256, 1);
      g.stroke();
      break;
    }
    case 'concrete': {
      g.fillStyle = '#ddd5ca';
      g.fillRect(0, 0, 256, 256);
      noise(g, 256, 256, 2200, ['#c9bfb2', '#efe8df', '#b8ad9f'], [1, 3], 5);
      break;
    }
    case 'wood': {
      g.fillStyle = '#b98a5a';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#a77a4c' : '#c4956a';
        g.fillRect(0, i * 32, 256, 30);
        g.fillStyle = 'rgba(60,35,15,0.5)';
        g.fillRect(0, i * 32 + 30, 256, 2);
      }
      noise(g, 256, 256, 600, ['#8d6238', '#d6a87a'], [1, 3], 9);
      break;
    }
    case 'asphalt': {
      g.fillStyle = '#4a4744';
      g.fillRect(0, 0, 256, 256);
      noise(g, 256, 256, 4200, ['#2e2c2a', '#6b6763', '#57524d', '#7d7770'], [1, 4], 11);
      // Cracks and patches.
      const r = rng(17);
      g.fillStyle = 'rgba(30,28,26,0.55)';
      for (let i = 0; i < 4; i++) g.fillRect(r() * 200, r() * 200, 30 + r() * 50, 20 + r() * 40);
      g.strokeStyle = '#1d1b1a';
      g.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        let x = r() * 256;
        let y = r() * 256;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (r() - 0.5) * 50;
          y += (r() - 0.5) * 50;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      break;
    }
    case 'sand': {
      g.fillStyle = '#e2bf82';
      g.fillRect(0, 0, 256, 256);
      noise(g, 256, 256, 5000, ['#c99f5f', '#f0d39f', '#b88d50', '#f7e2b8'], [1, 2.5], 13);
      const r = rng(23);
      g.fillStyle = 'rgba(150,110,60,0.35)';
      for (let i = 0; i < 14; i++) {
        g.beginPath();
        g.ellipse(r() * 256, r() * 256, 7, 12, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'brake': {
      g.fillStyle = '#b8402f';
      g.fillRect(0, 0, 256, 256);
      noise(g, 256, 256, 2000, ['#9c3426', '#cf5a45'], [1, 3], 29);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 8, 0, 6, 256);
      break;
    }
  }
  const t = finish(c);
  cache.set(key, t);
  return t;
}

/** Promenade tiles. */
export function tileTexture(): THREE.Texture {
  const hit = cache.get('tiles');
  if (hit) return hit;
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#c9a98a';
  g.fillRect(0, 0, 512, 512);
  const r = rng(41);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const tone = 180 + Math.floor(r() * 30);
      g.fillStyle = `rgb(${tone + 20},${tone - 5},${tone - 35})`;
      const off = y % 2 ? 32 : 0;
      g.fillRect(x * 64 + off + 2, y * 64 + 2, 60, 60);
    }
  noise(g, 512, 512, 3000, ['#a98a6c', '#e2c6a8'], [1, 2], 43);
  const t = finish(c);
  cache.set('tiles', t);
  return t;
}

export function beachTexture(): THREE.Texture {
  const hit = cache.get('beach');
  if (hit) return hit;
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#e9cd98';
  g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, 4000, ['#d8b77c', '#f6e2bb', '#cfa968'], [1, 2], 47);
  const t = finish(c);
  cache.set('beach', t);
  return t;
}

const GRAFFITI_COLORS = ['#ff4fa3', '#21d4c8', '#ffd23f', '#7a5cff', '#ff7a3d', '#3fb6ff'];

/** A colourful graffiti panel for ramp side walls (seeded so each wall differs). */
export function graffitiTexture(seed: number, wide = 2): THREE.Texture {
  const key = `graf-${seed}-${wide}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 256 * wide;
  const [c, g] = canvas(W, 256);
  g.fillStyle = '#e8e1d6';
  g.fillRect(0, 0, W, 256);
  noise(g, W, 256, 900 * wide, ['#d6cdbf', '#f3eee6'], [1, 3], seed);
  const r = rng(seed * 7 + 1);
  // Blobs and bubbles.
  for (let i = 0; i < 7 * wide; i++) {
    const col = GRAFFITI_COLORS[Math.floor(r() * GRAFFITI_COLORS.length)];
    g.fillStyle = col;
    g.globalAlpha = 0.85;
    g.beginPath();
    const x = r() * W;
    const y = 100 + r() * 140;
    g.ellipse(x, y, 30 + r() * 70, 20 + r() * 45, r() * 3, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#1b1530';
    g.lineWidth = 5;
    g.stroke();
  }
  g.globalAlpha = 1;
  // Skyline stencil.
  g.fillStyle = 'rgba(255,255,255,0.9)';
  let x = r() * 60;
  while (x < W) {
    const bw = 14 + r() * 26;
    const bh = 30 + r() * 80;
    g.fillRect(x, 230 - bh, bw, bh);
    x += bw + 4 + r() * 20;
  }
  // Tag.
  g.font = `900 ${70 + r() * 30}px Rubik, sans-serif`;
  g.textAlign = 'center';
  g.direction = 'rtl';
  const tags = ['תל אביב', "ג'ול!", 'יאללה', 'שאיבה', 'זום'];
  const tag = tags[Math.floor(r() * tags.length)];
  const col = GRAFFITI_COLORS[Math.floor(r() * GRAFFITI_COLORS.length)];
  g.lineWidth = 12;
  g.strokeStyle = '#1b1530';
  g.strokeText(tag, W / 2, 200);
  g.fillStyle = col;
  g.fillText(tag, W / 2, 200);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

/** Dashed glowing line texture (alpha) for the energy line. */
export function dashTexture(): THREE.Texture {
  const hit = cache.get('dash');
  if (hit) return hit;
  const [c, g] = canvas(128, 16);
  g.clearRect(0, 0, 128, 16);
  const grad = g.createLinearGradient(0, 0, 0, 16);
  grad.addColorStop(0, 'rgba(255,214,80,0)');
  grad.addColorStop(0.5, 'rgba(255,230,120,1)');
  grad.addColorStop(1, 'rgba(255,214,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 80, 16);
  const t = finish(c);
  cache.set('dash', t);
  return t;
}

/** Soft round sprite for particles and glows. */
export function softDot(color = '#ffffff'): THREE.Texture {
  const key = `dot-${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = finish(c, false);
  cache.set(key, t);
  return t;
}

/** Palm frond leaf texture (alpha). */
export function frondTexture(): THREE.Texture {
  const hit = cache.get('frond');
  if (hit) return hit;
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#2f6b2a';
  g.beginPath();
  g.moveTo(32, 0);
  for (let i = 0; i <= 16; i++) {
    const y = (i / 16) * 256;
    const w = Math.sin((i / 16) * Math.PI) * 30;
    g.lineTo(32 + w, y);
  }
  for (let i = 16; i >= 0; i--) {
    const y = (i / 16) * 256;
    const w = Math.sin((i / 16) * Math.PI) * 30;
    g.lineTo(32 - w, y);
  }
  g.fill();
  g.strokeStyle = '#7da33f';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(32, 0);
  g.lineTo(32, 256);
  g.stroke();
  const t = finish(c, false);
  cache.set('frond', t);
  return t;
}
