// Mapa de la isla entera para el aterrizaje (TRASPASO §2.4 y §4d, sesión 4).
// Coordenadas en "casillas grandes" de la isla completa (unos 212 × 164). El
// trozo ya construido (islandMap.js, 84 × 36) ocupa el suroeste y se pinta con
// sus datos reales; el resto de biomas se pinta de forma aproximada y aparece
// cubierto de niebla como «zona sin explorar» hasta la sesión 5, en la que este
// mapa saldrá del mapa grande de verdad.

import { TILE } from '../config.js';
import { G } from './tiles.js';
import { zoneAt, shoreX } from './islandMap.js';
import { PixelCanvas, rgb, mix, shade, bayer } from '../gfx/pixel.js';
import { C } from '../gfx/palette.js';

export const LAND_W = 212;
export const LAND_H = 164;
/** Esquina del trozo explorado dentro de la isla completa. */
export const OX = 12;
export const OY = 100;
/** Píxeles del mapa pintado por casilla grande. */
export const LAND_PX = 2;

/** Biomas sin explorar: centro, radio y nombre (para las etiquetas). */
export const UNEXPLORED = [
  { id: 'monte', nombre: 'Monte', x: 112, y: 52, r: 30 },
  { id: 'militar', nombre: 'Campamento militar', x: 160, y: 62, r: 11 },
  { id: 'acantilados', nombre: 'Acantilados del viento', x: 178, y: 26, r: 18 },
  { id: 'bahia', nombre: 'Bahía este', x: 196, y: 100, r: 12 },
  { id: 'manglar', nombre: 'Manglar', x: 128, y: 138, r: 20 },
  { id: 'selvaNorte', nombre: 'Selva profunda', x: 50, y: 66, r: 24 },
];

/** Resultado del aterrizaje según la zona (§2.4). */
export const LANDING_RESULTS = {
  playa: { nombre: 'Playa del naufragio', dano: 10, avion: 'reparable', riesgo: 'Bajo', texto: 'La arena frena el avión. Se podría reparar.' },
  selva: { nombre: 'La selva', dano: 30, avion: 'destruido', riesgo: 'Medio', texto: 'Los árboles destrozan las alas.' },
  ruinas: { nombre: 'Meseta de las ruinas', dano: 45, avion: 'destruido', riesgo: 'Alto', texto: 'Golpe durísimo en lo alto, pero cerca de los secretos.' },
  campamento: { nombre: 'Campamento de la tribu', dano: 25, avion: 'destruido', riesgo: 'Alto', texto: 'El estruendo alerta a la tribu.' },
  mar: { nombre: 'El mar', dano: 0, avion: 'hundido', riesgo: 'Medio', texto: 'El avión se hunde. Llegas nadando a la costa.' },
};

// ------------------------------------------------------------------ forma de la isla
const hash = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function vnoise(x, y, s) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s);
  const b = hash(x0 + 1, y0, s);
  const c = hash(x0, y0 + 1, s);
  const d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;

/** Distancia (en casillas) a la costa: positiva en tierra, negativa en el mar. Fuera del trozo explorado. */
function landValue(x, y) {
  // Elipse deformada con ruido, una bahía al este y la costa oeste del trozo explorado.
  const ex = (x - 108) / 96;
  const ey = (y - 80) / 78;
  let d = (1 - Math.hypot(ex, ey)) * 70 + (fbm(x * 0.06, y * 0.06, 3) - 0.5) * 22;
  d -= Math.max(0, 14 - Math.hypot((x - 206) / 1.2, y - 100)) * 1.6; // bahía este
  // Junto al trozo explorado, la costa oeste sigue la de ese mapa.
  const yy = Math.max(0, Math.min(35, y - OY));
  const w = Math.max(0, 1 - Math.max(OY - y, y - (OY + 36), 0) / 22);
  if (w > 0) d = d * (1 - w) + (x - (OX + shoreX(yy))) * w;
  return d;
}

