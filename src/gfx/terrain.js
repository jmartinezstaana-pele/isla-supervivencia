// Suelo de la isla pintado por código en pixel art. Con la isla completa
// (200 × 160 tiles, unos 33 millones de píxeles) ya no cabe prerenderizarlo
// entero: se pinta por trozos de 128 × 128 px bajo demanda (TerrainCache), con
// coordenadas globales para que los trozos encajen sin costuras.
// Bordes orgánicos entre suelos, contorno oscuro de cómic, arena mojada junto al
// agua, losas, puentes, paredes de acantilado con bloques, musgo, nieve y lianas.

import { TILE } from '../config.js';
import { fbm, hash2 } from '../core/rng.js';
import { PixelCanvas, bayer, mix, shade, rgb } from './pixel.js';
import { C } from './palette.js';
import { G } from '../world/tiles.js';

export const CHUNK = 128;
const MARGIN = 32;

const SOFT = new Uint8Array(32);
for (const g of [G.JUNGLE, G.GRASS, G.SAND, G.DIRT, G.SHALLOW, G.DEEP, G.RIVER, G.TALL_GRASS, G.SNOW, G.ROCK, G.MUD, G.SWAMP, G.GRAVEL, G.NEEDLES, G.CHASM, G.CAVE]) SOFT[g] = 1;
const WATER = new Uint8Array(32);
for (const g of [G.SHALLOW, G.DEEP, G.RIVER, G.WATERFALL, G.SWAMP]) WATER[g] = 1;
// Prioridad de borde: el suelo de mayor prioridad dibuja el contorno sobre el de menor.
const PRIORITY = new Int8Array(32).fill(-1);
Object.entries({
  [G.JUNGLE]: 5, [G.TALL_GRASS]: 5, [G.GRASS]: 5, [G.NEEDLES]: 5, [G.SNOW]: 6, [G.ROCK]: 4, [G.DIRT]: 3, [G.GRAVEL]: 3,
  [G.MUD]: 2, [G.SAND]: 2, [G.SHALLOW]: 0, [G.DEEP]: 0, [G.RIVER]: 0, [G.SWAMP]: 0, [G.STONE]: 4, [G.CONCRETE]: 4, [G.BRIDGE]: 7, [G.CHASM]: 1, [G.CAVE]: 3,
}).forEach(([k, v]) => { PRIORITY[k] = v; });
const VEG = new Uint8Array(32);
for (const g of [G.JUNGLE, G.GRASS, G.TALL_GRASS, G.NEEDLES]) VEG[g] = 1;

const SEA_BANDS = ['#7fdcd0', '#55c3c6', '#36a5b6', '#2a88a6', '#226e96', '#1d5a86', '#184a74'].map((c) => rgb(c));
const RIVER_BANDS = ['#6fd0c8', '#45adb8', '#2f8ea4', '#277892'].map((c) => rgb(c));
const SWAMP_BANDS = ['#5e8a6a', '#4a7a60', '#3d6a55', '#335c4a'].map((c) => rgb(c));
const SEA_STEPS = [3, 8, 15, 24, 34, 46];
const RIVER_STEPS = [2, 5, 9];
function waterBand(g, d) {
  const steps = g === G.DEEP || g === G.SHALLOW ? SEA_STEPS : RIVER_STEPS;
  const bands = g === G.RIVER ? RIVER_BANDS : g === G.SWAMP ? SWAMP_BANDS : SEA_BANDS;
  let k = 0;
  while (k < steps.length && d > steps[k]) k++;
  return bands[Math.min(k, bands.length - 1)];
}

/** Orilla de barro entre la vegetación y el agua. */
function bank(c, d, x, y) {
  if (d <= 1) return C.outline;
  if (d <= 3) return bayer(x, y) < 0.5 ? C.dirt[0] : C.dirt[1];
  if (d === 4) return bayer(x, y) < 0.5 ? C.dirt[0] : c;
  if (d === 5 && bayer(x, y) < 0.3) return C.outlineGreen;
  return c;
}

const COS = Float32Array.from({ length: 32 }, (_, t) => Math.cos(t * 1.7));
const SIN = Float32Array.from({ length: 32 }, (_, t) => Math.sin(t * 1.7));

const pick = (tones, t) => tones[Math.max(0, Math.min(tones.length - 1, Math.floor(t * tones.length)))];

/** Campo de ruido en coordenadas globales, muestreado cada `step` px e interpolado. */
function noiseField(rx, ry, w, h, step, scale, seed, octaves = 3) {
  const bx = Math.floor(rx / step);
  const by = Math.floor(ry / step);
  const gw = Math.ceil(w / step) + 3;
  const gh = Math.ceil(h / step) + 3;
  const grid = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grid[j * gw + i] = fbm(((bx + i) * step) / scale, ((by + j) * step) / scale, seed, octaves);
  return (x, y) => {
    const fx = x / step - bx;
    const fy = y / step - by;
    const i = fx | 0;
    const j = fy | 0;
    const u = fx - i;
    const v = fy - j;
    const k = j * gw + i;
    const a = grid[k];
    const b = grid[k + 1];
    const c = grid[k + gw];
    const d = grid[k + gw + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/** Transformada de distancia (chaflán 3-4) desde los píxeles con mask=1, limitada a `max` px. */
function distanceTransform(mask, w, h, max) {
  const INF = 255 * 3;
  const d = new Uint16Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? 0 : INF;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3);
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4);
      }
      d[i] = v;
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.min(max, Math.round(d[i] / 3));
  return out;
}

/** Distancia (px) de cada tile a la tierra más cercana, para la profundidad del mar lejos de la costa. */
export function coarseLandDistance(map) {
  const W = map.width;
  const H = map.height;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = WATER[map.ground[i]] ? 0 : 1;
  const d = distanceTransform(mask, W, H, 85);
  return { W, H, d };
}

/** Lienzo de píxeles con origen desplazado: se dibuja en coordenadas globales. */
class RegionCanvas extends PixelCanvas {
  constructor(ox, oy, w, h) {
    super(w, h);
    this.ox = ox;
    this.oy = oy;
  }

  set(x, y, c) { super.set(x - this.ox, y - this.oy, c); }
  get(x, y) { return super.get(x - this.ox, y - this.oy); }
}

/**
 * Pinta la región [rx, rx + rw) × [ry, ry + rh) del suelo (en px de mundo).
 * Devuelve el lienzo y, por píxel, el tipo de suelo, el agua y la distancia a tierra.
 */
