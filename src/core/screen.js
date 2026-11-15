// El canvas ocupa la ventana manteniendo 16:9 (bandas negras donde sobre) y su
// tamaño interno es el real en píxeles de pantalla (tamaño CSS × devicePixelRatio),
// para que nada se reescale con suavizado al final (sesión 6, nitidez). La
// interfaz se dibuja en coordenadas lógicas de 1280 × 720 (ver core/display.js).

import { VIEW_W, VIEW_H } from '../config.js';
import { display, computeScales } from './display.js';

export function setupScreen(canvas) {
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    let cssW = Math.floor(VIEW_W * scale);
    // Ancho real múltiplo de 16 para que el alto 16:9 sea exacto.
    const w = Math.max(320, Math.floor((cssW * dpr) / 16) * 16);
    const h = (w / 16) * 9;
    cssW = w / dpr;
    display.dpr = dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${h / dpr}px`;
    computeScales(w);
  };
  window.addEventListener('resize', resize);
  resize();
  const ctx = canvas.getContext('2d');
  return ctx;
}
