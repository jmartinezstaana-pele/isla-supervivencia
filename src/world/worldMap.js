// La isla completa (sesión 5, TRASPASO §2.4): 200 × 160 tiles de 32 px,
// semiprocedural con semilla y regiones colocadas a mano. El trozo hecho a mano
// en la sesión 3 (islandMap.js, 84 × 36: playa del naufragio, selva, ruinas y
// campamento de la tribu) se incrusta en el suroeste, en (PIECE_X, PIECE_Y).
//
//   suroeste ........ playa del naufragio + selva (el trozo de la sesión 3)
//   oeste y centro .. selva
//   noroeste ........ poblado de la tribu, rodeado de hierba alta
//   centro-norte .... monte con terrazas (niveles 1–4) y cumbre nevada con antena
//   este del monte .. campamento militar abandonado con la entrada del búnker
//   noreste ......... acantilados del viento (nivel 2) con grietas y nidos
//   este ............ bahía con embarcadero, helipuerto y barca naufragada
//   sur ............. manglar con barro, agua turbia y niebla

import { TILE } from '../config.js';
import { fbm, hash2 } from '../core/rng.js';
import { TileMap } from './tilemap.js';
import { G } from './tiles.js';
import { buildIsland, zoneAt as pieceZoneAt, PLACES as PIECE_PLACES, MAP_W as PIECE_W, MAP_H as PIECE_H, shoreX } from './islandMap.js';

export const WORLD_W = 200;
export const WORLD_H = 160;
/** Esquina del trozo de la sesión 3 dentro de la isla. */
export const PIECE_X = 4;
export const PIECE_Y = 116;

/** Lugares clave de la isla, en tiles. */
export const WORLD_PLACES = {
  spawn: [PIECE_PLACES.spawn[0] + PIECE_X, PIECE_PLACES.spawn[1] + PIECE_Y],
  wreck: [PIECE_PLACES.wreck[0] + PIECE_X, PIECE_PLACES.wreck[1] + PIECE_Y],
  poblado: { x: 32, y: 70, r: 9 },
  monte: { x: 96, y: 58, rx: 58, ry: 50 },
  cumbre: [96, 57],
  militar: { x: 168, y: 76, r: 11 },
  bunker: [172, 68.6],
  acantilados: { x0: 146, y1: 44 },
  bahia: { x: 199, y: 103, r: 15 },
  muelle: { y: 101 },
  helipuerto: { x: 179, y: 113 },
  barca: [183.5, 90],
  manglar: { x: 124, y: 140, rx: 30, ry: 15 },
};

/** Nombre y subtítulo de cada zona (cartel al entrar, mapa M, aterrizaje). */
export const ZONES = {
  playa: ['Playa del naufragio', 'Peligro bajo'],
  costa: ['La costa', 'Peligro bajo · cocos y cangrejos'],
  selva: ['La selva', 'Peligro medio · jabalíes'],
  ruinas: ['Ruinas antiguas', 'Algo brilla entre las piedras'],
  campamento: ['Campamento de la tribu', 'Peligro alto · no te dejes ver'],
  poblado: ['Poblado de la tribu', 'Peligro muy alto · la choza del jefe'],
  monte: ['El monte', 'Peligro medio · paredes para escalar'],
  cumbre: ['La cumbre', 'Frío intenso · la vieja antena'],
  militar: ['Campamento militar', 'Abandonado · el búnker sigue cerrado'],
  acantilados: ['Acantilados del viento', 'Peligro medio-alto · cuidado con las grietas'],
  bahia: ['Bahía este', 'Peligro bajo · embarcadero y helipuerto'],
  manglar: ['El manglar', 'Peligro medio · barro y niebla'],
  mar: ['El mar', 'Aguas profundas'],
};
export const ZONE_IDS = Object.keys(ZONES);

const inPiece = (x, y) => x >= PIECE_X && x < PIECE_X + PIECE_W && y >= PIECE_Y && y < PIECE_Y + PIECE_H;

