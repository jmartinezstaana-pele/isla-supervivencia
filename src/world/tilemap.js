import { TILE } from '../config.js';
import { T, TILE_INFO } from './tiles.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
    this.spawn = { x: 0, y: 0 }; // en píxeles: pies del jugador
  }

  get pixelWidth() {
    return this.width * TILE;
  }

  get pixelHeight() {
    return this.height * TILE;
  }

  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  get(tx, ty) {
    if (!this.inBounds(tx, ty)) return T.EMPTY;
    return this.data[ty * this.width + tx];
  }

  set(tx, ty, type) {
    if (this.inBounds(tx, ty)) this.data[ty * this.width + tx] = type;
  }

  /** Rellena el rectángulo de tiles [x0, x1] × [y0, y1] (ambos incluidos). */
  fill(x0, y0, x1, y1, type) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, type);
  }

  /**
   * ¿Es sólido? Fuera del mapa por los lados cuenta como pared (no se puede salir
   * de la isla); por arriba y por abajo, como vacío.
   */
  isSolid(tx, ty) {
    if (tx < 0 || tx >= this.width) return true;
    return !!TILE_INFO[this.get(tx, ty)].solid;
  }

  isOneWay(tx, ty) {
    return !!TILE_INFO[this.get(tx, ty)].oneWay;
  }

  isWater(tx, ty) {
    return this.get(tx, ty) === T.WATER;
  }

  /** Tipo de tile en una posición en píxeles. */
  at(px, py) {
    return this.get(Math.floor(px / TILE), Math.floor(py / TILE));
  }
}
