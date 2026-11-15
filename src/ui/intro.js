// Intro breve (sesión 4): tres pantallas de texto con efecto de máquina de
// escribir sobre las ilustraciones de Javier, antes del aterrizaje.

import { VIEW_W, VIEW_H } from '../config.js';
import { text, panel } from '../render/hud.js';
import { cover, shadeBottom } from './widgets.js';

const PAGES = [
  {
    bg: 'avion',
    titulo: 'Vuelo A-07',
    lineas: [
      'Ruta de suministros sobre el Pacífico sur.',
      'Llevas seis horas de vuelo y una tormenta te ha desviado del rumbo.',
    ],
  },
  {
    bg: 'avion',
    alarma: true,
    titulo: '¡Sin combustible!',
    lineas: [
      'La aguja del combustible cae a cero. El motor tose y se para.',
      'La radio solo devuelve ruido. Nadie sabe dónde estás.',
    ],
  },
  {
    bg: 'mapa',
    titulo: 'Una isla que no sale en los mapas',
    lineas: [
      'Abajo, entre las nubes, aparece una isla cubierta de selva.',
      'Elige bien dónde bajar: cada sitio tiene su riesgo.',
    ],
  },
];

const CPS = 55; // caracteres por segundo

export class IntroScreen {
  constructor(game) {
    this.game = game;
    this.page = 0;
    this.t = 0;
  }

  enter() {
    this.page = 0;
    this.t = 0;
    // El mapa de la isla se pinta aquí, mientras se leen los textos.
    this.game.landing.prepare();
  }

  get total() {
    return PAGES[this.page].lineas.join(' ').length;
  }

  get typed() {
    return Math.floor(this.t * CPS);
  }

  update(dt, input) {
    this.t += dt;
    if (input.pressed('pause')) {
      this.game.goto('landing');
      return;
    }
    if (input.pressed('confirm') || input.pressed('jump') || input.mouse.pressed[0]) {
      if (this.typed < this.total) {
        this.t = this.total / CPS + 0.01;
      } else if (this.page < PAGES.length - 1) {
        this.page++;
        this.t = 0;
        this.game.sound('pickup');
      } else {
        this.game.goto('landing');
      }
    }
  }

  render(c) {
    const pg = PAGES[this.page];
    const g = this.game;
    if (pg.bg === 'mapa') {
      g.landing.renderBackdrop(c, this.t);
    } else {
      cover(c, g.images.avion, 1.08 + this.t * 0.01, 0.5, 0.4);
    }
    if (pg.alarma && Math.floor(this.t * 2.5) % 2 === 0) {
      c.fillStyle = 'rgba(160, 20, 10, 0.25)';
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    shadeBottom(c, 0.25, 0.95);
    // Bandas de cine.
    c.fillStyle = '#000';
    c.fillRect(0, 0, VIEW_W, 56);
    c.fillRect(0, VIEW_H - 56, VIEW_W, 56);

    const x = 120;
    const w = VIEW_W - 240;
    const y = VIEW_H - 280;
    panel(c, x, y, w, 190, 0.78);
    text(c, pg.titulo.toUpperCase(), x + 24, y + 34, { size: 30, color: pg.alarma ? '#ff6a4a' : '#ffe8a8', outline: 6 });
    let left = this.typed;
    pg.lineas.forEach((l, i) => {
      const shown = l.slice(0, Math.max(0, left));
      left -= l.length + 1;
      text(c, shown, x + 24, y + 86 + i * 34, { size: 21, bold: false, outline: 4 });
    });
    const done = this.typed >= this.total;
    if (done && Math.floor(this.t * 2) % 2 === 0) {
      text(c, this.page < PAGES.length - 1 ? 'Enter ▸' : 'Enter: a los mandos ▸', x + w - 20, y + 166, { size: 17, align: 'right', color: '#ffd38a', outline: 3 });
    }
    // Puntos de página.
    for (let i = 0; i < PAGES.length; i++) {
      c.fillStyle = i === this.page ? '#ffe8a8' : '#5a5648';
      c.fillRect(VIEW_W / 2 - 30 + i * 24, VIEW_H - 32, 12, 12);
    }
    text(c, 'Esc: saltar la intro', VIEW_W - 20, 28, { size: 14, align: 'right', color: '#a8a8a0', bold: false, outline: 3 });
  }
}