/** Costa oeste junto al trozo (sigue la línea de costa de la playa del naufragio). */
function westCoast(y) {
  const py = y - PIECE_Y;
  if (py >= 0 && py < PIECE_H) return PIECE_X + shoreX(py);
  if (py < 0) return PIECE_X + shoreX(0) - Math.min(14, -py * 0.3) + Math.sin(y * 0.21) * 1.5;
  return PIECE_X + shoreX(PIECE_H - 1) + (py - PIECE_H + 1) * 1.6;
}

/** Distancia aproximada a la costa en tiles: positiva en tierra. */
export function landValue(x, y) {
  const ex = (x - 102) / 97;
  const ey = (y - 80) / 77;
  let d = (1 - Math.hypot(ex, ey)) * 60 + (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 20;
  const B = WORLD_PLACES.bahia;
  d = Math.min(d, (Math.hypot((x - B.x) / 1.15, y - B.y) - B.r) * 1.2 + (fbm(x * 0.2, y * 0.2, 8) - 0.5) * 3);
  if (y > 40) {
    const w = Math.min(1, (y - 40) / 30);
    d = Math.min(d, d * (1 - w) + (x - westCoast(y)) * w);
  }
  return d;
}

const ell = (x, y, cx, cy, rx, ry) => Math.hypot((x - cx) / rx, (y - cy) / ry);

/** Nivel del monte (0–4) fuera del trozo. */
function monteLevel(x, y) {
  const M = WORLD_PLACES.monte;
  const n = (fbm(x * 0.07, y * 0.07, 61) - 0.5) * 0.32;
  const m = 1 - ell(x, y, M.x, M.y, M.rx, M.ry) + n;
  let lvl = m > 0.8 ? 4 : m > 0.57 ? 3 : m > 0.32 ? 2 : m > 0 ? 1 : 0;
  // Lengua de nivel 1 que baja hasta la meseta de las ruinas del trozo.
  const dy = PIECE_Y - y;
  if (dy > 0 && dy <= 30) {
    const wob = dy * 0.7 + Math.sin(y * 0.4) * 1.2 * Math.min(1, dy / 4);
    const x0 = PIECE_X + PIECE_PLACES.plateau.x0 - (dy > 2 ? wob : 0);
    const x1 = PIECE_X + PIECE_PLACES.plateau.x1 + (dy > 2 ? wob : 0);
    if (x >= x0 && x <= x1) lvl = Math.max(lvl, 1);
  }
  return lvl;
}

const inAcantilados = (x, y) => x >= WORLD_PLACES.acantilados.x0 + Math.sin(y * 0.3) * 2 && y <= WORLD_PLACES.acantilados.y1 + (fbm(x * 0.15, 3, 71) - 0.5) * 6;

/** Caminos de tierra (polilíneas en tiles de la isla). Los del trozo ya vienen pintados. */
export const WORLD_PATHS = [
  // De la playa del naufragio hacia el norte por la costa, hasta el poblado.
  [[PIECE_X + 15, PIECE_Y + 0.5], [21, 108], [20, 96], [24, 84], [28, 76]],
  // Del poblado al pie del monte (terraza 1).
  [[38, 70], [46, 72], [52, 80]],
  // De la meseta de las ruinas hacia la cumbre, de terraza en terraza.
  [[PIECE_X + 37, PIECE_Y + 0.5], [38, 104], [40, 94], [50, 86], [62, 80], [84, 76], [100, 68], [102, 62], [98, 59]],
  // Del sur del campamento de la tribu al manglar.
  [[PIECE_X + 74, PIECE_Y + 35.5], [86, 154], [100, 148], [112, 142], [124, 140]],
  // De la selva del este al campamento militar y a la bahía.
  [[PIECE_X + 83.5, PIECE_Y + 22], [100, 136], [118, 122], [138, 106], [152, 92], [162, 82]],
  [[172, 80], [180, 88], [184, 100], [186, 108]],
  // Del campamento militar a los acantilados.
  [[166, 66], [164, 56], [160, 48]],
];

function distToSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export function distToWorldPaths(x, y) {
  let d = Infinity;
  for (const path of WORLD_PATHS) for (let i = 0; i + 1 < path.length; i++) d = Math.min(d, distToSeg(x, y, path[i], path[i + 1]));
  return d;
}

/** Río del monte: baja de la cumbre hasta la meseta de las ruinas (donde sigue el del trozo). */
const RIVER = [[90, 61], [88, 64], [80, 74], [66, 86], [56, 98], [PIECE_X + 47.5, 108], [PIECE_X + 47.5, PIECE_Y]];

function distToRiver(x, y) {
  let d = Infinity;
  for (let i = 0; i + 1 < RIVER.length; i++) d = Math.min(d, distToSeg(x, y, RIVER[i], RIVER[i + 1]));
  return d;
}

export function buildWorld() {
  const map = new TileMap(WORLD_W, WORLD_H);
  const M = WORLD_PLACES;
  const lvl = new Uint8Array(WORLD_W * WORLD_H);

  // 1) Tierra y mar, niveles.
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const i = y * WORLD_W + x;
      const v = landValue(x + 0.5, y + 0.5);
      if (v <= 0) {
        map.ground[i] = v > -4 ? G.SHALLOW : G.DEEP;
        continue;
      }
      let l = monteLevel(x + 0.5, y + 0.5);
      if (inAcantilados(x, y)) l = 2;
      // El poblado, el campamento militar y la bahía quedan en el llano.
      if (ell(x, y, M.militar.x, M.militar.y, M.militar.r + 6, M.militar.r + 6) < 1 || ell(x, y, M.poblado.x, M.poblado.y, M.poblado.r + 6, M.poblado.r + 6) < 1) l = 0;
      lvl[i] = l;
      map.ground[i] = G.JUNGLE;
    }
  }
  // Suaviza: sin islotes de un tile de otro nivel.
  for (let pass = 0; pass < 2; pass++) {
    const src = lvl.slice();
    for (let y = 1; y < WORLD_H - 1; y++) {
      for (let x = 1; x < WORLD_W - 1; x++) {
        const i = y * WORLD_W + x;
        const counts = new Map();
        for (const j of [i - 1, i + 1, i - WORLD_W, i + WORLD_W]) counts.set(src[j], (counts.get(src[j]) || 0) + 1);
        if ((counts.get(src[i]) || 0) <= 1) {
          let best = src[i];
          let bc = 0;
          for (const [k, c] of counts) if (c > bc) { bc = c; best = k; }
          lvl[i] = best;
        }
      }
    }
  }
  map.level.set(lvl);

  // 2) Suelo de cada bioma.
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const i = y * WORLD_W + x;
      if (map.ground[i] !== G.JUNGLE) continue;
      const l = lvl[i];
      const n = fbm(x * 0.13, y * 0.13, 91);
      const coast = landValue(x + 0.5, y + 0.5);
      let g = G.JUNGLE;
      if (inAcantilados(x, y)) g = n > 0.6 ? G.GRASS : G.ROCK;
      else if (l >= 4) g = G.SNOW;
      else if (l === 3) g = n > 0.6 ? G.SNOW : n < 0.26 ? G.GRASS : G.ROCK;
      else if (l === 2) g = n > 0.7 ? G.GRASS : G.NEEDLES;
      else if (l === 1) g = n > 0.66 ? G.GRASS : n < 0.3 ? G.NEEDLES : G.JUNGLE;
      else if (ell(x, y, M.manglar.x, M.manglar.y, M.manglar.rx, M.manglar.ry) < 1 + (n - 0.5) * 0.5) {
        const w = fbm(x * 0.22, y * 0.22, 93);
        g = w > 0.56 ? G.SWAMP : G.MUD;
      } else if (ell(x, y, M.militar.x, M.militar.y, M.militar.r, M.militar.r * 0.85) < 1 + (n - 0.5) * 0.2) g = G.GRAVEL;
      else if (Math.hypot(x - M.poblado.x, y - M.poblado.y) < M.poblado.r + (n - 0.5) * 2) g = G.DIRT;
      else if (Math.hypot(x - M.poblado.x, y - M.poblado.y) < M.poblado.r + 4 + (n - 0.5) * 3 && hash2(x >> 1, y >> 1, 5) < 0.8) g = G.TALL_GRASS;
      else if (coast < 2.6) g = G.SAND;
      else if (coast < 4.2 || n > 0.7) g = G.GRASS;
      else if (fbm(x * 0.09, y * 0.09, 97) > 0.68) g = G.TALL_GRASS;
      map.ground[i] = g;
    }
  }

  // 3) El trozo de la sesión 3.
  const piece = buildIsland();
  for (let y = 0; y < PIECE_H; y++) {
    for (let x = 0; x < PIECE_W; x++) {
      const wi = (y + PIECE_Y) * WORLD_W + x + PIECE_X;
      const pi = y * PIECE_W + x;
      map.ground[wi] = piece.ground[pi];
      map.level[wi] = piece.level[pi];
    }
  }

  const set = (x, y, g, l) => { if (!inPiece(x, y)) map.setTile(x, y, g, l); };
  const land = (x, y) => {
    const g = map.groundAt(x, y);
    return g !== -1 && g !== G.DEEP && g !== G.SHALLOW;
  };

  // 4) Caminos de tierra (no sobre agua, nieve ni roca).
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (inPiece(x, y)) continue;
      const g = map.groundAt(x, y);
      if (![G.JUNGLE, G.GRASS, G.NEEDLES, G.TALL_GRASS, G.SAND].includes(g)) continue;
      if (distToWorldPaths(x + 0.5, y + 0.5) < 0.95) map.ground[y * WORLD_W + x] = G.DIRT;
    }
  }

  // 5) Paredes de acantilado: cada caída hacia el sur se convierte en una pared de 3 tiles.
  for (let x = 0; x < WORLD_W; x++) {
    for (let y = 0; y < WORLD_H - 1; y++) {
      if (inPiece(x, y + 1) || !land(x, y) || !land(x, y + 1)) continue;
      const top = map.levelAt(x, y);
      if (map.levelAt(x, y + 1) >= top || map.groundAt(x, y) === G.CLIFF) continue;
      for (let k = 1; k <= 3; k++) {
        const yy = y + k;
        if (inPiece(x, yy) || !land(x, yy) || map.levelAt(x, yy) >= top) break;
        map.ground[yy * WORLD_W + x] = G.CLIFF;
      }
    }
  }
  // Un saliente en los acantilados del viento para bajar de un salto.
  for (let x = 158; x <= 163; x++) {
    for (let y = 30; y < 56; y++) {
      if (map.groundAt(x, y) === G.CLIFF && map.groundAt(x, y - 1) !== G.CLIFF) {
        map.ground[y * WORLD_W + x] = G.LEDGE_S;
        for (let k = 1; k <= 2; k++) if (map.groundAt(x, y + k) === G.CLIFF) { map.ground[(y + k) * WORLD_W + x] = G.JUNGLE; map.level[(y + k) * WORLD_W + x] = map.levelAt(x, y + 3); }
        break;
      }
    }
  }

  // 6) Río del monte con cascadas donde cruza las paredes, y puentes donde lo cruzan los caminos.
  for (let y = 0; y < PIECE_Y; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (!land(x, y)) continue;
      const d = distToRiver(x + 0.5, y + 0.5);
      if (d > 1.45 + (y > 100 ? 0.1 : 0)) continue;
      const g = map.groundAt(x, y);
      if (g === G.CLIFF || g === G.LEDGE_S) map.ground[y * WORLD_W + x] = G.WATERFALL;
      else map.ground[y * WORLD_W + x] = distToWorldPaths(x + 0.5, y + 0.5) < 0.75 ? G.BRIDGE : G.RIVER;
    }
  }
  // Puentes: rectángulos horizontales completos de orilla a orilla (como el del trozo).
  const spans = [];
  for (let y = 0; y < PIECE_Y; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (map.groundAt(x, y) !== G.BRIDGE || map.groundAt(x - 1, y) === G.BRIDGE) continue;
      let x0 = x;
      while (map.groundAt(x0 - 1, y) === G.RIVER) x0--;
      let x1 = x;
      while (map.groundAt(x1 + 1, y) === G.RIVER || map.groundAt(x1 + 1, y) === G.BRIDGE) x1++;
      const prev = spans.find((s2) => s2.y1 === y - 1 && s2.x0 <= x1 && s2.x1 >= x0);
      if (prev) { prev.y1 = y; prev.x0 = Math.min(prev.x0, x0); prev.x1 = Math.max(prev.x1, x1); } else spans.push({ x0, x1, y0: y, y1: y });
    }
  }
  for (const sp of spans) {
    sp.y1 = Math.min(sp.y1, sp.y0 + 1); // dos filas, como el puente del trozo
    for (let y = sp.y0; y <= sp.y1; y++) for (let x = sp.x0; x <= sp.x1; x++) map.ground[y * WORLD_W + x] = G.BRIDGE;
    for (let y = sp.y1 + 1; y < sp.y1 + 5; y++) for (let x = sp.x0; x <= sp.x1; x++) if (map.groundAt(x, y) === G.BRIDGE) map.ground[y * WORLD_W + x] = G.RIVER;
  }
  map.bridges = spans;

  // 7) Grietas en los acantilados del viento (se cruzan saltando).
  for (const [cx, cy, len] of [[172, 18, 5], [184, 26, 4], [160, 14, 4], [178, 36, 3]]) {
    for (let k = 0; k < len; k++) {
      const x = cx + Math.round(Math.sin(k * 0.9) * 0.6);
      const y = cy + k;
      for (const dx of [0, 1]) if (map.groundAt(x + dx, y) === G.ROCK || map.groundAt(x + dx, y) === G.GRASS) set(x + dx, y, G.CHASM);
    }
  }

  // 8) Bahía: embarcadero de madera hacia el agua y helipuerto de hormigón.
  {
    const y0 = M.muelle.y;
    let x = 160;
    while (x < WORLD_W && land(x, y0)) x++; // primer tile de agua
    const start = x - 1;
    for (let k = start; k < Math.min(WORLD_W - 1, start + 8); k++) for (const dy of [0, 1]) map.setTile(k, y0 + dy, G.BRIDGE, 0);
    M.muelle.x0 = start;
    M.muelle.x1 = Math.min(WORLD_W - 2, start + 7);
    const H = M.helipuerto;
    for (let y = H.y - 2; y <= H.y + 2; y++) for (let x2 = H.x - 2; x2 <= H.x + 2; x2++) if (land(x2, y)) map.setTile(x2, y, G.CONCRETE, 0);
    // Losa del búnker.
    const [bx, by] = M.bunker;
    for (let y = Math.floor(by) + 1; y <= Math.floor(by) + 2; y++) for (let x2 = Math.floor(bx) - 1; x2 <= Math.floor(bx) + 1; x2++) map.setTile(x2, y, G.CONCRETE, 0);
  }

  map.computeCliffs();
  map.helipad = { x: WORLD_PLACES.helipuerto.x, y: WORLD_PLACES.helipuerto.y };
  map.spawn = { x: WORLD_PLACES.spawn[0] * TILE, y: WORLD_PLACES.spawn[1] * TILE };
  map.piece = { x: PIECE_X, y: PIECE_Y, w: PIECE_W, h: PIECE_H, map: piece };
  map.zones = computeZones(map);
  map.zoneCenters = zoneCenters(map);
  return map;
}

