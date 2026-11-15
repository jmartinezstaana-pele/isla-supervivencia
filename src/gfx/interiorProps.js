// Sprites de los interiores (sesión 6): bocas de la cueva, cueva, búnker y
// cabañas. Mismo estilo que props.js y biomeProps.js: pixel art pintado por
// código, sombreado por tonos y contorno de cómic. Cada generador devuelve
// { parts, col?, shadow?, opaque?, solid? } con las partes ancladas en la base.

import { RNG } from '../core/rng.js';
import { PixelCanvas, rgb, shade } from './pixel.js';
import { C } from './palette.js';

const part = (pc, ax, ay, extra = {}) => ({ canvas: pc.toCanvas(), dx: -ax, dy: -ay, w: pc.w, h: pc.h, ...extra });

// ------------------------------------------------------------------ exterior

/**
 * Boca de cueva excavada en una pared de acantilado (3 tiles de ancho): arco de
 * roca con musgo y raíces colgando y un interior negro que se aclara hacia abajo.
 */
export function caveMouth(seed) {
  const r = new RNG(seed);
  const W = 104;
  const H = 76;
  const bx = W >> 1;
  const by = H - 1;
  const p = new PixelCanvas(W, H);
  // Rocas del arco.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - bx) / 50;
      const dy = (by - y) / 74;
      const outer = dx * dx + dy * dy;
      if (outer > 1) continue;
      const ix = (x - bx) / 34;
      const iy = (by - y) / 58;
      const inner = ix * ix + iy * iy;
      if (inner < 1) {
        // Hueco: negro arriba, algo de suelo visible abajo.
        const f = (by - y) / 58;
        p.set(x, y, f > 0.35 ? rgb('#060504') : f > 0.15 ? rgb('#14100c') : rgb('#221b14'));
        continue;
      }
      const t = 0.3 + (1 - inner / 2.2) * 0.2 + (r.next() - 0.5) * 0.25 + (x < bx ? 0.15 : -0.1);
      p.set(x, y, C.stone[Math.max(0, Math.min(4, Math.floor(t * 5)))]);
    }
  }
  // Bloques del arco (juntas).
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.08 + (k / 8) * 0.84);
    const x0 = bx - Math.cos(a) * 36;
    const y0 = by - Math.sin(a) * 60;
    p.line(Math.round(x0), Math.round(y0), Math.round(bx - Math.cos(a) * 48), Math.round(by - Math.sin(a) * 72), C.stone[0]);
  }
  // Musgo por arriba y raíces colgando dentro.
  for (let k = 0; k < 26; k++) {
    const a = Math.PI * r.range(0.15, 0.85);
    const rr = r.range(44, 50);
    p.over(Math.round(bx - Math.cos(a) * rr), Math.round(by - Math.sin(a) * rr * 1.45), C.moss[r.int(0, 2)]);
  }
  for (let k = 0; k < 6; k++) {
    const x = bx + r.int(-26, 26);
    const top = by - Math.round(Math.sqrt(Math.max(0, 1 - ((x - bx) / 34) ** 2)) * 58);
    const len = r.int(6, 16);
    for (let y = top; y < top + len; y++) p.set(x + (y % 5 === 0 ? 1 : 0), y, C.wood[1]);
  }
  // Piedras sueltas a los lados de la entrada.
  for (const sx of [-1, 1]) {
    p.shadedEllipse(bx + sx * 42, by - 5, 9, 6, C.stone);
    p.shadedEllipse(bx + sx * 33, by - 3, 5, 4, C.stone);
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], solid: false, shadow: null };
}

// ------------------------------------------------------------------ cueva

/** Estalagmita de roca (sólida). */
export function stalagmite(seed) {
  const r = new RNG(seed);
  const h = r.int(22, 38);
  const w = r.int(7, 11);
  const p = new PixelCanvas(w * 2 + 6, h + 4);
  const bx = w + 3;
  const by = h + 2;
  for (let y = 0; y < h; y++) {
    const hw = Math.max(1, Math.round(w * Math.pow(y / h, 0.8)));
    for (let x = -hw; x <= hw; x++) {
      const rel = x / hw;
      p.set(bx + x, by - h + y, C.stone[rel < -0.3 ? 3 : rel > 0.4 ? 0 : 2]);
    }
  }
  for (let k = 0; k < 6; k++) p.set(bx + r.int(-w + 2, w - 2), by - r.int(2, h - 4), C.stone[4]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: w * 2 - 2, h: 8 }, shadow: { rx: w + 2, ry: 3 }, opaque: true };
}

