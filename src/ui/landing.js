// Aterrizaje cenital (sesión 4, TRASPASO §2.3 y §2.4): la isla desde arriba, el
// avión planeando sin combustible, altímetro, giro con A/D y Espacio para
// aterrizar. El resultado depende de la zona. El mapa sale del mapa real del
// juego (sesión 5).
// El mapa se pinta a 640 × 360 y se escala ×2, como el mundo; los textos van
// encima a 1280 × 720.

import { LOW_W, LOW_H, VIEW_W, VIEW_H, PIXEL_SCALE } from '../config.js';
import { text, panel } from '../render/hud.js';
import { PixelCanvas, rgb } from '../gfx/pixel.js';
import { C } from '../gfx/palette.js';
import {
  LAND_PX, LANDING_RESULTS, paintLandingMap, landingZoneAt,
} from '../world/landingMap.js';
import { ZONES } from '../world/worldMap.js';

const MX = 8;                 // posición del mapa en el buffer de baja resolución
const MY = 16;
const START_ALT = 1250;       // m («BASE ALFA ALT. 1.250 m», guiño a la ilustración)
const SINK = 20;              // m/s de pérdida de altura
const SPEED = 7;              // casillas grandes por segundo
const TURN = 1.7;             // rad/s
const DESCENT = 1.5;          // s de bajada final
const CRASH = 1.4;            // s de impacto

/** Color del anillo bajo el avión según el riesgo. */
const RISK_COLOR = { Bajo: '#7cf06a', Medio: '#ffd84a', Alto: '#ff6a4a', 'Muy alto': '#ff3a3a' };

/** Avioneta vista desde arriba, mirando a la derecha (camuflaje y hélice parada). */
function planeSprite() {
  const p = new PixelCanvas(31, 29);
  const camo = C.camo;
  // Alas.
  p.poly([[12, 1], [17, 1], [19, 27], [14, 27]], camo[1]);
  p.poly([[12, 1], [17, 1], [17.6, 9], [12.6, 9]], camo[2]);
  p.poly([[13.6, 20], [18.6, 20], [19, 27], [14, 27]], camo[0]);
  // Fuselaje.
  for (let x = 2; x < 28; x++) {
    const half = x < 8 ? 1 + (x - 2) * 0.25 : x > 22 ? 2.6 - (x - 22) * 0.3 : 2.6;
    for (let y = Math.round(14 - half); y <= Math.round(14 + half); y++) {
      const camoN = Math.sin(x * 0.9 + y * 0.6) + Math.sin(x * 0.37 - y);
      p.set(x, y, y < 13 ? camo[3] : camoN > 0.6 ? camo[0] : camo[2]);
    }
  }
  // Estabilizador de cola.
  p.poly([[2, 8], [6, 8], [7, 20], [3, 20]], camo[1]);
  p.rect(3, 9, 3, 1, camo[3]);
  // Cabina.
  p.rect(19, 13, 3, 3, rgb('#2a5a6e'));
  p.set(20, 13, rgb('#bfe8f0'));
  // Morro y hélice parada.
  p.rect(27, 13, 2, 3, C.metal[3]);
  p.rect(29, 9, 1, 11, C.metal[1]);
  // Estrellas de las alas.
  p.set(15, 4, C.white); p.set(16, 24, C.white);
  p.outline(C.outline);
  return p.toCanvas();
}

