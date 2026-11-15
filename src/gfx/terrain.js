// Prerenderizado del suelo de todo el mapa en un único canvas (se hace una vez al
// cargar). Bordes orgánicos entre suelos (coordenadas deformadas con ruido),
// contorno oscuro de cómic, arena mojada junto al agua, losas, puente y paredes
// de acantilado con bloques de piedra, musgo y lianas.

import { TILE } from '../config.js';
import { fbm, hash2 } from '../core/rng.js';
import { PixelCanvas, bayer, mix, shade, rgb } from './pixel.js';
import { C } from './palette.js';
import { G } from '../world/tiles.js';

const SOFT = new Set([G.JUNGLE, G.GRASS, G.SAND, G.DIRT, G.SHALLOW, G.DEEP, G.RIVER, G.TALL_GRASS]);
const WATER = new Set([G.SHALLOW, G.DEEP, G.RIVER, G.WATERFALL]);
// Prioridad de borde: el suelo de mayor prioridad dibuja el contorno sobre el de menor.
const PRIORITY = {
  [G.JUNGLE]: 5, [G.TALL_GRASS]: 5, [G.GRASS]: 5, [G.DIRT]: 3, [G.SAND]: 2,
  [G.SHALLOW]: 0, [G.DEEP]: 0, [G.RIVER]: 0, [G.STONE]: 4, [G.BRIDGE]: 6, [G.CHASM]: 1,
};
const VEG = new Set([G.JUNGLE, G.GRASS, G.TALL_GRASS]);

const SEA_BANDS = ['#7fdcd0', '#55c3c6', '#36a5b6', '#2a88a6', '#226e96', '#1d5a86', '#184a74'].map((c) => rgb(c));
const RIVER_BANDS = ['#6fd0c8', '#45adb8', '#2f8ea4', '#277892'].map((c) => rgb(c));
const SEA_STEPS = [3, 8, 15, 24, 34, 46];
const RIVER_STEPS = [2, 5, 9];
function waterBand(g, d) {
  const steps = g === G.RIVER ? RIVER_STEPS : SEA_STEPS;
  const bands = g === G.RIVER ? RIVER_BANDS : SEA_BANDS;
  let k = 0;
  while (k < steps.length && d > steps[k]) k++;
  return bands[k];
}

/** Orilla de barro entre la vegetación y el agua. */
function bank(c, d, x, y) {
  if (d <= 1) return C.outline;
  if (d <= 3) return bayer(x, y) < 0.5 ? C.dirt[0] : C.dirt[1];
  if (d === 4) return bayer(x, y) < 0.5 ? C.dirt[0] : c;
  if (d === 5 && bayer(x, y) < 0.3) return C.outlineGreen;
  return c;
}

const pick = (tones, t) => tones[Math.max(0, Math.min(tones.length - 1, Math.floor(t * tones.length)))];

