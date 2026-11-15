// Sprites de los biomas de la isla completa (sesión 5), con el mismo estilo que
// props.js: pixel art pintado por código, sombreado por tonos y contorno de cómic.
// Cada generador devuelve { parts, col?, shadow, opaque? } con las partes
// ancladas en la base del prop.

import { RNG } from '../core/rng.js';
import { PixelCanvas, rgb, shade, mix } from './pixel.js';
import { C } from './palette.js';
import { canopy } from './props.js';

const part = (pc, ax, ay, extra = {}) => ({ canvas: pc.toCanvas(), dx: -ax, dy: -ay, w: pc.w, h: pc.h, ...extra });

// ------------------------------------------------------------------ monte

/** Pino del monte, por pisos de ramas caídas; con nieve en los pisos si `snowy`. */
export function pine(seed, snowy = false) {
  const r = new RNG(seed);
  const tall = r.next() < 0.5;
  const W = tall ? 56 : 48;
  const H = tall ? 96 : 80;
  const bx = W >> 1;
  const by = H - 3;
  const trunk = new PixelCanvas(W, H);
  for (let y = by - 16; y <= by; y++) {
    const w = 2.5 + (y > by - 4 ? 1.5 : 0);
    for (let x = -w; x <= w; x++) trunk.set(bx + x, y, C.wood[x < -1 ? 3 : x > 1 ? 0 : 1]);
  }
  trunk.outline(C.outline);
  const top = new PixelCanvas(W, H);
  const tiers = tall ? 6 : 5;
  const apex = 4;
  const base = by - 12;
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1);
    const yTop = apex + (base - apex) * t * 0.82;
    const yBot = yTop + (base - apex) / tiers + 8;
    const half = 5 + t * (W / 2 - 7);
    const lean = r.range(-1.5, 1.5);
    for (let y = Math.floor(yTop); y <= yBot; y++) {
      const f = (y - yTop) / (yBot - yTop);
      const hw = half * (0.25 + 0.75 * f) + Math.sin(y * 1.7 + k) * 1.2;
      for (let x = -hw; x <= hw; x++) {
        const rel = x / hw;
        let tone = rel < -0.35 ? 3 : rel > 0.4 ? 1 : 2;
        if (f > 0.8) tone = Math.max(0, tone - 1);
        if ((Math.round(x) + y) % 5 === 0 && f > 0.4) tone = Math.max(0, tone - 1); // ramitas
        top.set(bx + x + lean * f, y, C.pine[tone + (rel < -0.6 && f < 0.6 ? 1 : 0)]);
      }
      // Puntas de las ramas colgando.
      if (f > 0.85) for (const sx of [-1, 1]) top.set(bx + sx * hw + lean, y + 1, C.pine[0]);
    }
    if (snowy) {
      for (let x = -half * 0.7; x <= half * 0.7; x++) {
        const yy = yTop + 2 + Math.abs(x) * 0.5 + Math.sin(x * 2 + k) * 0.8;
        top.set(bx + x, yy, C.snow[3]);
        top.set(bx + x, yy + 1, x < 0 ? C.snow[4] : C.snow[2]);
      }
    }
  }
  top.set(bx, apex - 1, C.pine[2]);
  top.outline(C.outline);
  return {
    parts: [part(trunk, bx, by), part(top, bx, by, { canopy: true, sway: true })],
    col: { w: 10, h: 6 },
    shadow: { rx: tall ? 22 : 18, ry: 7, oy: -2 },
    opaque: true,
  };
}