/** Setas luminosas de la cueva (verde azulado). */
export function glowMushrooms(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(30, 20);
  for (let k = 0; k < 5; k++) {
    const x = 5 + r.int(0, 19);
    const y = 18 - r.int(0, 4);
    const h = r.int(4, 9);
    p.rect(x, y - h, 1, h, rgb('#cfe8d8'));
    const cap = r.int(2, 4);
    p.ellipse(x, y - h, cap, Math.max(1, cap - 1), rgb('#3fd0b0'));
    p.set(x - 1, y - h - 1, rgb('#b8fff0'));
  }
  p.outline(rgb('#0c1f1a'));
  return { parts: [part(p, 15, 19)], solid: false, shadow: null };
}

/** Esqueleto de un soldado tumbado, con casco y restos de uniforme. */
export function skeleton() {
  const p = new PixelCanvas(52, 24);
  const bone = rgb('#e6dfca');
  const boneS = rgb('#b8ae94');
  // Restos de uniforme.
  p.poly([[14, 8], [34, 7], [36, 17], [15, 18]], C.camo[1]);
  p.poly([[14, 8], [34, 7], [34, 10], [14, 11]], C.camo[2]);
  // Costillas, columna y pelvis.
  for (let k = 0; k < 5; k++) p.line(18 + k * 3, 9, 18 + k * 3, 16, k % 2 ? bone : boneS);
  p.line(16, 12, 38, 12, bone);
  p.ellipse(39, 12, 3, 3, boneS);
  // Piernas y brazos.
  p.line(41, 11, 50, 7, bone); p.line(41, 13, 50, 17, bone);
  p.line(17, 9, 10, 3, bone); p.line(17, 16, 9, 21, bone);
  // Cráneo con casco.
  p.circle(9, 12, 5, bone);
  p.set(7, 11, C.black); p.set(10, 11, C.black); p.set(8, 14, rgb('#4a4436'));
  p.ellipse(7, 10, 5, 4, C.camo[2]);
  p.rect(3, 10, 2, 3, C.camo[1]);
  p.outline(C.outline);
  return { parts: [part(p, 26, 20)], col: { w: 36, h: 8 }, solid: false, shadow: { rx: 22, ry: 4 } };
}

/** Hoja de papel en el suelo (nota). */
export function notePaper() {
  const p = new PixelCanvas(16, 12);
  p.poly([[1, 3], [12, 1], [14, 9], [3, 11]], rgb('#efe6c8'));
  for (let k = 0; k < 3; k++) p.line(4, 4 + k * 2, 11, 3 + k * 2, rgb('#7a6e58'));
  p.outline(C.outline);
  return { parts: [part(p, 8, 10)], solid: false, shadow: null };
}

/** Huesos roídos (guarida del depredador). */
export function bonePile(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(40, 18);
  const bone = [rgb('#b8ae94'), rgb('#d6ceb6'), rgb('#efe8d4')];
  for (let k = 0; k < 9; k++) {
    const x = r.int(4, 34);
    const y = r.int(6, 15);
    const len = r.int(5, 10);
    const a = r.range(0, Math.PI);
    const x1 = Math.round(x + Math.cos(a) * len);
    const y1 = Math.round(y + Math.sin(a) * len * 0.4);
    p.line(x, y, x1, y1, bone[r.int(0, 2)], 2);
    p.set(x1, y1, bone[2]);
  }
  p.circle(30, 10, 3, bone[1]); p.set(29, 10, C.black); p.set(31, 10, C.black);
  p.outline(C.outline);
  return { parts: [part(p, 20, 16)], solid: false, shadow: null };
}

/** Lecho de paja aplastada de la guarida, con mechones de pelo oscuro. */
export function den(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(70, 34);
  p.shadedEllipse(35, 18, 32, 14, [C.thatch[0], C.thatch[1], C.thatch[2], C.thatch[3]]);
  p.shadedEllipse(35, 18, 22, 9, [C.thatch[0], C.thatch[1], C.thatch[1], C.thatch[2]]);
  for (let k = 0; k < 40; k++) {
    const a = r.range(0, Math.PI * 2);
    const d = r.range(8, 30);
    p.set(Math.round(35 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d * 0.45), r.next() < 0.3 ? rgb('#1a1612') : C.thatch[r.int(1, 4)]);
  }
  p.outline(C.outline);
  return { parts: [part(p, 35, 30)], solid: false, shadow: null };
}

