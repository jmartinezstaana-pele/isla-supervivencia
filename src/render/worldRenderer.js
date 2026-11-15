// Dibujo provisional del mundo cenital: suelos con sprites de 32 × 32 generados
// y cacheados, paredes de acantilado, salientes, agua animada y objetos
// (árboles, rocas, muros) que se ordenan con el jugador por la y de su base.

import { TILE } from '../config.js';
import { RNG, hash2 } from '../core/rng.js';
import { G, O } from '../world/tiles.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const GRASS_BY_LEVEL = ['#5a9a43', '#6aa64c', '#7bb357', '#8cbf62'];

/** Sprite de suelo de 32 × 32 (sin efectos que dependan de los vecinos). */
function makeGroundSprite(g, variant, level) {
  const c = makeCanvas(TILE, TILE);
  const x = c.getContext('2d');
  const rng = new RNG(g * 977 + variant * 31 + level * 7 + 3);
  const dots = (colors, n, size) => {
    for (let i = 0; i < n; i++) {
      x.fillStyle = rng.pick(colors);
      x.fillRect(rng.int(0, TILE - size), rng.int(0, TILE - size), size, size);
    }
  };
  switch (g) {
    case G.GRASS:
    case G.TALL_GRASS: {
      const base = GRASS_BY_LEVEL[Math.min(level, 3)];
      x.fillStyle = base;
      x.fillRect(0, 0, TILE, TILE);
      dots(['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.08)'], 14, 2);
      if (variant === 0) dots(['#f2e27a', '#f0f0f0'], 2, 2); // florecillas
      if (g === G.TALL_GRASS) {
        for (let i = 0; i < 16; i++) {
          const bx = rng.int(1, TILE - 2);
          const by = rng.int(8, TILE - 1);
          x.strokeStyle = rng.pick(['#2f6b27', '#3d7f30', '#4b8f38']);
          x.lineWidth = 2;
          x.beginPath();
          x.moveTo(bx, by);
          x.lineTo(bx + rng.int(-3, 3), by - rng.int(8, 13));
          x.stroke();
        }
      }
      break;
    }
    case G.SAND:
      x.fillStyle = '#e2cf93';
      x.fillRect(0, 0, TILE, TILE);
      dots(['#d4bd7c', '#efe0ad', '#cdb574'], 12, 2);
      break;
    case G.DIRT:
      x.fillStyle = '#8a6a45';
      x.fillRect(0, 0, TILE, TILE);
      dots(['#76593a', '#9b7a52'], 12, 2);
      break;
    case G.CHASM: {
      const grad = x.createLinearGradient(0, 0, 0, TILE);
      grad.addColorStop(0, '#2a1d14');
      grad.addColorStop(1, '#0b0805');
      x.fillStyle = grad;
      x.fillRect(0, 0, TILE, TILE);
      break;
    }
    case G.CLIFF: {
      x.fillStyle = '#857a6c';
      x.fillRect(0, 0, TILE, TILE);
      x.fillStyle = '#6d6357';
      for (let i = 0; i < 4; i++) x.fillRect(rng.int(0, TILE - 2), 0, 2, TILE); // grietas verticales
      x.fillStyle = '#9a8f80';
      x.fillRect(0, rng.int(8, 22), TILE, 2); // estrato
      dots(['#5f564b', '#a29785'], 6, 2);
      break;
    }
    case G.LEDGE_S:
      x.fillStyle = GRASS_BY_LEVEL[Math.min(level, 3)];
      x.fillRect(0, 0, TILE, TILE);
      x.fillStyle = '#7d6a4f';
      x.fillRect(0, 10, TILE, 10);  // cara del saliente
      x.fillStyle = '#5e4f3a';
      x.fillRect(0, 18, TILE, 2);
      x.fillStyle = '#4c8a38';
      x.fillRect(0, 8, TILE, 3);    // borde de hierba
      break;
  }
  return c;
}

export class WorldRenderer {
  constructor(map) {
    this.map = map;
    this.time = 0;
    this.sprites = new Map();
  }

  update(dt) {
    this.time += dt;
  }

  groundSprite(g, tx, ty) {
    const variant = Math.floor(hash2(tx, ty) * 4);
    const level = g === G.LEDGE_S ? this.map.cliffTop[this.map.idx(tx, ty)] : this.map.levelAt(tx, ty);
    const key = `${g}:${variant}:${level}`;
    let s = this.sprites.get(key);
    if (!s) {
      s = makeGroundSprite(g, variant, level);
      this.sprites.set(key, s);
    }
    return s;
  }

