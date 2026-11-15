// Interfaz a 1280 × 720 sobre el mundo: barras, reloj, cartel de zona, avisos,
// registro de objetos, números de daño, inventario, título, muerte y pausa.
// Estilo cómic: paneles oscuros con borde de madera y texto con contorno.

import { VIEW_W, VIEW_H, TILE, PIXEL_SCALE } from '../config.js';
import { ITEMS, HINTS } from '../data/items.js';
import { ATTRS, ATTR_MAX, statLines } from '../data/attributes.js';
import { LANDING_RESULTS } from '../world/landingMap.js';
import { SLOTS } from '../systems/inventory.js';
import { PixelCanvas, rgb } from '../gfx/pixel.js';
import { C } from '../gfx/palette.js';

export const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
export const font = (size, bold = true) => `${bold ? 'bold ' : ''}${size}px ${FONT}`;

let ICONS = null;
function statIcons() {
  if (ICONS) return ICONS;
  const mk = (draw) => { const p = new PixelCanvas(11, 11); draw(p); p.outline(C.outline); return p.toCanvas(); };
  ICONS = {
    vida: mk((p) => { p.circle(3, 4, 2.4, C.red[2]); p.circle(7, 4, 2.4, C.red[2]); p.poly([[1, 5], [9.5, 5], [5, 10]], C.red[2]); p.set(3, 3, C.red[3]); }),
    hambre: mk((p) => { p.shadedEllipse(6, 4, 3.5, 3, [rgb('#7a3a1e'), rgb('#a85a30'), rgb('#d08a50')]); p.line(4, 7, 2, 10, rgb('#f0e8d8'), 2); }),
    sed: mk((p) => { p.poly([[5, 0], [9, 6], [5, 10], [1, 6]], rgb('#4aa8e0')); p.circle(5, 6.5, 3.5, rgb('#4aa8e0')); p.set(4, 5, rgb('#c8f0ff')); }),
    energia: mk((p) => { p.poly([[6, 0], [1, 6], [5, 6], [3, 10], [9, 4], [5, 4]], C.yellow[2]); }),
    sol: mk((p) => { p.circle(5, 5, 3, C.yellow[2]); for (let k = 0; k < 8; k++) p.set(5 + Math.round(Math.cos(k * 0.785) * 5), 5 + Math.round(Math.sin(k * 0.785) * 5), C.yellow[1]); }),
    luna: mk((p) => { p.circle(5, 5, 4, rgb('#e8ecff')); p.circle(7, 4, 3.5, 0); }),
    lluvia: mk((p) => { p.circle(3, 3, 2.5, rgb('#c8d4e0')); p.circle(6, 2.5, 3, rgb('#c8d4e0')); p.rect(1, 3, 9, 3, rgb('#c8d4e0')); for (const x of [2, 5, 8]) p.line(x, 7, x - 1, 10, rgb('#6ab0ff')); }),
    veneno: mk((p) => { p.circle(5, 4, 4, rgb('#7ac040')); p.rect(3, 7, 5, 3, rgb('#7ac040')); p.set(3, 4, C.black); p.set(7, 4, C.black); p.set(4, 8, C.black); p.set(6, 8, C.black); }),
    ojo: mk((p) => { p.ellipse(5, 5, 5, 3, rgb('#e8e8e8')); p.circle(5, 5, 2, rgb('#2a2a2a')); p.line(0, 9, 10, 1, C.red[2]); }),
  };
  return ICONS;
}

/** Panel con borde de madera. */
export function panel(c, x, y, w, h, alpha = 0.72) {
  c.fillStyle = '#17150f';
  c.fillRect(x - 3, y - 3, w + 6, h + 6);
  c.fillStyle = '#6b4a26';
  c.fillRect(x - 1, y - 1, w + 2, h + 2);
  c.fillStyle = `rgba(16, 22, 18, ${alpha})`;
  c.fillRect(x, y, w, h);
}

/** Texto con contorno oscuro. */
export function text(c, str, x, y, { size = 16, color = '#fff6dc', align = 'left', bold = true, outline = 4 } = {}) {
  c.font = font(size, bold);
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  if (outline > 0) {
    c.lineWidth = outline;
    c.strokeStyle = '#17150f';
    c.strokeText(str, x, y);
  }
  c.fillStyle = color;
  c.fillText(str, x, y);
}