/** Roca con casquete de nieve. */
export function snowRock(seed, size = 1) {
  const r = new RNG(seed);
  const w = Math.round(26 * size);
  const h = Math.round(20 * size);
  const p = new PixelCanvas(w + 4, h + 4);
  const bx = (w + 4) >> 1;
  const by = h + 2;
  p.shadedEllipse(bx, by - h / 2, w / 2, h / 2, C.stone);
  p.shadedEllipse(bx - Math.round(w * 0.15), by - h / 2 + 2, w / 3.2, h / 3, C.stone.slice(0, 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w + 4; x++) {
      const rel = y / h;
      if (p.get(x, y) >>> 24 && rel < 0.42 + Math.sin(x * 0.8) * 0.06 + r.range(-0.03, 0.03)) p.set(x, y, rel < 0.18 ? C.snow[4] : rel < 0.32 ? C.snow[3] : C.snow[2]);
    }
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: w * 0.8, h: h * 0.45 }, shadow: { rx: w / 2 + 2, ry: 4 }, opaque: size > 1.2 };
}

/** Antena de radio de la cumbre: celosía metálica con plato, cables y luz roja. */
export function antenna() {
  const W = 56;
  const H = 150;
  const p = new PixelCanvas(W, H);
  const bx = 28;
  const by = 146;
  const top = 14;
  // Patas de celosía que se estrechan.
  const legX = (y, s) => bx + s * (3 + ((y - top) / (by - top)) * 14);
  for (let y = top; y <= by; y++) {
    for (const s of [-1, 1]) {
      p.set(legX(y, s), y, s < 0 ? C.metal[3] : C.metal[1]);
      p.set(legX(y, s) + s, y, C.metal[0]);
    }
  }
  for (let y = top + 6; y < by; y += 12) {
    const a = legX(y, -1);
    const b = legX(y + 12, 1);
    p.line(a, y, b, Math.min(by, y + 12), C.rust[2]);
    p.line(legX(y, 1), y, legX(y + 12, -1), Math.min(by, y + 12), C.metal[2]);
    p.line(legX(y, -1), y, legX(y, 1), y, C.metal[2]);
  }
  // Mástil y luz.
  p.rect(bx - 1, 2, 2, top, C.metal[3]);
  p.rect(bx - 2, 0, 4, 3, C.red[2]);
  p.set(bx - 1, 0, C.red[3]);
  // Plato parabólico torcido y oxidado.
  p.shadedEllipse(bx + 12, 40, 7, 9, [C.metal[1], C.metal[2], C.metal[3], C.metal[4]]);
  p.shadedEllipse(bx + 13, 40, 3, 4, [C.rust[1], C.rust[2], C.rust[3]]);
  p.line(bx + 4, 40, bx + 10, 40, C.metal[1]);
  // Caseta con el equipo, a los pies.
  p.rect(bx - 12, by - 14, 24, 14, C.metal[2]);
  p.rect(bx - 12, by - 14, 24, 3, C.metal[3]);
  p.rect(bx - 4, by - 9, 7, 9, C.metal[0]);
  for (let k = 0; k < 10; k++) p.over(bx - 11 + ((k * 7) % 22), by - 12 + ((k * 3) % 10), C.rust[2 + (k % 2)]);
  // Nieve en la caseta.
  p.rect(bx - 13, by - 16, 26, 2, C.snow[4]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 26, h: 10 }, shadow: { rx: 22, ry: 6 }, opaque: true };
}

// ------------------------------------------------------------------ manglar

