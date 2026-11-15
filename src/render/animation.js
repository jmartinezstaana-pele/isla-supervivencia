// Animaciones a partir del atlas: { nombre: [[x, y, ancho, alto], …] }.
// Todos los fotogramas miran a la derecha; para la izquierda se voltean al dibujar.
// El ancla es el centro del borde inferior (los pies).

import { SPRITE_SCALE } from '../config.js';

export class Animator {
  constructor(frames) {
    this.frames = frames;
    this.name = null;
    this.time = 0;
    this.index = 0;
  }

  /** Reproduce en bucle `name` a `fps` fotogramas por segundo. */
  play(name, fps, dt) {
    if (name !== this.name) {
      this.name = name;
      this.time = 0;
    } else {
      this.time += dt;
    }
    const n = this.frames[name].length;
    this.index = Math.floor(this.time * fps) % n;
  }

  /** Muestra un fotograma fijo de una animación. */
  hold(name, index) {
    if (name !== this.name) this.time = 0;
    this.name = name;
    this.index = Math.min(index, this.frames[name].length - 1);
  }

  get frame() {
    return this.frames[this.name][this.index];
  }
}

/** Dibuja un fotograma con los pies en (x, y) mirando a `facing` (1 derecha, −1 izquierda). */
export function drawFrame(ctx, atlas, frame, x, y, facing, scale = SPRITE_SCALE) {
  const [sx, sy, sw, sh] = frame;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale);
  ctx.drawImage(atlas, sx, sy, sw, sh, -Math.round(sw / 2), -sh, sw, sh);
  ctx.restore();
}