export function renderRegion(map, rx, ry, rw, rh, coarse) {
  const pc = new RegionCanvas(rx, ry, rw, rh);
  const px = pc.data;
  const N = rw * rh;
  const type = new Uint8Array(N);
  const lvl = new Uint8Array(N);
  const MW = map.width;
  const MH = map.height;
  const outside = map.outside ?? G.DEEP; // fuera del mapa: mar en la isla, roca o negro en los interiores
  const gAt = (tx, ty) => (tx >= 0 && ty >= 0 && tx < MW && ty < MH ? map.ground[ty * MW + tx] : outside);
  // Ventana de tiles de la región (con un tile de margen): evita comprobar límites por píxel.
  const wx0 = Math.floor(rx / TILE) - 1;
  const wy0 = Math.floor(ry / TILE) - 1;
  const ww = Math.ceil((rx + rw) / TILE) - wx0 + 2;
  const wh = Math.ceil((ry + rh) / TILE) - wy0 + 2;
  const tg = new Uint8Array(ww * wh);
  const tl = new Uint8Array(ww * wh);
  for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { tg[j * ww + i] = gAt(wx0 + i, wy0 + j); const tx = wx0 + i; const ty = wy0 + j; tl[j * ww + i] = tx >= 0 && ty >= 0 && tx < MW && ty < MH ? map.level[ty * MW + tx] : 0; }

  const warpX = noiseField(rx, ry, rw, rh, 4, 46, 101);
  const warpY = noiseField(rx, ry, rw, rh, 4, 46, 202);
  const low = noiseField(rx, ry, rw, rh, 4, 90, 303);
  const mid = noiseField(rx, ry, rw, rh, 4, 18, 404, 2);

  // 1) Tipo de suelo por píxel: entre suelos blandos del mismo nivel se interpola
  //    la pertenencia a cada tipo y se le suma ruido (bordes orgánicos).
  const types = new Uint8Array(4);
  const scores = new Float32Array(4);
  for (let y = 0; y < rh; y++) {
    const gy = ry + y;
    const fy = gy / TILE - 0.5;
    const ty0 = Math.floor(fy);
    const v = fy - ty0;
    const rowC = (Math.floor(gy / TILE) - wy0) * ww - wx0;
    const row0 = (ty0 - wy0) * ww - wx0;
    for (let x = 0; x < rw; x++) {
      const gx = rx + x;
      const ci = rowC + Math.floor(gx / TILE);
      const g0 = tg[ci];
      const l0 = tl[ci];
      let g = g0;
      if (SOFT[g0]) {
        const fx = gx / TILE - 0.5;
        const tx0 = Math.floor(fx);
        const u = fx - tx0;
        const base = row0 + tx0;
        const seaC = g0 === G.DEEP || g0 === G.SHALLOW;
        let n = 0;
        for (let k = 0; k < 4; k++) {
          const j = base + (k & 1) + (k >> 1) * ww;
          const gk = tg[j];
          // Entre niveles distintos solo se mezcla la tierra con el mar (costas altas orgánicas).
          if (!SOFT[gk] || (tl[j] !== l0 && !(seaC || gk === G.DEEP || gk === G.SHALLOW))) continue;
          const wgt = (k & 1 ? u : 1 - u) * (k >> 1 ? v : 1 - v);
          let q = 0;
          while (q < n && types[q] !== gk) q++;
          if (q === n) { types[n] = gk; scores[n] = 0; n++; }
          scores[q] += wgt;
        }
        if (n > 1) {
          const wx = warpX(gx, gy) - 0.5;
          const wy = warpY(gx, gy) - 0.5;
          const m = mid(gx, gy) - 0.5;
          let best = g0;
          let bestS = -Infinity;
          for (let q = 0; q < n; q++) {
            const t = types[q];
            // Cada tipo combina los ruidos de forma distinta: bordes propios.
            const nn = (wx * COS[t] + wy * SIN[t]) * 1.2 + m * 0.6 + (hash2(gx >> 1, gy >> 1, t) - 0.5) * 0.06;
            const sc = scores[q] + nn * (t === G.RIVER ? 0.4 : 1);
            if (sc > bestS) { bestS = sc; best = t; }
          }
          g = best;
        }
      }
      type[y * rw + x] = g;
      lvl[y * rw + x] = l0;
    }
  }

  // 2) Distancias agua ↔ tierra.
  const waterMask = new Uint8Array(N);
  const landMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const w = WATER[type[i]] && type[i] !== G.WATERFALL;
    waterMask[i] = w ? 1 : 0;
    landMask[i] = w || type[i] === G.WATERFALL ? 0 : 1;
  }
  let anyWater = false;
  for (let i = 0; i < N; i++) if (waterMask[i]) { anyWater = true; break; }
  // Tierra adentro (lo más común) no hace falta calcular distancias al agua.
  const distToWater = anyWater ? distanceTransform(waterMask, rw, rh, 12) : new Uint8Array(N).fill(12);
  const distToLand = anyWater ? distanceTransform(landMask, rw, rh, 60) : new Uint8Array(N);
  // Lejos de la costa (más allá del margen) manda la distancia aproximada por tiles.
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      if (distToLand[i] < MARGIN - 4) continue;
      // Interpolación bilineal entre centros de tile (sin escalones).
      const fx = Math.min(coarse.W - 1.001, Math.max(0, (rx + x) / TILE - 0.5));
      const fy = Math.min(coarse.H - 1.001, Math.max(0, (ry + y) / TILE - 0.5));
      const ix = fx | 0;
      const iy = fy | 0;
      const u = fx - ix;
      const v = fy - iy;
      const k = iy * coarse.W + ix;
      const d = coarse.d;
      const cv = d[k] * (1 - u) * (1 - v) + d[k + 1] * u * (1 - v) + d[k + coarse.W] * (1 - u) * v + d[k + coarse.W + 1] * u * v;
      const cd = Math.max(0, cv * TILE - 16);
      distToLand[i] = Math.min(60, Math.max(distToLand[i], cd));
    }
  }

  // 3) Color base.
  for (let y = 0; y < rh; y++) {
    const gy = ry + y;
    for (let x = 0; x < rw; x++) {
      const gx = rx + x;
      const i = y * rw + x;
      const g = type[i];
      const hpx = hash2(gx, gy, 7);
      const b = bayer(gx, gy);
      const n = low(gx, gy);
      const m = mid(gx, gy);
      let c;
      switch (g) {
        case G.JUNGLE:
        case G.TALL_GRASS: {
          const t = n * 0.75 + m * 0.45 + (b - 0.5) * 0.35 + (hpx - 0.5) * 0.15 - 0.15 + lvl[i] * 0.06;
          c = bank(pick(g === G.TALL_GRASS ? C.grass : C.jungleFloor, t), distToWater[i], gx, gy);
          break;
        }
        case G.GRASS: {
          const t = n * 0.6 + m * 0.5 + (b - 0.5) * 0.35 + (hpx - 0.5) * 0.15 - 0.05;
          c = bank(pick(C.grass, t), distToWater[i], gx, gy);
          break;
        }
        case G.NEEDLES: {
          const t = n * 0.55 + m * 0.55 + (b - 0.5) * 0.4 + (hpx - 0.5) * 0.2 - 0.05;
          c = bank(pick(C.needles, t), distToWater[i], gx, gy);
          break;
        }
        case G.SNOW: {
          // Nieve con ondulaciones de viento y sombras azuladas.
          const drift = Math.sin(gy * 0.21 + gx * 0.05 + m * 7) > 0.8 ? -0.18 : 0;
          const t = 0.45 + n * 0.4 + (b - 0.5) * 0.25 + drift + (hpx - 0.5) * 0.08;
          c = pick(C.snow, t);
          if (hpx > 0.995) c = C.white;
          break;
        }
        case G.ROCK: {
          const t = 0.3 + n * 0.45 + m * 0.3 + (b - 0.5) * 0.3 + (hpx - 0.5) * 0.15;
          c = pick(C.stone, t);
          if (Math.abs(Math.sin(gx * 0.09 + m * 9) + Math.sin(gy * 0.13 - n * 6)) < 0.05) c = C.stone[0]; // grietas
          break;
        }
        case G.MUD: {
          const t = n * 0.5 + m * 0.6 + (b - 0.5) * 0.4 + (hpx - 0.5) * 0.15 - 0.05;
          c = pick(C.mud, t);
          if (m > 0.62 && b < 0.3) c = mix(c, rgb('#6a7a6a'), 0.35); // brillo húmedo
          break;
        }
        case G.GRAVEL: {
          const t = 0.35 + n * 0.3 + (b - 0.5) * 0.3 + (hpx - 0.5) * 0.6;
          c = pick(C.gravel, t);
          break;
        }
        case G.CONCRETE: {
          const lx = ((gx % 32) + 32) % 32;
          const ly = ((gy % 32) + 32) % 32;
          const slab = hash2(gx >> 5, gy >> 5, 12);
          c = pick(C.concrete, 0.45 + slab * 0.3 + (b - 0.5) * 0.15 + (hpx - 0.5) * 0.1);
          if (lx === 0 || ly === 0) c = C.concrete[0];
          else if (lx === 1 || ly === 1) c = C.concrete[4];
          if (hash2(gx >> 2, gy >> 2, 14) < 0.04) c = C.concrete[1]; // manchas
          if (n > 0.66 && b < 0.35) c = C.moss[0];
          break;
        }
        case G.SAND: {
          const ripple = Math.sin(gy * 0.55 + gx * 0.12 + m * 9) > 0.86 ? 0.25 : 0;
          const t = 0.35 + n * 0.35 + (b - 0.5) * 0.3 + ripple + (hpx - 0.5) * 0.1;
          c = pick(C.sand, t);
          const dw = distToWater[i];
          if (dw < 9) {
            const k = dw < 3 ? 0 : dw < 6 ? 1 : 2;
            if (dw < 6 || b < (9 - dw) / 4) c = C.wetSand[Math.min(2, k + (b > 0.6 ? 1 : 0))];
          }
          break;
        }
        case G.DIRT: {
          const t = n * 0.5 + m * 0.5 + (b - 0.5) * 0.4 + (hpx - 0.5) * 0.2;
          c = pick(C.dirt, t);
          break;
        }
        case G.SHALLOW:
        case G.DEEP:
        case G.RIVER:
        case G.SWAMP:
          c = waterBand(g, distToLand[i] + (b - 0.5) * 2.5 + (n - 0.5) * 3);
          break;
        case G.CHASM:
          c = rgb('#07060a');
          break;
        case G.WATERFALL:
          c = C.stone[0];
          break;
        case G.CAVE: {
          const t = 0.3 + n * 0.35 + m * 0.25 + (b - 0.5) * 0.3 + (hpx - 0.5) * 0.12;
          c = pick(C.cave, t);
          if (hash2(gx >> 1, gy >> 1, 31) < 0.025) c = C.cave[4]; // guijarros
          else if (hash2(gx >> 2, gy >> 2, 32) < 0.03) c = C.cave[0];
          break;
        }
        case G.WALL:
          c = C.caveWall[1];
          break;
        case G.VOID:
          c = rgb('#0b0907');
          break;
        default:
          c = C.stone[2];
      }
      px[i] = c;
    }
  }

  // Paredes de roca: en las costas altas (cara sur sobre el mar) y dentro de las grietas.
  // Por columnas: distancia al primer mar por debajo y al primer suelo firme por encima.
  for (let x = 0; x < rw; x++) {
    const gx = rx + x;
    let up = 99;     // px desde el último píxel que no es grieta, bajando
    for (let y = 0; y < rh; y++) {
      const i = y * rw + x;
      if (type[i] !== G.CHASM) { up = 0; continue; }
      up++;
      const gy = ry + y;
      if (up <= 8) {
        const k = up;
        const block = hash2(gx >> 3, (gy - k) >> 2, 44);
        let c = pick(C.stone, 0.75 - k * 0.09 + block * 0.15 + (bayer(gx, gy) - 0.5) * 0.15);
        if (k === 1) c = C.stone[4];
        if ((gx + (k > 4 ? 3 : 0)) % 9 === 0) c = C.stone[0];
        px[i] = k > 6 ? shade(c, 0.55) : c;
      } else if (bayer(gx, gy) < 0.06) px[i] = rgb('#1a1418');
    }
    let down = 99;   // px hasta el primer mar por debajo (subiendo desde abajo)
    for (let y = rh - 1; y >= 0; y--) {
      const i = y * rw + x;
      const g = type[i];
      if (g === G.SHALLOW || g === G.DEEP) { down = 0; continue; }
      if (WATER[g]) { down = 99; continue; }
      down++;
      if (lvl[i] === 0 || down > 8 || g === G.CHASM) continue;
      const k = down;
      const gy = ry + y;
      const band = Math.floor((gy + k) / 5);
      const block = hash2(Math.floor((gx + band * 7) / 11), band, 46);
      let c = pick(C.stone, 0.25 + (k / 8) * 0.45 + block * 0.25 + (bayer(gx, gy) - 0.5) * 0.15);
      if ((gy + k) % 5 === 0 || (gx + band * 7) % 11 === 0) c = C.stone[0];
      if (k >= 8) c = C.outline;
      else if (k === 7) c = C.stone[4];
      else if (k <= 1) c = shade(c, 0.6);
      px[i] = c;
    }
  }

  const tx0 = Math.floor(rx / TILE);
  const ty0 = Math.floor(ry / TILE);
  const tx1 = Math.floor((rx + rw - 1) / TILE);
  const ty1 = Math.floor((ry + rh - 1) / TILE);
  const ctx = { map, pc, type, rx, ry, rw, rh, tx0, ty0, tx1, ty1, gAt };
  drawStone(ctx);
  drawBridges(ctx);
  drawHelipad(ctx);
  if (map.theme) drawInterior(ctx);

  // 4) Contornos de cómic entre suelos (el de más prioridad dibuja el borde).
  const src = px.slice();
  for (let y = 1; y < rh - 1; y++) {
    for (let x = 1; x < rw - 1; x++) {
      const i = y * rw + x;
      const g = type[i];
      const p = PRIORITY[g];
      if (p < 0) continue;
      const li = lvl[i];
      const qa = PRIORITY[type[i - 1]];
      const qb = PRIORITY[type[i + 1]];
      const qc = PRIORITY[type[i - rw]];
      const qd = PRIORITY[type[i + rw]];
      const lower = (qa >= 0 && qa < p && (lvl[i - 1] === li || qa === 0)) || (qb >= 0 && qb < p && (lvl[i + 1] === li || qb === 0)) ||
        (qc >= 0 && qc < p && (lvl[i - rw] === li || qc === 0)) || (qd >= 0 && qd < p && (lvl[i + rw] === li || qd === 0));
      if (!lower) continue;
      if (VEG[g]) px[i] = g === G.NEEDLES ? C.needles[0] : C.outlineGreen;
      else if (g === G.DIRT) px[i] = C.dirt[0];
      else if (g === G.SAND) px[i] = C.wetSand[0];
      else if (g === G.SNOW) px[i] = C.snow[1];
      else if (g === G.ROCK) px[i] = C.stone[0];
      else if (g === G.MUD) px[i] = C.mud[0];
      else if (g === G.GRAVEL) px[i] = C.gravel[0];
      else if (g === G.STONE || g === G.BRIDGE || g === G.CONCRETE) px[i] = C.outline;
      else if (g === G.CAVE) px[i] = C.cave[0];
      // Segundo píxel algo más oscuro: da volumen al borde.
      const k = i + (type[i + rw] === g ? rw : -rw);
      if (type[k] === g && (VEG[g] || g === G.SNOW)) px[k] = shade(src[k], g === G.SNOW ? 0.9 : 0.78);
    }
  }

  drawDecals(ctx);
  drawCliffs(ctx);

  // Agua por píxel para la capa animada: 1 mar, 2 río, 3 cascada, 4 manglar.
  const kind = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const g = type[i];
    kind[i] = g === G.SHALLOW || g === G.DEEP ? 1 : g === G.RIVER ? 2 : g === G.WATERFALL ? 3 : g === G.SWAMP ? 4 : 0;
  }
  return { pc, type, kind, dist: distToLand };
}

