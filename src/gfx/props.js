// Generadores de sprites de props, pintados por código en pixel art con
// sombreado por tonos (cel-shading) y contorno oscuro de cómic, a la escala del
// mundo. Cada generador devuelve partes { canvas, dx, dy, canopy?, sway? } con
// (dx, dy) = posición de la esquina del sprite respecto a la base del prop.

import { RNG } from '../core/rng.js';
import { PixelCanvas, rgb, shade, mix } from './pixel.js';
import { C } from './palette.js';

const part = (pc, ax, ay, extra = {}) => ({ canvas: pc.toCanvas(), dx: -ax, dy: -ay, w: pc.w, h: pc.h, ...extra });

/** Hoja alargada (elipse orientada) con nervio central. */
function leafBlade(p, x0, y0, ang, len, wid, tones, vein) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  for (let t = 0; t <= len; t += 0.5) {
    const w = wid * Math.sin((t / len) * Math.PI) ;
    for (let s = -w; s <= w; s += 0.5) {
      const x = x0 + ca * t - sa * s;
      const y = y0 + sa * t + ca * s;
      const lit = s < 0 ? 2 : 1;
      p.set(x, y, tones[Math.min(tones.length - 1, lit + (t < len * 0.5 ? 1 : 0))]);
    }
  }
  if (vein) for (let t = 1; t < len - 1; t += 0.5) p.set(x0 + ca * t, y0 + sa * t, vein);
}

// ------------------------------------------------------------------ vegetación

export function palm(seed) {
  const r = new RNG(seed);
  const W = 72;
  const H = 92;
  const p = new PixelCanvas(W, H);
  const baseX = 36;
  const baseY = 88;
  const lean = r.range(-10, 10);
  const topX = baseX + lean;
  const topY = 30;
  // Tronco curvo con anillos.
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = baseX + lean * t * t;
    const y = baseY - (baseY - topY) * t;
    const w = 3.2 - t * 0.9;
    for (let s = -w; s <= w; s += 0.5) {
      const tone = s < -w * 0.3 ? 4 : s > w * 0.4 ? 1 : 3;
      const ring = Math.floor(y) % 4 === 0;
      p.set(x + s, y, ring ? C.wood[1] : C.wood[tone - (t > 0.8 ? 1 : 0)]);
    }
  }
  // Cocos.
  for (const [ox, oy] of [[-3, 2], [2, 3], [0, 5]]) p.shadedEllipse(Math.round(topX + ox), topY + oy, 2.5, 2.5, C.wood.slice(0, 4));
  // Hojas en estrella, colgando.
  const n = r.int(8, 10);
  const fronds = [];
  for (let k = 0; k < n; k++) fronds.push(((k + r.range(-0.2, 0.2)) / n) * Math.PI * 2);
  fronds.sort((a, b) => Math.sin(a) - Math.sin(b)); // las de atrás primero
  for (const a of fronds) {
    const len = r.range(22, 31);
    const back = Math.sin(a) < -0.3;
    const tones = back ? C.palmLeaf.slice(0, 3) : C.palmLeaf.slice(1);
    let px0 = topX;
    let py0 = topY;
    for (let t = 0; t <= len; t += 0.7) {
      const f = t / len;
      const x = topX + Math.cos(a) * t;
      const y = topY + Math.sin(a) * t * 0.62 + f * f * 12 - 3;
      const leaflet = (1 - f) * 7 + 1.5;
      const nx = -Math.sin(a);
      const ny = Math.cos(a) * 0.62;
      for (const side of [-1, 1]) {
        for (let s = 0; s < leaflet; s += 0.6) {
          const droop = s * 0.45;
          const tone = side < 0 ? tones[tones.length - 1] : tones[1];
          p.set(x + nx * s * side + Math.cos(a) * s * 0.3, y + ny * s * side + droop, s > leaflet - 1.5 ? tones[0] : tone);
        }
      }
      p.set(x, y, tones[0]);
      px0 = x;
      py0 = y;
    }
    void px0; void py0;
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, baseX, baseY, { canopyFrom: 50, sway: true })], col: { w: 10, h: 6 }, shadow: { rx: 22, ry: 7, oy: -2 } };
}

