// Pantalla de título (sesión 4): ilustración del avión de Javier y menú con
// Nueva partida, Continuar (desactivado si no hay partida guardada) y Controles.

import { VIEW_W, VIEW_H } from '../config.js';
import { text, panel, CONTROLS } from '../render/hud.js';
import { hasSave } from '../core/save.js';
import { cover, button, drawCursor, inRect, shadeBottom } from './widgets.js';

const ITEMS = [
  { id: 'nueva', label: 'Nueva partida' },
  { id: 'continuar', label: 'Continuar' },
  { id: 'controles', label: 'Controles' },
];

export class TitleScreen {
  constructor(game) {
    this.game = game;
    this.sel = 0;
    this.showControls = false;
    this.t = 0;
    this.canContinue = hasSave();
  }

  enter() {
    this.canContinue = hasSave();
    this.showControls = false;
    this.sel = 0;
  }

  rects() {
    return ITEMS.map((it, i) => ({ ...it, x: VIEW_W / 2 - 150, y: VIEW_H - 236 + i * 64, w: 300, h: 48 }));
  }

  enabled(id) {
    return id !== 'continuar' || this.canContinue;
  }

  update(dt, input) {
    this.t += dt;
    const m = input.mouse;
    if (this.showControls) {
      if (input.pressed('pause') || input.pressed('confirm') || input.pressed('jump') || m.pressed[0]) this.showControls = false;
      return;
    }
    const rs = this.rects();
    const move = (d) => {
      let i = this.sel;
      do i = (i + d + ITEMS.length) % ITEMS.length; while (!this.enabled(ITEMS[i].id));
      this.sel = i;
    };
    if (input.pressed('down')) move(1);
    if (input.pressed('up')) move(-1);
    let clicked = null;
    rs.forEach((r, i) => {
      if (inRect(m, r) && this.enabled(r.id)) {
        if (this.lastMouse && (this.lastMouse.x !== m.x || this.lastMouse.y !== m.y)) this.sel = i;
        if (m.pressed[0]) clicked = r.id;
      }
    });
    this.lastMouse = { x: m.x, y: m.y };
    const chosen = clicked || (input.pressed('confirm') || input.pressed('jump') ? ITEMS[this.sel].id : null);
    if (!chosen) return;
    this.game.sound('pickup');
    if (chosen === 'nueva') this.game.goto('create');
    else if (chosen === 'controles') this.showControls = true;
    else if (chosen === 'continuar') this.game.goto('create'); // el guardado completo llega en la sesión 8
  }

  render(c) {
    const img = this.game.images.avion;
    cover(c, img, 1.04 + Math.sin(this.t * 0.15) * 0.02, 0.5, 0.45);
    shadeBottom(c, 0.3, 0.9);
    text(c, 'ISLA', VIEW_W / 2, 150, { size: 120, align: 'center', color: '#ffe8a8', outline: 16 });
    text(c, 'Sin combustible. Sobrevive. Escapa.', VIEW_W / 2, 232, { size: 26, align: 'center', outline: 6 });
    for (const [i, r] of this.rects().entries()) {
      const disabled = !this.enabled(r.id);
      button(c, r, r.label, { selected: i === this.sel, disabled, sub: disabled ? 'sin partida guardada' : '' });
    }
    text(c, 'W / S o flechas · Enter para elegir', VIEW_W / 2, VIEW_H - 34, { size: 15, align: 'center', color: '#c8c8b8', bold: false, outline: 3 });
    text(c, 'Prototipo · sesión 4', VIEW_W - 16, VIEW_H - 16, { size: 13, align: 'right', color: '#a8a8a8', outline: 3 });
    if (this.showControls) this.renderControls(c);
    drawCursor(c, this.game.input.mouse);
  }

  renderControls(c) {
    c.fillStyle = 'rgba(0, 0, 0, 0.6)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 620;
    const h = CONTROLS.length * 28 + 100;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    panel(c, x, y, w, h, 0.92);
    text(c, 'CONTROLES', x + 20, y + 30, { size: 26, color: '#ffe8a8', outline: 5 });
    CONTROLS.forEach(([k, d], i) => {
      text(c, k, x + 20, y + 72 + i * 28, { size: 17, color: '#ffd38a', outline: 3 });
      text(c, d, x + 240, y + 72 + i * 28, { size: 17, bold: false, outline: 3 });
    });
    text(c, 'Pulsa Enter, Esc o haz clic para volver', VIEW_W / 2, y + h - 20, { size: 15, align: 'center', color: '#c8d0c0', bold: false, outline: 3 });
  }
}