/** Zona de un tile de tierra (índice en ZONE_IDS). */
function landZone(map, x, y) {
  const M = WORLD_PLACES;
  if (inPiece(x, y)) return pieceZoneAt((x - PIECE_X + 0.5) * TILE, (y - PIECE_Y + 0.5) * TILE);
  const g = map.groundAt(x, y);
  const l = map.levelAt(x, y);
  if (inAcantilados(x, y)) return 'acantilados';
  if (Math.hypot(x - M.militar.x, y - M.militar.y) < M.militar.r + 4) return 'militar';
  if (x > 170 && y > 82 && y < 126) return 'bahia';
  if (Math.hypot(x - M.poblado.x, y - M.poblado.y) < M.poblado.r + 6) return 'poblado';
  if (g === G.MUD || g === G.SWAMP || ell(x, y, M.manglar.x, M.manglar.y, M.manglar.rx + 2, M.manglar.ry + 2) < 1) return 'manglar';
  if (l >= 4 || (l >= 3 && g === G.SNOW)) return 'cumbre';
  if (l >= 1) return 'monte';
  if (g === G.SAND) return 'costa';
  return 'selva';
}

/** Cuadrícula de zonas: tierra según el bioma; el agua toma la zona de la tierra más cercana (hasta 6 tiles) o «mar». */
function computeZones(map) {
  const W = map.width;
  const H = map.height;
  const z = new Uint8Array(W * H).fill(255);
  const queue = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const g = map.groundAt(x, y);
      if (g === G.DEEP || g === G.SHALLOW) continue;
      z[y * W + x] = ZONE_IDS.indexOf(landZone(map, x, y));
      queue.push(y * W + x);
    }
  }
  const dist = new Uint8Array(W * H);
  for (let h = 0; h < queue.length; h++) {
    const i = queue[h];
    if (dist[i] >= 6) continue;
    const x = i % W;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= W * H || Math.abs((j % W) - x) > 1 || z[j] !== 255) continue;
      z[j] = z[i];
      dist[j] = dist[i] + 1;
      queue.push(j);
    }
  }
  const sea = ZONE_IDS.indexOf('mar');
  for (let i = 0; i < W * H; i++) if (z[i] === 255) z[i] = sea;
  return z;
}

