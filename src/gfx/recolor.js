// Recoloreado del protagonista en tiempo de ejecución (TRASPASO §2.6), sobre el
// atlas a resolución completa (sesión 6). Los píxeles se clasifican por HSV:
//   verdes → pantalón;
//   tonos de piel (salvo el 15 % inferior, las botas) → piel;
//   beige o blancos en el 25 % superior → pañuelo / pelo;
//   beige o blancos en el resto → camiseta.
// Mejoras de la sesión 6 (nitidez):
//   - el contorno negro y las sombras más oscuras no se tocan;
//   - la máscara de cada parte se limpia con un filtro de mayoría (sin píxeles
//     sueltos de otro color ni bordes sucios);
//   - el color elegido se aplica con una rampa de 3 tonos (sombra fría, tono
//     medio y luz), siguiendo la luminancia del original, no como tinte plano.

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

const PARTS = ['pelo', 'piel', 'camiseta', 'pantalon'];
/** Por debajo de esta luminosidad (0–1) un píxel es contorno o sombra profunda: no se toca. */
const DARK_V = 0.17;

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Clase de un píxel (o null si no se recolorea). `rel` = altura relativa en el fotograma (0 arriba). */
export function classify(r, g, b, rel) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max / 255;
  if (v < DARK_V) return null;
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

function hsvOf(r, g, b) {
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
  return [h, max ? d / max : 0, max / 255];
}

// Clases internas: 1 pelo, 2 piel, 3 camiseta, 4 pantalón, 5 «claro» (pelo o
// camiseta, se decide por regiones).
const LIGHT = 5;

/** ¿Puede el píxel (h, s, v, rel) pertenecer a la clase `c`? */
function compatible(c, h, s, v, rel) {
  if (c === 4) return (h > 50 && h < 185) || s < 0.18;
  if (c === 2) return rel < 0.85 && (h < 50 || h > 340);
  return (h < 62 || s < 0.2) && v > 0.3;
}

/**
 * Mapa de partes de un fotograma (Uint8Array, 0 = nada, 1… = PARTS):
 *  1. semillas seguras (verde saturado = pantalón, naranja saturado = piel,
 *     claro poco saturado = pañuelo o camiseta);
 *  2. los píxeles dudosos (sombras de la camiseta, brillos de la piel…) se unen
 *     a la parte vecina de color más parecido; el contorno oscuro hace de barrera;
 *  3. lo claro se separa en pañuelo y camiseta por regiones conexas (el pañuelo
 *     es la región de arriba), no por una franja fija;
 *  4. filtro de mayoría 3 × 3 para quitar píxeles sueltos.
 */
