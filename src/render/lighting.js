// Iluminación: capa de luz del tamaño del buffer de baja resolución, rellena con
// el color ambiente (hora y clima) y con luces radiales sumadas (hogueras,
// antorchas, el propio jugador). Se aplica multiplicando sobre el mundo. Las luces
// van en anillos escalonados, como en el pixel art.

import { LOW_W, LOW_H } from '../config.js';

export class Lighting {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LOW_W;
    this.canvas.height = LOW_H;
    this.ctx = this.canvas.getContext('2d');
    this.gradCache = new Map();
  }

  /** Luz radial con anillos escalonados. */
  light(c, x, y, r, [cr, cg, cb], k) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const steps = [[0, 1], [0.32, 1], [0.33, 0.78], [0.58, 0.78], [0.59, 0.5], [0.8, 0.5], [0.81, 0.22], [1, 0]];
    for (const [s, a] of steps) g.addColorStop(s, `rgba(${cr}, ${cg}, ${cb}, ${(a * k).toFixed(3)})`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  draw(l, game) {
    const { clock, weather, camera: cam, player, time: t } = game;
    const amb = clock.ambient;
    const tint = weather.tint;
    const a = amb.map((v, i) => Math.round(v * tint[i]));
    if (a[0] > 250 && a[1] > 250 && a[2] > 250) return;
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = `rgb(${a[0]}, ${a[1]}, ${a[2]})`;
    c.fillRect(0, 0, LOW_W, LOW_H);
    const dark = Math.max(0, 1 - (a[0] * 0.3 + a[1] * 0.5 + a[2] * 0.2) / 255);
    if (dark > 0.08) {
      c.globalCompositeOperation = 'lighter';
      const k = Math.min(1, dark * 1.3);
      for (const p of game.world.props) {
        if (!p.light) continue;
        const x = p.x - cam.ix;
        const y = p.y - cam.iy + (p.fire ? p.fire.dy * 0.6 : 0);
        const r = p.light.r * (p.light.flicker ? 0.94 + 0.06 * Math.sin(t * 13 + p.phase * 5) + 0.03 * Math.sin(t * 31) : 1);
        if (x < -r || x > LOW_W + r || y < -r || y > LOW_H + r) continue;
        this.light(c, x, y, r, p.light.color, k);
      }
      for (const e of game.lightSources()) {
        this.light(c, e.x - cam.ix, e.y - cam.iy, e.r, e.color, k * (e.k ?? 1));
      }
      // Luz propia del jugador (radio de visión reducido de noche).
      this.light(c, player.x - cam.ix, player.y - 20 - cam.iy, player.torchOn ? 0 : 68, [150, 150, 175], k * 0.7);
    }
    l.save();
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'multiply';
    l.drawImage(this.canvas, 0, 0);
    l.restore();
  }
}
