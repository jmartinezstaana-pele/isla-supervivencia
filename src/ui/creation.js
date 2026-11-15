// Creación de personaje (sesión 4, TRASPASO §1.5): 10 puntos entre Fuerza,
// Agilidad, Inteligencia y Sigilo/Percepción (0–6 cada uno), colores de pelo /
// pañuelo, piel, camiseta y pantalón con recoloreado, y vista previa animada del
// personaje girando por las 4 direcciones. Fondo: paisaje.jpg de Javier.

import { VIEW_W, VIEW_H } from '../config.js';
import { text, panel } from '../render/hud.js';
import { ATTRS, ATTR_MAX, ATTR_POINTS, DEFAULT_ATTRS, pointsUsed, statLines } from '../data/attributes.js';
import { COLOR_OPTIONS, COLOR_PARTS, DEFAULT_COLORS, recolorAtlas } from '../gfx/recolor.js';
import { CharacterSheet } from '../gfx/charSprite.js';
import { display } from '../core/display.js';
import { cover, button, drawCursor, inRect } from './widgets.js';

const DIRS = [['walk_down', 'De frente'], ['walk', 'Derecha'], ['walk_up', 'De espaldas'], ['walk_left', 'Izquierda']];
const ROWS = ATTRS.length + COLOR_PARTS.length + 2; // + Aleatorio + Empezar
const ROW_RANDOM = ATTRS.length + COLOR_PARTS.length;
const ROW_START = ROW_RANDOM + 1;

const LEFT = { x: 40, y: 96, w: 620, h: 580 };
const RIGHT = { x: 700, y: 96, w: 540, h: 580 };

export class CreationScreen {
  constructor(game) {
    this.game = game;
    this.attrs = { ...DEFAULT_ATTRS };
    this.colors = { ...DEFAULT_COLORS };
    this.sel = 0;
    this.t = 0;
    this.msg = null;
    this.preview = null;
    this.previewKey = '';
    this.previewSheet = null;
  }

  enter() {
    this.sel = 0;
    this.t = 0;
    this.msg = null;
  }

  get free() {
    return ATTR_POINTS - pointsUsed(this.attrs);
  }

  /** Atlas recoloreado (se recalcula solo al cambiar de color). */
  previewAtlas() {
    const key = JSON.stringify(this.colors);
    if (key !== this.previewKey) {
      this.preview = recolorAtlas(this.game.sprites.playerBase, this.colors);
      this.previewSheet = new CharacterSheet(this.preview, this.game.sprites.playerBase.frames);
      this.previewKey = key;
    }
    return this.preview;
  }

  /** Dirección de la vista previa: gira cada 1,4 s. */
  get previewDir() {
    return DIRS[Math.floor(this.t / 1.4) % DIRS.length];
  }

  // --------------------------------------------------------------- disposición
  attrRow(i) {
    return { x: LEFT.x + 16, y: LEFT.y + 56 + i * 78, w: LEFT.w - 32, h: 70 };
  }

  attrButtons(i) {
    const r = this.attrRow(i);
    return {
      minus: { x: r.x + r.w - 98, y: r.y + 6, w: 38, h: 32 },
      plus: { x: r.x + r.w - 46, y: r.y + 6, w: 38, h: 32 },
    };
  }

  colorRow(i) {
    return { x: RIGHT.x + 16, y: RIGHT.y + 316 + i * 50, w: RIGHT.w - 32, h: 44 };
  }

  swatch(i, k) {
    const r = this.colorRow(i);
    return { x: r.x + 168 + k * 46, y: r.y + 6, w: 36, h: 32 };
  }

  get randomRect() {
    return { x: RIGHT.x + 16, y: RIGHT.y + RIGHT.h - 66, w: 200, h: 46 };
  }

  get startRect() {
    return { x: RIGHT.x + RIGHT.w - 236, y: RIGHT.y + RIGHT.h - 66, w: 220, h: 46 };
  }

  rowRect(row) {
    if (row < ATTRS.length) return this.attrRow(row);
    if (row < ROW_RANDOM) return this.colorRow(row - ATTRS.length);
    return row === ROW_RANDOM ? this.randomRect : this.startRect;
  }

