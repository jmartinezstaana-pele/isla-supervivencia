// Sprites de personajes:
// - el atlas del protagonista se usa a resolución completa (ver gfx/charSprite.js);
// - los guerreros de la tribu reutilizan el atlas recoloreado (TRASPASO §2.6);
// - el jabalí y el cangrejo se pintan por código.

import { PixelCanvas, rgb, unpack, pack, shade } from './pixel.js';
import { C } from './palette.js';
import { CharacterSheet } from './charSprite.js';
import { recolorWith } from './recolor.js';

/**
 * Hoja de un guerrero de la tribu: el atlas del protagonista recoloreado (piel
 * oscura, pecho desnudo con rayas de pintura roja, taparrabos marrón y cinta roja
 * en la cabeza), con la misma limpieza de máscara que el protagonista.
 */
export function tribalAtlas(base) {
  const skin = [150, 96, 64];
  const canvas = recolorWith(base, { piel: skin, camiseta: skin, pelo: [205, 38, 32], pantalon: [112, 72, 44] }, (d, i, part, x, y, rel) => {
    // Rayas de pintura roja en el pecho.
    if (part === 'camiseta' && rel > 0.3 && rel < 0.5 && ((x + y) % 9 < 2)) {
      d[i] = 190; d[i + 1] = 40; d[i + 2] = 30;
    }
  });
  return new CharacterSheet(canvas, base.frames, base.worldScale);
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
