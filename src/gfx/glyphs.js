// Iconos pequeños sobre los personajes (? ! …) en pixel art con contorno.

import { PixelCanvas, rgb } from './pixel.js';
import { C } from './palette.js';

const SHAPES = {
  '?': ['0110', '1001', '0001', '0010', '0100', '0000', '0100'],
  '!': ['1', '1', '1', '1', '1', '0', '1'],
  '…': ['00000', '00000', '00000', '00000', '00000', '00000', '10101'],
};
const COLORS = { yellow: '#ffd84a', red: '#ff4a32', white: '#ffffff' };
const cache = new Map();

export function glyph(ch, color = 'white') {
  const key = ch + color;
  if (!cache.has(key)) {
    const rows = SHAPES[ch] || SHAPES['?'];
    const w = rows[0].length;
    const p = new PixelCanvas(w * 2 + 2, rows.length * 2 + 2);
    rows.forEach((row, y) => [...row].forEach((v, x) => v === '1' && p.rect(1 + x * 2, 1 + y * 2, 2, 2, rgb(COLORS[color]))));
    p.outline(C.outline, true);
    cache.set(key, p.toCanvas());
  }
  return cache.get(key);
}
