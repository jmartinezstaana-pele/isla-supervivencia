import { TILE } from '../config.js';
import { G } from './tiles.js';

/** Cuadrícula de suelo y alturas. Los props van aparte (world/props.js). */
export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.ground = new Uint8Array(width * height);
    this.level = new Uint8Array(width * height);
    // Para cada tile de acantilado o saliente: nivel de arriba y de abajo.
    this.cliffTop = new Int16Array(width * height).fill(-1);
    this.cliffBase = new Int16Array(width * height).fill(-1);
    this.spawn = { x: 0, y: 0 };
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

  idx(tx, ty) {
    return ty * this.width + tx;
  }

  setTile(tx, ty, g, level) {
    if (!this.inBounds(tx, ty)) return;
    const i = this.idx(tx, ty);
    this.ground[i] = g;
    if (level !== undefined) this.level[i] = level;
  }

  groundAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.ground[this.idx(tx, ty)] : -1;
  }

  levelAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.level[this.idx(tx, ty)] : 0;
  }

  isCliff(tx, ty) {
    return this.groundAt(tx, ty) === G.CLIFF;
  }

  tileOf(px, py) {
    return [Math.floor(px / TILE), Math.floor(py / TILE)];
  }

  groundAtPx(px, py) {
    return this.groundAt(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  /**
   * Las paredes de acantilado van en columnas verticales: el tile de encima de la
   * columna marca el nivel de arriba y el de debajo, el nivel del pie de la pared.
   */
  computeCliffs() {
    for (let x = 0; x < this.width; x++) {
      let y = 0;
      while (y < this.height) {
        const g = this.groundAt(x, y);
        if (g === G.CLIFF) {
          const start = y;
          while (this.isCliff(x, y)) y++;
          const top = this.levelAt(x, start - 1);
          const base = this.levelAt(x, y);
          for (let k = start; k < y; k++) {
            const i = this.idx(x, k);
            this.cliffTop[i] = top;
            this.cliffBase[i] = base;
            this.level[i] = base;
          }
        } else {
          if (g === G.LEDGE_S) {
            const i = this.idx(x, y);
            this.cliffTop[i] = this.levelAt(x, y - 1);
            this.cliffBase[i] = this.levelAt(x, y + 1);
            this.level[i] = this.cliffBase[i];
          }
          y++;
        }
      }
    }
  }

  cliffColumnTop(tx, ty) {
    while (this.isCliff(tx, ty - 1)) ty--;
    return ty;
  }

  cliffColumnBottom(tx, ty) {
    while (this.isCliff(tx, ty + 1)) ty++;
    return ty;
  }
}
