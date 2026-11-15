// Sprites de personajes nítidos (sesión 6, TRASPASO §4d «nitidez y definición del
// protagonista").
//
// El atlas del protagonista está a resolución completa (144 px de alto, ver
// tools/extract_sprites.py) y NO se reduce al cargar. Cada fotograma se prepara
// para la escala real de la pantalla:
//   - a escala entera (×1, ×2…) se copia píxel a píxel, sin suavizado;
//   - a cualquier otra escala se remuestrea una sola vez con un filtro Lanczos
//     (con alfa premultiplicado), que conserva el detalle y el contorno;
//   - se añade un contorno oscuro de 1 px alrededor de la silueta, para que el
//     personaje se lea bien sobre la hierba y la arena.
// Al dibujar, el fotograma se copia 1:1 sobre los píxeles reales del canvas
// (se deshace la escala entera K del mundo), así el personaje tiene el triple de
// detalle que el terreno sin dejar de encajar en su sitio.

/** Fracción de mundo de un píxel del atlas: 144 px de atlas = 48 px de mundo. */
export const ATLAS_WORLD_SCALE = 1 / 3;

const OUTLINE = [16, 12, 9];
const PAD = 2;

function lanczos(x, a) {
  if (x === 0) return 1;
  if (x <= -a || x >= a) return 0;
  const px = Math.PI * x;
  return (a * Math.sin(px) * Math.sin(px / a)) / (px * px);
}

/** Pesos de un remuestreo 1D de `n` muestras a `m` muestras. */
function weights(n, m) {
  const scale = m / n;
  const a = 2;
  const support = scale < 1 ? a / scale : a;
  const out = [];
  for (let i = 0; i < m; i++) {
    const center = (i + 0.5) / scale - 0.5;
    const j0 = Math.max(0, Math.floor(center - support));
    const j1 = Math.min(n - 1, Math.ceil(center + support));
    const idx = [];
    const w = [];
    let sum = 0;
    for (let j = j0; j <= j1; j++) {
      const v = lanczos((j - center) * Math.min(1, scale), a);
      if (v === 0) continue;
      idx.push(j);
      w.push(v);
      sum += v;
    }
    for (let k = 0; k < w.length; k++) w[k] /= sum;
    out.push({ idx, w });
  }
  return out;
}

/** Remuestrea RGBA (Uint8ClampedArray) de sw × sh a dw × dh con Lanczos-2 y alfa premultiplicado. */
export function resampleRGBA(src, sw, sh, dw, dh) {
  // Premultiplica en coma flotante.
  const pre = new Float32Array(sw * sh * 4);
  for (let i = 0; i < sw * sh; i++) {
    const a = src[i * 4 + 3] / 255;
    pre[i * 4] = src[i * 4] * a;
    pre[i * 4 + 1] = src[i * 4 + 1] * a;
    pre[i * 4 + 2] = src[i * 4 + 2] * a;
    pre[i * 4 + 3] = src[i * 4 + 3];
  }
  // Horizontal.
  const wx = weights(sw, dw);
  const tmp = new Float32Array(dw * sh * 4);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < dw; x++) {
      const { idx, w } = wx[x];
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < idx.length; k++) {
        const s = (y * sw + idx[k]) * 4;
        const f = w[k];
        r += pre[s] * f; g += pre[s + 1] * f; b += pre[s + 2] * f; a += pre[s + 3] * f;
      }
      const d = (y * dw + x) * 4;
      tmp[d] = r; tmp[d + 1] = g; tmp[d + 2] = b; tmp[d + 3] = a;
    }
  }
  // Vertical y despremultiplicado.
  const wy = weights(sh, dh);
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const { idx, w } = wy[y];
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < idx.length; k++) {
        const s = (idx[k] * dw + x) * 4;
        const f = w[k];
        r += tmp[s] * f; g += tmp[s + 1] * f; b += tmp[s + 2] * f; a += tmp[s + 3] * f;
      }
      const d = (y * dw + x) * 4;
      if (a < 8) continue; // restos casi invisibles del filtro: transparente
      const k = 255 / a;
      out[d] = r * k; out[d + 1] = g * k; out[d + 2] = b * k;
      out[d + 3] = a >= 247 ? 255 : a;
    }
  }
  return out;
}

/** Amplía RGBA por un factor entero, píxel a píxel. */
function nearestRGBA(src, sw, sh, f) {
  const dw = sw * f;
  const out = new Uint8ClampedArray(dw * sh * f * 4);
  const s32 = new Uint32Array(src.buffer, src.byteOffset, sw * sh);
  const o32 = new Uint32Array(out.buffer);
  for (let y = 0; y < sh * f; y++) {
    const sy = (y / f) | 0;
    for (let x = 0; x < dw; x++) o32[y * dw + x] = s32[sy * sw + ((x / f) | 0)];
  }
  return out;
}

/**
 * Contorno oscuro de 1 px alrededor de la silueta: cada píxel casi transparente
 * que toca uno opaco recibe el color del contorno por debajo (el borde suavizado
 * del sprite se compone encima).
 */
