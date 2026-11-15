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
      if (p.type === 'snow') p.x += Math.sin(p.age * 4 + p.seed) * 20 * dt;
      if (p.type === 'bird') p.y += Math.sin(p.age * 1.3 + p.seed) * 8 * dt;
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
        case 'snow': {
          // Copo con sombra azulada para que se lea también sobre la nieve.
          const sz = p.seed > 6 ? 2 : 1;
          l.fillStyle = '#7f94ac';
          l.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, sz, sz);
          l.fillStyle = p.color;
          l.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
          break;
        }
        case 'gust': {
          // Racha de viento: trazo largo y fino que se desvanece.
          l.globalAlpha = Math.sin(k * Math.PI) * 0.55;
          l.fillStyle = p.color;
          const len = 18 + ((p.y * 7) % 20);
          l.fillRect(Math.round(p.x), Math.round(p.y), len, 1);
          l.fillRect(Math.round(p.x + len * 0.3), Math.round(p.y - 1), Math.round(len * 0.4), 1);
          l.globalAlpha = 1;
          break;
        }
        case 'bird': {
          // Gaviota: una «v» que aletea.
          const up = Math.sin(p.age * 9 + p.seed) > 0;
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          l.fillStyle = '#17150f';
          l.fillRect(x - 3, y + (up ? -1 : 1), 3, 1);
          l.fillRect(x + 1, y + (up ? -1 : 1), 3, 1);
          l.fillStyle = p.color;
          l.fillRect(x - 2, y + (up ? -2 : 0), 2, 1);
          l.fillRect(x + 1, y + (up ? -2 : 0), 2, 1);
          l.fillRect(x, y, 1, 1);
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
  for (const p of game.world.index.query(cam.ix - 60, cam.iy - 80, cam.ix + cam.viewW + 60, cam.iy + cam.viewH + 60)) {
    if (p.smoke && Math.random() < dt * 9) {
      P.add({ type: 'smoke', x: p.x + p.smoke.dx + Math.random() * 4, y: p.y + p.smoke.dy, vx: 6 + Math.random() * 5, vy: -16, life: 3.5, size: 3, grow: 9, color: '#3a3a36', alpha: 0.5, drag: 0.3 });
    }
    if (p.fire && Math.random() < dt * (p.fire.size > 1 ? 10 : 3)) {
      P.add({ type: 'spark', x: p.x + (Math.random() - 0.5) * 8 * p.fire.size, y: p.y + p.fire.dy - 6, vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 25, life: 0.9, color: Math.random() < 0.5 ? '#ffd040' : '#ff7a20', fade: true });
    }
  }
  for (const wf of game.waterfalls || []) {
    if (wf.x < cam.ix - 60 || wf.x > cam.ix + cam.viewW + 60 || wf.y < cam.iy - 40 || wf.y > cam.iy + cam.viewH + 60 || Math.random() > dt * 14) continue;
    P.add({ type: 'mist', x: wf.x + (Math.random() - 0.5) * wf.w, y: wf.y + Math.random() * 10, vx: (Math.random() - 0.5) * 16, vy: -10 - Math.random() * 8, life: 1.8, size: 2, grow: 6, color: '#eaf8ff', alpha: 0.5 });
  }
  // Ambiente de cada bioma.
  if (zone === 'cumbre' || (zone === 'monte' && game.player.level >= 3)) {
    // Ventisca: copos que cruzan en diagonal y rachas de nieve.
    const k = zone === 'cumbre' ? 1 : 0.45;
    for (let i = 0; i < 2; i++) if (Math.random() < dt * 60 * k) P.add({ type: 'snow', x: cam.ix - 20 + Math.random() * (cam.viewW + 40), y: cam.iy - 6, vx: -40 - Math.random() * 50, vy: 30 + Math.random() * 30, life: 8, color: Math.random() < 0.3 ? '#c8d8e8' : '#ffffff', seed: Math.random() * 9 });
    if (Math.random() < dt * 3 * k) P.add({ type: 'gust', x: cam.ix + cam.viewW + 10, y: ry(), vx: -260 - Math.random() * 80, vy: 10, life: 2.4, color: '#9fb4c8' });
  } else if (zone === 'acantilados') {
    if (Math.random() < dt * 5) P.add({ type: 'gust', x: cam.ix + cam.viewW + 10, y: ry(), vx: -300 - Math.random() * 120, vy: 6, life: 2.2, color: '#e8f4f0' });
    if (Math.random() < dt * 0.8) P.add({ type: 'bird', x: cam.ix - 10, y: cam.iy + Math.random() * cam.viewH * 0.6, vx: 40 + Math.random() * 20, vy: (Math.random() - 0.5) * 6, life: 18, color: '#f0f0ea', seed: Math.random() * 9 });
  } else if (zone === 'manglar') {
    if (Math.random() < dt * 3) P.add({ type: 'mote', x: rx(), y: ry(), vy: -2, vx: 1, life: 2.5, color: '#c8e8a0' });
    if (night && Math.random() < dt * 3) P.add({ type: 'firefly', x: rx(), y: ry(), vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 4, color: '#c8ff6a', seed: Math.random() * 9 });
  } else if (zone === 'militar' && Math.random() < dt * 2) {
    P.add({ type: 'dust', x: cam.ix + cam.viewW + 4, y: ry(), vx: -60, vy: 2, life: 3, color: '#a89878', fade: true });
  } else if ((zone === 'costa' || zone === 'bahia' || zone === 'playa') && Math.random() < dt * 0.4) {
    P.add({ type: 'bird', x: cam.ix - 10, y: cam.iy + Math.random() * cam.viewH * 0.5, vx: 34 + Math.random() * 20, vy: (Math.random() - 0.5) * 6, life: 20, color: '#f4f4ee', seed: Math.random() * 9 });
  }
  void t;
  void TILE;
}