/** Campo de ruido muestreado cada `step` px e interpolado (mucho más rápido que por píxel). */
function noiseField(w, h, step, scale, seed, octaves = 3) {
  const gw = Math.ceil(w / step) + 2;
  const gh = Math.ceil(h / step) + 2;
  const grid = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grid[j * gw + i] = fbm((i * step) / scale, (j * step) / scale, seed, octaves);
  return (x, y) => {
    const fx = x / step;
    const fy = y / step;
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

export function renderTerrain(map) {
  const W = map.pixelWidth;
  const H = map.pixelHeight;
  const pc = new PixelCanvas(W, H);
  const px = pc.data;
  const type = new Uint8Array(W * H);
  const lvl = new Uint8Array(W * H);

  const warpX = noiseField(W, H, 4, 46, 101);
  const warpY = noiseField(W, H, 4, 46, 202);
  const low = noiseField(W, H, 4, 90, 303);
  const mid = noiseField(W, H, 4, 18, 404, 2);

  // 1) Tipo de suelo por píxel. Entre suelos "blandos" del mismo nivel se
  //    interpola la pertenencia a cada tipo entre los centros de los tiles
  //    (bordes redondeados en vez de escalones) y se le suma ruido (bordes orgánicos).
  const score = new Float32Array(16);
  for (let y = 0; y < H; y++) {
    const fy = y / TILE - 0.5;
    const ty0 = Math.floor(fy);
    const v = fy - ty0;
    const tyc = (y / TILE) | 0;
    for (let x = 0; x < W; x++) {
      const txc = (x / TILE) | 0;
      const ci = tyc * map.width + txc;
      const g0 = map.ground[ci];
      const l0 = map.level[ci];
      let g = g0;
      if (SOFT.has(g0)) {
        const fx = x / TILE - 0.5;
        const tx0 = Math.floor(fx);
        const u = fx - tx0;
        score.fill(0);
        let any = false;
        for (let k = 0; k < 4; k++) {
          const tx = Math.min(map.width - 1, Math.max(0, tx0 + (k & 1)));
          const ty = Math.min(map.height - 1, Math.max(0, ty0 + (k >> 1)));
          const j = ty * map.width + tx;
          const gk = map.ground[j];
          if (!SOFT.has(gk) || map.level[j] !== l0) continue;
          const wu = k & 1 ? u : 1 - u;
          const wv = k >> 1 ? v : 1 - v;
          score[gk] += wu * wv;
          any = true;
        }
        if (any) {
          let best = -1;
          let bestS = -Infinity;
          for (let t = 0; t < 16; t++) {
            if (!score[t]) continue;
            // Cada tipo tiene su propio ruido (muestreado con un desplazamiento).
            const ox = (x + t * 211) % W;
            const oy = (y + t * 97) % H;
            const n = (warpX(ox, oy) - 0.5) * 0.85 + (mid(ox, oy) - 0.5) * 0.6 + (hash2(x >> 1, y >> 1, t) - 0.5) * 0.06;
            const sc = score[t] + n * (t === G.RIVER ? 0.4 : 1);
            if (sc > bestS) { bestS = sc; best = t; }
          }
          // El tile central siempre conserva algo de su tipo (no se "come" del todo).
          g = best;
        }
      }
      type[y * W + x] = g;
      lvl[y * W + x] = l0;
    }
  }

  // 2) Distancias: agua ↔ tierra (orilla, profundidad y arena mojada).
  const waterMask = new Uint8Array(W * H);
  const landMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const w = WATER.has(type[i]) && type[i] !== G.WATERFALL;
    waterMask[i] = w ? 1 : 0;
    landMask[i] = w || type[i] === G.WATERFALL ? 0 : 1;
  }
  const distToWater = distanceTransform(waterMask, W, H, 12);
  const distToLand = distanceTransform(landMask, W, H, 60);

  // 3) Color base.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const g = type[i];
      const hpx = hash2(x, y, 7);
      const b = bayer(x, y);
      const n = low(x, y);
      const m = mid(x, y);
      let c;
      switch (g) {
        case G.JUNGLE:
        case G.TALL_GRASS: {
          const t = n * 0.75 + m * 0.45 + (b - 0.5) * 0.35 + (hpx - 0.5) * 0.15 - 0.15 + lvl[i] * 0.06;
          c = pick(g === G.TALL_GRASS ? C.grass : C.jungleFloor, t);
          c = bank(c, distToWater[i], x, y);
          break;
        }
        case G.GRASS: {
          const t = n * 0.6 + m * 0.5 + (b - 0.5) * 0.35 + (hpx - 0.5) * 0.15 - 0.05;
          c = bank(pick(C.grass, t), distToWater[i], x, y);
          break;
        }
        case G.SAND: {
          const ripple = Math.sin(y * 0.55 + x * 0.12 + m * 9) > 0.86 ? 0.25 : 0;
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
        case G.RIVER: {
          const d = distToLand[i];
          let base;
          if (g === G.RIVER) base = mix(C.waterShallow, C.river, Math.min(1, d / 10));
          else if (d < 14) base = mix(C.waterShallow, C.waterMid, d / 14);
          else if (d < 40) base = mix(C.waterMid, C.waterDeep, (d - 14) / 26);
          else base = mix(C.waterDeep, C.waterDeepest, Math.min(1, (d - 40) / 20));
          // Bandas de color con trama (pixel art, no degradado liso).
          c = waterBand(g, d + (b - 0.5) * 5 + (n - 0.5) * 6);
          break;
        }
        case G.CHASM:
          c = mix(rgb('#1a120c'), rgb('#000000'), Math.min(1, (y % TILE) / TILE));
          break;
        case G.WATERFALL:
          c = C.stone[0];
          break;
        default:
          c = C.stone[2];
      }
      px[i] = c;
    }
  }

  drawStone(pc, map, type);
  drawBridge(pc, map);

  // 4) Contornos de cómic entre suelos (el de más prioridad dibuja el borde).
  const src = px.slice();
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const g = type[i];
      const p = PRIORITY[g];
      if (p === undefined) continue;
      let lower = false;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        const q = PRIORITY[type[j]];
        if (q !== undefined && q < p && lvl[j] === lvl[i]) { lower = true; break; }
      }
      if (!lower) continue;
      if (VEG.has(g)) px[i] = C.outlineGreen;
      else if (g === G.DIRT) px[i] = C.dirt[0];
      else if (g === G.SAND) px[i] = C.wetSand[0];
      else if (g === G.STONE || g === G.BRIDGE) px[i] = C.outline;
      // Segundo píxel algo más oscuro: da volumen al borde.
      const k = i + (type[i + W] === g ? W : -W);
      if (type[k] === g && VEG.has(g)) px[k] = shade(src[k], 0.78);
    }
  }

  drawDecals(pc, map, type);
  drawCliffs(pc, map, type);

  return { canvas: pc.toCanvas(), type, distToLand, distToWater, width: W, height: H };
}

