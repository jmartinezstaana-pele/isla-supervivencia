// Capas de ambiente: sombras de nubes que se mueven por el suelo (trama de
// pixel art), gradación de color por zona y viñeta.

import { LOW_W, LOW_H, VIEW_W, VIEW_H } from '../config.js';
import { fbm } from '../core/rng.js';
import { bayer } from '../gfx/pixel.js';
import { uiTransform, worldScreen } from '../core/display.js';

const ZONE_TINT = {
  playa: [255, 196, 120, 0.07],
  costa: [255, 200, 130, 0.06],
  bahia: [120, 200, 230, 0.06],
  selva: [20, 70, 50, 0.16],
  ruinas: [60, 90, 70, 0.14],
  campamento: [150, 70, 30, 0.08],
  poblado: [160, 70, 30, 0.1],
  monte: [60, 90, 110, 0.08],
  cumbre: [120, 150, 200, 0.18],
  militar: [130, 120, 80, 0.12],
  acantilados: [100, 140, 160, 0.1],
  manglar: [40, 70, 50, 0.22],
  mar: [40, 120, 170, 0.06],
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
    // Bancos de niebla del manglar (se repiten).
    const F = 384;
    this.fog = document.createElement('canvas');
    this.fog.width = F;
    this.fog.height = F;
    const fctx = this.fog.getContext('2d');
    const fimg = fctx.createImageData(F, F);
    const fd = fimg.data;
    for (let y = 0; y < F; y++) {
      for (let x = 0; x < F; x++) {
        const u = x / F;
        const v = y / F;
        const n = (fbm(x / 60, y / 40, 9, 3) * (1 - u) * (1 - v) + fbm((x - F) / 60, y / 40, 9, 3) * u * (1 - v) +
          fbm(x / 60, (y - F) / 40, 9, 3) * (1 - u) * v + fbm((x - F) / 60, (y - F) / 40, 9, 3) * u * v);
        const k = (n - 0.42) * 3;
        const i = (y * F + x) * 4;
        // Trama por capas: niebla en bandas de opacidad, al estilo pixel art.
        const a = k > bayer(x, y) * 0.6 + 0.5 ? 150 : k > bayer(x, y) * 0.6 ? 95 : k > bayer(x, y) * 0.6 - 0.4 ? 45 : 0;
        fd[i] = 214; fd[i + 1] = 228; fd[i + 2] = 220; fd[i + 3] = a;
      }
    }
    fctx.putImageData(fimg, 0, 0);
    this.tint = [...ZONE_TINT.playa];
    this.vignette = null;
  }

  drawClouds(l, cam, t, strength) {
    if (strength <= 0.01) return;
    const S = this.cloud.width;
    const ox = (((cam.ix * 1 - t * 9) % S) + S) % S;
    const oy = (((cam.iy * 1 - t * 4) % S) + S) % S;
    worldScreen(l);
    l.globalAlpha = strength;
    for (let y = -oy; y < LOW_H; y += S) for (let x = -ox; x < LOW_W; x += S) l.drawImage(this.cloud, x, y);
    l.globalAlpha = 1;
  }

  /** Niebla que se arrastra por el suelo (manglar), con dos capas a distinta velocidad. */
  drawFog(l, cam, t, strength) {
    if (strength <= 0.01) return;
    const F = this.fog.width;
    worldScreen(l);
    for (const [sp, par, a] of [[6, 1, 0.8], [11, 1.3, 0.5]]) {
      const ox = (((cam.ix * par - t * sp) % F) + F) % F;
      const oy = (((cam.iy * par) % F) + F) % F;
      l.globalAlpha = strength * a;
      for (let y = -oy; y < LOW_H; y += F) for (let x = -ox; x < LOW_W; x += F) l.drawImage(this.fog, x, y);
    }
    l.globalAlpha = 1;
  }

  /** Gradación por zona (con transición suave) y viñeta, sobre el canvas final. */
  drawGrade(ctx, zone, dt) {
    const target = ZONE_TINT[zone] || ZONE_TINT.selva;
    const k = Math.min(1, dt * 1.5);
    for (let i = 0; i < 4; i++) this.tint[i] += (target[i] - this.tint[i]) * k;
    const [r, g, b, a] = this.tint;
    uiTransform(ctx);
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
