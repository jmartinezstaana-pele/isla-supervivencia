// Iconos de objetos de 16 × 16 en pixel art (se usan en el inventario y como
// objetos en el suelo).

import { PixelCanvas, rgb } from './pixel.js';
import { C } from './palette.js';

const DRAW = {
  cuchillo(p) {
    p.line(3, 12, 11, 4, C.metal[4], 2); p.line(4, 12, 11, 5, C.metal[2]);
    p.rect(2, 12, 3, 3, C.wood[2]); p.line(1, 15, 4, 12, C.wood[1]);
  },
  botella(p) {
    p.rect(5, 5, 6, 10, rgb('#5ab0d8')); p.rect(5, 5, 2, 10, rgb('#a8e0f4')); p.rect(6, 2, 4, 3, rgb('#5ab0d8')); p.rect(6, 1, 4, 1, C.red[1]);
    p.rect(5, 9, 6, 2, rgb('#e8e8e8'));
  },
  racion(p) {
    p.rect(3, 5, 10, 9, C.metal[3]); p.rect(3, 5, 10, 2, C.metal[4]); p.rect(3, 8, 10, 3, C.camo[2]); p.rect(3, 13, 10, 1, C.metal[1]);
  },
  galletas(p) {
    p.rect(2, 5, 12, 8, rgb('#d8b060')); p.rect(2, 5, 12, 2, rgb('#f0d088'));
    for (const x of [4, 8, 11]) p.set(x, 9, rgb('#8a6020'));
  },
  venda(p) {
    p.circle(8, 8, 5, rgb('#f2efe6')); p.circle(8, 8, 2, rgb('#c8c2b0')); p.rect(7, 2, 2, 3, C.red[2]); p.rect(6, 3, 4, 1, C.red[2]);
  },
  tela(p) {
    p.poly([[2, 4], [13, 3], [14, 12], [3, 13]], rgb('#c8b890')); p.line(3, 8, 13, 7, rgb('#9a8a60'));
  },
  cuerda(p) {
    p.circle(8, 8, 6, C.rope[1]); p.circle(8, 8, 3, 0); p.line(3, 6, 12, 10, C.rope[2]); p.line(12, 12, 15, 15, C.rope[1]);
  },
  madera(p) {
    p.line(2, 12, 13, 3, C.wood[2], 3); p.line(3, 14, 14, 6, C.wood[3], 2); p.set(12, 4, C.wood[4]);
  },
  piedra(p) {
    p.shadedEllipse(8, 9, 6, 4, C.stone);
  },
  fibra(p) {
    for (let k = 0; k < 5; k++) p.line(4 + k * 2, 14, 6 + k, 2, C.leaf[3 + (k % 2)]);
  },
  coco(p) {
    p.shadedEllipse(8, 9, 6, 6, C.wood.slice(0, 4)); p.set(6, 6, C.wood[0]); p.set(9, 6, C.wood[0]); p.set(8, 8, C.wood[0]);
  },
  bayas(p) {
    for (const [x, y] of [[5, 9], [9, 8], [7, 12], [11, 11]]) { p.circle(x, y, 2, C.red[2]); p.set(x - 1, y - 1, C.red[3]); }
    p.line(8, 3, 8, 7, C.leaf[2]); p.rect(9, 3, 3, 2, C.leaf[3]);
  },
  carne(p) {
    p.shadedEllipse(9, 8, 5, 4, [rgb('#6a1a1a'), rgb('#a02a2a'), rgb('#d04848'), rgb('#f07a7a')]);
    p.rect(2, 11, 5, 2, rgb('#f0e8d8')); p.rect(1, 10, 2, 4, rgb('#f0e8d8'));
  },
  cangrejo(p) {
    p.shadedEllipse(8, 9, 5, 4, C.red); p.rect(2, 4, 3, 3, C.red[2]); p.rect(11, 4, 3, 3, C.red[2]);
  },
  hierba(p) {
    p.line(8, 14, 8, 6, C.leaf[2]);
    for (const [x, y] of [[5, 6], [11, 6], [6, 10], [10, 10]]) p.circle(x, y, 2, C.leaf[4]);
    p.circle(8, 4, 2, C.purple[2]); p.set(8, 4, C.purple[3]);
  },
  cecina(p) {
    p.poly([[2, 6], [13, 4], [14, 10], [3, 12]], rgb('#7a3a1e')); p.line(4, 8, 12, 7, rgb('#a85a30')); p.line(5, 10, 12, 9, rgb('#5a2a12'));
  },
  antorcha(p) {
    p.line(5, 14, 10, 6, C.wood[2], 2); p.rect(9, 3, 4, 4, rgb('#ff9a1e')); p.rect(10, 2, 2, 2, rgb('#ffe066'));
  },
  bidon(p) {
    p.rect(4, 3, 9, 12, C.red[2]); p.rect(4, 3, 3, 12, C.red[3]); p.rect(11, 3, 2, 12, C.red[0]);
    p.rect(4, 6, 9, 1, C.red[0]); p.rect(4, 11, 9, 1, C.red[0]); p.rect(9, 1, 3, 2, C.metal[3]);
  },
  huevo(p) {
    p.shadedEllipse(8, 9, 4, 5, [rgb('#b8b098'), rgb('#e0d8c4'), rgb('#f8f2e4'), rgb('#ffffff')]); p.set(9, 11, rgb('#a89a80')); p.set(6, 8, rgb('#a89a80'));
  },
  metal(p) {
    p.poly([[2, 10], [9, 4], [14, 7], [8, 14]], C.metal[2]); p.line(3, 10, 9, 5, C.metal[4]); p.rect(9, 9, 3, 2, C.rust[2]); p.set(6, 11, C.rust[3]);
  },
  tarjeta(p) {
    p.rect(2, 4, 12, 8, rgb('#d8dcd8')); p.rect(2, 4, 12, 2, rgb('#3a64a0')); p.rect(2, 9, 12, 2, rgb('#1a1a1a'));
    p.rect(3, 6, 3, 2, C.yellow[1]); p.set(10, 7, C.metal[2]); p.set(12, 7, C.metal[2]);
  },
  radio_rota(p) {
    p.rect(2, 5, 12, 9, C.camo[1]); p.rect(2, 5, 12, 2, C.camo[2]); p.rect(4, 8, 5, 4, C.metal[0]);
    p.circle(11, 10, 2, C.metal[3]); p.line(12, 5, 14, 1, C.metal[3]); p.line(6, 13, 9, 15, C.red[2]); p.line(8, 13, 5, 15, C.yellow[2]);
  },
  bateria(p) {
    p.rect(3, 5, 10, 9, rgb('#2a2e30')); p.rect(3, 5, 10, 2, rgb('#454b4e')); p.rect(4, 3, 2, 2, C.red[2]); p.rect(10, 3, 2, 2, C.metal[3]);
    p.rect(5, 9, 6, 2, C.yellow[2]);
  },
  cables(p) {
    p.line(2, 12, 7, 4, C.red[2], 2); p.line(5, 14, 11, 5, C.yellow[2], 2); p.line(8, 14, 14, 8, rgb('#3a64a0'), 2);
    p.set(7, 3, C.rust[4]); p.set(11, 4, C.rust[4]); p.set(14, 7, C.rust[4]);
  },
  idolo(p) {
    p.rect(5, 3, 6, 11, rgb('#3a9a6a')); p.rect(5, 3, 2, 11, rgb('#6ad09a')); p.rect(6, 6, 1, 1, C.black); p.rect(9, 6, 1, 1, C.black);
    p.rect(6, 10, 4, 1, rgb('#1e5a3a')); p.rect(4, 13, 8, 2, rgb('#2a7a4e'));
  },
};

/** Genera { id: canvas 16 × 16 } con contorno. */
export function buildIcons() {
  const icons = {};
  for (const [id, draw] of Object.entries(DRAW)) {
    const p = new PixelCanvas(16, 16);
    draw(p);
    p.outline(C.outline);
    icons[id] = p.toCanvas();
  }
  return icons;
}