/** Mangle: copa densa y oscura sobre raíces en arco que salen del barro. */
export function mangrove(seed) {
  const r = new RNG(seed);
  const W = 96;
  const H = 92;
  const bx = 48;
  const by = 88;
  const roots = new PixelCanvas(W, H);
  const trunkTop = by - 34;
  for (let y = trunkTop; y <= by - 12; y++) {
    const w = 4 + (y - trunkTop) * 0.05;
    for (let x = -w; x <= w; x++) roots.set(bx + x, y, C.wood[x < -1 ? 3 : x > 2 ? 0 : 1]);
  }
  for (let k = 0; k < 7; k++) {
    const side = k % 2 ? 1 : -1;
    const spread = 6 + k * 3.2;
    const sx = bx + side * r.range(0, 3);
    const sy = by - 14 - r.range(0, 6);
    const ex = bx + side * spread;
    for (let t = 0; t <= 1; t += 0.03) {
      const x = sx + (ex - sx) * t;
      const y = sy - Math.sin(t * Math.PI) * (6 + k) + (by - sy) * t * t;
      roots.set(x, y, C.wood[2]);
      roots.set(x, y + 1, C.wood[0]);
    }
  }
  roots.outline(C.outline);
  const top = new PixelCanvas(W, H);
  canopy(top, bx, trunkTop - 14, 40, 22, r, C.mangrove, 52);
  for (let k = 0; k < 4; k++) {
    // Raíces aéreas que cuelgan.
    const x = bx + r.int(-26, 26);
    let y = trunkTop - 4;
    while (y < H - 1 && top.get(x, y) >>> 24) y++;
    for (let i = 0; i < r.int(6, 16); i++) top.set(x, y + i - 1, C.wood[1]);
  }
  top.outline(C.outlineGreen);
  return {
    parts: [part(roots, bx, by), part(top, bx, by, { canopy: true, sway: true })],
    col: { w: 14, h: 8 },
    shadow: { rx: 40, ry: 12, oy: -3 },
    opaque: true,
  };
}

/** Juncos y espadañas (sin colisión). */
export function reeds(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(26, 30);
  const bx = 13;
  const by = 28;
  for (let k = 0; k < 9; k++) {
    const x0 = bx + r.range(-9, 9);
    const hgt = r.int(12, 24);
    const lean = r.range(-4, 4);
    for (let i = 0; i < hgt; i++) {
      const t = i / hgt;
      p.set(x0 + lean * t * t, by - i, C.mangrove[t < 0.5 ? 3 : 4]);
    }
    if (r.next() < 0.5) {
      // Espadaña marrón en la punta.
      const tx = x0 + lean;
      p.rect(tx - 1, by - hgt - 3, 2, 5, C.wood[1]);
      p.set(tx - 1, by - hgt - 3, C.wood[3]);
    }
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, bx, by, { sway: true })], shadow: { rx: 9, ry: 2 } };
}

/** Árbol muerto y blanqueado (manglar y acantilados). */
export function deadTree(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(64, 76);
  const bx = 32;
  const by = 73;
  const bone = ['#5a5248', '#7e766a', '#a49a8a', '#c8bfae'].map((c) => rgb(c));
  const branch = (x, y, ang, len, w) => {
    for (let t = 0; t < len; t += 0.5) {
      const xx = x + Math.cos(ang) * t;
      const yy = y + Math.sin(ang) * t;
      for (let s = -w / 2; s <= w / 2; s += 0.5) p.set(xx + s, yy, bone[s < 0 ? 3 : s > 0.6 ? 0 : 2]);
    }
    if (len > 8 && w > 1) {
      const ex = x + Math.cos(ang) * len;
      const ey = y + Math.sin(ang) * len;
      branch(ex, ey, ang - r.range(0.3, 0.7), len * 0.6, w * 0.65);
      branch(ex, ey, ang + r.range(0.3, 0.7), len * 0.55, w * 0.6);
    }
  };
  branch(bx, by, -Math.PI / 2 + r.range(-0.15, 0.15), 30, 6);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 8, h: 5 }, shadow: { rx: 14, ry: 4 } };
}

// ------------------------------------------------------------------ poblado de la tribu