/** Altura (px) de la cara frontal de un muro de interior. */
const FACE = 22;

/**
 * Muros y sombras de los interiores (sesión 6). Vista cenital: de cada muro se ve
 * la parte de arriba (oscura) y, si debajo hay suelo, la cara frontal con la
 * textura del interior (roca en la cueva, bloques de hormigón en el búnker, palos
 * y barro en las cabañas). El suelo pegado a un muro recibe su sombra.
 */
function drawInterior({ map, pc, type, rx, ry, rw, rh, gAt }) {
  const theme = map.theme;
  const solid = (g) => g === G.WALL || g === G.VOID;
  const px = pc.data;
  if (theme === 'cueva') {
    drawCaveWalls({ map, pc, type, rx, ry, rw, rh, gAt });
    return;
  }
  for (let y = 0; y < rh; y++) {
    const gy = ry + y;
    const ty = Math.floor(gy / TILE);
    const ly = gy - ty * TILE;
    for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      const g = type[i];
      const gx = rx + x;
      const tx = Math.floor(gx / TILE);
      const lx = gx - tx * TILE;
      const b = bayer(gx, gy);
      if (g === G.WALL) {
        const below = gAt(tx, ty + 1);
        const faceTop = TILE - FACE;
        if (!solid(below) && ly >= faceTop) {
          // Cara frontal.
          const k = (ly - faceTop) / FACE; // 0 arriba, 1 abajo
          let c;
          if (theme === 'bunker') {
            const row = Math.floor((gy - faceTop) / 7);
            const off = (row % 2) * 8;
            const bl = hash2(Math.floor((gx + off) / 16), row, 61);
            c = pick(C.concrete, 0.55 - k * 0.35 + bl * 0.2 + (b - 0.5) * 0.1);
            if ((gy - faceTop) % 7 === 0 || (gx + off) % 16 === 0) c = C.concrete[0];
            if (ly >= TILE - 3) c = rgb('#2a2c2c');
            if (ly < faceTop + 3 && ((gx >> 2) + (gy >> 2)) % 2 === 0) c = C.yellow[1]; // franja de aviso
            else if (ly < faceTop + 3) c = rgb('#1a1a1a');
          } else if (theme === 'cabana') {
            const stick = (gx % 7 === 0) || (gx % 7 === 1);
            c = stick ? C.wood[1 + (hash2(gx >> 3, 0, 62) > 0.5 ? 1 : 0)] : pick(C.dirt, 0.5 - k * 0.3 + (b - 0.5) * 0.25);
            if (ly >= TILE - 2) c = C.wood[0];
          } else {
            const band = Math.floor((gy + Math.floor(hash2(gx >> 3, 0, 63) * 4)) / 5);
            const bl = hash2(Math.floor((gx + band * 5) / 9), band, 64);
            c = pick(C.stone, 0.55 - k * 0.4 + bl * 0.25 + (b - 0.5) * 0.15);
            if ((gx + band * 5) % 9 === 0 && bl > 0.4) c = C.stone[0];
            if (ly >= TILE - 2) c = C.caveWall[0];
            if (hash2(gx, gy, 65) < 0.02) c = C.moss[0];
          }
          if (ly === faceTop) c = theme === 'cabana' ? C.thatch[3] : theme === 'bunker' ? C.concrete[4] : C.stone[4]; // canto
          px[i] = c;
        } else {
          // Parte de arriba del muro.
          let c;
          if (theme === 'bunker') c = pick([rgb('#2c2e2e'), rgb('#333535'), rgb('#3a3c3c')], 0.5 + (b - 0.5) * 0.4 + (hash2(gx >> 2, gy >> 2, 66) - 0.5) * 0.3);
          else if (theme === 'cabana') c = pick(C.thatch, 0.25 + (b - 0.5) * 0.3 + (hash2(gx >> 1, gy, 67) - 0.5) * 0.4);
          else c = pick(C.caveWall, 0.45 + (b - 0.5) * 0.35 + (hash2(gx >> 2, gy >> 2, 68) - 0.5) * 0.5);
          // Borde con el suelo a los lados y arriba: canto claro de 2 px y contorno.
          const up = gAt(tx, ty - 1);
          const left = gAt(tx - 1, ty);
          const right = gAt(tx + 1, ty);
          if ((!solid(up) && ly < 2) || (!solid(left) && lx < 2) || (!solid(right) && lx > TILE - 3)) c = C.outline;
          px[i] = c;
        }
      } else if (!solid(g)) {
        // Sombra de los muros sobre el suelo.
        let s = 1;
        if (solid(gAt(tx, ty - 1)) && ly < 8) s = Math.min(s, 0.55 + ly * 0.055);
        if (solid(gAt(tx - 1, ty)) && lx < 4) s = Math.min(s, 0.7 + lx * 0.07);
        if (solid(gAt(tx + 1, ty)) && lx > TILE - 5) s = Math.min(s, 0.7 + (TILE - 1 - lx) * 0.07);
        if (s < 1) px[i] = shade(px[i], s);
      }
    }
  }
}

