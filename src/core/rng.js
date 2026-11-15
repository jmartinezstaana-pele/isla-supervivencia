// Generador de números aleatorios con semilla (mulberry32): la misma semilla
// produce siempre la misma secuencia, necesario para generar la isla.

export class RNG {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  /** Número en [0, 1). */
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Real en [min, max). */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /** Entero en [min, max] (ambos incluidos). */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
}

/** Hash entero rápido de dos coordenadas (variaciones deterministas por tile). */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