/** Cabaña redonda de la tribu con tejado de paja; `big` = choza del jefe (con calaveras y plumas). */
export function hut(seed, big = false) {
  const r = new RNG(seed);
  const W = big ? 112 : 80;
  const H = big ? 104 : 78;
  const bx = W >> 1;
  const by = H - 3;
  const p = new PixelCanvas(W, H);
  const rw = big ? 46 : 32;     // radio de la pared
  const wallH = big ? 26 : 18;
  // Pared de barro y palos.
  for (let x = -rw; x <= rw; x++) {
    const rel = x / rw;
    const yb = by - Math.sqrt(Math.max(0, 1 - rel * rel)) * 4;
    for (let y = yb - wallH; y <= yb; y++) {
      let c = C.dirt[rel < -0.4 ? 4 : rel > 0.5 ? 1 : 3];
      if ((x + 64) % 7 === 0) c = C.wood[rel > 0.4 ? 0 : 1];
      p.set(bx + x, y, c);
    }
  }
  // Puerta.
  p.poly([[bx - 7, by - 2], [bx - 6, by - wallH + 2], [bx + 6, by - wallH + 2], [bx + 7, by - 2]], rgb('#120a04'));
  p.rect(bx - 8, by - wallH + 1, 16, 2, C.wood[1]);
  // Tejado cónico de paja con bandas.
  const roofTop = by - wallH - (big ? 58 : 42);
  const roofBase = by - wallH + 6;
  const rr = rw + 8;
  for (let y = roofTop; y <= roofBase; y++) {
    const f = (y - roofTop) / (roofBase - roofTop);
    const hw = rr * Math.pow(f, 0.85) + 1;
    for (let x = -hw; x <= hw; x++) {
      const rel = x / hw;
      let tone = rel < -0.35 ? 4 : rel > 0.45 ? 1 : 2 + (rel < 0 ? 1 : 0);
      if ((y + Math.round(Math.abs(x) * 0.3)) % 6 === 0) tone = Math.max(0, tone - 1);
      if (Math.abs(Math.sin(x * 0.9 + y * 0.4)) < 0.08) tone = 0; // briznas
      p.set(bx + x, y, C.thatch[tone]);
    }
    // Flecos del borde.
    if (f > 0.96) for (let x = -hw; x <= hw; x += 2) p.set(bx + x, y + 1 + ((x * 3) & 1), C.thatch[1]);
  }
  // Palos que asoman en la punta.
  p.line(bx, roofTop + 2, bx - 5, roofTop - 6, C.wood[2], 2);
  p.line(bx, roofTop + 2, bx + 5, roofTop - 6, C.wood[1], 2);
  if (big) {
    for (const [dx, col] of [[-6, C.red[2]], [6, C.yellow[2]], [0, C.purple[2]]]) p.rect(bx + dx - 1, roofTop - 10, 2, 5, col);
    // Calaveras colgadas junto a la puerta.
    for (const dx of [-16, 16]) {
      p.circle(bx + dx, by - wallH + 8, 3, rgb('#e8e0cc'));
      p.set(bx + dx - 1, by - wallH + 8, C.black); p.set(bx + dx + 1, by - wallH + 8, C.black);
      p.line(bx + dx, by - wallH + 2, bx + dx, by - wallH + 5, C.rope[1]);
    }
    // Pinturas rojas en la pared.
    for (let k = 0; k < 5; k++) p.over(bx - 30 + k * 15, by - 10 - (k % 2) * 4, C.red[1]);
  }
  for (let k = 0; k < 12; k++) p.over(bx + r.int(-rw, rw), r.int(roofTop + 10, roofBase), C.thatch[r.int(0, 1)]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: rw * 2 - 4, h: 14 }, shadow: { rx: rw + 6, ry: 7 }, opaque: true };
}