/** Rayo de luz que entra por una salida (suelo iluminado, sin contorno). */
export function lightShaft(color = '#f6e8b0') {
  const p = new PixelCanvas(56, 40);
  const c = rgb(color);
  for (let y = 0; y < 40; y++) {
    const hw = 12 + y * 0.35;
    for (let x = Math.round(28 - hw); x <= Math.round(28 + hw); x++) {
      if (((x + y) & 1) === 0 || y > 30) p.set(x, y, rgb(color, y > 30 ? 60 : 90));
    }
  }
  void c;
  return { parts: [part(p, 28, 40)], solid: false, shadow: null };
}

// ------------------------------------------------------------------ búnker

/** Mesa metálica, con la radio rota encima si `radio`. */
export function desk(radio = true) {
  const p = new PixelCanvas(60, 44);
  const bx = 30;
  const by = 42;
  // Tablero y patas.
  p.rect(4, 14, 52, 14, C.metal[2]);
  p.rect(4, 14, 52, 3, C.metal[3]);
  p.rect(4, 26, 52, 2, C.metal[0]);
  p.rect(6, 28, 4, 14, C.metal[1]);
  p.rect(50, 28, 4, 14, C.metal[1]);
  p.rect(36, 28, 14, 10, C.metal[1]);
  p.rect(37, 31, 12, 1, C.metal[3]);
  if (radio) {
    p.rect(10, 4, 22, 14, C.camo[1]);
    p.rect(10, 4, 22, 3, C.camo[2]);
    p.rect(13, 9, 9, 6, C.metal[0]);
    p.circle(26, 12, 3, C.metal[3]);
    p.line(30, 4, 34, -6, C.metal[3]);
    p.line(14, 18, 20, 22, C.red[2]); p.line(18, 18, 13, 23, C.yellow[2]); // cables sueltos
  }
  // Papeles.
  p.rect(38, 15, 10, 7, rgb('#e8e0c8'));
  p.line(40, 17, 46, 17, rgb('#8a8070'));
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 52, h: 10 }, shadow: { rx: 28, ry: 4 }, opaque: false };
}

/** Estantería metálica con cajas y latas. */
export function shelf(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(48, 60);
  const bx = 24;
  const by = 58;
  p.rect(4, 4, 3, 54, C.metal[1]);
  p.rect(41, 4, 3, 54, C.metal[1]);
  for (const y of [16, 32, 48]) {
    p.rect(4, y, 40, 3, C.metal[3]);
    let x = 8;
    while (x < 38) {
      const w = r.int(5, 10);
      const h = r.int(5, 10);
      const kind = r.int(0, 2);
      const col = kind === 0 ? C.wood[3] : kind === 1 ? C.camo[2] : C.metal[2];
      p.rect(x, y - h, Math.min(w, 40 - x), h, col);
      p.rect(x, y - h, Math.min(w, 40 - x), 1, shade(col, 1.25));
      x += w + 1;
    }
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 40, h: 8 }, shadow: { rx: 22, ry: 3 }, opaque: true };
}

/** Fila de taquillas verdes. */
export function lockers(n = 3) {
  const W = n * 14 + 4;
  const p = new PixelCanvas(W, 52);
  for (let k = 0; k < n; k++) {
    const x = 2 + k * 14;
    p.rect(x, 4, 13, 46, C.camo[2]);
    p.rect(x, 4, 13, 2, C.camo[3]);
    p.rect(x + 12, 4, 1, 46, C.camo[0]);
    for (let y = 9; y < 17; y += 2) p.rect(x + 3, y, 7, 1, C.camo[0]); // rejilla
    p.rect(x + 9, 26, 2, 4, C.metal[3]);
  }
  p.outline(C.outline);
  return { parts: [part(p, W >> 1, 50)], col: { w: W - 4, h: 8 }, shadow: { rx: W / 2, ry: 3 }, opaque: true };
}