function partMap(d, W, fx, fy, fw, fh) {
  const n = fw * fh;
  let map = new Uint8Array(n);
  const val = new Float32Array(n);
  const hue = new Float32Array(n);
  const sat = new Float32Array(n);
  const rgbAt = (i) => ((fy + Math.floor(i / fw)) * W + fx + (i % fw)) * 4;
  for (let y = 0; y < fh; y++) {
    const rel = y / fh;
    for (let x = 0; x < fw; x++) {
      const i = y * fw + x;
      const k = rgbAt(i);
      if (!d[k + 3]) { val[i] = -1; continue; }
      const [h, s, v] = hsvOf(d[k], d[k + 1], d[k + 2]);
      val[i] = v; hue[i] = h; sat[i] = s;
      if (v < DARK_V) continue;
      if (h > 60 && h < 170 && s > 0.22) map[i] = 4;
      else if (h < 42 && s > 0.5 && v > 0.3 && rel < 0.85) map[i] = 2;
      else if (s < 0.3 && v > 0.5) map[i] = LIGHT;
    }
  }
  // 2. Crecimiento por parecido de color.
  const MAXD = 58 * 58;
  for (let pass = 0; pass < 14; pass++) {
    const next = map.slice();
    let changed = 0;
    for (let y = 0; y < fh; y++) {
      const rel = y / fh;
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        if (map[i] || val[i] < DARK_V) continue;
        const k = rgbAt(i);
        let best = 0;
        let bestD = MAXD;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= fh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if ((!dx && !dy) || xx < 0 || xx >= fw) continue;
            const j = yy * fw + xx;
            const c = map[j];
            if (!c || !compatible(c, hue[i], sat[i], val[i], rel)) continue;
            const q = rgbAt(j);
            const e = (d[k] - d[q]) ** 2 + (d[k + 1] - d[q + 1]) ** 2 + (d[k + 2] - d[q + 2]) ** 2;
            if (e < bestD) { bestD = e; best = c; }
          }
        }
        if (best) { next[i] = best; changed++; }
      }
    }
    map = next;
    if (!changed) break;
  }
  // 3. Claro → pañuelo o camiseta por regiones conexas (8 vecinos).
  const seen = new Uint8Array(n);
  const stack = [];
  for (let i0 = 0; i0 < n; i0++) {
    if (map[i0] !== LIGHT || seen[i0]) continue;
    const comp = [];
    stack.push(i0);
    seen[i0] = 1;
    let relSum = 0;
    let minRel = 1;
    const border = new Uint16Array(5); // vecinos de otras partes (0 = sin parte)
    let outside = false;               // toca el exterior de la silueta (a 2 px)
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % fw;
      const y = (i / fw) | 0;
      relSum += y / fh;
      minRel = Math.min(minRel, y / fh);
      if (!outside) {
        for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
          const xx = x + ox;
          const yy = y + oy;
          if (xx < 0 || yy < 0 || xx >= fw || yy >= fh || val[yy * fw + xx] < 0) { outside = true; break; }
        }
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= fw || yy >= fh) continue;
          const j = yy * fw + xx;
          if (map[j] === LIGHT) {
            if (!seen[j]) { seen[j] = 1; stack.push(j); }
          } else if (val[j] >= DARK_V && map[j] < LIGHT) {
            border[map[j]]++;
          }
        }
      }
    }
    const meanRel = relSum / comp.length;
    const parts = border[1] + border[2] + border[3] + border[4];
    let cls;
    if (comp.length < 90 && parts >= 3 && border[2] >= parts * 0.6) cls = 2; // brillo de la piel
    else if (minRel < 0.1 && meanRel < 0.22) cls = 1;                         // pañuelo (arriba del todo)
    else if (meanRel < 0.3 && outside && border[2] === 0 && comp.length >= 4) cls = 1; // puntas del nudo del pañuelo
    else if (meanRel < 0.3 && minRel >= 0.1) cls = 0;                         // ojos, dientes, brillos de la cara: original
    else if (comp.length < 6) cls = 0;
    else cls = 3;                                                             // camiseta
    for (const i of comp) {
      const rel = ((i / fw) | 0) / fh;
      // Una región grande que baja desde el pañuelo hasta el pecho se parte por altura.
      map[i] = cls === 1 && rel > 0.24 ? 3 : cls === 3 && rel < 0.1 ? 1 : cls;
    }
  }
  // 4. Filtro de mayoría.
  const counts = new Uint8Array(5);
  for (let pass = 0; pass < 2; pass++) {
    const next = map.slice();
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        if (val[i] < DARK_V) continue;
        counts.fill(0);
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= fh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if ((!dx && !dy) || xx < 0 || xx >= fw) continue;
            const j = yy * fw + xx;
            if (val[j] < 0) continue;
            counts[map[j]]++;
          }
        }
        let best = 1;
        for (let k = 2; k <= 4; k++) if (counts[k] > counts[best]) best = k;
        const cur = map[i];
        const rel = y / fh;
        const ok = compatible(best, hue[i], sat[i], val[i], rel) || counts[best] >= 7;
        if (cur) {
          if (counts[cur] <= 1 && counts[best] >= 4 && best !== cur && ok) next[i] = best;
          else if (counts[cur] <= 1 && counts[0] >= 5) next[i] = 0;
        } else if (val[i] > 0.3 && counts[best] >= 6 && ok) {
          next[i] = best;
        }
      }
    }
    map = next;
  }
  return map;
}

/** Mapas de partes de todos los fotogramas de una hoja (se calculan una vez). */
function partMaps(sheet) {
  if (!sheet.partMaps) {
    const img = sheet.data();
    const out = {};
    for (const [name, list] of Object.entries(sheet.frames)) {
      out[name] = list.map(([fx, fy, fw, fh]) => partMap(img.data, img.width, fx, fy, fw, fh));
    }
    sheet.partMaps = out;
  }
  return sheet.partMaps;
}

/** Luminancia de referencia (mediana) de cada parte en la hoja original. */
function refLuma(sheet) {
  if (!sheet.refLuma) {
    const img = sheet.data();
    const maps = partMaps(sheet);
    const vals = PARTS.map(() => []);
    for (const name of ['walk_down', 'walk', 'walk_up']) {
      sheet.frames[name].forEach(([fx, fy, fw, fh], fi) => {
        const m = maps[name][fi];
        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const c = m[y * fw + x];
            if (!c) continue;
            const i = ((fy + y) * img.width + fx + x) * 4;
            vals[c - 1].push(luma(img.data[i], img.data[i + 1], img.data[i + 2]));
          }
        }
      });
    }
    sheet.refLuma = vals.map((v) => {
      v.sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length * 0.55)] : 128;
    });
  }
  return sheet.refLuma;
}

function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360 / 60;
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return [r * 255, g * 255, b * 255];
}

/**
 * Rampa de 3 tonos para un color: sombra (más oscura, algo más saturada y con el
 * tono desplazado hacia el frío), medio (el color elegido) y luz (más clara y
 * algo menos saturada, manteniendo el tono: sin lavarse hacia el gris).
 */
