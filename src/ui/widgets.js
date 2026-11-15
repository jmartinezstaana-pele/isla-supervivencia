// Piezas comunes de las pantallas de menú (título, creación, intro, aterrizaje):
// botones de madera, imagen a pantalla completa, cursor y comprobación de ratón.

import { VIEW_W, VIEW_H } from '../config.js';
import { text } from '../render/hud.js';

export const inRect = (m, r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;

/** Dibuja una ilustración cubriendo la pantalla, con zoom lento opcional. */
export function cover(c, img, zoom = 1, ox = 0.5, oy = 0.5) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!img) return;
  const s = Math.max(VIEW_W / img.width, VIEW_H / img.height) * zoom;
  const w = img.width * s;
  const h = img.height * s;
  c.imageSmoothingEnabled = true;
  c.drawImage(img, (VIEW_W - w) * ox, (VIEW_H - h) * oy, w, h);
  c.imageSmoothingEnabled = false;
}

/** Botón con borde de madera. `state`: { hover, selected, disabled }. */
export function button(c, r, label, { hover = false, selected = false, disabled = false, size = 22, sub = '' } = {}) {
  const on = (hover || selected) && !disabled;
  c.fillStyle = '#17150f';
  c.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
  c.fillStyle = disabled ? '#3a3328' : on ? '#d8a848' : '#6b4a26';
  c.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  c.fillStyle = disabled ? 'rgba(30, 30, 26, 0.9)' : on ? 'rgba(70, 52, 22, 0.95)' : 'rgba(16, 22, 18, 0.88)';
  c.fillRect(r.x, r.y, r.w, r.h);
  c.fillStyle = 'rgba(255, 255, 255, 0.07)';
  c.fillRect(r.x, r.y, r.w, 3);
  const color = disabled ? '#7a766a' : on ? '#ffe8a8' : '#fff6dc';
  const cy = sub ? r.y + r.h / 2 - 8 : r.y + r.h / 2 + 1;
  text(c, label, r.x + r.w / 2, cy, { size, align: 'center', color, outline: 4 });
  if (sub) text(c, sub, r.x + r.w / 2, r.y + r.h / 2 + 14, { size: 13, align: 'center', color: '#a8a290', bold: false, outline: 3 });
  if (on) {
    // Flechas de selección a los lados.
    const y = r.y + r.h / 2;
    c.fillStyle = '#ffe8a8';
    for (let i = 0; i < 6; i++) {
      c.fillRect(r.x - 22 + i, y - 6 + i, 2, 12 - i * 2);
      c.fillRect(r.x + r.w + 20 - i, y - 6 + i, 2, 12 - i * 2);
    }
  }
}

/** Cursor de flecha en pixel art para los menús. */
export function drawCursor(c, m) {
  const shape = [
    'X', 'XX', 'XOX', 'XOOX', 'XOOOX', 'XOOOOX', 'XOOOOOX', 'XOOOOOOX', 'XOOOOXXXX', 'XOXOOX', 'XX XOOX', '   XOOX', '    XX',
  ];
  const s = 2;
  c.setTransform(1, 0, 0, 1, 0, 0);
  shape.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ' ') continue;
      c.fillStyle = row[x] === 'X' ? '#17150f' : '#fff6dc';
      c.fillRect(Math.round(m.x) + x * s, Math.round(m.y) + y * s, s, s);
    }
  });
}

/** Degradado oscuro de abajo arriba para que se lea el texto sobre una ilustración. */
export function shadeBottom(c, from = 0.45, alpha = 0.85) {
  const grad = c.createLinearGradient(0, VIEW_H * from, 0, VIEW_H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
  c.fillStyle = grad;
  c.fillRect(0, 0, VIEW_W, VIEW_H);
}
