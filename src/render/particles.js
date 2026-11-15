// Partículas en pixel art: hojas que caen, motas de luz, luciérnagas, humo,
// chispas, bruma de la cascada, salpicaduras, polvo y golpes.

import { TILE } from '../config.js';

export class Particles {
  constructor() {
    this.list = [];
  }

  add(p) {
    if (this.list.length > 900) return;
    this.list.push({ vx: 0, vy: 0, g: 0, life: 1, size: 1, drag: 0, ...p, age: 0 });
  }

  update(dt) {
    const out = [];
    for (const p of this.list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy += p.g * dt;
      if (p.drag) { p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt); }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'leaf') p.x += Math.sin(p.age * 3 + p.seed) * 14 * dt;
      out.push(p);
    }
    this.list = out;
  }

  draw(l) {
    for (const p of this.list) {
      const k = p.age / p.life;
      switch (p.type) {
        case 'leaf': {
          l.fillStyle = p.color;
          const flip = Math.sin(p.age * 6 + p.seed) > 0;
          l.fillRect(Math.round(p.x), Math.round(p.y), flip ? 2 : 1, flip ? 1 : 2);
          break;
        }
        case 'mote':
        case 'firefly': {
          const a = Math.sin(k * Math.PI) * (p.type === 'firefly' ? 0.5 + 0.5 * Math.sin(p.age * 8 + p.seed) : 0.8);
          l.globalAlpha = Math.max(0, a);
          l.fillStyle = p.color;
          l.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
          if (p.type === 'firefly') {
            l.globalAlpha = Math.max(0, a * 0.35);
            l.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1);
            l.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
          }
          l.globalAlpha = 1;
          break;
        }
        case 'smoke':
        case 'mist': {
          const s = Math.round(p.size + k * p.grow);
          l.globalAlpha = (1 - k) * (p.alpha ?? 0.45);
          l.fillStyle = p.color;
          l.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
          l.fillRect(Math.round(p.x - s / 2) - 1, Math.round(p.y - s / 2) + 1, s + 2, Math.max(1, s - 2));
          l.globalAlpha = 1;
          break;
        }
        case 'ring': {
          const r = Math.round(1 + k * p.grow);
          l.globalAlpha = 1 - k;
          l.fillStyle = p.color;
          l.fillRect(Math.round(p.x - r), Math.round(p.y), 1, 1);
          l.fillRect(Math.round(p.x + r), Math.round(p.y), 1, 1);
          l.fillRect(Math.round(p.x - r + 1), Math.round(p.y - 1), r * 2 - 1, 1);
          l.fillRect(Math.round(p.x - r + 1), Math.round(p.y + 1), r * 2 - 1, 1);
          l.globalAlpha = 1;
          break;
        }
        default: {
          l.globalAlpha = p.fade ? 1 - k : 1;
          l.fillStyle = p.color;
          l.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          l.globalAlpha = 1;
        }
      }
    }
  }
}

/** Emisores de ambiente según la zona y la hora. */
export function emitAmbient(game, dt) {
  const { camera: cam, particles: P, time: t } = game;
  const zone = game.zone;
  const night = game.clock ? game.clock.darkness > 0.5 : false;
  const rx = () => cam.ix + Math.random() * cam.viewW;
  const ry = () => cam.iy + Math.random() * cam.viewH;
  if ((zone === 'selva' || zone === 'ruinas') && Math.random() < dt * 5) {
    const leafCols = ['#4b8f3a', '#6b8a22', '#9a7a2a', '#2d6529'];
    P.add({ type: 'leaf', x: rx(), y: cam.iy - 4, vy: 18 + Math.random() * 14, vx: 6, life: 7, color: leafCols[(Math.random() * 4) | 0], seed: Math.random() * 9 });
  }
  if (!night && (zone === 'selva' || zone === 'ruinas') && Math.random() < dt * 6) {
    P.add({ type: 'mote', x: rx(), y: ry(), vy: -3, vx: 2, life: 3 + Math.random() * 2, color: '#fff6c0' });
  }
  if (night && zone !== 'playa' && Math.random() < dt * 4) {
    P.add({ type: 'firefly', x: rx(), y: ry(), vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 4, color: '#d8ff6a', seed: Math.random() * 9 });
  }
  // Humo de los restos del avión, chispas de los fuegos y bruma de la cascada.
  for (const p of game.world.props) {
    if (p.x < cam.ix - 60 || p.x > cam.ix + cam.viewW + 60 || p.y < cam.iy - 80 || p.y > cam.iy + cam.viewH + 60) continue;
    if (p.smoke && Math.random() < dt * 9) {
      P.add({ type: 'smoke', x: p.x + p.smoke.dx + Math.random() * 4, y: p.y + p.smoke.dy, vx: 6 + Math.random() * 5, vy: -16, life: 3.5, size: 3, grow: 9, color: '#3a3a36', alpha: 0.5, drag: 0.3 });
    }
    if (p.fire && Math.random() < dt * (p.fire.size > 1 ? 10 : 3)) {
      P.add({ type: 'spark', x: p.x + (Math.random() - 0.5) * 8 * p.fire.size, y: p.y + p.fire.dy - 6, vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 25, life: 0.9, color: Math.random() < 0.5 ? '#ffd040' : '#ff7a20', fade: true });
    }
  }
  const wf = game.waterfall;
  if (wf && wf.x > cam.ix - 60 && wf.x < cam.ix + cam.viewW + 60 && Math.random() < dt * 14) {
    P.add({ type: 'mist', x: wf.x + (Math.random() - 0.5) * wf.w, y: wf.y + Math.random() * 10, vx: (Math.random() - 0.5) * 16, vy: -10 - Math.random() * 8, life: 1.8, size: 2, grow: 6, color: '#eaf8ff', alpha: 0.5 });
  }
  void t;
  void TILE;
}