function ramp(t) {
  const [h, s, v] = hsvOf(t[0], t[1], t[2]);
  const cool = h < 200 && h > 20 ? 8 : h >= 200 && h < 300 ? -6 : 0;
  const shadow = hsvToRgb(h + cool, Math.min(1, s * 1.08 + 0.04), v * 0.36);
  const light = hsvToRgb(h - cool * 0.5, s * 0.72, Math.min(1, v * 1.45 + 0.16));
  return { shadow, mid: t, light };
}

/** Color de la rampa para una luminancia relativa k (1 = la de referencia). */
function rampColor(R, k, out) {
  if (k < 0.38) {
    const f = k / 0.38;
    for (let c = 0; c < 3; c++) out[c] = R.shadow[c] * f;
  } else if (k < 1) {
    let f = (k - 0.38) / 0.62;
    f = f * f * (3 - 2 * f);
    for (let c = 0; c < 3; c++) out[c] = R.shadow[c] + (R.mid[c] - R.shadow[c]) * f;
  } else {
    const f = Math.min(1, (k - 1) / 0.42);
    for (let c = 0; c < 3; c++) out[c] = R.mid[c] + (R.light[c] - R.mid[c]) * f;
  }
  return out;
}

/** Hex de cada parte según los índices elegidos (null = original). */
export function colorsToHex(choice) {
  const out = {};
  for (const [part] of COLOR_PARTS) out[part] = COLOR_OPTIONS[part][choice[part] || 0][1];
  return out;
}

/**
 * Recolorea una hoja con un color por parte ({ pelo: [r, g, b] | null, … }).
 * `post(d, i, part, x, y, rel)` permite retocar cada píxel recoloreado.
 * Devuelve un canvas del tamaño del atlas.
 */
export function recolorWith(sheet, targets, post = null) {
  const img = sheet.data();
  const W = img.width;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = img.height;
  const ctx = c.getContext('2d');
  if (!PARTS.some((p) => targets[p])) {
    ctx.putImageData(img, 0, 0);
    return c;
  }
  const out = new ImageData(new Uint8ClampedArray(img.data), W, img.height);
  const d = out.data;
  const src = img.data;
  const maps = partMaps(sheet);
  const refs = refLuma(sheet);
  const ramps = PARTS.map((p) => (targets[p] ? ramp(targets[p]) : null));
  const col = [0, 0, 0];
  for (const [name, list] of Object.entries(sheet.frames)) {
    list.forEach(([fx, fy, fw, fh], fi) => {
      const m = maps[name][fi];
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const cls = m[y * fw + x];
          if (!cls || !ramps[cls - 1]) continue;
          const i = ((fy + y) * W + fx + x) * 4;
          const k = luma(src[i], src[i + 1], src[i + 2]) / refs[cls - 1];
          rampColor(ramps[cls - 1], k, col);
          d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
          if (post) post(d, i, PARTS[cls - 1], x, y, y / fh);
        }
      }
    });
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

/** Atlas recoloreado con los colores elegidos en la creación. */
export function recolorAtlas(sheet, choice) {
  const hex = colorsToHex(choice);
  const targets = {};
  for (const [k, v] of Object.entries(hex)) targets[k] = v ? hexRgb(v) : null;
  return recolorWith(sheet, targets);
}

/**
 * Color medio [r, g, b] que tienen en `recolored` los píxeles de la parte `part`
 * (fotogramas de andar de frente). Sirve para comprobar en las pruebas que la
 * vista previa y el juego usan el color elegido.
 */
export function partAverage(sheet, recolored, part) {
  const W = recolored.width;
  const rec = recolored.getContext('2d').getImageData(0, 0, W, recolored.height).data;
  const maps = partMaps(sheet);
  const want = PARTS.indexOf(part) + 1;
  let n = 0;
  const sum = [0, 0, 0];
  sheet.frames.walk_down.forEach(([fx, fy, fw, fh], fi) => {
    const m = maps.walk_down[fi];
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        if (m[y * fw + x] !== want) continue;
        const i = ((fy + y) * W + fx + x) * 4;
        for (let k = 0; k < 3; k++) sum[k] += rec[i + k];
        n++;
      }
    }
  });
  return n ? sum.map((v) => Math.round(v / n)) : null;
}

/**
 * Estadística de limpieza de la máscara (para las pruebas): fracción de píxeles
 * recoloreados que no tienen ningún vecino de su misma parte (manchas sueltas).
 */
export function maskSpeckle(sheet) {
  const maps = partMaps(sheet);
  let total = 0;
  let lonely = 0;
  for (const [name, list] of Object.entries(sheet.frames)) {
    list.forEach(([, , fw, fh], fi) => {
      const m = maps[name][fi];
      for (let y = 1; y < fh - 1; y++) {
        for (let x = 1; x < fw - 1; x++) {
          const c = m[y * fw + x];
          if (!c) continue;
          total++;
          let same = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && m[(y + dy) * fw + x + dx] === c) same++;
          if (!same) lonely++;
        }
      }
    });
  }
  return { total, lonely, ratio: total ? lonely / total : 0 };
}