export function bar(c, x, y, w, h, k, color, dark) {
  c.fillStyle = '#17150f';
  c.fillRect(x - 2, y - 2, w + 4, h + 4);
  c.fillStyle = dark;
  c.fillRect(x, y, w, h);
  const fw = Math.round(w * Math.max(0, Math.min(1, k)));
  c.fillStyle = color;
  c.fillRect(x, y, fw, h);
  c.fillStyle = 'rgba(255, 255, 255, 0.28)';
  c.fillRect(x, y, fw, 3);
  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let sx = x + 20; sx < x + w; sx += 20) c.fillRect(sx, y, 2, h);
}

export function icon(c, img, x, y, s = 2) {
  c.imageSmoothingEnabled = false;
  c.drawImage(img, x, y, img.width * s, img.height * s);
}

export function drawHud(c, g) {
  const p = g.player;
  const I = statIcons();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = false;

  // --- Barras de estado.
  const n = p.needs;
  const rows = [
    ['vida', p.hp / p.maxHp, '#e0483a', '#4a1410', `${Math.ceil(p.hp)}`],
    ['hambre', n.hambre / 100, '#e0903a', '#4a2a10', 'Hambre'],
    ['sed', n.sed / 100, '#4aa8e0', '#10304a', 'Sed'],
    ['energia', n.energia / 100, '#e8c83a', '#4a4010', 'Energía'],
  ];
  panel(c, 16, 16, 236, 112);
  rows.forEach(([key, k, col, dark, label], i) => {
    const y = 24 + i * 25;
    icon(c, I[key], 24, y - 1, 2);
    const warn = key !== 'vida' && k < 0.2 && Math.floor(g.time * 3) % 2 === 0;
    bar(c, 54, y + 3, 150, 12, k, warn ? '#ff3a2a' : col, dark);
    text(c, key === 'vida' ? label : '', 212, y + 9, { size: 13 });
  });
  let sy = 140;
  if (p.hidden) {
    panel(c, 16, sy, 120, 26);
    icon(c, I.ojo, 22, sy + 3, 2);
    text(c, 'Oculto', 50, sy + 13, { size: 15, color: '#a8f0a0' });
    sy += 34;
  }
  if (p.sick > 0) {
    panel(c, 16, sy, 136, 26);
    icon(c, I.veneno, 22, sy + 3, 2);
    text(c, 'Intoxicado', 50, sy + 13, { size: 15, color: '#c8f07a' });
  }

  // --- Reloj y clima.
  panel(c, VIEW_W - 196, 16, 180, 40);
  icon(c, g.clock.isNight ? I.luna : I.sol, VIEW_W - 188, 25, 2);
  text(c, `Día ${g.clock.day} · ${g.clock.label}`, VIEW_W - 160, 36, { size: 18 });
  if (g.weather.intensity > 0.15) icon(c, I.lluvia, VIEW_W - 44, 25, 2);

  // --- Cartel de zona (con un trozo de la ilustración de Javier para la selva).
  const b = g.banner;
  if (b && b.age < 4) {
    const a = Math.min(1, b.age * 3, (4 - b.age) * 2);
    const [title, sub] = (g.zoneNames || {})[b.zone] || [b.zone, ''];
    c.globalAlpha = a;
    const w = 420;
    const x = (VIEW_W - w) / 2;
    const y = 70;
    panel(c, x, y, w, 70, 0.8);
    const art = g.images && (b.zone === 'selva' || b.zone === 'ruinas') ? g.images.selva : null;
    if (art) {
      c.save();
      c.beginPath();
      c.rect(x, y, w, 70);
      c.clip();
      c.globalAlpha = a * 0.55;
      c.imageSmoothingEnabled = true;
      c.drawImage(art, 0, art.height * 0.35, art.width, art.width * (70 / w), x, y, w, 70);
      c.imageSmoothingEnabled = false;
      c.restore();
      c.globalAlpha = a;
    }
    text(c, title.toUpperCase(), VIEW_W / 2, y + 26, { size: 28, align: 'center', color: '#ffe8a8', outline: 6 });
    text(c, sub, VIEW_W / 2, y + 54, { size: 15, align: 'center', color: '#e8f0e0' });
    c.globalAlpha = 1;
  }

  // --- Números de daño y avisos flotantes.
  for (const f of g.floaters) {
    const sx = (f.x - g.camera.ix) * PIXEL_SCALE;
    const sy = (f.y - g.camera.iy) * PIXEL_SCALE - f.age * 50;
    c.globalAlpha = Math.min(1, (1 - f.age) * 2);
    text(c, f.text, sx, sy, { size: 22, align: 'center', color: f.color, outline: 5 });
    c.globalAlpha = 1;
  }

  // --- Aviso de interacción.
  const prompt = g.killTarget ? ['F', 'Eliminar en silencio', '#ff9a7a'] : g.interaction && !g.invOpen ? ['E', g.interaction.label, '#fff6dc'] : null;
  if (prompt && !p.dead) {
    c.font = font(18);
    const tw = c.measureText(prompt[1]).width;
    const w = tw + 70;
    const x = (VIEW_W - w) / 2;
    panel(c, x, VIEW_H - 112, w, 36);
    c.fillStyle = '#f2e6c0';
    c.fillRect(x + 8, VIEW_H - 106, 26, 24);
    c.fillStyle = '#17150f';
    c.fillRect(x + 8, VIEW_H - 84, 26, 2);
    text(c, prompt[0], x + 21, VIEW_H - 94, { size: 17, align: 'center', color: '#17150f', outline: 0 });
    text(c, prompt[1], x + 44, VIEW_H - 94, { size: 18, color: prompt[2] });
  }

  // --- Mensaje del personaje.
  if (p.message) {
    c.globalAlpha = Math.min(1, p.message.time * 2);
    c.font = font(19);
    const w = c.measureText(p.message.text).width + 36;
    panel(c, (VIEW_W - w) / 2, VIEW_H - 168, w, 34);
    text(c, p.message.text, VIEW_W / 2, VIEW_H - 151, { size: 19, align: 'center' });
    c.globalAlpha = 1;
  }

  // --- Registro de objetos recogidos.
  g.log.forEach((l, i) => {
    const a = Math.min(1, (4 - l.age) * 2);
    c.globalAlpha = a;
    const y = VIEW_H - 60 - (g.log.length - 1 - i) * 34;
    panel(c, 16, y - 14, 230, 28, 0.6);
    icon(c, g.sprites.icons[l.id], 20, y - 16, 2);
    text(c, `+${l.n} ${ITEMS[l.id].nombre}`, 58, y, { size: 16, color: '#d8ffb0' });
    c.globalAlpha = 1;
  });

  // --- Ayuda de controles.
  if (g.helpT > 0 && !g.invOpen && !g.charOpen) drawHelp(c, Math.min(1, g.helpT));
  else text(c, 'F1 · controles', VIEW_W - 16, VIEW_H - 16, { size: 13, align: 'right', color: '#c8d0c0', outline: 3 });

  // --- Punto de mira.
  const m = g.input.mouse;
  if (!g.invOpen && !g.charOpen && !p.dead) {
    c.fillStyle = '#17150f';
    c.fillRect(m.x - 7, m.y - 1, 14, 3); c.fillRect(m.x - 1, m.y - 7, 3, 14);
    c.fillStyle = '#fff6dc';
    c.fillRect(m.x - 6, m.y, 4, 1); c.fillRect(m.x + 3, m.y, 4, 1);
    c.fillRect(m.x, m.y - 6, 1, 4); c.fillRect(m.x, m.y + 3, 1, 4);
  }

  if (g.invOpen) drawInventory(c, g);
  if (g.charOpen) drawCharacter(c, g);
  if (p.dead) {
    const a = Math.min(1, Math.max(0, g.deathT) * 0.8);
    c.fillStyle = `rgba(30, 0, 0, ${0.65 * a})`;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.globalAlpha = a;
    text(c, 'HAS MUERTO', VIEW_W / 2, VIEW_H / 2 - 20, { size: 64, align: 'center', color: '#ff5a4a', outline: 10 });
    text(c, 'Despiertas en la playa…', VIEW_W / 2, VIEW_H / 2 + 36, { size: 20, align: 'center' });
    c.globalAlpha = 1;
  }
  if (g.paused) {
    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    text(c, 'PAUSA', VIEW_W / 2, VIEW_H / 2 - 20, { size: 56, align: 'center', outline: 8 });
    text(c, 'Pulsa Esc para continuar', VIEW_W / 2, VIEW_H / 2 + 32, { size: 18, align: 'center' });
  }
  if (g.debug) drawDebug(c, g);
}

