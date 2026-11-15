// Índice espacial de props por celdas (para no recorrer miles de props en cada
// fotograma): dibujo, luces, partículas e interacción preguntan solo por lo
// que hay cerca de la cámara o del jugador.

const CELL = 256;

export class PropIndex {
  constructor(widthPx, heightPx) {
    this.cw = Math.ceil(widthPx / CELL) + 1;
    this.ch = Math.ceil(heightPx / CELL) + 1;
    this.cells = Array.from({ length: this.cw * this.ch }, () => []);
  }

  cellOf(p) {
    const cx = Math.max(0, Math.min(this.cw - 1, Math.floor(p.x / CELL)));
    const cy = Math.max(0, Math.min(this.ch - 1, Math.floor(p.y / CELL)));
    return cy * this.cw + cx;
  }

  add(p) {
    this.cells[this.cellOf(p)].push(p);
  }

  remove(p) {
    const cell = this.cells[this.cellOf(p)];
    const i = cell.indexOf(p);
    if (i >= 0) cell.splice(i, 1);
  }

  /** Props cuyo punto base cae en [x0, x1] × [y0, y1]. */
  query(x0, y0, x1, y1, out = []) {
    const a = Math.max(0, Math.floor(x0 / CELL));
    const b = Math.max(0, Math.floor(y0 / CELL));
    const c = Math.min(this.cw - 1, Math.floor(x1 / CELL));
    const d = Math.min(this.ch - 1, Math.floor(y1 / CELL));
    for (let cy = b; cy <= d; cy++) {
      for (let cx = a; cx <= c; cx++) {
        for (const p of this.cells[cy * this.cw + cx]) if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) out.push(p);
      }
    }
    return out;
  }
}

/** Reserva de huecos (círculos) con rejilla, para repartir props sin que se monten. */
export class SpacingGrid {
  constructor(cell = 64) {
    this.cell = cell;
    this.map = new Map();
  }

  key(cx, cy) {
    return cx * 100003 + cy;
  }

  free(x, y, rad) {
    const c = this.cell;
    const r = Math.ceil((rad + 48) / c);
    const cx = Math.floor(x / c);
    const cy = Math.floor(y / c);
    for (let j = cy - r; j <= cy + r; j++) {
      for (let i = cx - r; i <= cx + r; i++) {
        const list = this.map.get(this.key(i, j));
        if (!list) continue;
        for (const s of list) if (Math.hypot(s.x - x, s.y - y) < rad + s.rad) return false;
      }
    }
    return true;
  }

  reserve(x, y, rad) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    let list = this.map.get(k);
    if (!list) this.map.set(k, (list = []));
    list.push({ x, y, rad });
  }
}