/**
 * Muros de la cueva con bordes orgánicos: la frontera entre roca y suelo se
 * deforma con ruido (±5 px, solo en el dibujo; la colisión sigue por tiles), con
 * canto oscuro, cara de roca con estratos y sombra en el suelo.
 */
function drawCaveWalls({ pc, type, rx, ry, rw, rh, gAt }) {
  const px = pc.data;
  const solid = (g) => g === G.WALL || g === G.VOID;
  // 0 suelo, 1 parte de arriba de la roca, 2 cara frontal.
  const m = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) {
    const gy = ry + y;
    for (let x = 0; x < rw; x++) {
      const gx = rx + x;
      const wx = gx + (fbm(gx * 0.07, gy * 0.07, 81, 2) - 0.5) * 12;
      const wy = gy + (fbm(gx * 0.07, gy * 0.07, 82, 2) - 0.5) * 12;
      const tx = Math.floor(gx / TILE);
      const ty = Math.floor(gy / TILE);
      const ly = gy - ty * TILE;
      const own = gAt(tx, ty);
      if (own === G.WALL && !solid(gAt(tx, ty + 1))) {
        const faceTop = TILE - FACE + Math.round((fbm(gx * 0.11, ty, 83, 2) - 0.5) * 10);
        m[y * rw + x] = ly >= faceTop ? 2 : 1;
        continue;
      }
      const wtx = Math.floor(wx / TILE);
      const wty = Math.floor(wy / TILE);
      let s = solid(gAt(wtx, wty));
      // No invadir la cara frontal de un muro con suelo, ni comerse el suelo pegado a una cara.
      if (s && !solid(own) && solid(gAt(tx, ty - 1)) && !solid(gAt(tx, ty))) s = ly < 2;
      m[y * rw + x] = s ? 1 : 0;
    }
  }
  for (let y = 0; y < rh; y++) {
    const gy = ry + y;
    for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      const gx = rx + x;
      const b = bayer(gx, gy);
      const k = m[i];
      if (k === 2) {
        const ty = Math.floor(gy / TILE);
        let top = y;
        while (top > 0 && m[top * rw - rw + x] === 2) top--;
        const d = y - top; // px desde el canto
        const band = Math.floor((gy + Math.floor(hash2(gx >> 3, 0, 63) * 4)) / 5);
        const bl = hash2(Math.floor((gx + band * 5) / 9), band, 64);
        let c = pick(C.stone, 0.62 - (d / FACE) * 0.45 + bl * 0.22 + (b - 0.5) * 0.15);
        if ((gx + band * 5) % 9 === 0 && bl > 0.4) c = C.stone[0];
        if (hash2(gx, gy, 65) < 0.02) c = C.moss[0];
        if (d === 0) c = C.stone[4];
        if (gy >= (ty + 1) * TILE - 2) c = C.caveWall[0];
        px[i] = c;
      } else if (k === 1) {
        let c = pick(C.caveWall, 0.45 + (b - 0.5) * 0.35 + (hash2(gx >> 2, gy >> 2, 68) - 0.5) * 0.5);
        const edge = (x > 0 && m[i - 1] === 0) || (x < rw - 1 && m[i + 1] === 0) || (y > 0 && m[i - rw] === 0) || (y < rh - 1 && m[i + rw] === 0);
        if (edge) c = C.outline;
        else if ((y < rh - 1 && m[i + rw] === 2)) c = C.outline;
        px[i] = c;
      } else {
        // Suelo (también donde la deformación come un poco de muro).
        if (solid(type[i])) px[i] = pick(C.cave, 0.35 + (b - 0.5) * 0.3 + (hash2(gx >> 1, gy >> 1, 69) - 0.5) * 0.3);
        // Sombra al pie de la roca.
        let sh = 1;
        for (let k2 = 1; k2 <= 7; k2++) {
          if (y - k2 >= 0 && m[i - k2 * rw] !== 0) { sh = Math.min(sh, 0.5 + k2 * 0.07); break; }
        }
        for (let k2 = 1; k2 <= 3; k2++) {
          if ((x - k2 >= 0 && m[i - k2] !== 0) || (x + k2 < rw && m[i + k2] !== 0)) { sh = Math.min(sh, 0.68 + k2 * 0.08); break; }
        }
        if (sh < 1) px[i] = shade(px[i], sh);
      }
    }
  }
}