/** Copa de árbol: muchas matas pequeñas sombreadas (de atrás adelante) con huecos oscuros entre ellas. */
function canopy(p, cx, cy, rx, ry, r, tones, n = 46) {
  const clumps = [];
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2);
    const d = Math.sqrt(r.next());
    clumps.push({ x: cx + Math.cos(a) * rx * d * 0.82, y: cy + Math.sin(a) * ry * d * 0.78, rad: r.range(6, 10.5) });
  }
  clumps.sort((a, b) => a.y - b.y);
  // Base oscura que rellena huecos.
  p.ellipse(cx, cy + 2, rx * 0.85, ry * 0.8, tones[0]);
  for (const c of clumps) {
    const depth = (c.y - (cy - ry)) / (2 * ry); // 0 arriba … 1 abajo
    const set = depth > 0.72 ? tones.slice(0, 4) : depth > 0.4 ? tones.slice(1, 5) : tones.slice(1, 6);
    p.shadedEllipse(Math.round(c.x), Math.round(c.y), c.rad, c.rad * 0.8, set);
    // Hojas sueltas en el borde superior de cada mata.
    for (let k = 0; k < 4; k++) {
      const ang = Math.PI * 1.15 + r.range(0, Math.PI * 0.7);
      const lx = c.x + Math.cos(ang) * c.rad;
      const ly = c.y + Math.sin(ang) * c.rad * 0.8;
      p.set(lx, ly - 1, set[set.length - 2]);
      p.set(lx, ly, set[1]);
    }
  }
}

export function jungleTree(seed) {
  const r = new RNG(seed);
  const big = r.next() < 0.5;
  const W = big ? 112 : 92;
  const H = big ? 112 : 96;
  const baseX = W >> 1;
  const baseY = H - 4;
  const trunkTop = baseY - (big ? 40 : 34);
  const trunk = new PixelCanvas(W, H);
  for (let y = trunkTop; y <= baseY; y++) {
    const t = (y - trunkTop) / (baseY - trunkTop);
    const w = (big ? 6 : 4.5) + Math.max(0, t - 0.7) * (big ? 30 : 20) + Math.sin(y * 0.2) * 0.4;
    for (let x = -w; x <= w; x++) {
      const rel = x / w;
      let tone = rel < -0.4 ? 3 : rel > 0.45 ? 1 : 2;
      if (Math.abs(Math.sin(x * 0.9 + y * 0.12)) < 0.13) tone = 0; // vetas
      trunk.set(baseX + x, y, C.wood[tone]);
    }
  }
  for (let k = 0; k < 40; k++) trunk.over(baseX + r.int(-10, 10), r.int(trunkTop, baseY), C.moss[r.int(0, 2)]);
  trunk.outline(C.outline);
  const top = new PixelCanvas(W, H);
  const cy = trunkTop - (big ? 22 : 18);
  canopy(top, baseX, cy, big ? 50 : 40, big ? 30 : 24, r, r.next() < 0.3 ? C.oliveLeaf : C.jungleLeaf, big ? 60 : 44);
  // Lianas colgando de la copa.
  for (let k = 0; k < r.int(3, 6); k++) {
    const lx = baseX + r.int(-30, 30);
    let y0 = cy;
    while (y0 < H - 1 && top.get(lx, y0) >>> 24) y0++;
    const len = r.int(8, 26);
    for (let i = 0; i < len; i++) {
      const x = lx + Math.round(Math.sin(i * 0.4 + k) * 1);
      top.set(x, y0 + i - 2, C.jungleLeaf[1]);
      if (i % 4 === 2) { top.set(x + 1, y0 + i - 2, C.jungleLeaf[4]); top.set(x - 1, y0 + i - 1, C.jungleLeaf[3]); }
    }
  }
  top.outline(C.outlineGreen);
  return {
    parts: [part(trunk, baseX, baseY), part(top, baseX, baseY, { canopy: true, sway: true })],
    col: { w: big ? 16 : 12, h: 8 },
    shadow: { rx: big ? 44 : 36, ry: big ? 14 : 11, oy: -3 },
    opaque: true,
  };
}

export function fern(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(40, 28);
  const bx = 20;
  const by = 26;
  const n = r.int(6, 8);
  for (let k = 0; k < n; k++) {
    const a = Math.PI + (k / (n - 1)) * Math.PI + r.range(-0.15, 0.15);
    const len = r.range(12, 18);
    const tones = C.jungleLeaf.slice(1 + (k % 2));
    for (let t = 0; t <= len; t += 0.6) {
      const f = t / len;
      const x = bx + Math.cos(a) * t;
      const y = by + Math.sin(a) * t * 0.8 + f * f * 6;
      const lf = (1 - f) * 4 + 1;
      for (let s = 0; s < lf; s += 0.7) {
        p.set(x - Math.sin(a) * s, y + Math.cos(a) * s * 0.6 - s * 0.3, tones[2] || tones[1]);
        p.set(x + Math.sin(a) * s, y - Math.cos(a) * s * 0.6 - s * 0.3, tones[1]);
      }
      p.set(x, y, tones[0]);
    }
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, bx, by, { sway: true })], solid: false, shadow: { rx: 12, ry: 4 } };
}

