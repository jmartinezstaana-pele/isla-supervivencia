// Sprites de personajes a la escala del mundo (pixel art nítido):
// - el atlas del protagonista se reduce a la mitad una vez (96 → 48 px) y se
//   binariza la transparencia;
// - los guerreros de la tribu reutilizan el atlas recoloreado (TRASPASO §2.6);
// - el jabalí y el cangrejo se pintan por código.

import { PixelCanvas, rgb, unpack, pack, shade } from './pixel.js';
import { C } from './palette.js';

/** Reduce el atlas a la mitad. Devuelve { image, frames } con las mismas animaciones. */
export function scaleAtlas(atlasImg, frames) {
  const w = Math.ceil(atlasImg.width / 2);
  const h = Math.ceil(atlasImg.height / 2);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(atlasImg, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) d[i + 3] = 0;
    else {
      // Recupera algo del contraste perdido al reducir y vuelve opaco el borde.
      const k = 255 / d[i + 3];
      d[i] = Math.min(255, d[i] * k);
      d[i + 1] = Math.min(255, d[i + 1] * k);
      d[i + 2] = Math.min(255, d[i + 2] * k);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const scaled = {};
  for (const [name, list] of Object.entries(frames)) {
    scaled[name] = list.map(([x, y, fw, fh]) => {
      const x0 = Math.floor(x / 2);
      const y0 = Math.floor(y / 2);
      return [x0, y0, Math.ceil((x + fw) / 2) - x0, Math.ceil((y + fh) / 2) - y0];
    });
  }
  return { image: c, frames: scaled };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

/**
 * Recolorea el atlas reducido para un guerrero de la tribu: piel oscura, pecho
 * desnudo con pintura roja, taparrabos marrón y cinta roja en la cabeza.
 * Clasificación por HSV (TRASPASO §2.6), conservando la luminancia.
 */
export function tribalAtlas(scaled) {
  const { image, frames } = scaled;
  const c = document.createElement('canvas');
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const W = c.width;
  const target = {
    skin: [0.06, 0.55, 0.62],   // h (0–1), s, v máx.
    chest: [0.06, 0.55, 0.58],
    band: [0.0, 0.85, 0.85],
    cloth: [0.07, 0.6, 0.45],
  };
  const hsvToRgb = (h, s, v) => {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return [r * 255, g * 255, b * 255];
  };
  for (const list of Object.values(frames)) {
    for (const [fx, fy, fw, fh] of list) {
      for (let y = fy; y < fy + fh; y++) {
        const rel = (y - fy) / fh;
        for (let x = fx; x < fx + fw; x++) {
          const i = (y * W + x) * 4;
          if (!d[i + 3]) continue;
          const [h, s, v] = rgbToHsv(d[i], d[i + 1], d[i + 2]);
          let tg = null;
          if (h > 60 && h < 170 && s > 0.2) tg = target.cloth;                // pantalón verde
          else if (h < 45 && s > 0.3 && rel < 0.85) tg = target.skin;           // piel
          else if (s < 0.3 && v > 0.45) tg = rel < 0.25 ? target.band : target.chest; // pañuelo / camiseta
          if (!tg) continue;
          const [r, g, b] = hsvToRgb(tg[0], tg[1], Math.min(1, v * tg[2] * 1.25));
          d[i] = r; d[i + 1] = g; d[i + 2] = b;
          // Rayas de pintura roja en el pecho.
          if (tg === target.chest && (y + x) % 5 === 0 && rel > 0.3 && rel < 0.5) {
            d[i] = 190; d[i + 1] = 40; d[i + 2] = 30;
          }
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return { image: c, frames };
}

/** Jabalí visto de lado (mira a la derecha), 3 fotogramas de trote. */
export function boarFrames() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const p = new PixelCanvas(40, 28);
    const legs = [[0, 0], [2, -1], [-2, 1]][f];
    const fur = ['#1e140e', '#3a2618', '#563a24', '#6e4c30'].map((c) => rgb(c));
    // Patas.
    for (const [lx, o] of [[11, legs[0]], [15, legs[1]], [26, legs[1]], [30, legs[0]]]) {
      p.rect(lx + o, 19, 3, 7, fur[1]);
      p.rect(lx + o, 25, 3, 1, rgb('#120c08'));
    }
    p.shadedEllipse(20, 15, 14, 8, fur);
    p.shadedEllipse(32, 15, 6, 6, fur);                // cabeza
    p.rect(36, 15, 4, 4, rgb('#7a5040'));               // hocico
    p.set(39, 16, rgb('#2a1a12'));
    p.set(37, 18, rgb('#f2ead8')); p.set(38, 17, rgb('#f2ead8')); // colmillo
    p.set(33, 12, rgb('#e8c040')); p.set(33, 13, rgb('#120c08')); // ojo
    for (let x = 10; x < 30; x += 2) p.set(x, 7 + (x % 4 === 0 ? 0 : 1), fur[0]); // crin
    p.rect(30, 9, 2, 2, fur[0]); // oreja
    p.set(6, 13, fur[0]); p.set(5, 12, fur[0]); // cola
    p.outline(C.outline);
    frames.push(p.toCanvas());
  }
  return frames;
}

/** Cangrejo visto desde arriba, 2 fotogramas. */
export function crabFrames() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const p = new PixelCanvas(18, 13);
    const shell = ['#7a1a10', '#b8341c', '#e05a2c', '#ff8a52'].map((c) => rgb(c));
    for (let k = 0; k < 3; k++) {
      const o = (k + f) % 2;
      p.line(4, 6 + k * 2, 1, 5 + k * 2 + o, shell[1]);
      p.line(13, 6 + k * 2, 16, 5 + k * 2 + o, shell[1]);
    }
    p.shadedEllipse(9, 7, 5, 4, shell);
    p.rect(2, 1 + f, 3, 3, shell[2]); p.rect(13, 1 + (1 - f), 3, 3, shell[2]); // pinzas
    p.set(7, 4, C.black); p.set(11, 4, C.black);
    p.outline(C.outline);
    frames.push(p.toCanvas());
  }
  return frames;
}

export { shade, unpack, pack };