/** Losas de piedra con juntas, grietas y musgo (suelo de las ruinas). */
function drawStone({ pc, type, rx, ry, rw, rh }) {
  for (let y = 0; y < rh; y++) {
    const gy = ry + y;
    const row = Math.floor(gy / 14);
    const off = (((row % 2) + 2) % 2) * 9;
    for (let x = 0; x < rw; x++) {
      const i = y * rw + x;
      if (type[i] !== G.STONE) continue;
      const gx = rx + x;
      const lx = (gx + off) % 18;
      const ly = gy % 14;
      const slab = hash2(Math.floor((gx + off) / 18), row, 5);
      let c = pick(C.stone, 0.45 + slab * 0.4 + (bayer(gx, gy) - 0.5) * 0.2);
      if (ly === 0 || lx === 0) c = C.stone[0];
      else if (ly === 1 || lx === 1) c = C.stone[4];
      else if (ly === 13 || lx === 17) c = C.stone[1];
      if ((ly <= 1 || lx <= 1) && hash2(gx, gy, 9) < 0.45) c = C.moss[(gx + gy) % 2];
      if (slab > 0.8 && hash2(gx >> 2, gy >> 2, 3) < 0.35) c = C.moss[1 + (bayer(gx, gy) > 0.5 ? 1 : 0)];
      pc.data[i] = c;
    }
  }
}

/** Puentes colgantes y embarcadero: tablones con huecos y barandillas de cuerda. */
function drawBridges({ map, pc, tx0, ty0, tx1, ty1 }) {
  for (let ty = ty0 - 2; ty <= ty1 + 1; ty++) {
    for (let tx = tx0 - 12; tx <= tx1 + 1; tx++) {
      if (map.groundAt(tx, ty) !== G.BRIDGE || map.groundAt(tx - 1, ty) === G.BRIDGE || map.groundAt(tx, ty - 1) === G.BRIDGE) continue;
      let bx1 = tx;
      while (map.groundAt(bx1 + 1, ty) === G.BRIDGE) bx1++;
      let by1 = ty;
      while (map.groundAt(tx, by1 + 1) === G.BRIDGE) by1++;
      const x0 = tx * TILE - 6;
      const x1 = (bx1 + 1) * TILE + 6;
      const y0 = ty * TILE + 4;
      const y1 = (by1 + 1) * TILE - 4;
      const span = x1 - x0;
      // Embarcadero (un extremo en el mar): sin combarse y con pilotes.
      const pier = map.groundAt(bx1 + 1, ty) === G.SHALLOW || map.groundAt(bx1 + 1, ty) === G.DEEP;
      for (let x = x0; x < x1; x++) {
        const sag = pier ? 0 : Math.round(Math.sin(((x - x0) / span) * Math.PI) * 3);
        const plank = Math.floor((x - x0) / 6);
        const lx = (x - x0) % 6;
        const tone = hash2(plank, ty, 21);
        for (let y = y1 + sag; y < y1 + sag + 4; y++) pc.set(x, y, shade(pc.get(x, y), 0.6));
        for (let y = y0 + sag; y < y1 + sag; y++) {
          let c;
          if (lx === 5) c = C.wood[0];
          else {
            const jitter = Math.floor(hash2(plank, 3, 9) * 3) - 1;
            if (y < y0 + sag + 2 + jitter || y > y1 + sag - 3 + jitter) { if (y < y0 + sag + 1 || y > y1 + sag - 2) continue; }
            c = C.wood[2 + Math.floor(tone * 3)];
            if (lx === 0) c = C.wood[4];
            if (lx === 4) c = C.wood[1];
            if (hash2(x, y, 4) < 0.04) c = C.wood[1];
          }
          pc.set(x, y, c);
        }
        if (pier) {
          if ((x - x0) % 32 === 4) for (let k = 0; k < 7; k++) { pc.set(x, y1 + k, C.wood[0]); pc.set(x + 1, y1 + k, C.wood[1]); pc.set(x + 2, y1 + k, C.outline); }
          continue;
        }
        for (const [ryy, dark] of [[y0 + sag - 2, false], [y1 + sag - 3, true]]) {
          pc.set(x, ryy, C.rope[2]);
          pc.set(x, ryy + 1, dark ? C.rope[0] : C.rope[1]);
          if ((x - x0) % 12 === 0) for (let k = 2; k < 6; k++) pc.set(x, ryy + k, C.rope[0]);
        }
      }
    }
  }
}

