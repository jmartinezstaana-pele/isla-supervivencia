// Capa animada del agua: espuma que sube y baja por la orilla, líneas de ola que
// llegan a la playa, destellos, corriente del río y la cascada. Se calcula píxel
// a píxel solo en la zona visible y 30 veces por segundo.

import { LOW_W, LOW_H, TILE } from '../config.js';
import { hash2 } from '../core/rng.js';
import { G } from '../world/tiles.js';
import { pack } from '../gfx/pixel.js';
import { CHUNK } from '../gfx/terrain.js';

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

const SWAMP_RIPPLE = pack(150, 190, 160, 70);
const SWAMP_SHINE = pack(200, 230, 200, 120);

export class WaterLayer {
  constructor(map, terrain) {
    this.map = map;
    this.terrain = terrain;
    this.canvas = document.createElement('canvas');
    this.canvas.width = LOW_W + 1;
    this.canvas.height = LOW_H + 1;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(LOW_W + 1, LOW_H + 1);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.lastT = -1;
    this.cx = 0;
    this.cy = 0;
  }

  update(cam, t) {
    const { buf, map, terrain } = this;
    const ox = cam.ix;
    const oy = cam.iy;
    const bw = LOW_W + 1;
    buf.fill(0);
    const t6 = t * 6;
    const tw = (t * 40) | 0;
    const CH = CHUNK;
    const [c0, r0, c1, r1] = terrain.range(ox, oy, LOW_W + 1, LOW_H + 1);
    for (let r = r0; r <= r1; r++) {
      for (let cc = c0; cc <= c1; cc++) {
        const ch = terrain.chunk(cc, r);
        const { kind, dist, noise } = ch;
        const ya = Math.max(oy, ch.y);
        const yb = Math.min(oy + LOW_H + 1, ch.y + CH);
        const xa = Math.max(ox, ch.x);
        const xb = Math.min(ox + LOW_W + 1, ch.x + CH);
        for (let wy = ya; wy < yb; wy++) {
          const row = (wy - ch.y) * CH - ch.x;
          const orow = (wy - oy) * bw - ox;
          for (let wx = xa; wx < xb; wx++) {
            const i = row + wx;
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
              // Espuma revuelta al pie de una cascada.
              const ty = wy >> 5;
              const dy = wy - ty * TILE;
              if (dy < 14 && map.groundAt(wx >> 5, ty - 1) === G.WATERFALL && ((n + tw * 3) & 255) < 150 - dy * 10) c = FOAM;
            } else if (k === 3) {
              const col = hash2(wx >> 1, 0, 8);
              const v = (wy - t * 140 + col * 40) % 18;
              c = v < 2 ? FALL[2] : v < 7 ? FALL[1] : col > 0.75 ? FALL[3] : FALL[0];
              if (n < 20) c = FALL[2];
            } else {
              // Agua del manglar: quieta, con ondas lentas y algún brillo.
              const d = dist[i];
              if (d <= 1) c = SWAMP_RIPPLE;
              else if (((wx + wy * 2 + (n >> 2) + t * 4) % 61) < 1 && (n & 3) === 0) c = SWAMP_SHINE;
            }
            if (c) buf[orow + wx] = c;
          }
        }
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