export const CONTROLS = [
  ['WASD / flechas', 'moverse'], ['Mayús', 'correr'], ['C', 'agacharse (en hierba alta: oculto)'],
  ['Clic izq. / J', 'atacar hacia el ratón'], ['F', 'eliminar por la espalda'], ['E', 'abrir, recoger, beber del río'],
  ['I / Tab', 'inventario'], ['P', 'personaje (atributos)'], ['Q · R · H', 'comer · beber · curar'], ['T', 'antorcha'], ['Espacio', 'saltar'],
  ['Empujar contra roca', 'escalar'], ['F5 · F6', 'adelantar 2 h · lluvia (pruebas)'], ['Esc', 'pausa'],
];

function drawHelp(c, a) {
  c.globalAlpha = a;
  const w = 420;
  const h = CONTROLS.length * 21 + 40;
  const x = VIEW_W - w - 16;
  const y = 72;
  panel(c, x, y, w, h, 0.7);
  text(c, 'Controles  (F1 para ocultar)', x + 12, y + 16, { size: 15, color: '#ffe8a8' });
  CONTROLS.forEach(([k, d], i) => {
    text(c, k, x + 12, y + 40 + i * 21, { size: 14, color: '#ffd38a', outline: 3 });
    text(c, d, x + 168, y + 40 + i * 21, { size: 14, bold: false, outline: 3 });
  });
  c.globalAlpha = 1;
}