/** Centro aproximado (en tiles) de cada zona, para las etiquetas de los mapas. */
function zoneCenters(map) {
  const acc = {};
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const g = map.groundAt(x, y);
      if (g === G.DEEP || g === G.SHALLOW) continue;
      const id = ZONE_IDS[map.zones[y * map.width + x]];
      const a = acc[id] || (acc[id] = { x: 0, y: 0, n: 0 });
      a.x += x; a.y += y; a.n++;
    }
  }
  const out = {};
  for (const [id, a] of Object.entries(acc)) out[id] = { x: a.x / a.n + 0.5, y: a.y / a.n + 0.5, n: a.n };
  // Retoques para que las etiquetas caigan en sitios reconocibles.
  out.costa = { x: 186, y: 128, n: out.costa ? out.costa.n : 0 };
  out.cumbre = { x: WORLD_PLACES.cumbre[0], y: WORLD_PLACES.cumbre[1], n: out.cumbre ? out.cumbre.n : 0 };
  if (out.monte) out.monte = { x: 72, y: 84, n: out.monte.n };
  return out;
}

/** Zona en píxeles de mundo. */
export function worldZoneAt(map, px, py) {
  const tx = Math.max(0, Math.min(map.width - 1, Math.floor(px / TILE)));
  const ty = Math.max(0, Math.min(map.height - 1, Math.floor(py / TILE)));
  return ZONE_IDS[map.zones[ty * map.width + tx]];
}