function addOutline(d, w, h) {
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = d[i * 4 + 3];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = alpha[i];
      if (a >= 250) continue;
      let n = 0;
      if (x > 0) n = Math.max(n, alpha[i - 1]);
      if (x < w - 1) n = Math.max(n, alpha[i + 1]);
      if (y > 0) n = Math.max(n, alpha[i - w]);
      if (y < h - 1) n = Math.max(n, alpha[i + w]);
      if (n < 120) continue;
      const oa = 0.88 * Math.min(1, n / 200);
      const sa = a / 255;
      const outA = sa + oa * (1 - sa);
      if (outA <= 0) continue;
      const j = i * 4;
      for (let c = 0; c < 3; c++) d[j + c] = (d[j + c] * sa + OUTLINE[c] * oa * (1 - sa)) / outA;
      d[j + 3] = outA * 255;
    }
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

/**
 * Hoja de personaje: atlas a resolución completa + rectángulos por animación.
 * `frames` es el mismo objeto que atlas.json ({ nombre: [[x, y, w, h], …] }).
 */
export class CharacterSheet {
  constructor(image, frames, worldScale = ATLAS_WORLD_SCALE) {
    this.image = image;
    this.frames = frames;
    this.worldScale = worldScale;
    this.cache = new Map();
    this.pixels = null;
  }

  /** Píxeles del atlas (se leen una vez). */
  data() {
    if (!this.pixels) {
      const c = this.image instanceof HTMLCanvasElement ? this.image : (() => {
        const k = makeCanvas(this.image.width, this.image.height);
        k.getContext('2d').drawImage(this.image, 0, 0);
        return k;
      })();
      this.pixels = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
    }
    return this.pixels;
  }

  /** RGBA de un fotograma a resolución completa. */
  frameRGBA(name, index) {
    const [fx, fy, fw, fh] = this.frames[name][index];
    const img = this.data();
    const W = img.width;
    const out = new Uint8ClampedArray(fw * fh * 4);
    for (let y = 0; y < fh; y++) out.set(img.data.subarray(((fy + y) * W + fx) * 4, ((fy + y) * W + fx + fw) * 4), y * fw * 4);
    return { d: out, w: fw, h: fh };
  }

  /**
   * Fotograma preparado para `scale` píxeles reales por píxel de atlas:
   * { canvas, ax, ay } con el ancla (pies) en (ax, ay) dentro del canvas.
   */
  scaled(name, index, scale) {
    const s = Math.round(scale * 1000) / 1000;
    const key = `${name}:${index}:${s}`;
    let spr = this.cache.get(key);
    if (spr) return spr;
    const { d, w, h } = this.frameRGBA(name, index);
    let px;
    let dw;
    let dh;
    const integer = Math.abs(s - Math.round(s)) < 0.001 && s >= 1;
    if (integer) {
      // Escala entera: contorno a la resolución del atlas y ampliación sin suavizado.
      const f = Math.round(s);
      const padded = new Uint8ClampedArray((w + 2) * (h + 2) * 4);
      for (let y = 0; y < h; y++) padded.set(d.subarray(y * w * 4, (y + 1) * w * 4), ((y + 1) * (w + 2) + 1) * 4);
      addOutline(padded, w + 2, h + 2);
      dw = (w + 2) * f;
      dh = (h + 2) * f;
      px = f === 1 ? padded : nearestRGBA(padded, w + 2, h + 2, f);
      const c = makeCanvas(dw, dh);
      c.getContext('2d').putImageData(new ImageData(px, dw, dh), 0, 0);
      spr = { canvas: c, ax: f + Math.round((w * f) / 2), ay: f + h * f };
    } else {
      dw = Math.max(1, Math.round(w * s));
      dh = Math.max(1, Math.round(h * s));
      const r = resampleRGBA(d, w, h, dw, dh);
      const W2 = dw + PAD * 2;
      const H2 = dh + PAD * 2;
      px = new Uint8ClampedArray(W2 * H2 * 4);
      for (let y = 0; y < dh; y++) px.set(r.subarray(y * dw * 4, (y + 1) * dw * 4), ((y + PAD) * W2 + PAD) * 4);
      addOutline(px, W2, H2);
      const c = makeCanvas(W2, H2);
      c.getContext('2d').putImageData(new ImageData(px, W2, H2), 0, 0);
      spr = { canvas: c, ax: PAD + Math.round(dw / 2), ay: PAD + dh };
    }
    this.cache.set(key, spr);
    return spr;
  }

  /** Alto en píxeles de mundo de un fotograma. */
  worldHeight(name, index) {
    return this.frames[name][index][3] * this.worldScale;
  }
}

/**
 * Dibuja un fotograma con los pies en (x, y) (coordenadas de mundo, con la
 * transformación actual del contexto) mirando a `facing` (1 derecha, −1
 * izquierda). Con `scale` 1 y sin giro, se copia 1:1 sobre los píxeles reales.
 */
export function drawCharacter(ctx, sheet, name, index, x, y, facing = 1, scale = 1, rotation = 0) {
  const m = ctx.getTransform();
  const base = m.a * sheet.worldScale; // píxeles reales por píxel de atlas
  const spr = sheet.scaled(name, index, base);
  const dx = m.a * x + m.e;
  const dy = m.d * y + m.f;
  ctx.save();
  if (scale === 1 && !rotation && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6) {
    ctx.setTransform(facing, 0, 0, 1, Math.round(dx), Math.round(dy));
    ctx.drawImage(spr.canvas, -spr.ax, -spr.ay);
  } else {
    ctx.setTransform(1, 0, 0, 1, dx, dy);
    if (rotation) ctx.rotate(rotation);
    ctx.scale(facing * scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(spr.canvas, -spr.ax, -spr.ay);
  }
  ctx.restore();
}