/** Marcas del helipuerto: círculo amarillo y la H blanca. */
function drawHelipad({ map, pc }) {
  const h = map.helipad;
  if (!h) return;
  const cx = (h.x + 0.5) * TILE;
  const cy = (h.y + 0.5) * TILE;
  if (cx < pc.ox - 80 || cx > pc.ox + pc.w + 80 || cy < pc.oy - 80 || cy > pc.oy + pc.h + 80) return;
  for (let y = cy - 64; y <= cy + 64; y++) {
    for (let x = cx - 64; x <= cx + 64; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const worn = hash2(x >> 1, y >> 1, 66) < 0.12;
      if (d > 52 && d < 57 && !worn) pc.set(x, y, d < 53 ? C.yellow[0] : C.yellow[2]);
      const lx = x - cx;
      const ly = y - cy;
      const inH = (Math.abs(lx + 14) < 4 || Math.abs(lx - 14) < 4 || Math.abs(ly) < 4) && Math.abs(lx) < 18 && Math.abs(ly) < 24;
      if (inH && !worn) pc.set(x, y, Math.abs(ly) === 23 || Math.abs(lx) === 17 ? C.concrete[2] : rgb('#eef0ea'));
    }
  }
}

/** Detalles del suelo por bioma: hojas, matas, flores, conchas, piedras, pinocha, nenúfares… */
function drawDecals({ pc, type, rx, ry, rw, rh, tx0, ty0, tx1, ty1 }) {
  const at = (x, y) => {
    const lx = x - rx;
    const ly = y - ry;
    return lx >= 0 && ly >= 0 && lx < rw && ly < rh ? type[ly * rw + lx] : -1;
  };
  for (let ty = ty0 - 1; ty <= ty1 + 1; ty++) {
    for (let tx = tx0 - 1; tx <= tx1 + 1; tx++) {
      for (let k = 0; k < 10; k++) {
        const r = hash2(tx * 7 + k, ty * 13 + k, 31);
        const x = tx * TILE + Math.floor(hash2(tx, ty * 3 + k, 41) * TILE);
        const y = ty * TILE + Math.floor(hash2(tx * 5 + k, ty, 51) * TILE);
        const g = at(x, y);
        if (g === G.JUNGLE || g === G.GRASS) {
          if (r < 0.2) {
            const col = g === G.JUNGLE ? C.jungleLeaf[4] : C.grass[4];
            pc.set(x, y, col); pc.set(x - 1, y - 1, col); pc.set(x + 1, y - 1, col);
            pc.set(x, y + 1, C.outlineGreen);
          } else if (r < 0.3) {
            const cols = g === G.JUNGLE ? C.jungleLeaf : C.grass;
            for (let b2 = -2; b2 <= 2; b2 += 1) {
              const hgt = 3 - Math.abs(b2) + (b2 === 0 ? 1 : 0);
              for (let k2 = 0; k2 < hgt; k2++) pc.set(x + b2 + (k2 > 1 ? Math.sign(b2) : 0), y - k2, cols[2 + Math.min(2, k2)]);
            }
            pc.set(x - 1, y + 1, C.outlineGreen); pc.set(x, y + 1, C.outlineGreen); pc.set(x + 1, y + 1, C.outlineGreen);
          } else if (r < 0.4 && g === G.JUNGLE) {
            const col = r < 0.34 ? rgb('#6b5a22') : rgb('#4a3a18');
            pc.set(x, y, col); pc.set(x + 1, y, col); pc.set(x + 1, y + 1, C.outlineGreen);
          } else if (r < 0.43 && hash2(tx >> 1, ty >> 1, 77) < 0.3) {
            const fl = hash2(tx >> 1, ty >> 1, 78) < 0.55 ? C.red : C.purple;
            pc.set(x, y - 1, fl[3]); pc.set(x - 1, y, fl[2]); pc.set(x + 1, y, fl[2]); pc.set(x, y, C.yellow[2]);
            pc.set(x, y + 1, fl[1]); pc.set(x - 1, y + 1, C.outlineGreen); pc.set(x + 1, y + 1, C.outlineGreen);
            pc.set(x, y + 2, C.jungleLeaf[3]);
          } else if (r < 0.5 && g === G.GRASS) {
            pc.set(x, y, C.yellow[2]); pc.set(x, y + 1, C.yellow[0]);
          }
        } else if (g === G.NEEDLES) {
          if (r < 0.3) { // agujas de pino cruzadas
            pc.set(x, y, C.needles[4]); pc.set(x + 1, y + 1, C.needles[3]); pc.set(x + 2, y, C.needles[4]); pc.set(x + 1, y + 2, C.needles[0]);
          } else if (r < 0.38) { // piña
            pc.set(x, y, C.wood[2]); pc.set(x + 1, y, C.wood[3]); pc.set(x, y + 1, C.wood[1]); pc.set(x + 1, y + 1, C.wood[0]);
          } else if (r < 0.46) {
            pc.set(x, y, C.grass[3]); pc.set(x - 1, y - 1, C.grass[2]); pc.set(x + 1, y - 1, C.grass[2]);
          }
        } else if (g === G.SNOW) {
          if (r < 0.06) { // piedra asomando
            pc.set(x, y, C.stone[3]); pc.set(x + 1, y, C.stone[2]); pc.set(x, y + 1, C.stone[1]); pc.set(x + 1, y + 1, C.snow[1]);
          } else if (r < 0.18) {
            pc.set(x, y, C.snow[1]); pc.set(x + 1, y, C.snow[2]);
          } else if (r < 0.2) { // huellas
            pc.set(x, y, C.snow[0]); pc.set(x + 3, y + 5, C.snow[0]);
          }
        } else if (g === G.ROCK) {
          if (r < 0.25) {
            pc.set(x, y, C.stone[4]); pc.set(x + 1, y, C.stone[3]); pc.set(x, y + 1, C.stone[1]); pc.set(x + 1, y + 1, C.stone[0]);
          } else if (r < 0.32) {
            pc.set(x, y, C.moss[1]); pc.set(x + 1, y, C.moss[2]); pc.set(x, y + 1, C.moss[0]);
          }
        } else if (g === G.MUD) {
          if (r < 0.18) { // charquito
            pc.set(x, y, rgb('#5a6e60')); pc.set(x + 1, y, rgb('#6e8474')); pc.set(x + 2, y, rgb('#5a6e60')); pc.set(x + 1, y + 1, C.mud[0]);
          } else if (r < 0.3) { // raíz
            pc.set(x, y, C.wood[1]); pc.set(x + 1, y + 1, C.wood[1]); pc.set(x + 2, y + 1, C.wood[0]);
          } else if (r < 0.38) {
            pc.set(x, y, C.mangrove[3]); pc.set(x, y - 1, C.mangrove[4]); pc.set(x, y + 1, C.mangrove[1]);
          }
        } else if (g === G.SWAMP) {
          if (r < 0.1) { // nenúfar
            pc.set(x, y, C.mangrove[3]); pc.set(x + 1, y, C.mangrove[4]); pc.set(x - 1, y, C.mangrove[3]); pc.set(x, y - 1, C.mangrove[4]); pc.set(x, y + 1, C.mangrove[1]);
            if (r < 0.02) pc.set(x, y, C.red[3]);
          }
        } else if (g === G.GRAVEL) {
          if (r < 0.4) { pc.set(x, y, C.gravel[4]); pc.set(x + 1, y + 1, C.gravel[0]); } else if (r < 0.45) { pc.set(x, y, C.rust[3]); pc.set(x + 1, y, C.rust[1]); }
        } else if (g === G.SAND) {
          if (r < 0.12) {
            pc.set(x, y, rgb('#fff4ea')); pc.set(x + 1, y, rgb('#f2b8a8')); pc.set(x, y + 1, C.wetSand[0]); pc.set(x + 1, y + 1, C.wetSand[0]);
          } else if (r < 0.16) {
            pc.set(x, y, C.stone[3]); pc.set(x, y + 1, C.sand[0]);
          }
        } else if (g === G.DIRT) {
          if (r < 0.35) {
            pc.set(x, y, C.stone[4]); pc.set(x + 1, y, C.stone[2]); pc.set(x, y + 1, C.stone[1]); pc.set(x + 1, y + 1, C.dirt[0]);
          } else if (r < 0.45) {
            pc.set(x, y, C.dirt[0]); pc.set(x + 1, y + 1, C.dirt[0]);
          }
        }
      }
    }
  }
}

