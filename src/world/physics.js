// Movimiento y colisión de cajas (AABB) contra el mapa de tiles.
//
// Cuerpo: { x, y, w, h, vx, vy } con (x, y) = esquina superior izquierda en píxeles.
// El movimiento se resuelve por ejes (primero X, luego Y). Quien llama debe
// subdividir el tiempo para que ningún subpaso mueva más de medio tile
// (ver PHYSICS_STEP en config.js), así no se atraviesan tiles a velocidad máxima.

import { TILE } from '../config.js';

const EPS = 1e-4;

const firstTile = (p) => Math.floor(p / TILE);
const lastTile = (p, size) => Math.floor((p + size - EPS) / TILE);

/** Mueve en X. Devuelve -1/1 si chocó con una pared por ese lado, 0 si no. */
export function moveX(body, map, dx) {
  if (dx === 0) return 0;
  body.x += dx;
  const ty0 = firstTile(body.y);
  const ty1 = lastTile(body.y, body.h);
  if (dx > 0) {
    const tx = lastTile(body.x, body.w);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (map.isSolid(tx, ty)) {
        body.x = tx * TILE - body.w;
        return 1;
      }
    }
  } else {
    const tx = firstTile(body.x);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (map.isSolid(tx, ty)) {
        body.x = (tx + 1) * TILE;
        return -1;
      }
    }
  }
  return 0;
}

/**
 * Mueve en Y. Las plataformas de un sentido solo frenan al caer, si en el paso
 * anterior los pies estaban por encima de su borde superior y no se está bajando
 * de ellas (ignorePlatforms). Devuelve 1 si aterrizó, -1 si chocó con el techo, 0 si no.
 */
export function moveY(body, map, dy, ignorePlatforms = false) {
  if (dy === 0) return 0;
  const prevBottom = body.y + body.h;
  body.y += dy;
  const tx0 = firstTile(body.x);
  const tx1 = lastTile(body.x, body.w);
  if (dy > 0) {
    const ty = lastTile(body.y, body.h);
    const top = ty * TILE;
    for (let tx = tx0; tx <= tx1; tx++) {
      const solid = map.isSolid(tx, ty);
      const platform = !ignorePlatforms && map.isOneWay(tx, ty) && prevBottom <= top + EPS;
      if (solid || platform) {
        body.y = top - body.h;
        return 1;
      }
    }
  } else {
    const ty = firstTile(body.y);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (map.isSolid(tx, ty)) {
        body.y = (ty + 1) * TILE;
        return -1;
      }
    }
  }
  return 0;
}

/** ¿Hay algo que pise justo debajo de los pies? Devuelve 'solid', 'platform' o null. */
export function groundBelow(body, map, ignorePlatforms = false) {
  const bottom = body.y + body.h;
  // Solo cuenta si los pies están exactamente en el borde de un tile.
  if (Math.abs(bottom - Math.round(bottom / TILE) * TILE) > 0.01) return null;
  const ty = Math.round(bottom / TILE);
  const tx0 = firstTile(body.x);
  const tx1 = lastTile(body.x, body.w);
  let result = null;
  for (let tx = tx0; tx <= tx1; tx++) {
    if (map.isSolid(tx, ty)) return 'solid';
    if (!ignorePlatforms && map.isOneWay(tx, ty)) result = 'platform';
  }
  return result;
}

/** ¿Cabe una caja en esa posición sin solaparse con tiles sólidos? */
export function boxFree(map, x, y, w, h) {
  for (let ty = firstTile(y); ty <= lastTile(y, h); ty++) {
    for (let tx = firstTile(x); tx <= lastTile(x, w); tx++) {
      if (map.isSolid(tx, ty)) return false;
    }
  }
  return true;
}
