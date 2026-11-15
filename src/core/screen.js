// Canvas interno de tamaño fijo (1280 × 720) escalado para llenar la ventana
// manteniendo la proporción (bandas negras donde sobre).

import { VIEW_W, VIEW_H } from '../config.js';

export function setupScreen(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const resize = () => {
    const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
    canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  };
  window.addEventListener('resize', resize);
  resize();
  const ctx = canvas.getContext('2d');
  return ctx;
}