function biomeAt(x, y) {
  for (const b of UNEXPLORED) {
    const n = (fbm(x * 0.08, y * 0.08, 11 + b.r) - 0.5) * 0.5;
    if (Math.hypot(x - b.x, y - b.y) / b.r < 1 + n) return b;
  }
  return null;
}

const insideExplored = (x, y) => x >= OX && x < OX + 84 && y >= OY && y < OY + 36;

/**
 * Qué hay en un punto del mapa de aterrizaje: { kind, zone, explored, nombre }.
 * kind: 'mar' | 'tierra'. zone: clave de LANDING_RESULTS o id del bioma sin explorar.
 */
export function landingZoneAt(map, x, y) {
  if (insideExplored(x, y)) {
    const tx = Math.floor(x - OX);
    const ty = Math.floor(y - OY);
    const g = map.groundAt(tx, ty);
    if (g === G.DEEP || g === G.SHALLOW) return { kind: 'mar', zone: 'mar', explored: true, nombre: 'El mar' };
    let zone = zoneAt((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    if (map.levelAt(tx, ty) > 0 || g === G.CLIFF || g === G.LEDGE_S) zone = 'ruinas';
    return { kind: 'tierra', zone, explored: true, nombre: LANDING_RESULTS[zone].nombre };
  }
  if (landValue(x, y) <= 0) return { kind: 'mar', zone: 'mar', explored: true, nombre: 'El mar' };
  const b = biomeAt(x, y) || { id: 'selvaNorte', nombre: 'Selva profunda' };
  return { kind: 'tierra', zone: b.id, explored: false, nombre: b.nombre };
}

// ------------------------------------------------------------------ pintado
const P = {
  deep: rgb('#173f6a'), deep2: rgb('#1d5f86'), mid: rgb('#2f95a8'), shallow: rgb('#5fc4c4'), foam: rgb('#effaf2'),
  sand: C.sand, jungle: C.jungleLeaf, grass: C.grass, dirt: C.dirt, stone: C.stone, wood: C.wood,
  tall: ['#4a5a1e', '#6a7a2a', '#8a9a3a'].map((c) => rgb(c)),
  swamp: ['#1c2a18', '#2a3a1e', '#3a4a26', '#4f5f30'].map((c) => rgb(c)),
  swampWater: rgb('#3a6a5a'),
  snow: ['#b8c8d8', '#dfe8f0', '#ffffff'].map((c) => rgb(c)),
  rock: ['#3a3630', '#55504a', '#6e6a60', '#8e897c', '#aaa596'].map((c) => rgb(c)),
  khaki: ['#6a6040', '#8a7c52', '#a89868'].map((c) => rgb(c)),
  tent: ['#26301a', '#3a4a26', '#56663a'].map((c) => rgb(c)),
};

/** Copas de selva vistas desde arriba: grupos con luz por el noroeste y sombra por el sureste. */
function canopy(px, py, seed = 5) {
  const n = fbm(px * 0.22, py * 0.22, seed);
  const nl = fbm((px - 1.5) * 0.22, (py - 1.5) * 0.22, seed);
  let t = 1 + Math.floor(n * 4.4);
  if (nl < n - 0.025) t += 1;      // cara iluminada
  else if (nl > n + 0.03) t -= 1;  // cara en sombra
  return P.jungle[Math.max(0, Math.min(5, t))];
}

/** Color de un tile real del trozo explorado. */
function exploredColor(map, tx, ty, px, py) {
  const g = map.groundAt(tx, ty);
  const lvl = map.levelAt(tx, ty);
  const n = fbm(px * 0.35, py * 0.35, 5);
  const d = bayer(px, py);
  let c;
  switch (g) {
    case G.DEEP: c = P.deep2; break;
    case G.SHALLOW: c = n + d * 0.3 > 0.62 ? P.shallow : P.mid; break;
    case G.SAND: c = P.sand[1 + ((n * 3 + d) | 0) % 3]; break;
    case G.GRASS: c = P.grass[2 + ((n * 2 + d) | 0) % 2]; break;
    case G.DIRT: c = P.dirt[2 + ((n * 2 + d) | 0) % 2]; break;
    case G.RIVER: c = P.mid; break;
    case G.WATERFALL: c = P.foam; break;
    case G.BRIDGE: c = P.wood[3]; break;
    case G.CLIFF: c = P.stone[(py % 2) + 1]; break;
    case G.LEDGE_S: c = P.stone[2]; break;
    case G.TALL_GRASS: c = P.tall[((n * 3 + d) | 0) % 3]; break;
    case G.STONE: c = P.stone[3 + ((n + d) > 0.9 ? 1 : 0)]; break;
    default: c = canopy(px, py);
  }
  if (lvl > 0 && g !== G.CLIFF && g !== G.RIVER) c = shade(c, 1.15);
  return c;
}

/** Color de un punto de tierra sin explorar. */
function wildColor(x, y, px, py, dCoast) {
  const n = fbm(px * 0.3, py * 0.3, 21);
  const d = bayer(px, py);
  const b = biomeAt(x, y);
  const beach = dCoast < 2.4 && !(b && (b.id === 'acantilados' || b.id === 'monte'));
  if (b && b.id === 'monte') {
    const h = 1 - Math.hypot(x - b.x, y - b.y) / b.r + (fbm(x * 0.12, y * 0.12, 31) - 0.5) * 0.3;
    if (h > 0.78) return P.snow[Math.min(2, 1 + ((n + d) * 1.2) | 0)];
    const step = Math.floor(h * 5);
    const base = [P.jungle[3], P.grass[1], P.rock[2], P.rock[3], P.rock[4]][Math.max(0, Math.min(4, step))];
    // Curvas de nivel oscuras entre terrazas.
    const frac = h * 5 - step;
    if (frac < 0.12 && step >= 1) return P.rock[0];
    return frac > 0.75 ? shade(base, 1.12) : base;
  }
  if (b && b.id === 'acantilados') {
    if (dCoast < 2) return P.rock[(px + py) % 2];
    return n > 0.55 ? P.grass[1] : P.rock[2 + ((n * 2 + d) | 0) % 2];
  }
  if (beach) return P.sand[1 + ((n * 3 + d) | 0) % 3];
  if (b && b.id === 'manglar') return n + d * 0.25 > 0.72 ? P.swampWater : P.swamp[Math.min(3, (n * 4.5) | 0)];
  if (b && b.id === 'militar') {
    const lx = x - b.x;
    const ly = y - b.y;
    if ((Math.abs(lx + 3) < 2 && Math.abs(ly + 2) < 1.3) || (Math.abs(lx - 3) < 2 && Math.abs(ly - 1) < 1.3) || (Math.abs(lx) < 1.5 && Math.abs(ly + 5) < 1.2)) return P.tent[ly < 0 ? 2 : 1];
    if (Math.abs(Math.hypot(lx, ly) - 8.5) < 0.4) return P.wood[1];
    return P.khaki[((n * 3 + d) | 0) % 3];
  }
  if (b && b.id === 'bahia' && dCoast < 5) return P.sand[2];
  return canopy(px, py, 21);
}

/** Mar: más claro cerca de la costa (v = distancia con signo, negativa en el agua), con bandas de profundidad. */
function seaColor(v, px, py) {
  const t = Math.min(1, -v / 9);
  const dth = bayer(px, py) - 0.5;
  return t + dth * 0.25 < 0.25 ? P.shallow : t + dth * 0.2 < 0.55 ? P.mid : t < 0.85 ? P.deep2 : P.deep;
}

/**
 * Pinta la isla entera a LAND_PX píxeles por casilla. Devuelve { canvas, fog }:
 * la niebla (canvas aparte) cubre las zonas sin explorar.
 */
export function paintLandingMap(map) {
  const W = LAND_W * LAND_PX;
  const H = LAND_H * LAND_PX;
  const pc = new PixelCanvas(W, H);
  const land = new Uint8Array(W * H);
  const wild = new Uint8Array(W * H);
  const value = new Float32Array(W * H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / LAND_PX;
      const y = (py + 0.5) / LAND_PX;
      const i = py * W + px;
      let c;
      if (insideExplored(x, y)) {
        const tx = Math.floor(x - OX);
        const ty = Math.floor(y - OY);
        const g = map.groundAt(tx, ty);
        land[i] = g === G.DEEP || g === G.SHALLOW ? 0 : 1;
        value[i] = land[i] ? 3 : g === G.SHALLOW ? -1 : -4;
        c = land[i] ? exploredColor(map, tx, ty, px, py) : seaColor(x - (OX + shoreX(y - OY)), px, py);
      } else {
        const v = landValue(x, y);
        value[i] = v;
        if (v > 0) {
          land[i] = 1;
          wild[i] = 1;
          c = wildColor(x, y, px, py, v);
        } else {
          c = seaColor(v, px, py);
        }
      }
      pc.data[i] = c;
    }
  }
  // Río que baja del monte hasta la meseta del trozo explorado.
  const river = [[112, 62], [100, 74], [86, 84], [66, 94], [OX + 47.5, OY]];
  for (let k = 0; k + 1 < river.length; k++) {
    const [ax, ay] = river[k];
    const [bx, by] = river[k + 1];
    for (let t = 0; t <= 1; t += 0.01) {
      const wob = Math.sin(t * 9 + k) * 2;
      const x = (ax + (bx - ax) * t + wob) * LAND_PX;
      const y = (ay + (by - ay) * t) * LAND_PX;
      pc.rect(Math.round(x) - 1, Math.round(y), 3, 1, P.mid);
    }
  }
  // Espuma y contorno de cómic en la costa.
  const out = new Uint32Array(pc.data);
  for (let py = 1; py < H - 1; py++) {
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      const l = land[i];
      const edge = land[i - 1] !== l || land[i + 1] !== l || land[i - W] !== l || land[i + W] !== l;
      if (!edge) continue;
      out[i] = l ? shade(pc.data[i], 0.6) : (px + py) % 3 ? P.foam : P.shallow;
    }
  }
  pc.data.set(out);
  // Sombra hacia el sureste en la costa (la isla "sobresale" del mar).
  for (let py = H - 2; py >= 2; py--) {
    for (let px = W - 2; px >= 2; px--) {
      const i = py * W + px;
      if (!land[i] && land[i - W * 2 - 2]) pc.data[i] = mix(pc.data[i], P.deep, 0.45);
    }
  }

  // Niebla sobre lo no explorado: bruma translúcida con bancos más densos y borde suave.
  const fog = new PixelCanvas(W, H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / LAND_PX;
      const y = (py + 0.5) / LAND_PX;
      const dx = Math.max(OX - x, 0, x - (OX + 84));
      const dy = Math.max(OY - y, 0, y - (OY + 36));
      const dist = Math.hypot(dx, dy);
      if (dist <= 0) continue;
      const n = fbm(px * 0.035, py * 0.035, 41);
      const edge = Math.min(1, dist / 6);
      const dense = Math.max(0, (n - 0.5) * 2.2);
      const a = edge * (0.38 + dense * 0.45);
      const tone = Math.round(200 + dense * 45);
      const hex = (v) => v.toString(16).padStart(2, '0');
      fog.data[py * W + px] = rgb(`#${hex(tone - 6)}${hex(tone)}${hex(Math.min(255, tone + 10))}`, Math.round(a * 255));
    }
  }
  return { canvas: pc.toCanvas(), fog: fog.toCanvas(), land, wild };
}
