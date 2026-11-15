// Teclado y ratón. Para cada tecla se sabe si está pulsada (down), si se ha
// pulsado este fotograma (pressed) o si se ha soltado este fotograma (released).
// Se usa event.code (posición física de la tecla), así WASD funciona igual en
// teclados españoles e ingleses.

/** Acciones del juego → teclas. Ver controles en README.md. */
export const BINDINGS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  crouch: ['KeyC'],
  run: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape'],
  debug: ['F3'],
  timeSkip: ['F5'],
  rainToggle: ['F6'],
  interact: ['KeyE'],
  inventory: ['KeyI', 'Tab'],
  stealthKill: ['KeyF'],
  torch: ['KeyT'],
  eat: ['KeyQ'],
  drink: ['KeyR'],
  heal: ['KeyH'],
  confirm: ['Enter', 'NumpadEnter'],
  attack: ['KeyJ'],
  help: ['F1'],
  character: ['KeyP'],
  random: ['KeyX'],
};

// Teclas cuyo comportamiento por defecto del navegador (scroll, foco…) se anula.
const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F1', 'F3', 'F5', 'F6']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressedSet = new Set();
    this.releasedSet = new Set();
    this.mouse = { x: 0, y: 0, down: [false, false, false], pressed: [false, false, false] };

    window.addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat && !this.down.has(e.code)) this.pressedSet.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
      this.releasedSet.add(e.code);
    });
    // Al perder el foco el navegador no envía keyup: se sueltan todas las teclas.
    window.addEventListener('blur', () => this.clear());

    canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this.updateMouse(e);
      canvas.focus();
      if (e.button < 3) {
        this.mouse.down[e.button] = true;
        this.mouse.pressed[e.button] = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button < 3) this.mouse.down[e.button] = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Convierte la posición del ratón a coordenadas internas del canvas (1280 × 720). */
  updateMouse(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * this.canvas.width;
    this.mouse.y = ((e.clientY - r.top) / r.height) * this.canvas.height;
  }

  isDown(action) {
    return BINDINGS[action].some((c) => this.down.has(c));
  }

  pressed(action) {
    return BINDINGS[action].some((c) => this.pressedSet.has(c));
  }

  released(action) {
    return BINDINGS[action].some((c) => this.releasedSet.has(c));
  }

  /** −1, 0 o 1 según las teclas de dirección. */
  axisX() {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }

  axisY() {
    return (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
  }

  /** Llamar al final de cada fotograma. */
  endFrame() {
    this.pressedSet.clear();
    this.releasedSet.clear();
    this.mouse.pressed.fill(false);
  }

  clear() {
    this.down.clear();
    this.pressedSet.clear();
    this.releasedSet.clear();
    this.mouse.down.fill(false);
    this.mouse.pressed.fill(false);
  }
}
