// Escalas de dibujo según el tamaño real de la pantalla (sesión 6, nitidez).
//
// - S: píxeles reales del canvas por cada unidad lógica de 1280 × 720. Toda la
//   interfaz (menús, HUD) se sigue escribiendo en coordenadas de 1280 × 720 y se
//   dibuja con la transformación S, así el texto sale a resolución real.
// - K: píxeles reales por cada píxel de mundo (el mundo mide 640 × 360). Siempre es
//   un entero (×2 a 720p, ×3 a 1080p): el pixel art del terreno y los props se
//   amplía sin suavizado y sin bloques desiguales. Los personajes se dibujan a
//   resolución real (ver gfx/charSprite.js).

import { VIEW_W, VIEW_H, LOW_W } from '../config.js';

export const display = {
  /** Escala de la interfaz (canvas real / 1280). */
  S: 1,
  /** Escala entera del mundo (buffer del mundo / 640). */
  K: 2,
  /** Tamaño real del canvas en píxeles. */
  width: VIEW_W,
  height: VIEW_H,
  dpr: 1,
  /** Desplazamiento en píxeles reales del dibujo del mundo (temblor de cámara). */
  ox: 0,
  oy: 0,
};

/** Máxima escala entera del mundo (rendimiento en pantallas 4K). */
const K_MAX = 5;

/** Calcula las escalas para un canvas de `w` píxeles reales de ancho. */
export function computeScales(w) {
  display.width = w;
  display.height = Math.round((w * VIEW_H) / VIEW_W);
  display.S = w / VIEW_W;
  // El mundo se pinta con la escala entera más cercana por arriba (si sobra un
  // poco, se reduce con suavizado al componer; si encaja, se copia 1:1).
  display.K = Math.max(1, Math.min(K_MAX, Math.ceil(w / LOW_W - 0.02)));
}

/** Transformación de la interfaz: coordenadas lógicas de 1280 × 720. */
export function uiTransform(c) {
  c.setTransform(display.S, 0, 0, display.S, 0, 0);
}

/** Transformación de pantalla del buffer del mundo: 1 unidad = 1 píxel de mundo. */
export function worldScreen(l) {
  l.setTransform(display.K, 0, 0, display.K, display.ox, display.oy);
}
