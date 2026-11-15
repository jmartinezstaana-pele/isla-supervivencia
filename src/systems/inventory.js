// Inventario básico: huecos con objeto y cantidad.

import { ITEMS } from '../data/items.js';

export const SLOTS = 18;

export class Inventory {
  constructor() {
    this.slots = [];
  }

  add(id, n = 1) {
    if (!ITEMS[id]) throw new Error(`Objeto desconocido: ${id}`);
    const s = this.slots.find((x) => x.id === id);
    if (s) s.n += n;
    else if (this.slots.length < SLOTS) this.slots.push({ id, n });
    else return false;
    return true;
  }

  count(id) {
    const s = this.slots.find((x) => x.id === id);
    return s ? s.n : 0;
  }

  has(id) {
    return this.count(id) > 0;
  }

  remove(id, n = 1) {
    const s = this.slots.find((x) => x.id === id);
    if (!s || s.n < n) return false;
    s.n -= n;
    if (s.n === 0) this.slots.splice(this.slots.indexOf(s), 1);
    return true;
  }
}
