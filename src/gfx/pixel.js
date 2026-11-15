// Pequeña librería de pixel art sobre un Uint32Array: formas rellenas, sombreado
// por tonos (cel-shading) y contorno automático. Con ella se pintan por código el
// terreno, los props y los iconos, con el mismo aspecto que los sprites.

/** '#rrggbb' → entero ABGR (formato de ImageData en little-endian). */
export function rgb(hex, a = 255) {
  const n = parseInt(hex.slice(1), 16);
  return ((a & 255) << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255);
}

export function unpack(c) {
  return [c & 255, (c >> 8) & 255, (c >> 16) & 255, (c >>> 24) & 255];
}

export function pack(r, g, b, a = 255) {
  return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
}

/** Mezcla dos colores ABGR (t = 0 → a, t = 1 → b). */
export function mix(a, b, t) {
  const [r1, g1, b1, a1] = unpack(a);
  const [r2, g2, b2, a2] = unpack(b);
  return pack(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t, a1 + (a2 - a1) * t);
}

/** Oscurece / aclara un color (f < 1 oscurece). */
export function shade(c, f) {
  const [r, g, b, a] = unpack(c);
  const k = (v) => Math.max(0, Math.min(255, v * f));
  return pack(k(r), k(g), k(b), a);
}

// Matriz de Bayer 4 × 4 para tramas ordenadas.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

export class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }

  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
  }

  get(x, y) {
    x |= 0;
    y |= 0;
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.data[y * this.w + x] : 0;
  }

  /** Pinta solo si el píxel ya es opaco (para detalles dentro de una forma). */
  over(x, y, c) {
    if (this.get(x, y) >>> 24) this.set(x, y, c);
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
      for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
        if ((x * x) / (rx * rx + 0.6) + (y * y) / (ry * ry + 0.6) <= 1) this.set(cx + x, cy + y, c);
      }
    }
  }

  circle(cx, cy, r, c) {
    this.ellipse(cx, cy, r, r, c);
  }

  /**
   * Elipse sombreada con tonos (oscuro → claro) según una luz que viene de arriba
   * a la izquierda. Da el aspecto cel-shaded de bloques de luz y sombra.
   */
  shadedEllipse(cx, cy, rx, ry, tones, lx = -0.55, ly = -0.75) {
    const n = tones.length;
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
      for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
        const nx = x / (rx + 0.3);
        const ny = y / (ry + 0.3);
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        const nz = Math.sqrt(Math.max(0, 1 - d));
        const l = nx * lx + ny * ly + nz * 0.55; // −1 … 1
        const t = Math.max(0, Math.min(0.999, (l + 0.35) / 1.25 + (bayer(cx + x, cy + y) - 0.5) * 0.18));
        this.set(cx + x, cy + y, tones[Math.floor(t * n)]);
      }
    }
  }

  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (w <= 1) this.set(x0, y0, c);
      else this.rect(x0 - (w >> 1), y0 - (w >> 1), w, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Polígono relleno (regla par-impar). */
  poly(pts, c) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) {
          xs.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
      }
    }
  }

  /** Contorno de 1 px alrededor de lo opaco (estilo cómic). */
  outline(c, diagonals = false) {
    const src = this.data.slice();
    const { w, h } = this;
    const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 > 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (opaque(x, y)) continue;
        let hit = opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1);
        if (!hit && diagonals) hit = opaque(x - 1, y - 1) || opaque(x + 1, y - 1) || opaque(x - 1, y + 1) || opaque(x + 1, y + 1);
        if (hit) this.data[y * w + x] = c;
      }
    }
  }

  /** Oscurece el borde inferior de lo opaco (sombra interior, da volumen). */
  innerShadow(f = 0.7, depth = 1) {
    const src = this.data.slice();
    const { w, h } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = src[y * w + x];
        if (!(c >>> 24)) continue;
        for (let k = 1; k <= depth; k++) {
          const below = y + k < h ? src[(y + k) * w + x] : 0;
          if (!(below >>> 24)) { this.data[y * w + x] = shade(c, f); break; }
        }
      }
    }
  }

  /** Copia otro PixelCanvas encima (con transparencia binaria). */
  blit(src, dx, dy, flip = false) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.data[y * src.w + (flip ? src.w - 1 - x : x)];
        if (c >>> 24) this.set(dx + x, dy + y, c);
      }
    }
  }

  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}