function drawInventory(c, g) {
  c.fillStyle = 'rgba(0, 0, 0, 0.5)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  const cols = 6;
  const S = 72;
  const w = cols * S + 24;
  const rows = Math.ceil(SLOTS / cols);
  const x0 = (VIEW_W - w) / 2;
  const y0 = 120;
  panel(c, x0, y0, w, rows * S + 170, 0.88);
  text(c, 'MOCHILA', x0 + 14, y0 + 22, { size: 24, color: '#ffe8a8', outline: 5 });
  text(c, 'Clic o Enter: usar · I / Tab / Esc: cerrar', x0 + w - 14, y0 + 22, { size: 14, align: 'right', bold: false, outline: 3 });
  const m = g.input.mouse;
  g.inventoryHover = -1;
  for (let i = 0; i < SLOTS; i++) {
    const sx = x0 + 12 + (i % cols) * S;
    const sy = y0 + 44 + Math.floor(i / cols) * S;
    const sel = i === g.invSel;
    if (m.x >= sx && m.x < sx + S - 6 && m.y >= sy && m.y < sy + S - 6) g.inventoryHover = i;
    c.fillStyle = '#17150f';
    c.fillRect(sx, sy, S - 6, S - 6);
    c.fillStyle = sel ? '#6b5a30' : '#2a2a20';
    c.fillRect(sx + 2, sy + 2, S - 10, S - 10);
    const slot = g.inventory.slots[i];
    if (slot) {
      icon(c, g.sprites.icons[slot.id], sx + 9, sy + 7, 3);
      if (slot.n > 1) text(c, `${slot.n}`, sx + S - 12, sy + S - 16, { size: 16, align: 'right' });
    }
  }
  const slot = g.inventory.slots[g.invSel];
  const iy = y0 + 54 + rows * S;
  if (slot) {
    const def = ITEMS[slot.id];
    text(c, def.nombre, x0 + 14, iy + 12, { size: 20, color: '#ffe8a8' });
    text(c, def.desc, x0 + 14, iy + 42, { size: 15, bold: false, outline: 3 });
    const e = def.efecto;
    if (e) {
      const parts = Object.entries(e).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k === 'energia' ? 'energía' : k}`);
      if (def.riesgo) parts.push(`riesgo de intoxicación ${Math.round(p0(g).sicknessChance(def.riesgo) * 100)} %`);
      text(c, parts.join('   '), x0 + 14, iy + 66, { size: 15, color: '#b8f0a0', outline: 3 });
    }
    // Pistas según la Inteligencia (TRASPASO §2.5).
    const hint = hintFor(slot.id, p0(g).attrs.inteligencia);
    if (hint) text(c, `Pista: ${hint}`, x0 + 14, iy + 88, { size: 14, color: '#9ad0ff', bold: false, outline: 3 });
    else if (HINTS[slot.id]) text(c, 'Quizá sirva para algo… (con más Inteligencia lo sabrías)', x0 + 14, iy + 88, { size: 14, color: '#8a9aa8', bold: false, outline: 3 });
  } else {
    text(c, g.inventory.slots.length ? '' : 'La mochila está vacía. Busca en los restos del avión (E).', x0 + 14, iy + 12, { size: 16, bold: false });
  }
  text(c, `Saqueos: ${g.stats.saqueos}   Eliminaciones: ${g.stats.eliminaciones} (${g.stats.sigilosas} en silencio)`, x0 + 14, iy + 112, { size: 14, color: '#c8d0c0', bold: false, outline: 3 });
}

const p0 = (g) => g.player;

/** Pista más completa que da la Inteligencia para un objeto, o null. */
export function hintFor(id, intel) {
  const h = HINTS[id];
  if (!h) return null;
  let best = null;
  for (const [lvl, txt] of Object.entries(h)) if (intel >= Number(lvl)) best = txt;
  return best;
}

/** Pantalla de personaje (P): atributos, efectos y estado. */
function drawCharacter(c, g) {
  const p = g.player;
  c.fillStyle = 'rgba(0, 0, 0, 0.55)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 760;
  const h = 520;
  const x0 = (VIEW_W - w) / 2;
  const y0 = 100;
  panel(c, x0, y0, w, h, 0.9);
  text(c, 'PERSONAJE', x0 + 16, y0 + 24, { size: 26, color: '#ffe8a8', outline: 5 });
  text(c, 'P / Esc: cerrar', x0 + w - 16, y0 + 24, { size: 14, align: 'right', bold: false, outline: 3 });
  // Retrato.
  const fr = g.sprites.player.frames.walk_down[0];
  const S = 4;
  c.imageSmoothingEnabled = false;
  c.fillStyle = 'rgba(40, 70, 40, 0.5)';
  c.fillRect(x0 + 20, y0 + 52, 200, 230);
  c.drawImage(g.sprites.player.image, fr[0], fr[1], fr[2], fr[3], x0 + 120 - (fr[2] * S) / 2, y0 + 270 - fr[3] * S, fr[2] * S, fr[3] * S);
  text(c, `Vida ${Math.ceil(p.hp)} / ${p.maxHp}`, x0 + 120, y0 + 302, { size: 17, align: 'center', color: '#ff8a7a' });
  text(c, p.sick > 0 ? 'Intoxicado' : 'Sano', x0 + 120, y0 + 326, { size: 15, align: 'center', color: p.sick > 0 ? '#c8f07a' : '#a8f0a0', bold: false });
  const pl = g.plane && LANDING_RESULTS[g.plane.zone];
  if (pl) {
    text(c, 'Avión', x0 + 120, y0 + 362, { size: 15, align: 'center', color: '#ffd38a' });
    text(c, g.plane.estado, x0 + 120, y0 + 384, { size: 15, align: 'center', bold: false });
    text(c, `(${pl.nombre})`, x0 + 120, y0 + 404, { size: 13, align: 'center', bold: false, color: '#c8d0c0' });
  }
  // Atributos.
  ATTRS.forEach((a, i) => {
    const y = y0 + 70 + i * 34;
    const v = p.attrs[a.id];
    text(c, a.nombre, x0 + 250, y, { size: 18 });
    for (let k = 0; k < ATTR_MAX; k++) {
      c.fillStyle = '#17150f';
      c.fillRect(x0 + 470 + k * 26, y - 10, 22, 20);
      c.fillStyle = k < v ? ['#e0483a', '#4ac06a', '#4aa8e0', '#b07ae0'][i] : '#2a2a22';
      c.fillRect(x0 + 472 + k * 26, y - 8, 18, 16);
    }
    text(c, `${v}`, x0 + 640, y, { size: 18, color: '#ffe8a8' });
  });
  text(c, 'Efectos', x0 + 250, y0 + 220, { size: 17, color: '#ffd38a' });
  statLines(p.attrs).forEach(([k, v], i) => {
    const y = y0 + 248 + i * 26;
    text(c, k, x0 + 250, y, { size: 15, bold: false, color: '#c8d0c0', outline: 3 });
    text(c, v, x0 + w - 24, y, { size: 15, align: 'right', outline: 3 });
  });
}

/** Pantalla del impacto tras el aterrizaje: zona, daño y estado del avión. */
export function drawImpact(c, g) {
  const im = g.impact;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const flash = Math.max(0, 1 - im.t / 0.8);
  c.fillStyle = `rgba(0, 0, 0, ${(0.45 + flash * 0.55).toFixed(2)})`;
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  const a = Math.min(1, im.t * 2);
  c.globalAlpha = a;
  const R = im.R;
  const w = 560;
  const h = 250;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2 - 40;
  panel(c, x, y, w, h, 0.9);
  const sea = im.result.zone === 'mar';
  text(c, sea ? '¡AMERIZAJE!' : '¡ATERRIZAJE FORZOSO!', VIEW_W / 2, y + 36, { size: 32, align: 'center', color: '#ffe8a8', outline: 6 });
  text(c, R.nombre, VIEW_W / 2, y + 76, { size: 22, align: 'center' });
  text(c, R.dano ? `−${R.dano} de vida` : 'Sin heridas', VIEW_W / 2, y + 114, { size: 20, align: 'center', color: R.dano ? '#ff8a7a' : '#a8f0a0' });
  const estado = { reparable: 'El avión se puede reparar', destruido: 'El avión ha quedado destruido', hundido: 'El avión se ha hundido' }[R.avion];
  text(c, estado, VIEW_W / 2, y + 146, { size: 18, align: 'center', color: R.avion === 'reparable' ? '#a8f0a0' : '#ffb08a' });
  text(c, im.result.forced && sea ? 'Sin altura sobre tierra desconocida: amerizas junto a la costa.' : R.texto, VIEW_W / 2, y + 178, { size: 16, align: 'center', bold: false });
  if (im.t > 0.6 && Math.floor(im.t * 2) % 2 === 0) text(c, 'Pulsa Enter para continuar', VIEW_W / 2, y + 222, { size: 17, align: 'center', color: '#ffd38a' });
  c.globalAlpha = 1;
}

function drawDebug(c, g) {
  const p = g.player;
  const lines = [
    `FPS: ${g.fps.toFixed(0)}`,
    `Pies (tiles): ${(p.x / TILE).toFixed(2)}, ${(p.y / TILE).toFixed(2)} · nivel ${p.level} · zona ${g.zone}`,
    `Estado: ${p.stateName} · terreno ${p.terrain} · ruido ${p.noise}`,
    `Enemigos: ${g.enemies.map((e) => `${e.state}${e.dead ? '' : ' ' + e.detect.toFixed(1)}`).join(' | ')}`,
    `Lluvia ${g.weather.intensity.toFixed(2)} · oscuridad ${g.clock.darkness.toFixed(2)}`,
  ];
  panel(c, 270, 16, 560, lines.length * 20 + 10, 0.8);
  lines.forEach((l, i) => text(c, l, 280, 30 + i * 20, { size: 13, bold: false, color: '#c8ffd0', outline: 3 }));
}

/** Pantalla de carga con la ilustración de la selva de Javier. */
export function drawLoading(c, img) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  if (img) {
    const s = Math.max(VIEW_W / img.width, VIEW_H / img.height);
    c.imageSmoothingEnabled = true;
    c.drawImage(img, (VIEW_W - img.width * s) / 2, (VIEW_H - img.height * s) / 2, img.width * s, img.height * s);
  }
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(0, VIEW_H - 90, VIEW_W, 90);
  text(c, 'Cargando la isla…', VIEW_W / 2, VIEW_H - 45, { size: 28, align: 'center', outline: 6 });
}
