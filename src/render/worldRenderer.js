// Dibujo provisional del mundo: cielo, fondos con paralaje, tiles con
// rectángulos de color (con sprites de 20 × 20 generados y cacheados) y agua.

import { TILE, VIEW_W, VIEW_H } from '../config.js';
import { RNG, hash2 } from '../core/rng.js';
import { T, TILE_INFO } from '../world/tiles.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Genera el sprite de un tile: tipo, variante (0–3) y si su cara superior está al aire. */
function makeTileSprite(type, variant, exposed) {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d');
  const rng = new RNG(type * 1000 + variant * 10 + (exposed ? 1 : 0) + 7);
  const speckles = (colors, n, size) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = rng.pick(colors);
      g.fillRect(rng.int(0, TILE - size), rng.int(0, TILE - size), size, size);
    }
  };
  if (type === T.DIRT) {
    g.fillStyle = '#7a5233';
    g.fillRect(0, 0, TILE, TILE);
    speckles(['#644229', '#8a5e3c', '#6e4a2e'], 7, 2);
    if (exposed) {
      g.fillStyle = '#3f7d34';
      g.fillRect(0, 0, TILE, 6);
      g.fillStyle = '#5fa046';
      g.fillRect(0, 0, TILE, 2);
      g.fillStyle = '#3f7d34';
      for (let x = 0; x < TILE; x += 3) g.fillRect(x, 6, 2, rng.int(0, 3));
    }
  } else if (type === T.ROCK) {
    g.fillStyle = '#6b6863';
    g.fillRect(0, 0, TILE, TILE);
    speckles(['#5a5752', '#7a7771', '#615e59'], 6, 3);
    g.fillStyle = '#4e4b47';
    g.fillRect(rng.int(2, 14), rng.int(4, 16), rng.int(3, 6), 1);
    if (exposed) {
      g.fillStyle = '#8c8881';
      g.fillRect(0, 0, TILE, 2);
    }
  } else if (type === T.PLATFORM) {
    g.fillStyle = '#9a6a3a';
    g.fillRect(0, 0, TILE, 6);
    g.fillStyle = '#c08a52';
    g.fillRect(0, 0, TILE, 1);
    g.fillStyle = '#5e3d20';
    g.fillRect(0, 5, TILE, 1);
    g.fillRect(variant % 2 ? 4 : 13, 1, 1, 4);
  }
  return c;
}

export class WorldRenderer {
  constructor(map, seed = 12345) {
    this.map = map;
    this.time = 0;
    this.sprites = new Map();
    // Siluetas de fondo generadas con semilla.
    const rng = new RNG(seed);
    this.layers = [
      { factor: 0.12, color: '#9ab8c4', base: 0.62, amp: 120, step: 80, points: [] },
      { factor: 0.3, color: '#6f9a83', base: 0.74, amp: 70, step: 50, points: [] },
    ];
    for (const layer of this.layers) {
      let h = rng.next();
      for (let i = 0; i < 400; i++) {
        h = Math.min(1, Math.max(0, h + rng.range(-0.35, 0.35)));
        layer.points.push(h);
      }
    }
    this.clouds = Array.from({ length: 9 }, () => ({
      x: rng.range(0, 3000),
      y: rng.range(40, 260),
      w: rng.range(90, 220),
      speed: rng.range(4, 12),
    }));
  }

  sprite(type, tx, ty) {
    const above = this.map.get(tx, ty - 1);
    // Cara superior al aire (con hierba); bajo el agua o bajo otro sólido, no.
    const exposed = !TILE_INFO[above].solid && !TILE_INFO[above].liquid;
    const variant = Math.floor(hash2(tx, ty) * 4);
    const key = type * 100 + variant * 10 + (exposed ? 1 : 0);
    let s = this.sprites.get(key);
    if (!s) {
      s = makeTileSprite(type, variant, exposed);
      this.sprites.set(key, s);
    }
    return s;
  }

  update(dt) {
    this.time += dt;
  }

  /** Cielo y montañas lejanas, en coordenadas de pantalla. */
  drawBackground(ctx, cam) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#4f9bd1');
    sky.addColorStop(0.6, '#a9d6ea');
    sky.addColorStop(1, '#e9f1e4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = 'rgba(255, 246, 214, 0.9)';
    ctx.beginPath();
    ctx.arc(VIEW_W * 0.78, VIEW_H * 0.18, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (const c of this.clouds) {
      const span = VIEW_W + 600;
      const x = ((((c.x + this.time * c.speed - cam.x * 0.05 * cam.zoom) % span) + span) % span) - 300;
      ctx.beginPath();
      ctx.ellipse(x, c.y, c.w / 2, c.w / 7, 0, 0, Math.PI * 2);
      ctx.ellipse(x + c.w * 0.18, c.y - c.w / 10, c.w / 4, c.w / 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const layer of this.layers) {
      const off = cam.x * layer.factor * cam.zoom;
      const vOff = (cam.y - (this.map.pixelHeight - cam.viewH)) * layer.factor * cam.zoom;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);
      const first = Math.floor(off / layer.step);
      for (let i = first; i <= first + Math.ceil(VIEW_W / layer.step) + 1; i++) {
        const p = layer.points[((i % layer.points.length) + layer.points.length) % layer.points.length];
        ctx.lineTo(i * layer.step - off, VIEW_H * layer.base - p * layer.amp - vOff);
      }
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Rango de tiles visibles con la cámara actual. */
  visibleRange(cam) {
    return {
      x0: Math.max(0, Math.floor(cam.x / TILE)),
      y0: Math.max(0, Math.floor(cam.y / TILE)),
      x1: Math.min(this.map.width - 1, Math.floor((cam.x + cam.viewW) / TILE)),
      y1: Math.min(this.map.height - 1, Math.floor((cam.y + cam.viewH) / TILE)),
    };
  }

  /** Tiles sólidos y plataformas (con la transformación de la cámara ya aplicada). */
  drawTiles(ctx, cam) {
    const { x0, y0, x1, y1 } = this.visibleRange(cam);
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const type = this.map.get(tx, ty);
        if (type === T.EMPTY || type === T.WATER) continue;
        ctx.drawImage(this.sprite(type, tx, ty), tx * TILE, ty * TILE);
      }
    }
    ctx.imageSmoothingEnabled = prev;
  }

  /** Agua semitransparente, dibujada encima de las entidades. */
  drawWater(ctx, cam) {
    const { x0, y0, x1, y1 } = this.visibleRange(cam);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.map.isWater(tx, ty)) continue;
        const surface = !this.map.isWater(tx, ty - 1);
        ctx.fillStyle = surface ? 'rgba(46, 130, 196, 0.55)' : 'rgba(30, 95, 165, 0.62)';
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        if (surface) {
          const wave = Math.sin(this.time * 2.5 + tx * 0.9) * 1.5;
          ctx.fillStyle = 'rgba(200, 240, 255, 0.75)';
          ctx.fillRect(tx * TILE, ty * TILE + 1 + wave, TILE, 2);
        }
      }
    }
  }

  /** Carteles del mundo de prueba. */
  drawLabels(ctx) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    for (const l of this.map.labels || []) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillText(l.text, l.x + 1, l.y + 1);
      ctx.fillStyle = '#fff8e0';
      ctx.fillText(l.text, l.x, l.y);
    }
  }
}