/** Losas de piedra con juntas, grietas y musgo (suelo de las ruinas). */
function drawStone(pc, map, type) {
  const W = pc.w;
  for (let y = 0; y < pc.h; y++) {
    const row = (y / 14) | 0;
    const off = (row % 2) * 9;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (type[i] !== G.STONE) continue;
      const lx = (x + off) % 18;
      const ly = y % 14;
      const slab = hash2(((x + off) / 18) | 0, row, 5);
      let c = pick(C.stone, 0.45 + slab * 0.4 + (bayer(x, y) - 0.5) * 0.2);
      if (ly === 0 || lx === 0) c = C.stone[0];
      else if (ly === 1 || lx === 1) c = C.stone[4];
      else if (ly === 13 || lx === 17) c = C.stone[1];
      // Musgo en las juntas y manchas.
      if ((ly <= 1 || lx <= 1) && hash2(x, y, 9) < 0.45) c = C.moss[(x + y) % 2];
      if (slab > 0.8 && hash2(x >> 2, y >> 2, 3) < 0.35) c = C.moss[1 + (bayer(x, y) > 0.5 ? 1 : 0)];
      pc.data[i] = c;
    }
  }
}

/** Puente colgante: tablones con huecos, cuerdas en los bordes. */
function drawBridge(pc, map) {
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.groundAt(tx, ty) !== G.BRIDGE) continue;
      const north = map.groundAt(tx, ty - 1) !== G.BRIDGE;
      const south = map.groundAt(tx, ty + 1) !== G.BRIDGE;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const gx = tx * TILE + x;
          const gy = ty * TILE + y;
          const plank = (gx / 6) | 0;
          const lx = gx % 6;
          const sag = Math.round(Math.sin((gx / (TILE * 6)) * Math.PI) * 2);
          let c;
          if (lx === 5) c = shade(C.river, 0.55); // hueco entre tablones
          else {
            const t = hash2(plank, ty, 21);
            c = C.wood[2 + Math.floor(t * 3)];
            if (lx === 0) c = C.wood[4];
            if (lx === 4) c = C.wood[1];
            if (hash2(gx, gy, 4) < 0.05) c = C.wood[1];
          }
          if (north && y < 3 + sag) c = shade(C.river, 0.6);
          if (south && y > TILE - 4 + sag) c = shade(C.river, 0.6);
          if (north && (y === 3 + sag || y === 4 + sag)) c = y === 3 + sag ? C.rope[2] : C.rope[0];
          if (south && (y === TILE - 5 + sag || y === TILE - 4 + sag)) c = y === TILE - 5 + sag ? C.rope[2] : C.rope[0];
          pc.set(gx, gy, c);
        }
      }
    }
  }
}

