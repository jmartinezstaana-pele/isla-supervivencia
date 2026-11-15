// Capas de ambiente: sombras de nubes que se mueven por el suelo (trama de
// pixel art), gradación de color por zona y viñeta.

import { LOW_W, LOW_H, VIEW_W, VIEW_H } from '../config.js';
import { fbm } from '../core/rng.js';
import { bayer } from '../gfx/pixel.js';

const ZONE_TINT = {
  playa: [255, 196, 120, 0.07],
  selva: [20, 70, 50, 0.16],
  ruinas: [60, 90, 70, 0.14],
  campamento: [150, 70, 30, 0.08],
};

export class Ambience {
  constructor() {
    // Textura de sombras de nubes (512 × 512, se repite).
    const S = 512;
    this.cloud = document.createElement('canvas');
    this.cloud.width = S;
    this.cloud.height = S;
    const ctx = this.cloud.getContext('2d');
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Ruido periódico: se suma en las cuatro esquinas para que encaje al repetir.
        const u = x / S;
        const v = y / S;
        const n = (fbm(x / 70, y / 70, 5, 3) * (1 - u) * (1 - v) + fbm((x - S) / 70, y / 70, 5, 3) * u * (1 - v) +
          fbm(x / 70, (y - S) / 70, 5, 3) * (1 - u) * v + fbm((x - S) / 70, (y - S) / 70, 5, 3) * u * v);
        const k = (n - 0.52) * 6;
        const i = (y * S + x) * 4;
        if (k > bayer(x, y)) {
          d[i] = 8; d[i + 1] = 20; d[i + 2] = 30; d[i + 3] = 42;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    this.tint = [...ZONE_TINT.playa];
    this.vignette = null;
  }

  drawClouds(l, cam, t, strength) {
    if (strength <= 0.01) return;
    const S = this.cloud.width;
    const ox = (((cam.ix * 1 - t * 9) % S) + S) % S;
    const oy = (((cam.iy * 1 - t * 4) % S) + S) % S;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalAlpha = strength;
    for (let y = -oy; y < LOW_H; y += S) for (let x = -ox; x < LOW_W; x += S) l.drawImage(this.cloud, x, y);
    l.globalAlpha = 1;
  }

  /** Gradación por zona (con transición suave) y viñeta, sobre el canvas final. */
  drawGrade(ctx, zone, dt) {
    const target = ZONE_TINT[zone] || ZONE_TINT.selva;
    const k = Math.min(1, dt * 1.5);
    for (let i = 0; i < 4; i++) this.tint[i] += (target[i] - this.tint[i]) * k;
    const [r, g, b, a] = this.tint;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a.toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!this.vignette) {
      const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.68);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      this.vignette = grad;
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
