import { TILE } from '../config.js';
import { G, O, LEGEND } from './tiles.js';

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.ground = new Uint8Array(width * height);
    this.object = new Uint8Array(width * height);
    this.level = new Uint8Array(width * height);
    // Para cada tile de acantilado: nivel de arriba y de abajo, y filas donde acaba.
    this.cliffTop = new Int16Array(width * height).fill(-1);
    this.cliffBase = new Int16Array(width * height).fill(-1);
    this.spawn = { x: 0, y: 0 }; // pies del jugador, en píxeles
  }

  /** Crea un mapa a partir de filas de texto (ver LEGEND en tiles.js). */
  static fromAscii(rows) {
    const height = rows.length;
    const width = rows[0].length;
    const map = new TileMap(width, height);
    rows.forEach((row, y) => {
      if (row.length !== width) throw new Error(`Fila ${y} del mapa con longitud ${row.length} (esperada ${width})`);
      [...row].forEach((ch, x) => {
        const def = LEGEND[ch];
        if (!def) throw new Error(`Carácter desconocido '${ch}' en el mapa (${x}, ${y})`);
        const i = y * width + x;
        map.ground[i] = def.g;
        map.object[i] = def.o || O.NONE;
        map.level[i] = def.h;
        if (def.spawn) map.spawn = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      });
    });
    map.computeCliffs();
    return map;
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

  groundAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.ground[this.idx(tx, ty)] : -1;
  }

  objectAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.object[this.idx(tx, ty)] : O.NONE;
  }

  levelAt(tx, ty) {
    return this.inBounds(tx, ty) ? this.level[this.idx(tx, ty)] : 0;
  }

  isCliff(tx, ty) {
    return this.groundAt(tx, ty) === G.CLIFF;
  }

  /** Tile en una posición en píxeles. */
  tileOf(px, py) {
    return [Math.floor(px / TILE), Math.floor(py / TILE)];
  }

  /**
   * Las paredes de acantilado van en columnas verticales: el tile de encima de la
   * columna marca el nivel de arriba y el de debajo, el nivel del pie de la pared.
   * Los salientes toman el nivel de abajo y guardan el de arriba en cliffTop.
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

  /** Primera fila de la columna de acantilado que contiene (tx, ty). */
  cliffColumnTop(tx, ty) {
    while (this.isCliff(tx, ty - 1)) ty--;
    return ty;
  }

  /** Última fila de la columna de acantilado que contiene (tx, ty). */
  cliffColumnBottom(tx, ty) {
    while (this.isCliff(tx, ty + 1)) ty++;
    return ty;
  }
}
