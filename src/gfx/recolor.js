// Recoloreado del protagonista en tiempo de ejecución (TRASPASO §2.6). Los
// píxeles se clasifican por HSV y se pintan con el color elegido conservando su
// luminosidad relativa:
//   verdes → pantalón;
//   tonos de piel (salvo el 15 % inferior, las botas) → piel;
//   beige o blancos en el 25 % superior → pañuelo / pelo;
//   beige o blancos en el resto → camiseta.

/** Opciones de color de la creación. La primera de cada lista es la original del sprite. */
export const COLOR_OPTIONS = {
  pelo: [
    ['Arena', null], ['Rojo', '#b8302a'], ['Negro', '#34302e'], ['Azul', '#2f5fa8'],
    ['Oliva', '#5d6b2e'], ['Amarillo', '#d8a830'], ['Morado', '#6a3a8a'],
  ],
  piel: [
    ['Original', null], ['Clara', '#f2c9a2'], ['Media', '#c98c5c'], ['Morena', '#8e5a34'], ['Oscura', '#5a3620'],
  ],
  camiseta: [
    ['Blanca', null], ['Negra', '#2e2e32'], ['Roja', '#a83228'], ['Azul', '#3a64a0'],
    ['Verde', '#4f7a3a'], ['Amarilla', '#d0a83a'],
  ],
  pantalon: [
    ['Militar', null], ['Caqui', '#a08a5a'], ['Vaquero', '#3a5478'], ['Negro', '#2c2c2e'],
    ['Gris', '#6e7274'], ['Marrón', '#6a4a2c'],
  ],
};

export const COLOR_PARTS = [
  ['pelo', 'Pelo / pañuelo'],
  ['piel', 'Piel'],
  ['camiseta', 'Camiseta'],
  ['pantalon', 'Pantalón'],
];

export const DEFAULT_COLORS = { pelo: 0, piel: 0, camiseta: 0, pantalon: 0 };

/** Luminosidad de referencia de cada clase en el sprite original (mediana medida). */
const REF_V = { pelo: 0.87, piel: 0.6, camiseta: 0.83, pantalon: 0.3 };

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Clase de un píxel (o null si no se recolorea). `rel` = altura relativa en el fotograma (0 arriba). */
export function classify(r, g, b, rel) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max / 255;
  const s = max ? d / max : 0;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  if (h > 60 && h < 170 && s > 0.2) return 'pantalon';
  if (h < 45 && s > 0.3 && rel < 0.85) return 'piel';
  if (s < 0.3 && v > 0.45) return rel < 0.25 ? 'pelo' : 'camiseta';
  return null;
}

/** Hex de cada parte según los índices elegidos (null = original). */
export function colorsToHex(choice) {
  const out = {};
  for (const [part] of COLOR_PARTS) out[part] = COLOR_OPTIONS[part][choice[part] || 0][1];
  return out;
}

/**
 * Devuelve un canvas con el atlas (ya reducido) recoloreado. `frames` limita el
 * trabajo a los fotogramas y sirve para calcular la altura relativa.
 */
export function recolorAtlas(scaled, choice) {
  const { image, frames } = scaled;
  const hex = colorsToHex(choice);
  const c = document.createElement('canvas');
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);
  if (!Object.values(hex).some(Boolean)) return c;
  const target = {};
  for (const [k, v] of Object.entries(hex)) target[k] = v ? hexRgb(v) : null;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const W = c.width;
  for (const list of Object.values(frames)) {
    for (const [fx, fy, fw, fh] of list) {
      for (let y = fy; y < fy + fh; y++) {
        const rel = (y - fy) / fh;
        for (let x = fx; x < fx + fw; x++) {
          const i = (y * W + x) * 4;
          if (!d[i + 3]) continue;
          const cls = classify(d[i], d[i + 1], d[i + 2], rel);
          if (!cls || !target[cls]) continue;
          const t = target[cls];
          const k = Math.max(d[i], d[i + 1], d[i + 2]) / 255 / REF_V[cls];
          for (let ch = 0; ch < 3; ch++) {
            // Por debajo de la referencia se oscurece; por encima, se aclara hacia el blanco.
            d[i + ch] = k <= 1 ? t[ch] * k : Math.min(255, t[ch] + (255 - t[ch]) * (k - 1) * 0.8);
          }
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Color medio [r, g, b] que tienen en `recolored` los píxeles que en el atlas
 * original son de la parte `part` (fotogramas de andar de frente). Sirve para
 * comprobar en las pruebas que la vista previa y el juego usan el color elegido.
 */
export function partAverage(scaled, recolored, part) {
  const { image, frames } = scaled;
  const W = image.width;
  const H = image.height;
  const base = image.getContext('2d').getImageData(0, 0, W, H).data;
  const rec = recolored.getContext('2d').getImageData(0, 0, W, H).data;
  let n = 0;
  const sum = [0, 0, 0];
  for (const [fx, fy, fw, fh] of frames.walk_down) {
    for (let y = fy; y < fy + fh; y++) {
      for (let x = fx; x < fx + fw; x++) {
        const i = (y * W + x) * 4;
        if (!base[i + 3] || classify(base[i], base[i + 1], base[i + 2], (y - fy) / fh) !== part) continue;
        for (let k = 0; k < 3; k++) sum[k] += rec[i + k];
        n++;
      }
    }
  }
  return n ? sum.map((v) => Math.round(v / n)) : null;
}