  // --------------------------------------------------------------- acciones
  change(row, d) {
    if (row < ATTRS.length) {
      const id = ATTRS[row].id;
      const v = this.attrs[id] + d;
      if (v < 0 || v > ATTR_MAX) return;
      if (d > 0 && this.free <= 0) {
        this.say('No te quedan puntos. Quita de otro atributo.');
        return;
      }
      this.attrs[id] = v;
      this.game.sound('pickup');
    } else if (row < ROW_RANDOM) {
      const [part] = COLOR_PARTS[row - ATTRS.length];
      const n = COLOR_OPTIONS[part].length;
      this.colors[part] = (this.colors[part] + d + n) % n;
      this.game.sound('pickup');
    }
  }

  randomize() {
    const r = this.game.rng;
    for (const { id } of ATTRS) this.attrs[id] = 0;
    let left = ATTR_POINTS;
    while (left > 0) {
      const a = ATTRS[Math.floor(r() * ATTRS.length)].id;
      if (this.attrs[a] < ATTR_MAX) { this.attrs[a]++; left--; }
    }
    for (const [part] of COLOR_PARTS) this.colors[part] = Math.floor(r() * COLOR_OPTIONS[part].length);
    this.game.sound('open');
  }

  startGame() {
    if (this.free > 0) {
      this.say(`Te quedan ${this.free} punto${this.free === 1 ? '' : 's'} por repartir.`);
      return;
    }
    this.game.sound('open');
    this.game.newGame({ attrs: { ...this.attrs }, colors: { ...this.colors } });
    this.game.goto('intro');
  }

  say(textMsg) {
    this.msg = { text: textMsg, t: 2.5 };
  }

  update(dt, input) {
    this.t += dt;
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    const m = input.mouse;
    if (input.pressed('pause')) {
      this.game.goto('title');
      return;
    }
    if (input.pressed('down')) this.sel = (this.sel + 1) % ROWS;
    if (input.pressed('up')) this.sel = (this.sel + ROWS - 1) % ROWS;
    if (input.pressed('left')) {
      if (this.sel === ROW_START) this.sel = ROW_RANDOM;
      else this.change(this.sel, -1);
    }
    if (input.pressed('right')) {
      if (this.sel === ROW_RANDOM) this.sel = ROW_START;
      else this.change(this.sel, 1);
    }
    if (input.pressed('random')) this.randomize();
    if (input.pressed('confirm') || input.pressed('jump')) {
      if (this.sel === ROW_RANDOM) this.randomize();
      else this.startGame();
      return;
    }
    // Ratón.
    const moved = this.lastMouse && (this.lastMouse.x !== m.x || this.lastMouse.y !== m.y);
    this.lastMouse = { x: m.x, y: m.y };
    for (let row = 0; row < ROWS; row++) if (moved && inRect(m, this.rowRect(row))) this.sel = row;
    if (!m.pressed[0]) return;
    for (let i = 0; i < ATTRS.length; i++) {
      const b = this.attrButtons(i);
      if (inRect(m, b.minus)) this.change(i, -1);
      if (inRect(m, b.plus)) this.change(i, 1);
    }
    COLOR_PARTS.forEach(([part], i) => {
      COLOR_OPTIONS[part].forEach((_, k) => {
        if (inRect(m, this.swatch(i, k))) {
          this.colors[part] = k;
          this.sel = ATTRS.length + i;
          this.game.sound('pickup');
        }
      });
    });
    if (inRect(m, this.randomRect)) this.randomize();
    if (inRect(m, this.startRect)) this.startGame();
  }