export function bigLeaves(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(48, 34);
  const bx = 24;
  const by = 32;
  const n = r.int(4, 6);
  for (let k = 0; k < n; k++) {
    const a = Math.PI * 1.1 + (k / (n - 1)) * Math.PI * 0.8 + r.range(-0.1, 0.1);
    const len = r.range(16, 24);
    // Tallo.
    p.line(bx, by, bx + Math.cos(a) * 6, by + Math.sin(a) * 6, C.jungleLeaf[1]);
    leafBlade(p, bx + Math.cos(a) * 5, by + Math.sin(a) * 5, a, len, r.range(5, 7), C.jungleLeaf.slice(1), C.jungleLeaf[1]);
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, bx, by, { sway: true })], solid: false, shadow: { rx: 14, ry: 4 } };
}

export function bromeliad(seed, flower = 'red') {
  const r = new RNG(seed);
  const p = new PixelCanvas(30, 24);
  const bx = 15;
  const by = 22;
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + (k / 8) * Math.PI + r.range(-0.1, 0.1);
    leafBlade(p, bx, by - 1, a, r.range(9, 13), 2.2, C.leaf.slice(2), null);
  }
  const fl = flower === 'red' ? C.red : C.purple;
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.45;
    p.line(bx, by - 4, bx + Math.cos(a) * 6, by - 4 + Math.sin(a) * 7, fl[2]);
    p.set(bx + Math.cos(a) * 6, by - 4 + Math.sin(a) * 7, fl[3]);
  }
  p.set(bx, by - 5, C.yellow[2]);
  p.outline(C.outlineGreen);
  return { parts: [part(p, bx, by, { sway: true })], solid: false, shadow: { rx: 9, ry: 3 } };
}

export function bush(seed, berries = false) {
  const r = new RNG(seed);
  const p = new PixelCanvas(36, 28);
  const bx = 18;
  const by = 25;
  const blobs = [[-7, -7, 7], [6, -8, 7], [0, -12, 8], [-9, -3, 5], [9, -3, 5], [0, -5, 7]];
  for (const [ox, oy, rad] of blobs) p.shadedEllipse(bx + ox + r.int(-1, 1), by + oy, rad, rad * 0.85, C.jungleLeaf.slice(1, 6));
  for (let k = 0; k < 14; k++) p.over(bx + r.int(-12, 6), by + r.int(-18, -6), C.jungleLeaf[5]);
  if (berries) {
    for (let k = 0; k < 9; k++) {
      const x = bx + r.int(-11, 11);
      const y = by + r.int(-16, -3);
      if (p.get(x, y) >>> 24) { p.set(x, y, C.red[2]); p.set(x, y + 1, C.red[0]); p.set(x - 1, y, C.red[3]); }
    }
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, bx, by, { sway: true })], col: { w: 22, h: 8 }, shadow: { rx: 15, ry: 5 } };
}

/** Mata de hierba alta del tamaño de un tile (con briznas que sobresalen por arriba). */
export function tallGrass(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(36, 44);
  for (let k = 0; k < 34; k++) {
    const x = r.range(2, 34);
    const y = r.range(16, 43);
    const h = r.range(9, 16);
    const bend = r.range(-4, 4);
    const tones = C.grass;
    for (let t = 0; t < h; t++) {
      const f = t / h;
      p.set(x + bend * f * f, y - t, f > 0.7 ? tones[4] : f > 0.35 ? tones[3] : tones[1]);
    }
  }
  p.outline(C.outlineGreen);
  return { parts: [part(p, 2, 44, { sway: true })], solid: false };
}

// ------------------------------------------------------------------ piedra

export function rock(seed, size = 1) {
  const r = new RNG(seed);
  const w = Math.round(26 * size);
  const h = Math.round(20 * size);
  const p = new PixelCanvas(w + 4, h + 4);
  const bx = (w + 4) >> 1;
  const by = h + 2;
  p.shadedEllipse(bx, by - h / 2, w / 2, h / 2, C.stone);
  p.shadedEllipse(bx + Math.round(w * 0.18), by - h / 2 + 2, w / 3.2, h / 3, C.stone.slice(0, 4));
  // Musgo por arriba.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w + 4; x++) {
      const rel = y / h;
      if (p.get(x, y) >>> 24 && rel < 0.45 && r.next() < 0.75 - rel * 1.2) p.set(x, y, C.moss[rel < 0.25 ? 2 : 1]);
    }
  }
  p.line(bx - 3, by - h / 2, bx + 2, by - h / 2 + 4, C.stone[0]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: w * 0.8, h: h * 0.45 }, shadow: { rx: w / 2 + 2, ry: 4 }, opaque: size > 1.2 };
}