/** Torre de vigía de madera: cuatro patas, plataforma con barandilla y tejadillo. */
export function watchtower(seed, metal = false) {
  const W = 64;
  const H = 120;
  const bx = 32;
  const by = 116;
  const p = new PixelCanvas(W, H);
  const T = metal ? C.metal : C.wood;
  const plat = 44;
  for (const s of [-1, 1]) {
    for (let y = plat; y <= by; y++) {
      const x = bx + s * (12 + ((y - plat) / (by - plat)) * 8);
      p.rect(Math.round(x) - 1, y, 3, 1, T[s < 0 ? 3 : 1]);
    }
  }
  for (let y = plat + 14; y < by; y += 20) {
    const w0 = 12 + ((y - plat) / (by - plat)) * 8;
    const w1 = 12 + ((y + 20 - plat) / (by - plat)) * 8;
    p.line(bx - w0, y, bx + w1, Math.min(by, y + 20), T[2]);
    p.line(bx + w0, y, bx - w1, Math.min(by, y + 20), T[1]);
  }
  // Escalera.
  for (let y = plat + 4; y < by; y += 5) p.rect(bx - 3, y, 7, 1, T[3]);
  p.rect(bx - 4, plat, 1, by - plat, T[1]); p.rect(bx + 4, plat, 1, by - plat, T[1]);
  // Plataforma y barandilla.
  p.rect(bx - 22, plat - 2, 44, 6, T[2]);
  p.rect(bx - 22, plat - 2, 44, 2, T[4]);
  for (let x = bx - 21; x <= bx + 21; x += 6) p.rect(x, plat - 14, 2, 12, T[3]);
  p.rect(bx - 22, plat - 15, 44, 2, T[3]);
  // Tejadillo.
  const roof = metal ? C.rust : C.thatch;
  p.poly([[bx - 27, plat - 22], [bx, plat - 40], [bx + 27, plat - 22]], roof[2]);
  p.poly([[bx, plat - 40], [bx + 27, plat - 22], [bx + 8, plat - 22]], roof[1]);
  p.poly([[bx - 27, plat - 22], [bx, plat - 40], [bx - 10, plat - 22]], roof[3]);
  for (const s of [-1, 1]) p.rect(bx + s * 20, plat - 22, 2, 8, T[1]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by, { canopy: true })], col: { w: 36, h: 8 }, shadow: { rx: 24, ry: 6 }, opaque: false };
}

/** Bastidor para secar pieles y pescado. */
export function dryingRack(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(44, 34);
  const bx = 22;
  const by = 32;
  for (const x of [4, 39]) { p.rect(x, 6, 2, 26, C.wood[2]); p.rect(x, 6, 1, 26, C.wood[3]); }
  p.rect(3, 6, 38, 2, C.wood[1]);
  for (let k = 0; k < 4; k++) {
    const x = 8 + k * 8;
    if (r.next() < 0.5) {
      p.poly([[x, 8], [x + 6, 8], [x + 5, 24], [x + 1, 24]], [C.thatch[3], rgb('#9a6a48'), rgb('#7a4a32')][k % 3]);
    } else {
      p.shadedEllipse(x + 3, 14, 2.5, 5, [C.metal[1], C.metal[2], C.metal[3]]);
      p.line(x + 3, 8, x + 3, 9, C.rope[1]);
    }
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 36, h: 5 }, shadow: { rx: 20, ry: 3 } };
}

// ------------------------------------------------------------------ campamento militar

/** Tienda militar de lona con caballete, vientos y parches. */
export function milTent(seed) {
  const r = new RNG(seed);
  const W = 86;
  const H = 62;
  const bx = 43;
  const by = 58;
  const p = new PixelCanvas(W, H);
  const ridgeY = 10;
  // Faldón trasero (vista 3/4): techo y frontal.
  p.poly([[8, 40], [20, ridgeY], [66, ridgeY], [78, 40]], C.canvas[3]);
  p.poly([[43, ridgeY], [66, ridgeY], [78, 40], [43, 40]], C.canvas[2]);
  // Frontal triangular.
  p.poly([[8, 40], [20, ridgeY], [32, 40]], C.canvas[1]);
  p.poly([[8, 40], [32, 40], [32, 56], [8, 56]], C.canvas[1]);
  p.poly([[32, 40], [78, 40], [78, 56], [32, 56]], C.canvas[2]);
  // Entrada abierta.
  p.poly([[14, 56], [20, 22], [26, 56]], rgb('#12160a'));
  // Costuras y parches.
  for (let x = 24; x < 66; x += 8) p.line(x, ridgeY + 1, x + 10, 39, C.canvas[1]);
  for (let k = 0; k < 4; k++) {
    const x = r.int(36, 70);
    const y = r.int(14, 50);
    if (p.get(x, y) >>> 24) p.rect(x, y, r.int(4, 7), r.int(3, 5), C.canvas[r.int(0, 4)]);
  }
  p.rect(20, ridgeY - 1, 46, 2, C.canvas[4]);
  // Vientos (cuerdas) y estacas.
  p.line(78, 40, 84, 58, C.rope[1]); p.line(8, 40, 2, 58, C.rope[1]);
  p.rect(83, 56, 2, 3, C.wood[1]); p.rect(1, 56, 2, 3, C.wood[1]);
  // Estrella desteñida.
  p.set(55, 47, C.white); p.set(54, 48, C.white); p.set(56, 48, C.white); p.set(55, 49, C.white);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 72, h: 14 }, shadow: { rx: 40, ry: 6 }, opaque: true };
}