  // --------------------------------------------------------------- dibujo
  render(c) {
    cover(c, this.game.images.paisaje, 1.05, 0.5, 0.5);
    c.fillStyle = 'rgba(8, 12, 10, 0.55)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    text(c, 'CREA TU PERSONAJE', LEFT.x, 50, { size: 34, color: '#ffe8a8', outline: 7 });
    text(c, 'Antes de subir al avión: reparte 10 puntos y elige tu aspecto.', LEFT.x + 390, 52, { size: 16, bold: false, outline: 3 });
    this.renderAttributes(c);
    this.renderLook(c);
    if (this.msg) {
      c.globalAlpha = Math.min(1, this.msg.t * 2);
      c.font = "bold 18px 'Trebuchet MS', sans-serif";
      const w = c.measureText(this.msg.text).width + 40;
      panel(c, (VIEW_W - w) / 2, VIEW_H - 40, w, 30, 0.9);
      text(c, this.msg.text, VIEW_W / 2, VIEW_H - 25, { size: 18, align: 'center', color: '#ffb08a' });
      c.globalAlpha = 1;
    }
    text(c, 'W/S elegir · A/D cambiar · X aleatorio · Enter empezar · Esc volver', VIEW_W / 2, 84, { size: 14, align: 'center', color: '#c8d0c0', bold: false, outline: 3 });
    drawCursor(c, this.game.input.mouse);
  }

  renderAttributes(c) {
    panel(c, LEFT.x, LEFT.y, LEFT.w, LEFT.h, 0.8);
    const free = this.free;
    text(c, 'ATRIBUTOS', LEFT.x + 16, LEFT.y + 26, { size: 22, color: '#ffe8a8', outline: 5 });
    text(c, `Puntos por repartir: ${free}`, LEFT.x + LEFT.w - 16, LEFT.y + 26, { size: 20, align: 'right', color: free > 0 ? '#ffd84a' : '#a8f0a0', outline: 4 });
    ATTRS.forEach((a, i) => {
      const r = this.attrRow(i);
      const sel = this.sel === i;
      if (sel) {
        c.fillStyle = 'rgba(216, 168, 72, 0.18)';
        c.fillRect(r.x - 6, r.y - 2, r.w + 12, r.h);
      }
      text(c, a.nombre, r.x, r.y + 22, { size: 21, color: sel ? '#ffe8a8' : '#fff6dc' });
      const v = this.attrs[a.id];
      for (let k = 0; k < ATTR_MAX; k++) {
        const px = r.x + 236 + k * 30;
        c.fillStyle = '#17150f';
        c.fillRect(px, r.y + 10, 24, 22);
        c.fillStyle = k < v ? ['#e0483a', '#4ac06a', '#4aa8e0', '#b07ae0'][i] : '#2a2a22';
        c.fillRect(px + 2, r.y + 12, 20, 18);
        if (k < v) {
          c.fillStyle = 'rgba(255,255,255,0.3)';
          c.fillRect(px + 2, r.y + 12, 20, 4);
        }
      }
      text(c, `${v}`, r.x + 236 + ATTR_MAX * 30 + 10, r.y + 22, { size: 22, color: '#ffe8a8' });
      const b = this.attrButtons(i);
      const m = this.game.input.mouse;
      button(c, b.minus, '−', { hover: inRect(m, b.minus), disabled: v <= 0, size: 24 });
      button(c, b.plus, '+', { hover: inRect(m, b.plus), disabled: v >= ATTR_MAX || free <= 0, size: 24 });
      text(c, a.desc, r.x, r.y + 52, { size: 14, bold: false, color: '#d8dcc8', outline: 3 });
    });
    // Efectos calculados.
    const y0 = LEFT.y + 56 + ATTRS.length * 78 + 6;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(LEFT.x + 10, y0 - 8, LEFT.w - 20, LEFT.h - (y0 - LEFT.y) - 2);
    text(c, 'Así queda tu personaje', LEFT.x + 20, y0 + 10, { size: 16, color: '#ffd38a', outline: 3 });
    statLines(this.attrs).forEach(([k, v], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = LEFT.x + 20 + col * 300;
      const y = y0 + 36 + row * 22;
      text(c, `${k}:`, x, y, { size: 14, bold: false, color: '#c8d0c0', outline: 3 });
      text(c, v, x + 290, y, { size: 14, align: 'right', color: '#fff6dc', outline: 3 });
    });
  }