export function log(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(54, 20);
  const bx = 27;
  const by = 18;
  for (let x = 6; x < 48; x++) {
    for (let y = 4; y < 17; y++) {
      const rel = (y - 4) / 13;
      let tone = rel < 0.3 ? 3 : rel > 0.75 ? 1 : 2;
      if ((x * 3 + y * 7) % 11 === 0) tone = 0;
      p.set(x, y, C.wood[tone]);
    }
  }
  p.shadedEllipse(48, 10, 4, 6, [C.wood[2], C.wood[3], C.wood[4]]);
  p.set(48, 10, C.wood[1]); p.set(49, 9, C.wood[1]);
  p.ellipse(6, 10, 3, 6, C.wood[1]);
  for (let k = 0; k < 40; k++) p.over(r.int(8, 44), r.int(4, 8), C.moss[r.int(0, 2)]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 42, h: 8 }, shadow: { rx: 24, ry: 4 } };
}

export function totem(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(22, 46);
  const bx = 11;
  const by = 44;
  for (let y = 4; y < 44; y++) {
    for (let x = 2; x < 20; x++) {
      const rel = (x - 2) / 18;
      p.set(x, y, C.stone[rel < 0.25 ? 4 : rel > 0.75 ? 1 : 2 + (y % 9 === 0 ? -1 : 0)]);
    }
  }
  for (const fy of [8, 24]) { // dos caras talladas
    p.rect(5, fy, 4, 3, C.stone[0]); p.rect(13, fy, 4, 3, C.stone[0]);
    p.set(6, fy + 1, C.red[2]); p.set(14, fy + 1, C.red[2]);
    p.rect(7, fy + 6, 8, 3, C.stone[0]); p.rect(8, fy + 7, 6, 1, C.stone[4]);
    p.rect(2, fy + 11, 18, 1, C.stone[0]);
  }
  p.rect(1, 2, 20, 3, C.stone[3]);
  for (let k = 0; k < 40; k++) p.over(r.int(2, 19), r.int(2, 18 + r.int(0, 20)), C.moss[r.int(0, 2)]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 18, h: 8 }, shadow: { rx: 11, ry: 3 }, opaque: true };
}

export function pillar(seed, broken = false) {
  const r = new RNG(seed);
  const h = broken ? r.int(22, 32) : 54;
  const p = new PixelCanvas(26, h + 6);
  const bx = 13;
  const by = h + 4;
  p.rect(2, by - 6, 22, 6, C.stone[2]); p.rect(2, by - 6, 22, 1, C.stone[4]);
  for (let y = 6; y < by - 6; y++) {
    for (let x = 5; x < 21; x++) {
      const rel = (x - 5) / 16;
      p.set(x, y, C.stone[rel < 0.25 ? 4 : rel > 0.7 ? 1 : 3]);
    }
    if (y % 10 === 0) p.rect(5, y, 16, 1, C.stone[0]);
  }
  if (broken) {
    for (let x = 5; x < 21; x++) for (let k = 0; k < r.int(0, 5); k++) p.set(x, 6 + k, 0);
  } else {
    p.rect(3, 2, 20, 5, C.stone[3]); p.rect(3, 2, 20, 1, C.stone[4]);
  }
  for (let k = 0; k < 50; k++) p.over(r.int(4, 21), r.int(4, by), C.moss[r.int(0, 2)]);
  for (let k = 0; k < 2; k++) { // lianas
    const lx = r.int(6, 19);
    for (let y = 6; y < 6 + r.int(8, 20); y++) p.over(lx + Math.round(Math.sin(y * 0.5)), y, C.jungleLeaf[2]);
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 20, h: 8 }, shadow: { rx: 12, ry: 3 }, opaque: true };
}

