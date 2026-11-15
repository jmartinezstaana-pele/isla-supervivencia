// Capa animada del agua: espuma que sube y baja por la orilla, líneas de ola que
// llegan a la playa, destellos, corriente del río y la cascada. Se calcula píxel
// a píxel solo en la zona visible y 30 veces por segundo.

import { LOW_W, LOW_H, TILE } from '../config.js';
import { hash2 } from '../core/rng.js';
import { G } from '../world/tiles.js';
import { pack } from '../gfx/pixel.js';

const LUT_N = 1024;
const SIN = new Float32Array(LUT_N);
for (let i = 0; i < LUT_N; i++) SIN[i] = Math.sin((i / LUT_N) * Math.PI * 2);
const sinf = (v) => SIN[((v * (LUT_N / (Math.PI * 2))) | 0) & (LUT_N - 1)];

const FOAM = pack(240, 252, 246, 235);
const FOAM_SOFT = pack(225, 248, 245, 130);
const WAVE = pack(200, 245, 245, 90);
const SPARK = pack(255, 255, 255, 220);
const CREST = pack(170, 230, 235, 80);
const RIVER_STREAK = pack(190, 240, 240, 110);
const FALL = [pack(120, 205, 220), pack(170, 228, 236), pack(235, 250, 252), pack(70, 160, 190)];

export class WaterLayer {
  constructor(map, terrain) {
    this.map = map;
    const { type, distToLand, width, height } = terrain;
    this.W = width;
    this.H = height;
    this.kind = new Uint8Array(width * height); // 0 nada, 1 mar, 2 río, 3 cascada
    this.dist = distToLand;
    this.noise = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const g = type[i];
      this.kind[i] = g === G.SHALLOW || g === G.DEEP ? 1 : g === G.RIVER ? 2 : g === G.WATERFALL ? 3 : 0;
      this.noise[i] = (hash2(i % width, (i / width) | 0, 3) * 255) | 0;
    }
    // Fila inferior de cada columna de cascada (para la espuma de la poza).
    this.fallBottom = new Int32Array(width).fill(-1);
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.groundAt(tx, ty) === G.WATERFALL) for (let x = tx * TILE; x < (tx + 1) * TILE; x++) this.fallBottom[x] = (ty + 1) * TILE;
      }
    }
    this.canvas = document.createElement('canvas');
    this.canvas.width = LOW_W + 1;
    this.canvas.height = LOW_H + 1;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(LOW_W + 1, LOW_H + 1);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.lastT = -1;
    this.cx = 0;
    this.cy = 0;
    this.rainRipples = 0;
  }

  update(cam, t) {
    const { W, kind, dist, noise, buf, fallBottom } = this;
    const ox = cam.ix;
    const oy = cam.iy;
    const bw = LOW_W + 1;
    buf.fill(0);
    const t6 = t * 6;
    const tw = (t * 40) | 0;
    for (let y = 0; y <= LOW_H; y++) {
      const wy = oy + y;
      if (wy < 0 || wy >= this.H) continue;
      for (let x = 0; x <= LOW_W; x++) {
        const wx = ox + x;
        if (wx < 0 || wx >= W) continue;
        const i = wy * W + wx;
        const k = kind[i];
        if (!k) continue;
        const n = noise[i];
        let c = 0;
        if (k === 1) {
          const d = dist[i];
          const swash = 2.2 + 2 * sinf(t * 1.25 + wx * 0.021 + wy * 0.033);
          if (d <= swash) c = FOAM;
          else if (d <= swash + 1.6) c = FOAM_SOFT;
          else if (d < 26) {
            const band = (d + t6 + (n & 7) * 0.6) % 22;
            if (band < 1.2) c = WAVE;
          }
          if (!c && d > 6) {
            if (((n * 7 + tw) & 1023) < 2 && (n & 1)) c = SPARK;
            else if (((wx * 2 + wy * 3 + (n >> 2) + t * 26) % 52) < 1.4 && ((wx >> 2) + wy) % 3 === 0) c = CREST;
          }
        } else if (k === 2) {
          const d = dist[i];
          if (d <= 1 + (sinf(t * 2 + wy * 0.1) > 0.3 ? 1 : 0)) c = FOAM_SOFT;
          else if (((wy - t * 55 + (n >> 3) + wx * 0.35) % 23) < 1.4 && (n & 3) !== 0) c = RIVER_STREAK;
        } else {
          // Cascada: chorros que caen.
          const col = hash2(wx >> 1, 0, 8);
          const v = (wy - t * 140 + col * 40) % 18;
          c = v < 2 ? FALL[2] : v < 7 ? FALL[1] : col > 0.75 ? FALL[3] : FALL[0];
          if (n < 20) c = FALL[2];
        }
        // Espuma revuelta al pie de la cascada.
        if (k === 2 && fallBottom[wx] >= 0) {
          const dy = wy - fallBottom[wx];
          if (dy >= 0 && dy < 14 && ((n + tw * 3) & 255) < 150 - dy * 10) c = FOAM;
        }
        if (c) buf[y * bw + x] = c;
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
    this.cx = ox;
    this.cy = oy;
  }

  draw(l, cam, t) {
    if (t - this.lastT > 1 / 30 || cam.ix !== this.cx || cam.iy !== this.cy) {
      this.update(cam, t);
      this.lastT = t;
    }
    l.drawImage(this.canvas, this.cx, this.cy);
  }
}