/** Muro de sacos terreros (`len` sacos). */
export function sandbags(seed, len = 4) {
  const r = new RNG(seed);
  const W = len * 11 + 6;
  const p = new PixelCanvas(W, 22);
  const bx = W >> 1;
  const by = 20;
  const bag = ['#4e4630', '#6e6446', '#8a7f5a', '#a49870'].map((c) => rgb(c));
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < len - row; k++) {
      const x = 7 + k * 11 + row * 5;
      const y = 15 - row * 6;
      p.shadedEllipse(x, y, 6, 4, bag);
      p.set(x + r.int(-2, 2), y, bag[0]);
    }
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: W - 8, h: 7 }, shadow: { rx: W / 2, ry: 3 } };
}

/** Caja metálica de munición, verde oliva con letras estarcidas. */
export function ammoCrate(seed) {
  const p = new PixelCanvas(28, 24);
  const bx = 14;
  const by = 22;
  p.rect(2, 4, 24, 6, C.canvas[3]);
  p.rect(2, 10, 24, 11, C.canvas[2]);
  p.rect(2, 4, 24, 1, C.canvas[4]);
  p.rect(2, 19, 24, 2, C.canvas[1]);
  p.rect(11, 2, 6, 3, C.metal[2]);
  for (const x of [4, 22]) p.rect(x, 10, 2, 11, C.canvas[1]);
  p.rect(8, 13, 12, 1, C.yellow[2]); p.rect(8, 15, 8, 1, C.yellow[2]);
  for (let k = 0; k < 6; k++) p.over(3 + ((k * 7 + seed) % 22), 11 + ((k * 3) % 9), C.rust[2]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 22, h: 7 }, shadow: { rx: 13, ry: 3 } };
}

/** Bidón metálico (rojo de combustible u oxidado). */
export function drum(seed, color = 'rojo') {
  const p = new PixelCanvas(20, 28);
  const bx = 10;
  const by = 26;
  const T = color === 'rojo' ? C.red : color === 'verde' ? C.canvas.slice(1) : C.rust.slice(1);
  for (let y = 5; y < 25; y++) {
    for (let x = 2; x < 18; x++) {
      const rel = (x - 2) / 16;
      let c = T[rel < 0.25 ? 3 : rel > 0.7 ? 0 : rel > 0.5 ? 1 : 2];
      if (y === 10 || y === 18) c = shade(c, 0.6);
      p.set(x, y, c);
    }
  }
  p.ellipse(10, 5, 8, 3, T[2]);
  p.ellipse(10, 5, 6, 2, T[1]);
  p.rect(12, 4, 2, 2, C.metal[3]);
  for (let k = 0; k < 7; k++) p.over(3 + ((k * 5 + seed * 3) % 14), 8 + ((k * 7) % 15), C.rust[1 + (k % 3)]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 14, h: 7 }, shadow: { rx: 9, ry: 3 } };
}