/** Tramo de muro en ruinas (horizontal), 32 px de ancho. */
export function ruinWall(seed, height = 2) {
  const r = new RNG(seed);
  const h = 10 + height * 9 + r.int(-4, 3);
  const p = new PixelCanvas(34, h + 6);
  const bx = 17;
  const by = h + 4;
  for (let row = 0; row < height + 1; row++) {
    const y0 = by - 4 - (row + 1) * 9;
    let x = (row % 2) * -6;
    while (x < 32) {
      const w = r.int(9, 14);
      const tone = r.int(1, 3);
      for (let yy = 0; yy < 9; yy++) {
        for (let xx = 0; xx < w; xx++) {
          let c = C.stone[tone + (yy < 2 ? 1 : 0)];
          if (yy === 8 || xx === w - 1) c = C.stone[0];
          p.set(1 + x + xx, y0 + yy, c);
        }
      }
      x += w;
    }
  }
  // Cara superior y musgo; borde roto.
  p.rect(1, by - 4 - (height + 1) * 9 - 4, 32, 4, C.stone[3]);
  for (let x = 1; x < 33; x++) for (let k = 0; k < r.int(0, 6); k++) p.set(x, by - 4 - (height + 1) * 9 - 4 + k, 0);
  for (let k = 0; k < 70; k++) {
    const x = r.int(1, 32);
    const y = r.int(0, by - 10);
    if (p.get(x, y) >>> 24) p.set(x, y, C.moss[r.int(0, 2)]);
  }
  p.rect(1, by - 4, 32, 4, C.stone[1]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 32, h: 10 }, shadow: { rx: 18, ry: 3 }, opaque: true };
}

/** Pequeño templo escalonado en ruinas, como el de la ilustración de referencia. */
export function temple(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(120, 104);
  const bx = 60;
  const by = 100;
  const tiers = [[112, 26], [92, 24], [70, 22], [46, 20]];
  let y = by;
  for (const [w, h] of tiers) {
    const x0 = bx - w / 2;
    // Cara frontal de bloques.
    for (let yy = y - h; yy < y; yy++) {
      for (let xx = x0; xx < x0 + w; xx++) {
        const row = Math.floor((yy - (y - h)) / 8);
        const bw = 12;
        const lx = (xx - x0 + (row % 2) * 6) % bw;
        let c = C.stone[2 + ((Math.floor((xx + row * 5) / bw) + row) % 2)];
        if ((yy - (y - h)) % 8 === 7 || lx === 0) c = C.stone[0];
        if ((yy - (y - h)) % 8 === 0) c = C.stone[4];
        p.set(xx, yy, c);
      }
    }
    y -= h - 4;
    p.rect(x0 + 2, y - 4, w - 4, 4, C.stone[3]); // repisa
  }
  // Escalera central y puerta oscura arriba.
  for (let k = 0; k < 18; k++) p.rect(bx - 10, by - k * 4 - 4, 20, 4, k % 2 ? C.stone[3] : C.stone[4]);
  p.rect(bx - 8, by - 96, 16, 14, C.black);
  p.rect(bx - 10, by - 98, 20, 3, C.stone[4]);
  // Musgo y lianas.
  for (let k = 0; k < 600; k++) {
    const x = r.int(0, 119);
    const yy = r.int(0, 100);
    if (p.get(x, yy) >>> 24 && r.next() < 0.6 - yy / 220) p.set(x, yy, C.moss[r.int(0, 2)]);
  }
  for (let k = 0; k < 8; k++) {
    const lx = r.int(8, 112);
    const y0 = r.int(20, 60);
    for (let i = 0; i < r.int(10, 30); i++) p.over(lx + Math.round(Math.sin(i * 0.4)), y0 + i, C.jungleLeaf[2]);
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 112, h: 30 }, shadow: { rx: 60, ry: 8 }, opaque: true };
}

// ------------------------------------------------------------------ objetos de madera

export function crate(seed, size = 1) {
  const s = Math.round(20 * size);
  const p = new PixelCanvas(s + 4, s + 8);
  const bx = (s + 4) >> 1;
  const by = s + 6;
  const top = 6;
  p.rect(2, 2, s, top, C.wood[4]);
  for (let x = 2; x < s + 2; x += 5) p.rect(x, 2, 1, top, C.wood[3]);
  p.rect(2, 2 + top, s, s - top + 2, C.wood[2]);
  // Marco y cruz.
  p.rect(2, 2 + top, s, 2, C.wood[3]); p.rect(2, s + 2, s, 2, C.wood[1]);
  p.rect(2, 2 + top, 2, s - top + 2, C.wood[3]); p.rect(s, 2 + top, 2, s - top + 2, C.wood[1]);
  p.line(4, 4 + top, s - 1, s + 1, C.wood[1], 2);
  p.line(s - 1, 4 + top, 4, s + 1, C.wood[3], 1);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: s, h: 8 }, shadow: { rx: s / 2 + 2, ry: 3 } };
}

export function barrel(seed) {
  const p = new PixelCanvas(20, 26);
  const bx = 10;
  const by = 24;
  for (let y = 5; y < 23; y++) {
    const bulge = Math.round(Math.sin(((y - 5) / 18) * Math.PI) * 1.5);
    for (let x = 2 - bulge; x < 18 + bulge; x++) {
      const rel = (x - 2) / 16;
      let c = C.wood[rel < 0.25 ? 4 : rel > 0.7 ? 1 : 2];
      if ((x - 2) % 4 === 0) c = C.wood[1];
      if (y === 8 || y === 18) c = C.metal[rel < 0.3 ? 3 : 1];
      p.set(x, y, c);
    }
  }
  p.ellipse(10, 5, 8, 3, C.wood[3]);
  p.ellipse(10, 5, 6, 2, C.wood[4]);
  p.set(10, 5, C.wood[1]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 14, h: 7 }, shadow: { rx: 9, ry: 3 } };
}