/** Silueta de sombra del avión. */
function silhouette(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = 'rgba(6, 18, 10, 0.45)';
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Nube de pixel art (blanca con sombreado azulado). */
function cloudSprite(seed) {
  const w = 60 + (seed % 3) * 18;
  const p = new PixelCanvas(w, 30);
  const tones = [rgb('#b8c6d6'), rgb('#dce6ee'), rgb('#ffffff')];
  for (let k = 0; k < 6; k++) {
    const cx = 12 + ((k * 37 + seed * 13) % (w - 24));
    const cy = 16 + ((k * 5 + seed) % 6) - 3;
    p.shadedEllipse(cx, cy, 10 + ((k + seed) % 3) * 3, 8, tones);
  }
  return p.toCanvas();
}

export class LandingScreen {
  constructor(game) {
    this.game = game;
    this.paint = null;
    this.low = document.createElement('canvas');
    this.low.width = LOW_W;
    this.low.height = LOW_H;
    this.lctx = this.low.getContext('2d');
    this.lctx.imageSmoothingEnabled = false;
    this.plane = planeSprite();
    this.shadow = silhouette(this.plane);
    this.clouds = [0, 1, 2, 3, 4, 5].map((i) => ({ img: cloudSprite(i + 1), x: (i * 97) % 440, y: 20 + ((i * 53) % 300), v: 4 + (i % 3) * 2 }));
    this.reset();
  }

  /** Pinta el mapa de la isla (una vez; tarda unas décimas). */
  prepare() {
    if (!this.paint) this.paint = paintLandingMap(this.game.map);
    this.LW = this.game.map.width;
    this.LH = this.game.map.height;
  }

  reset() {
    this.x = 34;            // casillas grandes: entra por el suroeste, sobre el mar
    this.y = 156;
    this.angle = -1.15;
    this.alt = START_ALT;
    this.phase = 'fly';     // 'fly' | 'descent' | 'crash'
    this.t = 0;
    this.phaseT = 0;
    this.msg = null;
    this.puffs = [];
    this.result = null;
    this.shakeT = 0;
  }

  enter() {
    this.prepare();
    this.reset();
  }

  /** Zona bajo el avión. */
  get zone() {
    return landingZoneAt(this.game.map, this.x, this.y);
  }

  say(textMsg) {
    this.msg = { text: textMsg, t: 2.2 };
  }

  /** Empieza la bajada final sobre el punto actual (si es una zona explorada). */
  tryLand(forced = false) {
    const z = this.zone;
    this.result = { zone: z.zone, result: z.result, x: this.x, y: this.y, forced };
    this.phase = 'descent';
    this.phaseT = 0;
    this.descentFrom = this.alt;
    return true;
  }

  /** Atajo para pruebas: aterriza en (x, y) de la isla grande sin esperar. */
  forceAt(x, y) {
    this.x = x;
    this.y = y;
    if (!this.tryLand()) return false;
    this.finish();
    return true;
  }

  finish() {
    this.game.landAt(this.result);
  }

  update(dt, input) {
    this.t += dt;
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > this.LW * LAND_PX + 20) c.x = -c.img.width - 10;
    }
    for (const p of this.puffs) p.age += dt;
    this.puffs = this.puffs.filter((p) => p.age < p.life);
    this.shakeT = Math.max(0, this.shakeT - dt);

    if (this.phase === 'fly') {
      this.angle += input.axisX() * TURN * dt;
      // Si se sale del mapa, vira solo hacia la isla.
      const out = this.x < 2 || this.y < 2 || this.x > this.LW - 2 || this.y > this.LH - 2;
      if (out) {
        const want = Math.atan2(this.LH / 2 - this.y, this.LW / 2 - this.x);
        const d = Math.atan2(Math.sin(want - this.angle), Math.cos(want - this.angle));
        this.angle += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
      }
      this.x += Math.cos(this.angle) * SPEED * dt;
      this.y += Math.sin(this.angle) * SPEED * dt;
      this.alt = Math.max(0, this.alt - SINK * dt);
      // El motor tose: humo a ratos.
      if (Math.random() < dt * 5) {
        this.puffs.push({ x: this.x - Math.cos(this.angle) * 6, y: this.y - Math.sin(this.angle) * 6, alt: this.alt, age: 0, life: 1.6, kind: 'smoke' });
      }
      if (input.pressed('jump')) this.tryLand();
      else if (this.alt <= 0) {
        this.say('¡Sin altura!');
        this.tryLand(true);
      }
    } else if (this.phase === 'descent') {
      this.phaseT += dt;
      const k = Math.min(1, this.phaseT / DESCENT);
      this.alt = this.descentFrom * (1 - k) * (1 - k);
      this.angle += Math.sin(this.phaseT * 6) * dt * 0.6; // bandazos
      if (k >= 1) {
        this.phase = 'crash';
        this.phaseT = 0;
        this.shakeT = 0.6;
        this.game.sound(this.result.result === 'mar' ? 'drink' : 'kill');
        this.game.sound('thunder');
        this.burst();
      }
    } else if (this.phase === 'crash') {
      this.phaseT += dt;
      if (this.phaseT >= CRASH) this.finish();
    }
  }

  /** Partículas del impacto, del color del suelo. */
  burst() {
    const colors = {
      mar: ['#effaf2', '#5fc4c4', '#2f95a8'], playa: ['#e5cb92', '#c9a96b', '#f6e6bd'],
      selva: ['#2d6529', '#428334', '#5e4224'], campamento: ['#866237', '#5e4224', '#e05a2c'], ruinas: ['#757662', '#47493c', '#e05a2c'],
    }[this.result.result] || ['#2d6529', '#757662', '#866237'];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 12;
      this.puffs.push({ x: this.x, y: this.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, alt: 0, age: 0, life: 0.6 + Math.random() * 0.8, kind: 'debris', color: colors[i % colors.length] });
    }
  }

  // --------------------------------------------------------------- dibujo
  /** Pantalla con solo el mapa (fondo de la última página de la intro). */
  renderBackdrop(c, t) {
    this.prepare();
    this.drawLow(t, false);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.low, 0, 0, VIEW_W, VIEW_H);
  }

  drawLow(t, withPlane) {
    const l = this.lctx;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalAlpha = 1;
    l.fillStyle = '#173f6a';
    l.fillRect(0, 0, LOW_W, LOW_H);
    // Destellos del mar abierto.
    for (let i = 0; i < 70; i++) {
      const x = (i * 97 + Math.floor(t * 6) * (i % 3 ? 1 : 0)) % LOW_W;
      const y = (i * 53) % LOW_H;
      if (Math.sin(t * 2 + i) > 0.5) {
        l.fillStyle = i % 4 ? '#2f6f9a' : '#5fa8c8';
        l.fillRect(x, y, 3, 1);
      }
    }
    const sx = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    const sy = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    l.translate(MX + sx, MY + sy);
    l.drawImage(this.paint.canvas, 0, 0);
    // Sombras de nubes que cruzan el suelo.
    l.globalAlpha = 0.18;
    for (const cl of this.clouds) l.drawImage(silhouetteOf(cl), Math.round(cl.x + 30), Math.round(cl.y + 40));
    l.globalAlpha = 1;
    if (withPlane) this.drawPlane(l, t);
    // Nubes por encima (más presentes cuanto más alto vuela).
    l.globalAlpha = withPlane ? 0.35 + 0.5 * (this.alt / START_ALT) : 0.8;
    for (const cl of this.clouds) l.drawImage(cl.img, Math.round(cl.x), Math.round(cl.y));
    l.globalAlpha = 1;
    l.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawPlane(l, t) {
    const gx = this.x * LAND_PX;
    const gy = this.y * LAND_PX;
    const k = this.alt / START_ALT;
    // Humo y restos.
    for (const p of this.puffs) {
      const a = 1 - p.age / p.life;
      if (p.kind === 'smoke') {
        const lift = p.alt / START_ALT;
        l.fillStyle = `rgba(70, 70, 64, ${(0.5 * a).toFixed(2)})`;
        const r = 2 + p.age * 3;
        l.fillRect(Math.round(p.x * LAND_PX - 6 * lift - r / 2), Math.round(p.y * LAND_PX - 22 * lift - r / 2 - p.age * 4), Math.round(r), Math.round(r));
      } else {
        l.fillStyle = p.color;
        l.globalAlpha = a;
        l.fillRect(Math.round((p.x + p.vx * p.age) * LAND_PX), Math.round((p.y + p.vy * p.age) * LAND_PX - Math.sin(a * Math.PI) * 6), 2, 2);
        l.globalAlpha = 1;
      }
    }
    if (this.phase === 'crash') {
      // Destello y columna de humo en el punto del impacto.
      const a = Math.max(0, 1 - this.phaseT / 0.5);
      if (a > 0) {
        l.fillStyle = `rgba(255, 240, 200, ${a.toFixed(2)})`;
        l.beginPath();
        l.arc(gx, gy, 6 + this.phaseT * 30, 0, Math.PI * 2);
        l.fill();
      }
      for (let i = 0; i < 6; i++) {
        const age = (this.phaseT * 1.5 + i * 0.2) % 1.2;
        l.fillStyle = `rgba(50, 48, 44, ${(0.6 * (1 - age / 1.2)).toFixed(2)})`;
        const r = 3 + age * 6;
        l.fillRect(Math.round(gx - r / 2 + age * 4), Math.round(gy - age * 18 - r / 2), Math.round(r), Math.round(r));
      }
      return;
    }
    // Sombra en el suelo: marca dónde aterrizarías.
    const z = this.zone;
    const ring = RISK_COLOR[LANDING_RESULTS[z.result].riesgo] || '#ffd84a';
    const pulse = 5 + Math.sin(t * 6) * 1.5;
    l.strokeStyle = ring;
    l.lineWidth = 1;
    l.beginPath();
    l.ellipse(Math.round(gx) + 0.5, Math.round(gy) + 0.5, pulse + 3, (pulse + 3) * 0.7, 0, 0, Math.PI * 2);
    l.stroke();
    this.drawRotated(l, this.shadow, gx + 2, gy + 1, 0.8 + 0.2 * k);
    // El avión, más arriba y más grande cuanto más alto vuela.
    const bob = Math.sin(t * 2.4) * 0.8;
    this.drawRotated(l, this.plane, gx - 10 * k, gy - 34 * k + bob, 1 + 0.45 * k);
  }

  drawRotated(l, img, x, y, s) {
    l.save();
    l.translate(Math.round(x), Math.round(y));
    l.rotate(this.angle);
    l.scale(s, s);
    l.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
    l.restore();
  }

  render(c) {
    const t = this.t;
    this.drawLow(t, true);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.low, 0, 0, VIEW_W, VIEW_H);
    const S = PIXEL_SCALE;
    // Etiquetas de las zonas.
    for (const [id, cz] of Object.entries(this.game.map.zoneCenters)) {
      if (id === 'mar' || cz.n < 30) continue;
      text(c, ZONES[id][0], (MX + cz.x * LAND_PX) * S, (MY + cz.y * LAND_PX) * S, { size: 13, align: 'center', color: '#fff6dc', outline: 4 });
    }
    this.renderPanel(c);
    if (this.phase === 'crash') {
      const a = Math.max(0, 1 - this.phaseT / 0.35);
      if (a > 0) {
        c.fillStyle = `rgba(255, 250, 235, ${(a * 0.8).toFixed(2)})`;
        c.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      const f = Math.max(0, (this.phaseT - CRASH + 0.5) / 0.5);
      if (f > 0) {
        c.fillStyle = `rgba(0, 0, 0, ${f.toFixed(2)})`;
        c.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }
  }

  renderPanel(c) {
    const x = 890;
    const w = VIEW_W - x - 16;
    panel(c, x, 16, w, VIEW_H - 32, 0.86);
    // Aviso de combustible.
    const blink = Math.floor(this.t * 2.5) % 2 === 0;
    c.fillStyle = blink ? '#a0180e' : '#3a0c08';
    c.fillRect(x + 12, 28, w - 24, 44);
    text(c, 'SIN COMBUSTIBLE', x + w / 2, 51, { size: 26, align: 'center', color: blink ? '#ffe8a8' : '#ff6a4a', outline: 5 });

    // Altímetro: esfera con aguja y lectura digital.
    const cx = x + 96;
    const cy = 172;
    const R = 66;
    c.fillStyle = '#17150f';
    c.beginPath(); c.arc(cx, cy, R + 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b4a26';
    c.beginPath(); c.arc(cx, cy, R + 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a201a';
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d8dcc8';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      c.lineWidth = i % 5 ? 2 : 4;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12));
      c.lineTo(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3));
      c.stroke();
      text(c, `${i}`, cx + Math.cos(a) * (R - 24), cy + Math.sin(a) * (R - 24), { size: 12, align: 'center', bold: false, outline: 2 });
    }
    // Aguja: una vuelta = 1.000 m (como un altímetro de avioneta).
    const na = -Math.PI / 2 + ((this.alt % 1000) / 1000) * Math.PI * 2;
    c.strokeStyle = '#ffd84a';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(na) * (R - 10), cy + Math.sin(na) * (R - 10)); c.stroke();
    const na2 = -Math.PI / 2 + ((this.alt % 10000) / 10000) * Math.PI * 2;
    c.strokeStyle = '#ff6a4a';
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(na2) * (R - 30), cy + Math.sin(na2) * (R - 30)); c.stroke();
    c.fillStyle = '#17150f';
    c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.fill();
    text(c, 'ALTÍMETRO', x + 186, 128, { size: 15, color: '#ffd38a', outline: 3 });
    text(c, `${Math.round(this.alt).toLocaleString('es-ES')} m`, x + 186, 162, { size: 30, color: this.alt < 300 ? '#ff6a4a' : '#fff6dc', outline: 5 });
    // Combustible: aguja en E.
    text(c, 'COMBUSTIBLE', x + 186, 200, { size: 13, color: '#ffd38a', outline: 3 });
    c.fillStyle = '#17150f';
    c.fillRect(x + 186, 212, 150, 16);
    c.fillStyle = '#3a0c08';
    c.fillRect(x + 188, 214, 146, 12);
    text(c, 'E', x + 194, 221, { size: 12, color: '#ff6a4a', outline: 2 });
    text(c, 'F', x + 328, 221, { size: 12, color: '#7a766a', outline: 2 });

    // Zona bajo el avión.
    const z = this.zone;
    let y = 276;
    text(c, 'BAJO EL AVIÓN', x + 16, y, { size: 15, color: '#ffd38a', outline: 3 });
    y += 30;
    text(c, z.nombre, x + 16, y, { size: 22, color: '#fff6dc', outline: 4 });
    y += 30;
    {
      const r = LANDING_RESULTS[z.result];
      const col = RISK_COLOR[r.riesgo] || '#ffd84a';
      text(c, `${r.nombre !== z.nombre ? r.nombre + ' · ' : ''}riesgo ${r.riesgo.toLowerCase()}`, x + 16, y, { size: 17, color: col, outline: 3 });
      text(c, r.dano ? `Daño: −${r.dano} de vida` : 'Daño: ninguno', x + 16, y + 26, { size: 16, bold: false, outline: 3 });
      text(c, `Avión: ${r.avion}`, x + 16, y + 50, { size: 16, bold: false, outline: 3 });
      wrap(c, r.texto, x + 16, y + 78, w - 32, 20, { size: 15, bold: false, color: '#d8dcc8', outline: 3 });
    }
    // Leyenda del anillo bajo el avión.
    const ly = VIEW_H - 262;
    text(c, 'LEYENDA', x + 16, ly, { size: 14, color: '#ffd38a', outline: 3 });
    [['#7cf06a', 'Riesgo bajo'], ['#ffd84a', 'Riesgo medio'], ['#ff6a4a', 'Riesgo alto'], ['#ff3a3a', 'Muy alto']].forEach(([col, name], i) => {
      const lx = x + 16 + (i % 2) * 170;
      const yy = ly + 26 + Math.floor(i / 2) * 24;
      c.strokeStyle = col;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(lx + 8, yy, 8, 5, 0, 0, Math.PI * 2);
      c.stroke();
      text(c, name, lx + 24, yy, { size: 14, bold: false, outline: 3 });
    });
    // Controles.
    const cy2 = VIEW_H - 150;
    text(c, 'A / D o ← / →   girar', x + 16, cy2, { size: 16, outline: 3 });
    text(c, 'Espacio   aterrizar aquí', x + 16, cy2 + 26, { size: 16, outline: 3 });
    text(c, 'La sombra marca dónde tocarás tierra.', x + 16, cy2 + 56, { size: 14, bold: false, color: '#c8d0c0', outline: 3 });
    if (this.phase === 'descent') text(c, '¡Agárrate!', x + w / 2, cy2 - 40, { size: 26, align: 'center', color: '#ff9a7a', outline: 5 });
    if (this.msg) {
      c.globalAlpha = Math.min(1, this.msg.t * 2);
      c.font = "bold 18px 'Trebuchet MS', sans-serif";
      const mw = c.measureText(this.msg.text).width + 40;
      const mx = (x - mw) / 2;
      panel(c, mx, VIEW_H - 70, mw, 34, 0.9);
      text(c, this.msg.text, mx + mw / 2, VIEW_H - 53, { size: 18, align: 'center', color: '#ffb08a' });
      c.globalAlpha = 1;
    }
  }
}

const silCache = new Map();
function silhouetteOf(cl) {
  if (!silCache.has(cl.img)) silCache.set(cl.img, silhouette(cl.img));
  return silCache.get(cl.img);
}

/** Texto en varias líneas ajustado a un ancho. */
function wrap(c, str, x, y, w, lh, opts) {
  c.font = `${opts.bold === false ? '' : 'bold '}${opts.size}px 'Trebuchet MS', sans-serif`;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > w && line) {
      text(c, line, x, yy, opts);
      line = word;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) text(c, line, x, yy, opts);
}
