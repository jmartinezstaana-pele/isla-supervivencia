// Composición de cada fotograma: el mundo se pinta en un buffer de 640 × 360 y
// se escala ×2 sin suavizado al canvas principal; el HUD va encima a 1280 × 720.

import { LOW_W, LOW_H, VIEW_W, VIEW_H } from '../config.js';
import { PixelCanvas, rgb } from '../gfx/pixel.js';

const shadowCache = new Map();
/** Sombra elíptica de pixel art (bordes nítidos, semitransparente). */
function shadowSprite(rx, ry) {
  rx = Math.max(2, Math.round(rx));
  ry = Math.max(1, Math.round(ry));
  const key = rx * 1000 + ry;
  if (!shadowCache.has(key)) {
    const p = new PixelCanvas(rx * 2 + 1, ry * 2 + 1);
    p.ellipse(rx, ry, rx, ry, rgb('#0a1408', 70));
    p.ellipse(rx, ry, rx * 0.7, ry * 0.7, rgb('#0a1408', 105));
    shadowCache.set(key, p.toCanvas());
  }
  return shadowCache.get(key);
}

export class Renderer {
  constructor(game) {
    this.game = game;
    this.low = document.createElement('canvas');
    this.low.width = LOW_W;
    this.low.height = LOW_H;
    this.lctx = this.low.getContext('2d');
    this.lctx.imageSmoothingEnabled = false;
  }

  /** Props y entidades visibles, como elementos ordenables { sortY, draw, shadow }. */
  collect(cam) {
    const g = this.game;
    const x0 = cam.ix - 80;
    const x1 = cam.ix + LOW_W + 80;
    const y0 = cam.iy - 20;
    const y1 = cam.iy + LOW_H + 140;
    const items = [];
    for (const p of g.world.props) {
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1 || p.hidden) continue;
      items.push({ sortY: p.y, prop: p, kind: p.kind, x: p.x, y: p.y });
    }
    for (const e of g.entities()) {
      if (e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      items.push({ sortY: e.sortY ?? e.y, ent: e, kind: e.kind || 'entidad', x: e.x, y: e.y });
    }
    items.sort((a, b) => a.sortY - b.sortY);
    return items;
  }

  drawProp(l, p, t, player) {
    const sway = Math.round(Math.sin(t * 1.4 + p.phase) * 0.9);
    const parts = p.opened && p.openSprite ? p.openSprite.parts : p.emptied && p.emptySprite ? p.emptySprite.parts : p.parts;
    for (const part of parts) {
      let alpha = 1;
      if (part.canopy || p.kind === 'palmera') {
        // Copa semitransparente si el jugador está detrás.
        const px0 = p.x + part.dx;
        const py0 = p.y + part.dy;
        const behind = player.y < p.y - 2 && player.x > px0 + 6 && player.x < px0 + part.w - 6 && player.y - 40 < py0 + part.h - 20 && player.y > py0 + 10;
        if (behind) alpha = 0.45;
      }
      if (alpha < 1) l.globalAlpha = alpha;
      l.drawImage(part.canvas, Math.round(p.x + part.dx + (part.sway ? sway : 0)), Math.round(p.y + part.dy));
      if (alpha < 1) l.globalAlpha = 1;
    }
    if (p.fire) {
      const frames = this.game.sprites.flames[p.fire.size > 1 ? 'big' : 'small'];
      const f = frames[Math.floor(t * 9 + p.phase * 3) % frames.length];
      l.drawImage(f, Math.round(p.x - f.width / 2), Math.round(p.y + p.fire.dy - f.height + 4));
    }
  }

  render(ctx) {
    const g = this.game;
    const l = this.lctx;
    const cam = g.camera;
    const t = g.time;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalAlpha = 1;
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = '#173f6a';
    l.fillRect(0, 0, LOW_W, LOW_H);
    // Suelo prerenderizado.
    l.drawImage(g.terrain.canvas, cam.ix, cam.iy, LOW_W, LOW_H, 0, 0, LOW_W, LOW_H);
    cam.apply(l);
    g.water.draw(l, cam, t);
    g.weather.drawPuddles(l, cam, t);

    const items = this.collect(cam);
    // Sombras primero (debajo de todo lo que tiene volumen).
    for (const it of items) {
      const s = it.prop ? it.prop.shadow : it.ent.shadow;
      if (!s) continue;
      const img = shadowSprite(s.rx, s.ry);
      l.drawImage(img, Math.round(it.x - img.width / 2 + (s.ox || 0)), Math.round(it.y - img.height / 2 + (s.oy || 0)));
    }
    for (const it of items) {
      if (it.prop) this.drawProp(l, it.prop, t, g.player);
      else it.ent.draw(l, g, t);
    }
    this.lastOrder = items;
    g.particles.draw(l);
    g.ambience.drawClouds(l, cam, t, g.cloudStrength ?? 1);
    cam.apply(l);
    g.lighting.draw(l, g);
    cam.apply(l);
    g.weather.draw(l);
    g.afterWorld(l, cam, t);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const sh = g.shake > 0 ? Math.round((Math.random() - 0.5) * 3) * 2 : 0;
    const sv = g.shake > 0 ? Math.round((Math.random() - 0.5) * 3) * 2 : 0;
    ctx.drawImage(this.low, sh, sv, VIEW_W, VIEW_H);
  }
}