export function chest(seed, open = false) {
  const p = new PixelCanvas(26, 22);
  const bx = 13;
  const by = 20;
  // Cuerpo.
  p.rect(2, 9, 22, 11, C.wood[2]);
  p.rect(2, 9, 22, 2, C.wood[3]);
  p.rect(2, 18, 22, 2, C.wood[1]);
  for (const x of [5, 19]) p.rect(x, 9, 2, 11, C.metal[2]);
  if (open) {
    p.rect(3, 9, 20, 4, rgb('#1a120a'));
    p.rect(2, 1, 22, 8, C.wood[1]);
    p.rect(3, 2, 20, 6, C.wood[2]);
    p.set(12, 10, C.yellow[2]); p.set(14, 11, C.yellow[1]);
  } else {
    p.rect(2, 4, 22, 6, C.wood[3]);
    p.rect(2, 4, 22, 2, C.wood[4]);
    for (const x of [5, 19]) p.rect(x, 4, 2, 6, C.metal[3]);
    p.rect(11, 8, 4, 4, C.yellow[1]); p.set(12, 9, C.yellow[2]); p.set(13, 10, C.black);
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 20, h: 7 }, shadow: { rx: 13, ry: 3 } };
}

export function sign(seed, kind = 'arrow') {
  const p = new PixelCanvas(30, 36);
  const bx = 15;
  const by = 34;
  p.rect(13, 14, 4, 20, C.wood[2]); p.rect(13, 14, 1, 20, C.wood[3]);
  p.rect(2, 3, 26, 13, C.wood[3]);
  p.rect(2, 3, 26, 2, C.wood[4]); p.rect(2, 14, 26, 2, C.wood[1]);
  for (const x of [9, 17]) p.rect(x, 5, 1, 9, C.wood[2]);
  if (kind === 'arrow') {
    p.rect(6, 8, 13, 3, C.white);
    p.poly([[18, 5], [24, 9.5], [18, 14]], C.white);
  } else {
    p.circle(15, 8, 3, C.white);
    p.rect(13, 11, 5, 2, C.white);
    p.set(14, 8, C.black); p.set(16, 8, C.black);
    p.line(8, 5, 22, 14, C.white); p.line(22, 5, 8, 14, C.white);
    p.circle(15, 8, 3, C.white); p.set(14, 8, C.black); p.set(16, 8, C.black);
  }
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 6, h: 4 }, shadow: { rx: 8, ry: 2 } };
}

/** Tramo de valla: 'h' (horizontal, 32 px) o 'v' (vertical, 32 px). */
export function fence(seed, dir = 'h') {
  const r = new RNG(seed);
  if (dir === 'h') {
    const p = new PixelCanvas(36, 26);
    for (const x of [2, 18]) { p.rect(x, 4, 4, 20, C.wood[2]); p.rect(x, 4, 1, 20, C.wood[4]); p.rect(x, 3, 4, 2, C.wood[1]); }
    for (const y of [9, 16]) { p.rect(0, y, 36, 3, C.wood[3]); p.rect(0, y + 2, 36, 1, C.wood[1]); }
    p.outline(C.outline);
    return { parts: [part(p, 18, 24)], col: { w: 32, h: 6 }, shadow: { rx: 18, ry: 2 } };
  }
  const p = new PixelCanvas(10, 52);
  for (const y of [22, 50]) { p.rect(3, y - 20, 4, 20, C.wood[2]); p.rect(3, y - 20, 1, 20, C.wood[4]); }
  p.rect(4, 6, 2, 44, C.wood[3]);
  p.outline(C.outline);
  void r;
  return { parts: [part(p, 5, 50)], col: { w: 6, h: 32 }, shadow: { rx: 4, ry: 2 } };
}

