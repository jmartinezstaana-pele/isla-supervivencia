// Colisión de la caja de los pies del jugador contra el mapa cenital.
// El movimiento se resuelve por ejes (deslizamiento contra paredes) y, si el
// choque es solo con una esquina, se empuja al jugador hacia el lado libre para
// que no se quede enganchado.

import { TILE } from '../config.js';
import { G, O, OBJECT_RECTS } from './tiles.js';

const EPS = 1e-4;
const FULL = { x: 0, y: 0, w: TILE, h: TILE };

/**
 * Rectángulo sólido de un tile para un cuerpo en el nivel `level`, o null si se puede pisar.
 * `airborne`: en el aire, las grietas no bloquean.
 */
export function solidRect(map, tx, ty, level, airborne = false) {
  if (!map.inBounds(tx, ty)) return FULL;
  const g = map.groundAt(tx, ty);
  if (g === G.CLIFF || g === G.LEDGE_S) return FULL;
  if (g === G.CHASM && !airborne) return FULL;
  if (map.levelAt(tx, ty) !== level) return FULL; // borde entre alturas
  const o = map.objectAt(tx, ty);
  if (o !== O.NONE) return OBJECT_RECTS[o];
  return null;
}

function overlapsRect(box, tx, ty, r) {
  const rx = tx * TILE + r.x;
  const ry = ty * TILE + r.y;
  return box.x < rx + r.w - EPS && box.x + box.w > rx + EPS && box.y < ry + r.h - EPS && box.y + box.h > ry + EPS;
}

/** Recorre los tiles que toca la caja y devuelve los choques { tx, ty, rx, ry, r }. */
function hits(map, box, level, airborne) {
  const out = [];
  const tx0 = Math.floor(box.x / TILE);
  const tx1 = Math.floor((box.x + box.w - EPS) / TILE);
  const ty0 = Math.floor(box.y / TILE);
  const ty1 = Math.floor((box.y + box.h - EPS) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const r = solidRect(map, tx, ty, level, airborne);
      if (r && overlapsRect(box, tx, ty, r)) out.push({ tx, ty, rx: tx * TILE + r.x, ry: ty * TILE + r.y, r });
    }
  }
  return out;
}

export function boxFree(map, box, level, airborne = false) {
  return hits(map, box, level, airborne).length === 0;
}

/**
 * Mueve la caja `box` ({x, y, w, h}) `d` píxeles en el eje 'x' o 'y'.
 * Devuelve la lista de choques (vacía si no chocó). Con `cornerSlide` > 0, si el
 * choque se evita desplazándose como mucho esos píxeles en el otro eje, se
 * desplaza hacia allí `slideStep` píxeles.
 */
export function moveAxis(map, box, axis, d, level, airborne = false, cornerSlide = 0, slideStep = 0) {
  if (d === 0) return [];
  const size = axis === 'x' ? 'w' : 'h';
  box[axis] += d;
  const found = hits(map, box, level, airborne);
  if (found.length === 0) return [];
  // Retrocede hasta el borde del obstáculo más cercano.
  if (d > 0) {
    let limit = Infinity;
    for (const h of found) limit = Math.min(limit, (axis === 'x' ? h.rx : h.ry) - box[size]);
    box[axis] = limit;
  } else {
    let limit = -Infinity;
    for (const h of found) limit = Math.max(limit, (axis === 'x' ? h.rx + h.r.w : h.ry + h.r.h));
    box[axis] = limit;
  }
  if (cornerSlide > 0) trySlide(map, box, axis, Math.sign(d), level, airborne, cornerSlide, slideStep);
  return found;
}

/** Corrección de esquinas: si un pequeño desplazamiento lateral libera el paso, se aplica. */
function trySlide(map, box, axis, dir, level, airborne, maxSlide, step) {
  const other = axis === 'x' ? 'y' : 'x';
  for (let off = 1; off <= maxSlide; off++) {
    for (const s of [-1, 1]) {
      const probe = { ...box };
      probe[other] += s * off;
      probe[axis] += dir; // ¿avanzaría con ese desplazamiento?
      if (boxFree(map, probe, level, airborne)) {
        const moved = { ...box };
        moved[other] += s * Math.min(step, off);
        if (boxFree(map, moved, level, airborne)) box[other] = moved[other];
        return;
      }
    }
  }
}

/** Si la caja se solapa con algo, la mueve al hueco libre más cercano (hasta `maxDist` px). */
export function nudgeFree(map, box, level, maxDist = 24) {
  if (boxFree(map, box, level)) return true;
  for (let d = 1; d <= maxDist; d++) {
    for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]]) {
      const probe = { ...box, x: box.x + ox, y: box.y + oy };
      if (boxFree(map, probe, level)) {
        box.x = probe.x;
        box.y = probe.y;
        return true;
      }
    }
  }
  return false;
}
