// Mapa del juego (tecla M, sesión 5): la isla pintada desde el mismo mapa que el
// aterrizaje, con niebla de guerra sobre las zonas que aún no has pisado,
// marcador del jugador, restos del avión y nombres de las zonas descubiertas.

import { VIEW_W, VIEW_H, TILE } from '../config.js';
import { text, panel } from '../render/hud.js';
import { LAND_PX, paintLandingMap, paintFog } from '../world/landingMap.js';
import { ZONES, ZONE_IDS } from '../world/worldMap.js';

const S = 2; // escala del mapa pintado en pantalla (cada tile = 4 px)

export function drawWorldMap(c, g) {
  const map = g.map;
  if (!g.landing.paint) g.landing.prepare();
  if (!g.mapFog || g.mapDirty) {
    g.mapFog = paintFog(map, g.discovered);
    g.mapDirty = false;
  }
  const paint = g.landing.paint;
  const w = paint.W * S;
  const h = paint.H * S;
  const x0 = Math.round((VIEW_W - w) / 2);
  const y0 = 56;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = 'rgba(0, 0, 0, 0.65)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(c, x0 - 10, y0 - 44, w + 20, h + 64, 0.92);
  text(c, 'MAPA DE LA ISLA', x0, y0 - 22, { size: 24, color: '#ffe8a8', outline: 5 });
  const total = ZONE_IDS.filter((z) => z !== 'mar').length;
  const found = [...g.discovered].filter((z) => z !== 'mar').length;
  text(c, `Zonas descubiertas: ${found} / ${total}   ·   M / Esc: cerrar`, x0 + w, y0 - 22, { size: 15, align: 'right', bold: false, outline: 3 });
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#173f6a';
  c.fillRect(x0, y0, w, h);
  c.drawImage(paint.canvas, x0, y0, w, h);
  c.drawImage(g.mapFog, x0, y0, w, h);
  // Nombres de las zonas descubiertas.
  for (const [id, cz] of Object.entries(map.zoneCenters)) {
    if (id === 'mar' || cz.n < 30) continue;
    const known = g.discovered.has(id);
    text(c, known ? ZONES[id][0] : '?', x0 + cz.x * LAND_PX * S, y0 + cz.y * LAND_PX * S, { size: known ? 14 : 18, align: 'center', color: known ? '#fff6dc' : '#6a6a60', outline: 4 });
  }
  const toMap = (px, py) => [x0 + (px / TILE) * LAND_PX * S, y0 + (py / TILE) * LAND_PX * S];
  // Restos del avión.
  const wreck = g.world.props.find((p) => p.kind === 'avion');
  if (wreck && g.discovered.has(g.zoneAt(wreck.x, wreck.y))) {
    const [wx, wy] = toMap(wreck.x, wreck.y);
    c.fillStyle = '#17150f';
    c.fillRect(wx - 7, wy - 3, 14, 6);
    c.fillRect(wx - 2, wy - 7, 4, 14);
    c.fillStyle = '#c8b860';
    c.fillRect(wx - 6, wy - 2, 12, 4);
    c.fillRect(wx - 1, wy - 6, 2, 12);
    text(c, 'Avión', wx, wy + 16, { size: 12, align: 'center', color: '#e8dca0', outline: 3 });
  }
  // Jugador: flecha parpadeante según hacia dónde mira.
  const p = g.player;
  const [mx, my] = toMap(p.x, p.y);
  const blink = Math.floor(performance.now() / 300) % 2 === 0;
  const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.facing] || 0;
  c.save();
  c.translate(Math.round(mx), Math.round(my));
  c.rotate(ang);
  c.fillStyle = '#17150f';
  c.beginPath(); c.moveTo(11, 0); c.lineTo(-7, -8); c.lineTo(-3, 0); c.lineTo(-7, 8); c.closePath(); c.fill();
  c.fillStyle = blink ? '#ff5a3a' : '#ffd84a';
  c.beginPath(); c.moveTo(8, 0); c.lineTo(-5, -5); c.lineTo(-2, 0); c.lineTo(-5, 5); c.closePath(); c.fill();
  c.restore();
  text(c, 'Tú', mx, my - 16, { size: 13, align: 'center', color: '#ffd84a', outline: 3 });
  text(c, ZONES[g.zone] ? ZONES[g.zone][0] : '', x0 + 8, y0 + h + 10, { size: 15, color: '#ffd38a', outline: 3 });
}

export { paintLandingMap };