  visibleRange(cam, margin = 0) {
    return {
      x0: Math.max(0, Math.floor(cam.x / TILE) - margin),
      y0: Math.max(0, Math.floor(cam.y / TILE) - margin),
      x1: Math.min(this.map.width - 1, Math.floor((cam.x + cam.viewW) / TILE) + margin),
      y1: Math.min(this.map.height - 1, Math.floor((cam.y + cam.viewH) / TILE) + margin),
    };
  }

  /** Capa de suelo (todo lo que va por debajo de personajes y objetos). */
  drawGround(ctx, cam) {
    const m = this.map;
    const { x0, y0, x1, y1 } = this.visibleRange(cam);
    ctx.imageSmoothingEnabled = false;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const g = m.groundAt(tx, ty);
        const px = tx * TILE;
        const py = ty * TILE;
        if (g === G.SHALLOW || g === G.DEEP) {
          this.drawWaterTile(ctx, tx, ty, g);
          continue;
        }
        ctx.drawImage(this.groundSprite(g, tx, ty), px, py);
        this.drawEdges(ctx, tx, ty, g);
      }
    }
    ctx.imageSmoothingEnabled = true;
  }

  drawWaterTile(ctx, tx, ty, g) {
    const px = tx * TILE;
    const py = ty * TILE;
    ctx.fillStyle = g === G.DEEP ? '#2b6cad' : '#58aed6';
    ctx.fillRect(px, py, TILE, TILE);
    if (g === G.SHALLOW) {
      ctx.fillStyle = 'rgba(226, 207, 147, 0.35)'; // fondo de arena que se transparenta
      ctx.fillRect(px, py, TILE, TILE);
    }
    const t = this.time;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    const ox = (Math.sin(t * 1.3 + tx * 1.7 + ty) * 6) | 0;
    ctx.fillRect(px + 6 + ox, py + 9 + ((tx * 7 + ty * 3) % 12), 10, 2);
    // Espuma donde el agua toca tierra.
    const m = this.map;
    const isWater = (x, y) => {
      const k = m.groundAt(x, y);
      return k === G.SHALLOW || k === G.DEEP || k === -1;
    };
    ctx.fillStyle = 'rgba(240, 250, 255, 0.6)';
    if (!isWater(tx, ty - 1)) ctx.fillRect(px, py, TILE, 2);
    if (!isWater(tx, ty + 1)) ctx.fillRect(px, py + TILE - 2, TILE, 2);
    if (!isWater(tx - 1, ty)) ctx.fillRect(px, py, 2, TILE);
    if (!isWater(tx + 1, ty)) ctx.fillRect(px + TILE - 2, py, 2, TILE);
  }

  /** Bordes entre alturas y de grietas, según los vecinos. */
  drawEdges(ctx, tx, ty, g) {
    const m = this.map;
    const px = tx * TILE;
    const py = ty * TILE;
    if (g === G.CLIFF) {
      if (!m.isCliff(tx, ty - 1)) { // borde superior con hierba colgando
        ctx.fillStyle = GRASS_BY_LEVEL[Math.min(m.cliffTop[m.idx(tx, ty)], 3)];
        ctx.fillRect(px, py, TILE, 4);
        ctx.fillStyle = '#3f7a30';
        ctx.fillRect(px, py + 4, TILE, 2);
      }
      if (!m.isCliff(tx, ty + 1)) { // sombra al pie de la pared
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      }
      if (!m.isCliff(tx - 1, ty)) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px, py, 2, TILE); }
      if (!m.isCliff(tx + 1, ty)) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(px + TILE - 2, py, 2, TILE); }
      return;
    }
    if (g === G.CHASM) {
      if (m.groundAt(tx, ty - 1) !== G.CHASM) { // corte de tierra visible arriba
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(px, py, TILE, 8);
        ctx.fillStyle = '#4e3520';
        ctx.fillRect(px, py + 8, TILE, 2);
      }
      return;
    }
    if (g === G.LEDGE_S) return;
    const lv = m.levelAt(tx, ty);
    // Sombra en el suelo bajo, junto a un lado más alto (la meseta proyecta sombra).
    const higher = (x, y) => {
      const k = m.groundAt(x, y);
      return k !== G.CLIFF && k !== -1 && (k === G.LEDGE_S ? m.cliffTop[m.idx(x, y)] : m.levelAt(x, y)) > lv;
    };
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    if (higher(tx - 1, ty)) ctx.fillRect(px, py, 6, TILE);
    if (higher(tx + 1, ty)) ctx.fillRect(px + TILE - 6, py, 6, TILE);
    if (lv === 0) return;
    // Borde de meseta: línea de roca en los lados que dan a un nivel más bajo.
    const lower = (x, y) => {
      const k = m.groundAt(x, y);
      return k !== G.CLIFF && k !== G.LEDGE_S && k !== -1 && m.levelAt(x, y) < lv;
    };
    ctx.fillStyle = '#857a6c';
    if (lower(tx, ty - 1)) ctx.fillRect(px, py, TILE, 3);
    if (lower(tx - 1, ty)) ctx.fillRect(px, py, 4, TILE);
    if (lower(tx + 1, ty)) ctx.fillRect(px + TILE - 4, py, 4, TILE);
  }

  /** Objetos visibles como elementos ordenables { sortY, draw }. */
  collectObjects(cam, out) {
    const m = this.map;
    const { x0, y0, x1, y1 } = this.visibleRange(cam, 3);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const o = m.objectAt(tx, ty);
        if (o === O.NONE) continue;
        const px = tx * TILE;
        const py = ty * TILE;
        if (o === O.TREE) {
          out.push({ kind: 'árbol', tx, ty, sortY: py + 30, draw: (ctx) => this.drawTree(ctx, px, py, tx, ty) });
        } else if (o === O.BOULDER) {
          out.push({ kind: 'roca', tx, ty, sortY: py + 30, draw: (ctx) => this.drawBoulder(ctx, px, py) });
        } else if (o === O.WALL) {
          out.push({ kind: 'muro', tx, ty, sortY: py + TILE, draw: (ctx) => this.drawWall(ctx, px, py, tx, ty) });
        }
      }
    }
  }

  drawTree(ctx, px, py, tx, ty) {
    const cx = px + TILE / 2;
    const sway = Math.sin(this.time * 1.2 + tx) * 1.2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, py + 28, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4627';
    ctx.fillRect(cx - 5, py - 4, 10, 34);
    ctx.fillStyle = '#4f321b';
    ctx.fillRect(cx + 2, py - 4, 3, 34);
    const shade = hash2(tx, ty, 9) * 0.15;
    const blob = (x, y, r, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(cx + sway, py - 22, 26, `rgb(${40 + shade * 100}, ${100 + shade * 80}, 45)`);
    blob(cx - 12 + sway, py - 12, 16, '#2f7a33');
    blob(cx + 13 + sway, py - 14, 15, '#2f7a33');
    blob(cx - 6 + sway, py - 32, 14, '#4c9c45');
    blob(cx + 8 + sway, py - 28, 9, '#5aae50');
  }

  drawBoulder(ctx, px, py) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 28, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#80796f';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 18, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9d968b';
    ctx.beginPath();
    ctx.ellipse(px + 12, py + 13, 7, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWall(ctx, px, py, tx, ty) {
    // Bloque con algo de altura: la cara frontal se ve por debajo de la parte superior.
    const top = this.map.objectAt(tx, ty - 1) !== O.WALL;
    const h = 14;
    ctx.fillStyle = '#6f685f';
    ctx.fillRect(px, py - (top ? h : 0), TILE, TILE + (top ? h : 0));
    ctx.fillStyle = '#958d81';
    if (top) ctx.fillRect(px, py - h, TILE, 10);
    if (this.map.objectAt(tx, ty + 1) !== O.WALL) { // cara frontal solo abajo
      ctx.fillStyle = '#5a544c';
      ctx.fillRect(px, py + TILE - 10, TILE, 10);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(px + 10 + (ty % 2) * 8, py + 4, 2, 12);
  }

  /** Carteles del mapa de prueba. */
  drawLabels(ctx) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    for (const l of this.map.labels || []) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillText(l.text, l.x + 1, l.y + 1);
      ctx.fillStyle = '#fff8e0';
      ctx.fillText(l.text, l.x, l.y);
    }
  }
}