/** Entrada del búnker: bloque de hormigón semienterrado con puerta de acero y franjas de aviso. */
export function bunker() {
  const W = 116;
  const H = 70;
  const bx = 58;
  const by = 66;
  const p = new PixelCanvas(W, H);
  // Montículo de tierra con hierba.
  p.shadedEllipse(bx, by - 14, 56, 18, [C.dirt[1], C.dirt[2], C.grass[1], C.grass[2], C.grass[3]]);
  // Frontal de hormigón.
  p.rect(bx - 40, by - 40, 80, 40, C.concrete[2]);
  p.rect(bx - 44, by - 46, 88, 8, C.concrete[3]);
  p.rect(bx - 44, by - 46, 88, 2, C.concrete[4]);
  p.rect(bx - 40, by - 4, 80, 4, C.concrete[1]);
  for (let k = 0; k < 14; k++) p.over(bx - 38 + ((k * 13) % 76), by - 36 + ((k * 7) % 30), C.concrete[k % 2 ? 1 : 3]);
  for (let k = 0; k < 8; k++) p.over(bx - 40 + ((k * 11) % 80), by - 40 + ((k * 5) % 6), C.moss[k % 3]);
  // Franjas de aviso amarillas y negras.
  for (let x = bx - 26; x < bx + 26; x++) for (let y = by - 36; y < by - 32; y++) p.set(x, y, ((x + y) >> 2) % 2 ? C.yellow[2] : rgb('#1a1a1a'));
  // Puerta de acero con remaches y volante.
  p.rect(bx - 20, by - 31, 40, 31, C.metal[1]);
  p.rect(bx - 20, by - 31, 40, 2, C.metal[3]);
  p.rect(bx - 1, by - 31, 2, 31, C.metal[0]);
  for (let y = by - 27; y < by; y += 6) for (const x of [bx - 17, bx - 4, bx + 3, bx + 16]) p.set(x, y, C.metal[4]);
  p.circle(bx + 8, by - 16, 4, C.metal[3]);
  p.circle(bx + 8, by - 16, 2, C.metal[1]);
  for (let k = 0; k < 12; k++) p.over(bx - 19 + ((k * 7) % 38), by - 29 + ((k * 5) % 28), C.rust[2 + (k % 2)]);
  // Luz roja apagada.
  p.rect(bx + 26, by - 30, 5, 4, C.red[0]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 84, h: 14 }, shadow: { rx: 54, ry: 8 }, opaque: true };
}

/** Manga de viento del helipuerto. */
export function windsock() {
  const p = new PixelCanvas(34, 50);
  const bx = 6;
  const by = 48;
  p.rect(5, 6, 2, 42, C.metal[2]); p.rect(5, 6, 1, 42, C.metal[4]);
  for (let k = 0; k < 4; k++) {
    const x = 8 + k * 6;
    const hh = 7 - k;
    p.rect(x, 7 + k, 6, hh, k % 2 ? C.white : rgb('#e8661e'));
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by, { sway: true })], col: { w: 4, h: 3 }, shadow: { rx: 5, ry: 2 } };
}

// ------------------------------------------------------------------ costa y acantilados

/** Barca de madera naufragada, medio volcada en la arena. */
export function boatWreck(seed) {
  const r = new RNG(seed);
  const W = 104;
  const H = 50;
  const bx = 52;
  const by = 46;
  const p = new PixelCanvas(W, H);
  // Casco: elipse alargada, con tablas.
  for (let x = 6; x < 98; x++) {
    const t = (x - 6) / 92;
    const half = Math.sin(t * Math.PI) * 18 * (t > 0.85 ? 1 - (t - 0.85) * 3 : 1);
    for (let y = -half; y <= half; y++) {
      const rel = y / (half || 1);
      let tone = rel < -0.4 ? 4 : rel > 0.5 ? 1 : 2;
      if (Math.round(y + 40) % 5 === 0) tone = Math.max(0, tone - 1);
      p.set(x, 28 + y * 0.6, C.wood[tone]);
    }
  }
  // Interior visible y costillas.
  for (let x = 16; x < 86; x++) {
    const t = (x - 6) / 92;
    const half = Math.sin(t * Math.PI) * 13;
    for (let y = -half * 0.45; y <= half * 0.15; y++) p.set(x, 25 + y, x % 9 === 0 ? C.wood[3] : C.wood[0]);
  }
  // Agujero roto.
  p.shadedEllipse(64, 34, 7, 3, [rgb('#0a0604'), rgb('#140c06'), rgb('#1e140a')]);
  p.line(58, 32, 70, 36, C.wood[4]);
  // Remo y franja pintada.
  p.line(20, 44, 50, 36, C.wood[3], 2);
  p.rect(48, 34, 6, 4, C.wood[2]);
  for (let x = 12; x < 92; x++) if (p.get(x, 36) >>> 24) p.set(x, 37, C.red[1]);
  for (let k = 0; k < 20; k++) p.over(r.int(10, 94), r.int(20, 40), C.moss[r.int(0, 1)]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 80, h: 12 }, shadow: { rx: 50, ry: 8 } };
}