/** Tonos del borde superior de una pared según el suelo de arriba. */
function lipTones(g) {
  if (g === G.SNOW) return { body: C.snow, edge: C.snow[0] };
  if (g === G.ROCK) return { body: C.stone, edge: C.outline };
  if (g === G.NEEDLES) return { body: C.needles, edge: C.needles[0] };
  return { body: C.jungleFloor, edge: C.outlineGreen };
}

/** Paredes de acantilado con bloques de piedra, musgo o nieve, lianas, borde superior y sombra al pie. */
function drawCliffs({ map, pc, tx0, ty0, tx1, ty1 }) {
  const bandH = (b) => 10 + Math.floor(hash2(b, 0, 61) * 7);
  const X0 = Math.max(0, tx0 - 1);
  const X1 = Math.min(map.width - 1, tx1 + 1);
  const Y0 = Math.max(0, ty0 - 4);
  const Y1 = Math.min(map.height - 1, ty1 + 1);
  for (let tx = X0; tx <= X1; tx++) {
    for (let ty = Y0; ty <= Y1; ty++) {
      if (!map.isCliff(tx, ty)) continue;
      const topRow = map.cliffColumnTop(tx, ty);
      const top = topRow * TILE;
      const high = map.levelAt(tx, topRow - 1) >= 3;
      for (let y = ty * TILE; y < (ty + 1) * TILE; y++) {
        let by = top;
        let band = 0;
        while (by + bandH(band) <= y) { by += bandH(band); band++; }
        const ly = y - by;
        const bh = bandH(band);
        for (let x = tx * TILE; x < (tx + 1) * TILE; x++) {
          const off = Math.floor(hash2(band, 1, 71) * 20);
          const bw = 15 + Math.floor(hash2(band, 2, 81) * 14);
          const bx = Math.floor((x + off) / bw);
          const lx = (x + off) % bw;
          const corner = (lx <= 1 || lx >= bw - 2) && (ly <= 1 || ly >= bh - 2);
          const tone = hash2(bx, band, 91);
          let c = pick(C.stone, 0.35 + tone * 0.45 + (bayer(x, y) - 0.5) * 0.25);
          if (ly === 0 || lx === 0 || corner) c = C.outline;
          else if (ly === 1 || (ly === 2 && lx < bw * 0.4)) c = high ? C.snow[2] : C.stone[4];
          else if (lx === 1) c = C.stone[3];
          else if (ly === bh - 1 || lx === bw - 1) c = C.stone[1];
          if (hash2(x, y, 13) < 0.03) c = C.stone[0];
          const rel = (y - top) / (3 * TILE);
          const mossN = fbm(x / 9, y / 9, 17, 2) + (1 - rel) * 0.35;
          if (mossN > 0.78) c = high ? C.snow[mossN > 0.86 ? 4 : 2] : C.moss[mossN > 0.86 ? 2 : bayer(x, y) > 0.5 ? 1 : 0];
          if (rel > 0.75 && bayer(x, y) < (rel - 0.75) * 3) c = shade(c, 0.7);
          pc.set(x, y, c);
        }
      }
    }
  }
  for (let tx = X0; tx <= X1; tx++) {
    for (let ty = Y0; ty <= Y1; ty++) {
      if (!map.isCliff(tx, ty) || map.isCliff(tx, ty - 1)) continue;
      const bottomY = (map.cliffColumnBottom(tx, ty) + 1) * TILE;
      const above = map.groundAt(tx, ty - 1);
      const lip = lipTones(above);
      const vines = above !== G.SNOW && above !== G.ROCK && map.levelAt(tx, ty - 1) < 3;
      for (let x = tx * TILE; x < (tx + 1) * TILE; x++) {
        const drop = 3 + Math.floor(fbm(x / 5, ty, 23, 2) * 6);
        for (let k = 0; k < drop; k++) {
          const c = k === drop - 1 ? lip.edge : k === drop - 2 ? lip.body[1] : pick(lip.body, 0.5 + bayer(x, k) * 0.4);
          pc.set(x, ty * TILE + k, c);
        }
        if (vines && hash2(x, ty, 33) < 0.07) {
          const len = 12 + Math.floor(hash2(x, ty, 34) * (bottomY - ty * TILE - 16));
          for (let k = drop; k < drop + len; k++) {
            const lx = x + Math.round(Math.sin(k * 0.35 + x) * 1.2);
            pc.set(lx, ty * TILE + k, C.jungleLeaf[1]);
            pc.set(lx + 1, ty * TILE + k, C.outlineGreen);
            if (k % 5 === 0) {
              const side = (k / 5) % 2 ? 1 : -1;
              pc.set(lx + side, ty * TILE + k, C.jungleLeaf[4]);
              pc.set(lx + side * 2, ty * TILE + k, C.jungleLeaf[3]);
              pc.set(lx + side, ty * TILE + k + 1, C.jungleLeaf[2]);
            }
          }
        } else if (!vines && hash2(x, ty, 35) < 0.05) {
          // Carámbanos o regueros de nieve en las paredes altas.
          const len = 4 + Math.floor(hash2(x, ty, 36) * 10);
          for (let k = drop; k < drop + len; k++) pc.set(x, ty * TILE + k, k > drop + len - 3 ? C.snow[1] : C.snow[3]);
        }
      }
      for (let x = tx * TILE; x < (tx + 1) * TILE; x++) {
        for (let k = 0; k < 10; k++) {
          const y = bottomY + k;
          if (k < 2 || bayer(x, y) < 1 - k / 10) pc.set(x, y, shade(pc.get(x, y), k < 2 ? 0.45 : 0.7));
        }
      }
    }
  }
  // Bordes de meseta que no son pared (este, oeste, norte) y salientes.
  for (let ty = Y0; ty <= Y1; ty++) {
    for (let tx = X0; tx <= X1; tx++) {
      const g = map.groundAt(tx, ty);
      const lv = map.levelAt(tx, ty);
      if (g === G.LEDGE_S) { drawLedge(pc, tx, ty, lipTones(map.groundAt(tx, ty - 1))); continue; }
      if (lv === 0 || g === G.CLIFF) continue;
      const lower = (x, y) => {
        const k = map.groundAt(x, y);
        return k !== -1 && k !== G.CLIFF && k !== G.LEDGE_S && k !== G.WATERFALL && k !== G.DEEP && k !== G.SHALLOW && map.levelAt(x, y) < lv;
      };
      const x0 = tx * TILE;
      const y0 = ty * TILE;
      const lip = lipTones(g);
      for (const [dx, side] of [[-1, 'w'], [1, 'e']]) {
        if (!lower(tx + dx, ty)) continue;
        for (let y = y0; y < y0 + TILE; y++) {
          const ex = side === 'w' ? x0 : x0 + TILE - 1;
          pc.set(ex, y, lip.edge);
          for (let k = 1; k <= 5; k++) {
            const sx = side === 'w' ? x0 - k : x0 + TILE - 1 + k;
            pc.set(sx, y, k === 5 ? C.outline : pick(C.stone, 0.3 + bayer(sx, y) * 0.3 + (side === 'e' ? 0.2 : 0)));
          }
          for (let k = 6; k <= 9; k++) {
            const sx = side === 'w' ? x0 - k : x0 + TILE - 1 + k;
            if (bayer(sx, y) < (10 - k) / 5) pc.set(sx, y, shade(pc.get(sx, y), 0.7));
          }
        }
      }
      if (lower(tx, ty - 1)) for (let x = x0; x < x0 + TILE; x++) { pc.set(x, y0, lip.edge); pc.set(x, y0 + 1, g === G.SNOW ? C.snow[4] : C.moss[2]); }
    }
  }
}

