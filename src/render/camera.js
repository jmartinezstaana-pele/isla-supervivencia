// Cámara cenital: sigue al jugador en x e y con suavizado, mira un poco hacia
// donde se mueve y respeta los límites del mapa.

import { LOW_W, LOW_H } from '../config.js';
import { clamp, smoothFactor } from '../core/math.js';
import { display } from '../core/display.js';

const LOOK_AHEAD = 0.35;  // segundos de movimiento que se adelanta la cámara
const LOOK_MAX = 70;      // px de mundo
const LOOK_RATE = 3;
const FOLLOW_RATE = 7;
const HEAD_OFFSET = 16;   // centra un poco por encima de los pies

export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;
    this.y = 0;
    this.lookX = 0;
    this.lookY = 0;
  }

  get viewW() {
    return LOW_W;
  }

  get viewH() {
    return LOW_H;
  }

  /** Posición entera de la cámara (el mundo se pinta a píxel exacto). */
  get ix() {
    return Math.round(this.x);
  }

  get iy() {
    return Math.round(this.y);
  }

  target(p) {
    return [p.x + this.lookX - this.viewW / 2, p.y - HEAD_OFFSET + this.lookY - this.viewH / 2];
  }

  /** Coloca la cámara directamente sobre el jugador (al empezar o reaparecer). */
  snap(p) {
    this.lookX = this.lookY = 0;
    [this.x, this.y] = this.target(p);
    this.clampToWorld();
  }

  update(dt, p) {
    const lx = clamp(p.vx * LOOK_AHEAD, -LOOK_MAX, LOOK_MAX);
    const ly = clamp(p.vy * LOOK_AHEAD, -LOOK_MAX, LOOK_MAX);
    const k = smoothFactor(LOOK_RATE, dt);
    this.lookX += (lx - this.lookX) * k;
    this.lookY += (ly - this.lookY) * k;
    const [tx, ty] = this.target(p);
    const f = smoothFactor(FOLLOW_RATE, dt);
    this.x += (tx - this.x) * f;
    this.y += (ty - this.y) * f;
    this.clampToWorld();
  }

  clampToWorld() {
    const maxX = this.worldW - this.viewW;
    const maxY = this.worldH - this.viewH;
    this.x = maxX > 0 ? clamp(this.x, 0, maxX) : maxX / 2;
    this.y = maxY > 0 ? clamp(this.y, 0, maxY) : maxY / 2;
  }

  /** Aplica la transformación de mundo al buffer del mundo (escala entera K). */
  apply(ctx) {
    const K = display.K;
    ctx.setTransform(K, 0, 0, K, -this.ix * K + display.ox, -this.iy * K + display.oy);
  }
}