/** Detalles del suelo: hojas caídas, plantitas, flores, conchas, piedrecitas. */
function drawDecals(pc, map, type) {
  const W = pc.w;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      for (let k = 0; k < 6; k++) {
        const r = hash2(tx * 7 + k, ty * 13 + k, 31);
        const x = tx * TILE + Math.floor(hash2(tx, ty * 3 + k, 41) * TILE);
        const y = ty * TILE + Math.floor(hash2(tx * 5 + k, ty, 51) * TILE);
        const g = type[y * W + x];
        if (g === G.JUNGLE || g === G.GRASS) {
          if (r < 0.28) { // plantita en V
            const col = g === G.JUNGLE ? C.jungleLeaf[4] : C.grass[4];
            pc.set(x, y, col); pc.set(x - 1, y - 1, col); pc.set(x + 1, y - 1, col);
            pc.set(x, y + 1, C.outlineGreen);
          } else if (r < 0.4 && g === G.JUNGLE) { // hoja caída
            const col = r < 0.34 ? rgb('#6b5a22') : rgb('#4a3a18');
            pc.set(x, y, col); pc.set(x + 1, y, col); pc.set(x + 1, y + 1, C.outlineGreen);
          } else if (r < 0.43 && hash2(tx >> 1, ty >> 1, 77) < 0.3) { // flores, en grupos
            const fl = hash2(tx >> 1, ty >> 1, 78) < 0.55 ? C.red : C.purple;
            pc.set(x, y - 1, fl[3]); pc.set(x - 1, y, fl[2]); pc.set(x + 1, y, fl[2]); pc.set(x, y, C.yellow[2]);
            pc.set(x, y + 1, fl[1]); pc.set(x - 1, y + 1, C.outlineGreen); pc.set(x + 1, y + 1, C.outlineGreen);
            pc.set(x, y + 2, C.jungleLeaf[3]);
          } else if (r < 0.5 && g === G.GRASS) {
            pc.set(x, y, C.yellow[2]); pc.set(x, y + 1, C.yellow[0]);
          }
        } else if (g === G.SAND) {
          if (r < 0.12) { // concha
            pc.set(x, y, rgb('#fff4ea')); pc.set(x + 1, y, rgb('#f2b8a8')); pc.set(x, y + 1, C.wetSand[0]); pc.set(x + 1, y + 1, C.wetSand[0]);
          } else if (r < 0.16) {
            pc.set(x, y, C.stone[3]); pc.set(x, y + 1, C.sand[0]);
          }
        } else if (g === G.DIRT) {
          if (r < 0.35) { // piedrecita
            pc.set(x, y, C.stone[4]); pc.set(x + 1, y, C.stone[2]); pc.set(x, y + 1, C.stone[1]); pc.set(x + 1, y + 1, C.dirt[0]);
          } else if (r < 0.45) {
            pc.set(x, y, C.dirt[0]); pc.set(x + 1, y + 1, C.dirt[0]);
          }
        }
      }
    }
  }
}