/** Choza/tienda de la tribu: pieles sobre palos. */
export function tent(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(70, 62);
  const bx = 35;
  const by = 60;
  const hide = ['#4a2e18', '#6e4a2a', '#8e6a40', '#b08a58'].map((c) => rgb(c));
  p.poly([[4, 58], [35, 8], [66, 58]], hide[2]);
  p.poly([[35, 8], [66, 58], [44, 58]], hide[1]);
  p.poly([[4, 58], [35, 8], [20, 58]], hide[3]);
  // Parches y costuras.
  for (let k = 0; k < 6; k++) {
    const x = r.int(14, 54);
    const y = r.int(26, 52);
    if (p.get(x, y) >>> 24) p.rect(x, y, r.int(4, 8), r.int(3, 6), hide[r.int(0, 3)]);
  }
  for (let y = 14; y < 58; y += 3) p.set(35 + (y - 8) * 0.18, y, hide[0]);
  // Entrada.
  p.poly([[27, 58], [35, 30], [43, 58]], rgb('#140c06'));
  p.line(35, 30, 27, 58, hide[0]);
  // Palos que sobresalen arriba.
  p.line(35, 10, 29, 1, C.wood[2], 2); p.line(35, 10, 41, 1, C.wood[3], 2); p.line(35, 10, 35, 0, C.wood[1], 1);
  // Plumas rojas.
  p.rect(28, 2, 2, 3, C.red[2]); p.rect(41, 2, 2, 3, C.yellow[2]);
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 56, h: 14 }, shadow: { rx: 34, ry: 6 }, opaque: true };
}

/** Anillo de piedras y leños de la hoguera (las llamas se animan aparte). */
export function campfireBase() {
  const p = new PixelCanvas(30, 18);
  const bx = 15;
  const by = 14;
  p.line(5, 12, 25, 6, C.wood[1], 3);
  p.line(5, 6, 25, 12, C.wood[2], 3);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    p.shadedEllipse(Math.round(15 + Math.cos(a) * 12), Math.round(9 + Math.sin(a) * 6), 3, 2, C.stone.slice(1));
  }
  p.ellipse(15, 9, 5, 2, rgb('#2a1a10'));
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 24, h: 8 }, shadow: { rx: 14, ry: 3 } };
}

export function torchPole() {
  const p = new PixelCanvas(10, 40);
  p.rect(4, 8, 3, 32, C.wood[2]); p.rect(4, 8, 1, 32, C.wood[4]);
  p.rect(2, 5, 7, 5, C.wood[1]); p.rect(3, 5, 5, 2, rgb('#3a2a1a'));
  p.outline(C.outline);
  return { parts: [part(p, 5, 39)], col: { w: 6, h: 4 }, shadow: { rx: 5, ry: 2 } };
}

/** Fotogramas de llama (para hoguera y antorchas). */
export function flameFrames(size = 1) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const r = new RNG(900 + f);
    const w = Math.round(14 * size);
    const h = Math.round(20 * size);
    const p = new PixelCanvas(w, h);
    const cols = [rgb('#8a1a0a'), rgb('#e04a14'), rgb('#ff9a1e'), rgb('#ffe066'), rgb('#fff8d0')];
    for (let layer = 0; layer < 5; layer++) {
      const lw = (w / 2) * (1 - layer * 0.18);
      const lh = h * (1 - layer * 0.16);
      for (let y = 0; y < lh; y++) {
        const f2 = y / lh;
        const half = lw * Math.sin(Math.PI * Math.pow(1 - f2, 0.7)) * (0.85 + r.next() * 0.3);
        const cx = w / 2 + Math.sin(f2 * 5 + f * 1.7) * 1.4 * f2;
        for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) p.set(x, h - 1 - y, cols[layer]);
      }
    }
    frames.push(p.toCanvas());
  }
  return frames;
}

/** Postes de madera con cuerda en los extremos del puente. */
export function bridgePost() {
  const p = new PixelCanvas(10, 26);
  p.rect(3, 4, 5, 22, C.wood[2]); p.rect(3, 4, 1, 22, C.wood[4]); p.rect(3, 3, 5, 2, C.wood[1]);
  p.rect(2, 8, 7, 2, C.rope[1]);
  p.outline(C.outline);
  return { parts: [part(p, 5, 25)], col: { w: 7, h: 5 }, shadow: { rx: 5, ry: 2 } };
}

// ------------------------------------------------------------------ restos del avión

/** Texto en pixel art 3 × 5 (solo los caracteres que hacen falta). */
const FONT = {
  A: ['010', '101', '111', '101', '101'], '-': ['000', '000', '111', '000', '000'],
  0: ['111', '101', '101', '101', '111'], 7: ['111', '001', '010', '010', '010'],
};
function text(p, str, x, y, c) {
  for (const ch of str) {
    const g = FONT[ch];
    if (g) g.forEach((row, j) => [...row].forEach((v, i) => v === '1' && p.set(x + i, y + j, c)));
    x += 4;
  }
}

