// Cámara cenital: sigue al jugador en x e y con suavizado, mira un poco hacia
// donde se mueve y respeta los límites del mapa.

import { VIEW_W, VIEW_H, CAMERA_ZOOM } from '../config.js';
import { clamp, smoothFactor } from '../core/math.js';

const LOOK_AHEAD = 0.35;  // segundos de movimiento que se adelanta la cámara
const LOOK_MAX = 70;      // px de mundo
const LOOK_RATE = 3;
const FOLLOW_RATE = 7;
const HEAD_OFFSET = 16;   // centra un poco por encima de los pies

export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.zoom = CAMERA_ZOOM;
    this.x = 0;
    this.y = 0;
    this.lookX = 0;
    this.lookY = 0;
  }

  get viewW() {
    return VIEW_W / this.zoom;
  }

  get viewH() {
    return VIEW_H / this.zoom;
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

  /** Aplica la transformación de mundo (posición redondeada a píxeles de pantalla). */
  apply(ctx) {
    const z = this.zoom;
    ctx.setTransform(z, 0, 0, z, -Math.round(this.x * z), -Math.round(this.y * z));
  }
}
