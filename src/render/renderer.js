// Composición de cada fotograma: el mundo (640 × 360 píxeles de mundo) se pinta
// en un buffer de 640K × 360K píxeles reales, con la escala entera K de la
// pantalla: terreno y props se amplían sin suavizado y los personajes se dibujan
// 1:1 a resolución real. Después se copia al canvas principal (1:1 si encaja) y
// el HUD va encima a resolución real.

import { LOW_W, LOW_H, TILE } from '../config.js';
import { display, uiTransform, worldScreen } from '../core/display.js';
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
    this.lctx = this.low.getContext('2d');
  }

  /** Ajusta el buffer del mundo a la escala entera actual. */
  fit() {
    const K = display.K;
    if (this.low.width !== LOW_W * K || this.low.height !== LOW_H * K) {
      this.low.width = LOW_W * K;
      this.low.height = LOW_H * K;
    }
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
    for (const p of g.world.index.query(x0, y0, x1, y1)) {
      if (p.hidden) continue;
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
    const cam = g.camera;
    const t = g.time;
    const K = display.K;
    // Si el canvas mide justo 640K × 360K (lo normal: 720p, 1080p…), el mundo se
    // pinta directamente en él, sin buffer intermedio ni copia.
    const direct = ctx.canvas.width === LOW_W * K && ctx.canvas.height === LOW_H * K;
    if (!direct) this.fit();
    const l = direct ? ctx : this.lctx;
    l.imageSmoothingEnabled = false;
    display.ox = g.shake > 0 ? Math.round((Math.random() - 0.5) * 3) * K : 0;
    display.oy = g.shake > 0 ? Math.round((Math.random() - 0.5) * 3) * K : 0;
    worldScreen(l);
    l.globalAlpha = 1;
    l.globalCompositeOperation = 'source-over';
    // Fondo de mar solo si la vista se sale del mapa (si no, el suelo lo tapa todo).
    if (cam.ix < 0 || cam.iy < 0 || cam.ix + LOW_W > g.map.width * TILE || cam.iy + LOW_H > g.map.height * TILE) {
      l.fillStyle = '#173f6a';
      l.fillRect(0, 0, LOW_W, LOW_H);
    }
    // Suelo pintado por trozos (los que falten se pintan ahora).
    g.terrain.draw(l, cam.ix, cam.iy, LOW_W, LOW_H);
    cam.apply(l);
    const indoor = g.level && g.level.indoor;
    g.water.draw(l, cam, t);
    if (!indoor) g.weather.drawPuddles(l, cam, t);

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
    if (!indoor) {
      g.ambience.drawClouds(l, cam, t, g.cloudStrength ?? 1);
      g.ambience.drawFog(l, cam, t, g.fogStrength ?? 0);
    }
    cam.apply(l);
    g.lighting.draw(l, g);
    cam.apply(l);
    if (!indoor) g.weather.draw(l);
    g.afterWorld(l, cam, t);

    display.ox = display.oy = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (!direct) {
      // Tamaño de ventana sin escala entera exacta: se reduce con suavizado.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.low, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.imageSmoothingEnabled = false;
    uiTransform(ctx);
  }
}
