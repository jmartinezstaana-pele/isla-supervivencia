// Cámara con seguimiento suave, mirada adelantada en la dirección del jugador y
// límites del mundo. En vertical no sigue cada salto: se reajusta al pisar suelo,
// al caer por debajo o al subir demasiado, para evitar tirones.

import { VIEW_W, VIEW_H, CAMERA_ZOOM, PLAYER } from '../config.js';
import { clamp, smoothFactor } from '../core/math.js';

const LOOK_AHEAD = 90;        // px de mundo por delante del jugador
const LOOK_RATE = 2.2;        // velocidad a la que cambia la mirada adelantada
const FOLLOW_RATE_X = 6;
const FOLLOW_RATE_Y = 4;
const FOLLOW_RATE_Y_FAST = 10; // al caer deprisa
const FOCUS_ABOVE_MAX = 110;   // cuánto puede subir el jugador sin que la cámara lo siga
const SCREEN_FEET_Y = 0.62;    // altura de pantalla (0–1) donde quedan los pies

export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.zoom = CAMERA_ZOOM;
    this.x = 0;
    this.y = 0;
    this.look = 0;
    this.focusY = 0;
  }

  get viewW() {
    return VIEW_W / this.zoom;
  }

  get viewH() {
    return VIEW_H / this.zoom;
  }

  targetFor(p) {
    const tx = p.centerX + this.look - this.viewW / 2;
    const ty = this.focusY - this.viewH * SCREEN_FEET_Y;
    return [tx, ty];
  }

  updateFocus(p) {
    const feet = p.feetY;
    if (p.onGround || p.swimming) this.focusY = feet;
    else if (feet > this.focusY) this.focusY = feet;
    else if (feet < this.focusY - FOCUS_ABOVE_MAX) this.focusY = feet + FOCUS_ABOVE_MAX;
  }

  /** Coloca la cámara directamente sobre el jugador (al empezar o reaparecer). */
  snap(p) {
    this.look = p.facing * LOOK_AHEAD * 0.5;
    this.focusY = p.feetY;
    [this.x, this.y] = this.targetFor(p);
    this.clampToWorld();
  }

  update(dt, p) {
    const moving = Math.min(1, Math.abs(p.vx) / PLAYER.walkSpeed);
    const desiredLook = p.facing * LOOK_AHEAD * (0.5 + 0.5 * moving);
    this.look += (desiredLook - this.look) * smoothFactor(LOOK_RATE, dt);
    this.updateFocus(p);

    const [tx, ty] = this.targetFor(p);
    this.x += (tx - this.x) * smoothFactor(FOLLOW_RATE_X, dt);
    const rateY = p.vy > 400 ? FOLLOW_RATE_Y_FAST : FOLLOW_RATE_Y;
    this.y += (ty - this.y) * smoothFactor(rateY, dt);
    this.clampToWorld();
  }

  clampToWorld() {
    const maxX = this.worldW - this.viewW;
    const maxY = this.worldH - this.viewH;
    this.x = maxX > 0 ? clamp(this.x, 0, maxX) : maxX / 2;
    this.y = maxY > 0 ? clamp(this.y, 0, maxY) : maxY / 2;
  }

  /** Aplica la transformación de mundo al contexto (posición redondeada a píxeles de pantalla). */
  apply(ctx) {
    const z = this.zoom;
    ctx.setTransform(z, 0, 0, z, -Math.round(this.x * z), -Math.round(this.y * z));
  }
}