  renderLook(c) {
    panel(c, RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h, 0.8);
    text(c, 'ASPECTO', RIGHT.x + 16, RIGHT.y + 26, { size: 22, color: '#ffe8a8', outline: 5 });
    // Vista previa: el personaje gira por las 4 direcciones andando. Se dibuja el
    // sprite a resolución completa con una escala entera de píxeles reales (×1 a
    // 720p, ×2 a 1080p), sin suavizado, sobre un fondo neutro.
    this.previewAtlas();
    const sheet = this.previewSheet;
    const [anim, label] = this.previewDir;
    const frames = sheet.frames[anim];
    const fi = Math.floor(this.t * 8) % frames.length;
    const pr = { x: RIGHT.x + 16, y: RIGHT.y + 46, w: RIGHT.w - 32, h: 254 };
    const S = display.S;
    const tallest = Math.max(...frames.map((f) => f[3]));
    const f = Math.max(1, Math.floor((pr.h * S - 44 * S) / tallest));
    const cx = pr.x + pr.w / 2;
    const feet = pr.y + pr.h - 22;
    const grad = c.createRadialGradient(cx, pr.y + pr.h * 0.55, 10, cx, pr.y + pr.h * 0.55, pr.w * 0.62);
    grad.addColorStop(0, '#5a6068');
    grad.addColorStop(1, '#2a2e34');
    c.fillStyle = grad;
    c.fillRect(pr.x, pr.y, pr.w, pr.h);
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 2;
    c.strokeRect(pr.x + 1, pr.y + 1, pr.w - 2, pr.h - 2);
    // Suelo: sombra elíptica bajo los pies.
    c.fillStyle = 'rgba(10, 12, 16, 0.45)';
    c.beginPath();
    c.ellipse(cx, feet - 1, 15 * f / S + 8, 5 * f / S + 2, 0, 0, Math.PI * 2);
    c.fill();
    const spr = sheet.scaled(anim, fi, f);
    c.save();
    c.setTransform(1, 0, 0, 1, Math.round(cx * S), Math.round(feet * S));
    c.imageSmoothingEnabled = false;
    c.drawImage(spr.canvas, -spr.ax, -spr.ay);
    c.restore();
    text(c, label, pr.x + pr.w - 10, pr.y + 18, { size: 14, align: 'right', color: '#c8d0c0', bold: false, outline: 3 });
    const [, , sw, sh] = frames[fi];
    this.previewRect = { x: cx - (sw * f) / S / 2, y: feet - (sh * f) / S, w: (sw * f) / S, h: (sh * f) / S, scale: f };
    // Colores.
    const m = this.game.input.mouse;
    COLOR_PARTS.forEach(([part, name], i) => {
      const r = this.colorRow(i);
      const sel = this.sel === ATTRS.length + i;
      if (sel) {
        c.fillStyle = 'rgba(216, 168, 72, 0.18)';
        c.fillRect(r.x - 6, r.y, r.w + 12, r.h);
      }
      text(c, name, r.x, r.y + 14, { size: 18, color: sel ? '#ffe8a8' : '#fff6dc' });
      text(c, COLOR_OPTIONS[part][this.colors[part]][0], r.x, r.y + 34, { size: 13, color: '#c8d0c0', bold: false, outline: 3 });
      COLOR_OPTIONS[part].forEach(([, hex], k) => {
        const s = this.swatch(i, k);
        const chosen = this.colors[part] === k;
        c.fillStyle = chosen ? '#ffe8a8' : inRect(m, s) ? '#a88a48' : '#17150f';
        c.fillRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
        c.fillStyle = hex || ORIGINAL[part];
        c.fillRect(s.x, s.y, s.w, s.h);
        c.fillStyle = 'rgba(255,255,255,0.25)';
        c.fillRect(s.x, s.y, s.w, 5);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(s.x, s.y + s.h - 5, s.w, 5);
      });
    });
    button(c, this.randomRect, 'Aleatorio', { selected: this.sel === ROW_RANDOM, hover: inRect(m, this.randomRect), size: 20 });
    button(c, this.startRect, 'Empezar', { selected: this.sel === ROW_START, hover: inRect(m, this.startRect), disabled: this.free > 0, size: 22 });
  }
}

/** Color de muestra de la opción «original» de cada parte. */
const ORIGINAL = { pelo: '#d8cfae', piel: '#c58652', camiseta: '#ddd5bd', pantalon: '#4d6436' };