/** Saliente: suelo de arriba, labio de piedra con contorno y el suelo de abajo. */
function drawLedge(pc, tx, ty, lip) {
  const x0 = tx * TILE;
  const y0 = ty * TILE;
  for (let x = x0; x < x0 + TILE; x++) {
    const wob = Math.round(Math.sin(x * 0.4) * 1.5);
    for (let y = y0; y < y0 + TILE; y++) {
      const ly = y - y0 - wob;
      let c;
      if (ly < 9) c = pick(lip.body, 0.45 + bayer(x, y) * 0.4);
      else if (ly === 9) c = lip.edge;
      else if (ly < 18) c = ly === 10 ? C.stone[4] : pick(C.stone, 0.25 + bayer(x, y) * 0.4);
      else if (ly === 18) c = C.outline;
      else if (ly < 22) c = shade(pick(C.jungleFloor, 0.3 + bayer(x, y) * 0.3), 0.7);
      else continue;
      pc.set(x, y, c);
    }
  }
}

/**
 * Caché de trozos del suelo. Pinta cada trozo de CHUNK × CHUNK px cuando hace
 * falta (con un margen alrededor para que bordes y orillas encajen) y guarda los
 * más recientes. `prefetch` adelanta trozos cercanos a la cámara sin pasarse de
 * un presupuesto de tiempo por fotograma.
 */
export class TerrainCache {
  constructor(map, maxChunks = 420) {
    this.map = map;
    this.cols = Math.ceil(map.pixelWidth / CHUNK);
    this.rows = Math.ceil(map.pixelHeight / CHUNK);
    this.coarse = coarseLandDistance(map);
    this.chunks = new Map();
    this.max = maxChunks;
    this.rendered = 0;
    this.renderMs = 0;
    this.maxRenderMs = 0;
  }

  key(cx, cy) {
    return cy * this.cols + cx;
  }

  has(cx, cy) {
    return this.chunks.has(this.key(cx, cy));
  }

  /** Trozo (cx, cy), pintándolo si no está. */
  chunk(cx, cy) {
    const k = this.key(cx, cy);
    let ch = this.chunks.get(k);
    if (ch) {
      // Recién usado: al final del orden de la caché.
      this.chunks.delete(k);
      this.chunks.set(k, ch);
      return ch;
    }
    ch = this.render(cx, cy);
    this.chunks.set(k, ch);
    if (this.chunks.size > this.max) this.chunks.delete(this.chunks.keys().next().value);
    return ch;
  }

  render(cx, cy) {
    const t0 = performance.now();
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    const R = renderRegion(this.map, x0 - MARGIN, y0 - MARGIN, CHUNK + MARGIN * 2, CHUNK + MARGIN * 2, this.coarse);
    const RW = CHUNK + MARGIN * 2;
    const out = new PixelCanvas(CHUNK, CHUNK);
    const kind = new Uint8Array(CHUNK * CHUNK);
    const dist = new Uint8Array(CHUNK * CHUNK);
    const noise = new Uint8Array(CHUNK * CHUNK);
    for (let y = 0; y < CHUNK; y++) {
      const src = (y + MARGIN) * RW + MARGIN;
      out.data.set(R.pc.data.subarray(src, src + CHUNK), y * CHUNK);
      kind.set(R.kind.subarray(src, src + CHUNK), y * CHUNK);
      dist.set(R.dist.subarray(src, src + CHUNK), y * CHUNK);
      for (let x = 0; x < CHUNK; x++) noise[y * CHUNK + x] = (hash2(x0 + x, y0 + y, 3) * 255) | 0;
    }
    const ms = performance.now() - t0;
    this.rendered++;
    this.renderMs += ms;
    this.maxRenderMs = Math.max(this.maxRenderMs, ms);
    return { canvas: out.toCanvas(), kind, dist, noise, x: x0, y: y0 };
  }

  /** Trozos que tocan el rectángulo [x, x + w) × [y, y + h) en px. */
  range(x, y, w, h) {
    return [
      Math.max(0, Math.floor(x / CHUNK)), Math.max(0, Math.floor(y / CHUNK)),
      Math.min(this.cols - 1, Math.floor((x + w - 1) / CHUNK)), Math.min(this.rows - 1, Math.floor((y + h - 1) / CHUNK)),
    ];
  }

  /** Pinta por adelantado los trozos de alrededor de la vista (como mucho `budgetMs` por llamada). */
  prefetch(x, y, w, h, budgetMs = 5, pad = CHUNK) {
    const t0 = performance.now();
    const [c0, r0, c1, r1] = this.range(x - pad, y - pad, w + pad * 2, h + pad * 2);
    const ccx = (x + w / 2) / CHUNK;
    const ccy = (y + h / 2) / CHUNK;
    const missing = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!this.has(c, r)) missing.push([c, r, Math.hypot(c + 0.5 - ccx, r + 0.5 - ccy)]);
    missing.sort((a, b) => a[2] - b[2]);
    for (const [c, r] of missing) {
      if (performance.now() - t0 > budgetMs) break;
      this.chunk(c, r);
    }
    return missing.length;
  }

  /** Dibuja el suelo visible en el lienzo de baja resolución (sin transformación). */
  draw(l, camX, camY, w, h) {
    const [c0, r0, c1, r1] = this.range(camX, camY, w, h);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const ch = this.chunk(c, r);
        l.drawImage(ch.canvas, ch.x - camX, ch.y - camY);
      }
    }
  }

  /** Tipo de agua y distancia a tierra en un píxel de mundo (solo trozos ya pintados). */
  waterAt(x, y) {
    const ch = this.chunks.get(this.key(Math.floor(x / CHUNK), Math.floor(y / CHUNK)));
    if (!ch) return null;
    const i = (y - ch.y) * CHUNK + (x - ch.x);
    return { kind: ch.kind[i], dist: ch.dist[i] };
  }
}
