// Lluvia como evento: llega cada cierto tiempo, con gotas, salpicaduras, ondas en
// el agua, charcos, cielo oscurecido y relámpagos cuando arrecia. Afecta al
// juego: los enemigos ven menos lejos y oyen menos.

import { TILE, LOW_W, LOW_H } from '../config.js';
import { RNG } from '../core/rng.js';
import { G, isWaterGround } from '../world/tiles.js';

export class Weather {
  constructor(map) {
    this.map = map;
    this.rng = new RNG(777);
    this.intensity = 0;
    this.raining = false;
    this.timer = 75 + this.rng.range(0, 45); // primera lluvia
    this.flash = 0;
    this.nextFlash = 6;
    this.drops = [];
    this.splashes = [];
    // Charcos: sitios fijos en caminos y claros.
    this.puddles = [];
    for (let i = 0; i < 9000 && this.puddles.length < 700; i++) {
      const tx = this.rng.int(0, map.width - 1);
      const ty = this.rng.int(0, map.height - 1);
      const g = map.groundAt(tx, ty);
      if (g === G.DIRT || (g === G.JUNGLE && this.rng.next() < 0.3) || (g === G.SAND && this.rng.next() < 0.15)) {
        this.puddles.push({ x: (tx + this.rng.next()) * TILE, y: (ty + this.rng.next()) * TILE, rx: this.rng.int(5, 12), ry: this.rng.int(2, 4) });
      }
    }
  }

  /** Activa o quita la lluvia de inmediato (pruebas y atajo F6). */
  set(on) {
    this.raining = on;
    this.intensity = on ? 1 : 0;
    this.timer = on ? 70 : 150;
  }

  get visionFactor() {
    return 1 - 0.35 * this.intensity;
  }

  get hearingFactor() {
    return 1 - 0.6 * this.intensity;
  }

  /** Multiplicador del color ambiente (cielo encapotado). */
  get tint() {
    const k = this.intensity;
    return [1 - 0.3 * k, 1 - 0.26 * k, 1 - 0.16 * k];
  }

  update(dt, cam) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.raining = !this.raining;
      this.timer = this.raining ? 55 + this.rng.range(0, 35) : 130 + this.rng.range(0, 110);
    }
    const target = this.raining ? 1 : 0;
    this.intensity += Math.sign(target - this.intensity) * Math.min(Math.abs(target - this.intensity), dt * 0.18);

    // Relámpagos cuando llueve fuerte.
    this.flash = Math.max(0, this.flash - dt * 2.8);
    if (this.intensity > 0.75) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash = 1;
        this.nextFlash = 8 + this.rng.range(0, 14);
      }
    }

    // Gotas (en coordenadas de mundo, alrededor de la cámara).
    const n = Math.floor(LOW_W * LOW_H * 0.0042 * this.intensity * dt * 60);
    for (let i = 0; i < n / 10 + (Math.random() < (n % 10) / 10 ? 1 : 0); i++) {
      const life = 0.25 + Math.random() * 0.45;
      this.drops.push({
        x: cam.ix + Math.random() * (LOW_W + 60), y: cam.iy + Math.random() * LOW_H - 120 * life * 1.5,
        vx: -55, vy: 360, life, age: 0,
      });
    }
    const keep = [];
    for (const d of this.drops) {
      d.age += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.age < d.life) { keep.push(d); continue; }
      const g = this.map.groundAt(Math.floor(d.x / TILE), Math.floor(d.y / TILE));
      this.splashes.push({ x: d.x, y: d.y, age: 0, water: isWaterGround(g) });
    }
    this.drops = keep;
    this.splashes = this.splashes.filter((s) => (s.age += dt) < (s.water ? 0.45 : 0.18));
  }

  drawPuddles(l, cam, t) {
    if (this.intensity < 0.05) return;
    l.globalAlpha = Math.min(1, this.intensity * 1.2) * 0.55;
    for (const p of this.puddles) {
      if (p.x < cam.ix - 20 || p.x > cam.ix + LOW_W + 20 || p.y < cam.iy - 10 || p.y > cam.iy + LOW_H + 10) continue;
      l.fillStyle = '#2a4a5e';
      l.fillRect(Math.round(p.x - p.rx), Math.round(p.y - p.ry + 1), p.rx * 2, p.ry * 2 - 2);
      l.fillRect(Math.round(p.x - p.rx + 2), Math.round(p.y - p.ry), p.rx * 2 - 4, p.ry * 2);
      l.fillStyle = '#9ac4d8';
      l.fillRect(Math.round(p.x - p.rx + 3), Math.round(p.y - p.ry + 1), Math.max(2, p.rx - 2), 1);
      // Onda ocasional.
      const k = (t * 1.7 + p.x * 0.01) % 1;
      if (k < 0.5) {
        const r = Math.round(1 + k * 8);
        l.fillRect(Math.round(p.x - r + (p.x % 5)), Math.round(p.y), r * 2, 1);
      }
    }
    l.globalAlpha = 1;
  }

  draw(l) {
    if (this.intensity < 0.02 && !this.drops.length) return;
    l.fillStyle = 'rgba(200, 220, 240, 0.55)';
    for (const d of this.drops) {
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      l.fillRect(x, y, 1, 3);
      l.fillRect(x - 1, y + 3, 1, 3);
    }
    for (const s of this.splashes) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      if (s.water) {
        const r = Math.round(1 + (s.age / 0.45) * 4);
        l.fillStyle = `rgba(220, 245, 255, ${0.7 * (1 - s.age / 0.45)})`;
        l.fillRect(x - r, y, r * 2 + 1, 1);
        l.fillRect(x - r + 1, y - 1, r * 2 - 1, 1);
      } else {
        l.fillStyle = 'rgba(210, 230, 245, 0.7)';
        l.fillRect(x - 1, y - 1, 1, 1);
        l.fillRect(x + 1, y - 1, 1, 1);
        l.fillRect(x, y - 2, 1, 1);
      }
    }
  }
}