/** Nido de ramitas con huevos (se pueden coger). */
export function nest(seed, eggs = true) {
  const r = new RNG(seed);
  const p = new PixelCanvas(24, 16);
  const bx = 12;
  const by = 13;
  p.ellipse(12, 9, 10, 5, C.wood[1]);
  for (let k = 0; k < 26; k++) {
    const a = r.range(0, Math.PI * 2);
    const x = 12 + Math.cos(a) * r.range(5, 10);
    const y = 9 + Math.sin(a) * r.range(2.5, 5);
    p.line(x, y, x + r.range(-3, 3), y + r.range(-1, 1), C.wood[r.int(1, 4)]);
  }
  p.ellipse(12, 8, 6, 2.5, C.wood[0]);
  if (eggs) for (const [x, y] of [[9, 7], [13, 6], [15, 8]]) { p.shadedEllipse(x, y, 2, 2.5, [rgb('#c8c0a8'), rgb('#e8e2d0'), rgb('#fffaf0')]); p.set(x, y + 1, rgb('#a89a80')); }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], shadow: { rx: 10, ry: 3 } };
}

/** Aguja de roca de los acantilados, con vetas y algo de verde. */
export function rockSpire(seed) {
  const r = new RNG(seed);
  const W = 44;
  const H = 80;
  const bx = 22;
  const by = 77;
  const p = new PixelCanvas(W, H);
  const hgt = r.int(50, 72);
  for (let y = by - hgt; y <= by; y++) {
    const f = (y - (by - hgt)) / hgt;
    const hw = 4 + f * 15 + Math.sin(y * 0.5) * 1.5;
    for (let x = -hw; x <= hw; x++) {
      const rel = x / hw;
      let tone = rel < -0.4 ? 4 : rel > 0.45 ? 1 : 2 + (rel < 0 ? 1 : 0);
      if (Math.round(y + x * 0.3) % 9 === 0) tone = Math.max(0, tone - 1);
      p.set(bx + x, y, C.stone[tone]);
    }
  }
  for (let k = 0; k < 18; k++) p.over(bx + r.int(-12, 12), r.int(by - hgt + 6, by - 6), C.moss[r.int(0, 2)]);
  // Excrementos blancos de aves en la punta.
  for (let k = 0; k < 6; k++) p.over(bx + r.int(-3, 3), by - hgt + r.int(0, 8), C.snow[4]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 26, h: 10 }, shadow: { rx: 18, ry: 5 }, opaque: true };
}

/** Matojo de hierba dura (costa ventosa y monte). */
export function grassTuft(seed, tones = C.grass) {
  const r = new RNG(seed);
  const p = new PixelCanvas(18, 16);
  const bx = 9;
  const by = 14;
  for (let k = 0; k < 10; k++) {
    const x0 = bx + r.range(-5, 5);
    const lean = r.range(-5, 5);
    const h = r.int(6, 12);
    for (let i = 0; i < h; i++) p.set(x0 + (lean * i) / h, by - i, tones[Math.min(tones.length - 1, 1 + Math.floor((i / h) * 3))]);
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, bx, by, { sway: true })], shadow: { rx: 6, ry: 2 } };
}

void mix;
