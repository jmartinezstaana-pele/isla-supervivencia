// Colisión de cajas (pies del jugador, enemigos, animales) contra el mundo: tiles
// sólidos (río, acantilados, bordes de altura…) y props sólidos (troncos, rocas,
// cajas, muros de las ruinas…). Movimiento por ejes con deslizamiento y
// corrección de esquinas.

import { TILE } from '../config.js';
import { G } from './tiles.js';

const EPS = 1e-4;
const CELL = 64;

/** Índice espacial de rectángulos de props por celdas de 64 px. */
export class PropGrid {
  constructor(widthPx, heightPx) {
    this.cw = Math.ceil(widthPx / CELL);
    this.ch = Math.ceil(heightPx / CELL);
    this.cells = Array.from({ length: this.cw * this.ch }, () => []);
  }

  add(item) {
    const r = item.col;
    for (let cy = Math.floor(r.y / CELL); cy <= Math.floor((r.y + r.h) / CELL); cy++) {
      for (let cx = Math.floor(r.x / CELL); cx <= Math.floor((r.x + r.w) / CELL); cx++) {
        if (cx >= 0 && cy >= 0 && cx < this.cw && cy < this.ch) this.cells[cy * this.cw + cx].push(item);
      }
    }
  }

  remove(item) {
    for (const cell of this.cells) {
      const i = cell.indexOf(item);
      if (i >= 0) cell.splice(i, 1);
    }
  }

  query(box, out = new Set()) {
    for (let cy = Math.floor(box.y / CELL); cy <= Math.floor((box.y + box.h) / CELL); cy++) {
      for (let cx = Math.floor(box.x / CELL); cx <= Math.floor((box.x + box.w) / CELL); cx++) {
        if (cx >= 0 && cy >= 0 && cx < this.cw && cy < this.ch) for (const it of this.cells[cy * this.cw + cx]) out.add(it);
      }
    }
    return out;
  }
}

/** ¿El tile bloquea a un cuerpo en el nivel `level`? */
export function tileBlocks(map, tx, ty, level, airborne = false) {
  if (!map.inBounds(tx, ty)) return true;
  const g = map.groundAt(tx, ty);
  if (g === G.CLIFF || g === G.LEDGE_S || g === G.RIVER || g === G.WATERFALL) return true;
  if (g === G.CHASM && !airborne) return true;
  return map.levelAt(tx, ty) !== level;
}

const overlaps = (a, b) => a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;

/** Obstáculos que se solapan con la caja: [{ x, y, w, h }]. */
export function hits(world, box, level, airborne = false) {
  const out = [];
  const { map } = world;
  const tx0 = Math.floor(box.x / TILE);
  const tx1 = Math.floor((box.x + box.w - EPS) / TILE);
  const ty0 = Math.floor(box.y / TILE);
  const ty1 = Math.floor((box.y + box.h - EPS) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tileBlocks(map, tx, ty, level, airborne)) out.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE });
    }
  }
  if (world.grid) {
    for (const p of world.grid.query(box)) {
      if (p.solid && (p.level || 0) === level && overlaps(box, p.col)) out.push(p.col);
    }
  }
  return out;
}

export function boxFree(world, box, level, airborne = false) {
  return hits(world, box, level, airborne).length === 0;
}

/**
 * Mueve la caja `d` px en el eje 'x' o 'y'. Devuelve los choques (vacío si no
 * chocó). Con `cornerSlide` > 0, si el choque se evita desplazándose como mucho
 * esos píxeles en el otro eje, se desplaza hacia allí `slideStep` px.
 */
export function moveAxis(world, box, axis, d, level, airborne = false, cornerSlide = 0, slideStep = 0) {
  if (d === 0) return [];
  const size = axis === 'x' ? 'w' : 'h';
  box[axis] += d;
  const found = hits(world, box, level, airborne);
  if (found.length === 0) return [];
  if (d > 0) {
    let limit = Infinity;
    for (const h of found) limit = Math.min(limit, h[axis] - box[size]);
    box[axis] = Math.max(limit, box[axis] - d);
  } else {
    let limit = -Infinity;
    for (const h of found) limit = Math.max(limit, h[axis] + h[size]);
    box[axis] = Math.min(limit, box[axis] - d);
  }
  if (cornerSlide > 0) trySlide(world, box, axis, Math.sign(d), level, airborne, cornerSlide, slideStep);
  return found;
}

function trySlide(world, box, axis, dir, level, airborne, maxSlide, step) {
  const other = axis === 'x' ? 'y' : 'x';
  for (let off = 1; off <= maxSlide; off++) {
    for (const s of [-1, 1]) {
      const probe = { ...box };
      probe[other] += s * off;
      probe[axis] += dir;
      if (boxFree(world, probe, level, airborne)) {
        const moved = { ...box };
        moved[other] += s * Math.min(step, off);
        if (boxFree(world, moved, level, airborne)) box[other] = moved[other];
        return;
      }
    }
  }
}

/** Si la caja se solapa con algo, la lleva al hueco libre más cercano. */
export function nudgeFree(world, box, level, maxDist = 24) {
  if (boxFree(world, box, level)) return true;
  for (let d = 1; d <= maxDist; d++) {
    for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]]) {
      const probe = { ...box, x: box.x + ox, y: box.y + oy };
      if (boxFree(world, probe, level)) {
        box.x = probe.x;
        box.y = probe.y;
        return true;
      }
    }
  }
  return false;
}

/** ¿Hay línea de visión entre dos puntos? (tiles que bloquean y props opacos). */
export function lineOfSight(world, x0, y0, x1, y1, level = 0) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(dist / 8);
  for (let i = 1; i < steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const g = world.map.groundAt(tx, ty);
    if (g === G.CLIFF || g === -1 || world.map.levelAt(tx, ty) > level) return false;
    for (const p of world.grid.query({ x, y, w: 1, h: 1 })) {
      if (p.opaque && x >= p.col.x && x <= p.col.x + p.col.w && y >= p.col.y - 6 && y <= p.col.y + p.col.h) return false;
    }
  }
  return true;
}
