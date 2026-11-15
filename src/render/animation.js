// Animaciones a partir del atlas: { nombre: [[x, y, ancho, alto], …] }.
// Todos los fotogramas miran a la derecha; para la izquierda se voltean al dibujar.
// El ancla es el centro del borde inferior (los pies).

import { drawCharacter } from '../gfx/charSprite.js';

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

/**
 * Dibuja el fotograma actual de `anim` (hoja `sheet`, ver gfx/charSprite.js) con
 * los pies en (x, y) mirando a `facing` (1 derecha, −1 izquierda). Con escala 1
 * se copia 1:1 sobre los píxeles reales de la pantalla.
 */
export function drawFrame(ctx, sheet, anim, x, y, facing, scale = 1, rotation = 0) {
  drawCharacter(ctx, sheet, anim.name, anim.index, x, y, facing, scale, rotation);
}