/** Litera metálica con mantas. */
export function bunkBed(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(64, 56);
  const blanket = [C.camo[1], C.camo[2], C.camo[3]];
  for (const y of [8, 30]) {
    p.rect(4, y, 56, 14, rgb('#d8d0b8'));
    p.rect(4, y + 3, 40 + r.int(-4, 4), 11, blanket[1]);
    p.rect(4, y + 3, 40, 2, blanket[2]);
    p.rect(48, y + 2, 10, 6, rgb('#efe8d8')); // almohada
    p.rect(4, y + 13, 56, 2, C.metal[1]);
  }
  p.rect(2, 4, 3, 50, C.metal[2]);
  p.rect(59, 4, 3, 50, C.metal[2]);
  p.outline(C.outline);
  return { parts: [part(p, 32, 54)], col: { w: 60, h: 10 }, shadow: { rx: 32, ry: 4 }, opaque: false };
}

/** Lámpara de emergencia en la pared (rejilla y bombilla roja). */
export function wallLamp() {
  const p = new PixelCanvas(12, 12);
  p.rect(2, 2, 8, 7, C.metal[1]);
  p.rect(3, 3, 6, 5, rgb('#ff5040'));
  p.rect(4, 3, 2, 2, rgb('#ffc0b0'));
  for (const x of [5, 7]) p.rect(x, 3, 1, 5, C.metal[0]);
  p.outline(C.outline);
  return { parts: [part(p, 6, 11)], solid: false, shadow: null };
}

/** Escalera de hormigón que sube a la salida, con cartel de «SALIDA». */
export function stairsUp() {
  const p = new PixelCanvas(64, 40);
  for (let k = 0; k < 5; k++) {
    const y = 4 + k * 7;
    p.rect(4, y, 56, 7, C.concrete[1 + Math.min(3, k)]);
    p.rect(4, y, 56, 1, C.concrete[4]);
  }
  p.rect(2, 0, 3, 40, C.metal[2]);
  p.rect(59, 0, 3, 40, C.metal[2]);
  p.outline(C.outline);
  return { parts: [part(p, 32, 40)], solid: false, shadow: null };
}

// ------------------------------------------------------------------ cabañas

/** Estera tejida en el suelo. */
export function mat(seed) {
  const r = new RNG(seed);
  const w = r.int(34, 46);
  const h = r.int(20, 26);
  const p = new PixelCanvas(w + 2, h + 2);
  const tones = r.next() < 0.5 ? C.thatch : C.rope;
  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      const weave = ((x >> 2) + (y >> 2)) % 2;
      let c = tones[Math.min(tones.length - 1, 1 + weave + ((x + y) % 7 === 0 ? 1 : 0))];
      if (y === 4 || y === h - 3) c = C.red[1];
      p.set(x, y, c);
    }
  }
  p.outline(C.outline);
  return { parts: [part(p, (w + 2) >> 1, h + 1)], solid: false, shadow: null };
}

/** Vasijas de barro. */
export function pots(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(36, 28);
  const clay = [rgb('#5a2e18'), rgb('#7e4224'), rgb('#a05a32'), rgb('#c07848')];
  const n = r.int(2, 3);
  for (let k = 0; k < n; k++) {
    const cx = 8 + k * 10 + r.int(-1, 1);
    const rr = r.int(5, 7);
    const cy = 26 - rr;
    p.shadedEllipse(cx, cy, rr, rr, clay);
    p.rect(cx - 2, cy - rr - 2, 5, 3, clay[1]);
    p.rect(cx - rr + 1, cy - 1, rr * 2 - 2, 1, clay[0]);
  }
  p.outline(C.outline);
  return { parts: [part(p, 18, 26)], col: { w: 26, h: 6 }, shadow: { rx: 14, ry: 3 } };
}

/** Escudo y lanzas apoyados (decoración de la choza del jefe). */
export function weaponRack() {
  const p = new PixelCanvas(40, 56);
  for (const [x, c] of [[8, C.wood[2]], [14, C.wood[1]], [30, C.wood[2]]]) {
    p.line(x, 54, x + 2, 4, c, 2);
    p.poly([[x + 1, 0], [x + 4, 6], [x + 1, 8], [x - 1, 6]], C.metal[3]);
  }
  p.ellipse(22, 36, 10, 14, C.wood[2]);
  p.ellipse(22, 36, 7, 11, C.red[1]);
  p.rect(21, 24, 2, 24, C.thatch[3]);
  p.circle(22, 36, 2, C.wood[0]);
  p.outline(C.outline);
  return { parts: [part(p, 20, 54)], col: { w: 30, h: 6 }, shadow: { rx: 14, ry: 3 } };
}