/** Paredes de acantilado con bloques de piedra, musgo, lianas, borde de hierba y sombra al pie. */
function drawCliffs(pc, map, type) {
  const W = pc.w;
  // Bloques irregulares por bandas horizontales.
  const bandH = (b) => 9 + Math.floor(hash2(b, 0, 61) * 4);
  for (let tx = 0; tx < map.width; tx++) {
    for (let ty = 0; ty < map.height; ty++) {
      if (!map.isCliff(tx, ty)) continue;
      const top = map.cliffColumnTop(tx, ty) * TILE;
      for (let y = ty * TILE; y < (ty + 1) * TILE; y++) {
        // Banda en la que cae y.
        let by = top;
        let band = 0;
        while (by + bandH(band) <= y) { by += bandH(band); band++; }
        const ly = y - by;
        const bh = bandH(band);
        for (let x = tx * TILE; x < (tx + 1) * TILE; x++) {
          // Bloques de anchura 12–22 px por banda.
          const off = Math.floor(hash2(band, 1, 71) * 20);
          const bw = 12 + Math.floor(hash2(band, 2, 81) * 8);
          const bx = Math.floor((x + off) / bw);
          const lx = (x + off) % bw;
          const tone = hash2(bx, band, 91);
          let c = pick(C.stone, 0.35 + tone * 0.45 + (bayer(x, y) - 0.5) * 0.25);
          if (ly === 0 || lx === 0) c = C.outline;
          else if (ly === 1) c = C.stone[4];
          else if (lx === 1) c = C.stone[3];
          else if (ly === bh - 1 || lx === bw - 1) c = C.stone[1];
          if (hash2(x, y, 13) < 0.03) c = C.stone[0]; // grietas
          // Musgo: más cerca del borde superior y en manchas.
          const rel = (y - top) / (3 * TILE);
          const mossN = fbm(x / 9, y / 9, 17, 2) + (1 - rel) * 0.35;
          if (mossN > 0.78) c = C.moss[mossN > 0.86 ? 2 : bayer(x, y) > 0.5 ? 1 : 0];
          pc.data[y * W + x] = c;
        }
      }
    }
  }
  // Borde superior: la hierba de arriba sobresale, con contorno; lianas colgando.
  for (let tx = 0; tx < map.width; tx++) {
    for (let ty = 0; ty < map.height; ty++) {
      if (!map.isCliff(tx, ty) || map.isCliff(tx, ty - 1)) continue;
      const bottomY = (map.cliffColumnBottom(tx, ty) + 1) * TILE;
      for (let x = tx * TILE; x < (tx + 1) * TILE; x++) {
        const drop = 3 + Math.floor(fbm(x / 5, ty, 23, 2) * 6);
        for (let k = 0; k < drop; k++) {
          const c = k === drop - 1 ? C.outlineGreen : k === drop - 2 ? C.jungleFloor[1] : pick(C.jungleFloor, 0.5 + bayer(x, k) * 0.4);
          pc.set(x, ty * TILE + k, c);
        }
        // Lianas.
        if (hash2(x, ty, 33) < 0.07) {
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
        }
      }
      // Sombra proyectada al pie de la pared.
      for (let x = tx * TILE; x < (tx + 1) * TILE; x++) {
        for (let k = 0; k < 10; k++) {
          const y = bottomY + k;
          if (y >= pc.h) break;
          if (k < 2 || bayer(x, y) < 1 - k / 10) pc.data[y * W + x] = shade(pc.data[y * W + x], k < 2 ? 0.45 : 0.7);
        }
      }
    }
  }
  // Bordes de meseta que no son pared (este, oeste, norte) y salientes.
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const g = map.groundAt(tx, ty);
      const lv = map.levelAt(tx, ty);
      if (g === G.LEDGE_S) { drawLedge(pc, tx, ty); continue; }
      if (lv === 0 || g === G.CLIFF) continue;
      const lower = (x, y) => {
        const k = map.groundAt(x, y);
        return k !== -1 && k !== G.CLIFF && k !== G.LEDGE_S && k !== G.WATERFALL && map.levelAt(x, y) < lv;
      };
      const x0 = tx * TILE;
      const y0 = ty * TILE;
      for (const [dx, side] of [[-1, 'w'], [1, 'e']]) {
        if (!lower(tx + dx, ty)) continue;
        for (let y = y0; y < y0 + TILE; y++) {
          const ex = side === 'w' ? x0 : x0 + TILE - 1;
          pc.set(ex, y, C.outlineGreen);
          // Cara lateral de piedra en el tile bajo.
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
      if (lower(tx, ty - 1)) for (let x = x0; x < x0 + TILE; x++) { pc.set(x, y0, C.outlineGreen); pc.set(x, y0 + 1, C.moss[2]); }
    }
  }
}

/** Saliente: hierba arriba, labio de piedra con contorno y la hierba de abajo. */
function drawLedge(pc, tx, ty) {
  const x0 = tx * TILE;
  const y0 = ty * TILE;
  for (let x = x0; x < x0 + TILE; x++) {
    const wob = Math.round(Math.sin(x * 0.4) * 1.5);
    for (let y = y0; y < y0 + TILE; y++) {
      const ly = y - y0 - wob;
      let c;
      if (ly < 9) c = pick(C.jungleFloor, 0.45 + bayer(x, y) * 0.4);
      else if (ly === 9) c = C.outlineGreen;
      else if (ly < 18) c = ly === 10 ? C.stone[4] : pick(C.stone, 0.25 + bayer(x, y) * 0.4);
      else if (ly === 18) c = C.outline;
      else if (ly < 22) c = shade(pick(C.jungleFloor, 0.3 + bayer(x, y) * 0.3), 0.7);
      else continue;
      pc.set(x, y, c);
    }
  }
}