export function planeWreck(seed) {
  const r = new RNG(seed);
  const p = new PixelCanvas(132, 70);
  const bx = 66;
  const by = 64;
  // Fuselaje (cilindro inclinado) con camuflaje.
  const body = (x, y) => {
    const t = (x - 10) / 104;
    const cy = 38 - t * 8;
    const rad = 13 - Math.abs(t - 0.45) * 9;
    return Math.abs(y - cy) <= rad ? (y - cy) / rad : null;
  };
  for (let x = 10; x < 114; x++) {
    for (let y = 10; y < 60; y++) {
      const v = body(x, y);
      if (v === null) continue;
      const camoN = Math.sin(x * 0.21 + Math.sin(y * 0.3) * 2) + Math.sin(y * 0.33 - x * 0.07);
      let tone = camoN > 0.9 ? 0 : camoN > -0.2 ? 2 : 3;
      if (v < -0.55) tone = Math.min(3, tone + 1);
      if (v > 0.6) tone = Math.max(0, tone - 1);
      p.set(x, y, C.camo[tone]);
    }
  }
  // Cabina rota.
  for (let x = 82; x < 100; x++) for (let y = 22; y < 32; y++) if (body(x, y) !== null && body(x, y) < -0.1) p.set(x, y, (x + y) % 7 ? rgb('#2a5a6e') : rgb('#bfe8f0'));
  p.line(86, 24, 92, 30, rgb('#e8f8ff')); p.line(92, 24, 88, 29, rgb('#e8f8ff'));
  // Morro con hélice doblada.
  p.shadedEllipse(114, 30, 5, 7, C.metal);
  p.line(116, 30, 126, 18, C.metal[2], 2); p.line(116, 30, 122, 44, C.metal[1], 2);
  // Ala rota pegada al fuselaje.
  p.poly([[44, 44], [80, 40], [70, 64], [30, 66]], C.camo[2]);
  p.poly([[44, 44], [80, 40], [78, 44], [42, 48]], C.camo[3]);
  p.line(48, 52, 64, 50, C.camo[0]);
  // Cola rota.
  p.poly([[10, 30], [2, 14], [14, 14], [20, 30]], C.camo[1]);
  // Matrícula A-07.
  text(p, 'A-07', 56, 30, rgb('#f0f0e0'));
  // Agujeros y abolladuras.
  for (let k = 0; k < 6; k++) p.over(r.int(20, 100), r.int(28, 48), rgb('#141810'));
  p.outline(C.outline);
  return { parts: [part(p, bx, by)], col: { w: 96, h: 16 }, shadow: { rx: 60, ry: 10 }, opaque: true };
}

export function suitcase() {
  const p = new PixelCanvas(20, 16);
  p.rect(2, 4, 16, 10, rgb('#6a3a22')); p.rect(2, 4, 16, 2, rgb('#8a5232'));
  p.rect(7, 1, 6, 3, C.outline); p.rect(8, 2, 4, 1, rgb('#6a3a22'));
  p.rect(2, 9, 16, 1, rgb('#3a2012'));
  p.outline(C.outline);
  return { parts: [part(p, 10, 14)], col: { w: 14, h: 5 }, shadow: { rx: 9, ry: 2 } };
}

export function skullPole() {
  const p = new PixelCanvas(14, 40);
  p.rect(6, 12, 3, 28, C.wood[2]);
  p.circle(7, 7, 5, rgb('#e8e0c8'));
  p.rect(5, 10, 5, 3, rgb('#e8e0c8'));
  p.rect(4, 6, 2, 2, C.black); p.rect(9, 6, 2, 2, C.black);
  p.set(7, 9, C.black); p.rect(5, 12, 1, 1, C.black); p.rect(9, 12, 1, 1, C.black);
  p.rect(9, 14, 2, 5, C.red[2]); p.rect(3, 15, 2, 4, C.yellow[2]);
  p.outline(C.outline);
  return { parts: [part(p, 7, 39)], col: { w: 5, h: 4 }, shadow: { rx: 5, ry: 2 } };
}

export { shade, mix };

/** Estaca de empalizada (las del campamento). */
export function stake(seed) {
  const r = new RNG(seed);
  const h = r.int(22, 28);
  const p = new PixelCanvas(10, h + 3);
  p.rect(2, 5, 6, h - 4, C.wood[2]); p.rect(2, 5, 2, h - 4, C.wood[4]); p.rect(7, 5, 1, h - 4, C.wood[1]);
  p.poly([[2, 6], [5, 0], [8, 6]], C.wood[3]);
  p.rect(1, 12, 8, 2, C.rope[1]);
  p.outline(C.outline);
  return { parts: [part(p, 5, h + 1)], col: { w: 7, h: 5 }, shadow: { rx: 5, ry: 2 } };
}
