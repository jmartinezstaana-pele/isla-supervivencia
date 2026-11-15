// Primer trozo de isla hecho a mano (sesión 3, TRASPASO §4c): playa del naufragio
// al oeste y selva al este, con una meseta con ruinas, un río con cascada y puente
// colgante, hierba alta y un campamento de la tribu. 84 × 36 tiles de 32 px
// (unas 4 × 3 pantallas).

import { TILE } from '../config.js';
import { TileMap } from './tilemap.js';
import { G } from './tiles.js';

export const MAP_W = 84;
export const MAP_H = 36;

/** Lugares clave, en tiles. */
export const PLACES = {
  spawn: [17.5, 20.5],
  wreck: [12.5, 17.2],
  camp: [75, 20],
  campRadius: 7.2,
  ruins: { x0: 33, y0: 1, x1: 42, y1: 7 },
  bridge: { y0: 22, y1: 23 },
  plateau: { x0: 30, x1: 63, y1: 8 },
};

/** Línea de costa (x del primer tile de arena) para cada fila. */
export function shoreX(y) {
  return 11 + 1.6 * Math.sin(y * 0.33) + 0.9 * Math.sin(y * 0.81 + 2) + (y < 5 ? (5 - y) * 1.3 : 0) + (y > 31 ? (y - 31) * 1.1 : 0);
}

/** Ancho de la playa en cada fila. */
export const sandWidth = (y) => 8.5 + 1.8 * Math.sin(y * 0.47 + 1);

/** Centro del río para cada fila (al sur de la poza). */
export const riverX = (y) => 47 + 1.8 * Math.sin((y - 15) * 0.35);

/** Caminos de tierra: polilíneas en tiles. */
export const PATHS = [
  [[15, 21.5], [22, 21.8], [28, 21], [32, 17], [35.5, 13]],
  [[28, 21], [36, 23.2], [43, 22.6]],
  [[51, 22.6], [57, 23.5], [62, 22.5], [67.5, 20.5], [72, 20]],
  [[75, 26], [75.5, 31], [74, 36]],
  [[36, 8.5], [37.5, 7]],
];

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export function distToPaths(x, y) {
  let d = Infinity;
  for (const path of PATHS) for (let i = 0; i + 1 < path.length; i++) d = Math.min(d, distToSegment(x, y, path[i], path[i + 1]));
  return d;
}

export function zoneAt(px, py) {
  const x = px / TILE;
  const y = py / TILE;
  if (x < shoreX(y) + sandWidth(y) + 1.5) return 'playa';
  if (Math.hypot(x - PLACES.camp[0], y - PLACES.camp[1]) < PLACES.campRadius + 2.5) return 'campamento';
  const r = PLACES.ruins;
  if (y < 9 && x > r.x0 - 3 && x < 46) return 'ruinas';
  return 'selva';
}

export function buildIsland() {
  const map = new TileMap(MAP_W, MAP_H);
  map.ground.fill(G.JUNGLE);

  for (let y = 0; y < MAP_H; y++) {
    const shore = shoreX(y);
    const sandEnd = shore + sandWidth(y);
    for (let x = 0; x < MAP_W; x++) {
      const cx = x + 0.5;
      let g = G.JUNGLE;
      if (cx < shore - 4) g = G.DEEP;
      else if (cx < shore) g = G.SHALLOW;
      else if (cx < sandEnd) g = G.SAND;
      else if (cx < sandEnd + 3) g = G.GRASS;
      map.setTile(x, y, g, 0);
    }
  }

  // Meseta de nivel 1 al norte, con su pared de acantilado (filas 9–11) y un saliente al este.
  const P = PLACES.plateau;
  for (let y = 0; y <= 11; y++) {
    for (let x = P.x0; x <= P.x1; x++) {
      if (y <= P.y1 || x >= 56) map.setTile(x, y, G.JUNGLE, 1);
      else map.setTile(x, y, G.CLIFF, 0);
    }
  }
  for (let x = 56; x <= P.x1; x++) map.setTile(x, 12, G.LEDGE_S, 0);

  // Ruinas: suelo de losas.
  const R = PLACES.ruins;
  for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) map.setTile(x, y, G.STONE, 1);

  // Río: nace en la meseta, cae en cascada y baja hacia el sur.
  for (let y = 0; y <= 8; y++) for (let x = 46; x <= 48; x++) map.setTile(x, y, G.RIVER, 1);
  for (let y = 9; y <= 11; y++) for (let x = 46; x <= 48; x++) map.setTile(x, y, G.WATERFALL, 0);
  for (let y = 12; y <= 14; y++) for (let x = 44; x <= 50; x++) {
    if (Math.hypot((x - 47) / 3.6, (y - 13) / 1.8) <= 1.05) map.setTile(x, y, G.RIVER, 0);
  }
  for (let y = 14; y < MAP_H; y++) {
    const c = riverX(y);
    for (let x = Math.round(c - 1.6); x <= Math.round(c + 1.4); x++) map.setTile(x, y, G.RIVER, 0);
  }
  // Puente colgante sobre el río: rectángulo uniforme de orilla a orilla.
  let bx0 = Infinity;
  let bx1 = -Infinity;
  for (let y = PLACES.bridge.y0; y <= PLACES.bridge.y1; y++) {
    for (let x = 40; x < 56; x++) if (map.groundAt(x, y) === G.RIVER) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); }
  }
  for (let y = PLACES.bridge.y0; y <= PLACES.bridge.y1; y++) for (let x = bx0; x <= bx1; x++) map.setTile(x, y, G.BRIDGE, 0);

  // Claro del campamento.
  const [cx, cy] = PLACES.camp;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < PLACES.campRadius && map.groundAt(x, y) === G.JUNGLE && map.levelAt(x, y) === 0) {
        map.setTile(x, y, G.DIRT);
      }
    }
  }

  // Hierba alta junto al campamento (para acercarse sin ser visto) y otra mancha en la selva.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const inA = Math.hypot((x - 63) / 4.2, (y - 21) / 7.5) < 1 + 0.18 * Math.sin(x * 1.7 + y);
      const inB = Math.hypot((x - 36) / 3.2, (y - 30) / 2.4) < 1;
      if ((inA || inB) && map.groundAt(x, y) === G.JUNGLE && map.levelAt(x, y) === 0) map.setTile(x, y, G.TALL_GRASS);
    }
  }

  // Caminos de tierra.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const g = map.groundAt(x, y);
      if (g !== G.JUNGLE && g !== G.GRASS && g !== G.TALL_GRASS) continue;
      if (distToPaths(x + 0.5, y + 0.5) < 1.05) map.setTile(x, y, G.DIRT);
    }
  }

  map.computeCliffs();
  const [sx, sy] = PLACES.spawn;
  map.spawn = { x: sx * TILE, y: sy * TILE };
  return map;
}
