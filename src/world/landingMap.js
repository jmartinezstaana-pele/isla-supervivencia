// Mapa de la isla vista desde arriba, pintado a partir del mapa real del juego
// (sesión 5): lo usan el aterrizaje (TRASPASO §2.3) y el mapa M con niebla de
// guerra. Cada tile ocupa LAND_PX × LAND_PX píxeles del mapa pintado.

import { G } from './tiles.js';
import { ZONES, ZONE_IDS, landValue } from './worldMap.js';
import { PixelCanvas, rgb, mix, shade, bayer } from '../gfx/pixel.js';
import { C } from '../gfx/palette.js';
import { fbm } from '../core/rng.js';

export const LAND_PX = 2;

/** Resultado del aterrizaje (TRASPASO §2.4). Clave: tipo de sitio. */
export const LANDING_RESULTS = {
  arena: { nombre: 'Arena de la playa', dano: 10, avion: 'reparable', riesgo: 'Bajo', texto: 'La arena frena el avión. Se podría reparar.' },
  selva: { nombre: 'La selva', dano: 30, avion: 'destruido', riesgo: 'Medio', texto: 'Los árboles destrozan las alas.' },
  ruinas: { nombre: 'Meseta de las ruinas', dano: 45, avion: 'destruido', riesgo: 'Alto', texto: 'Golpe durísimo en lo alto, pero cerca de los secretos.' },
  campamento: { nombre: 'Campamento de la tribu', dano: 25, avion: 'destruido', riesgo: 'Alto', texto: 'El estruendo alerta a la tribu.' },
  poblado: { nombre: 'Poblado de la tribu', dano: 25, avion: 'destruido', riesgo: 'Muy alto', texto: 'Caes en medio del poblado: toda la tribu acude.' },
  monte: { nombre: 'El monte', dano: 45, avion: 'destruido', riesgo: 'Alto', texto: 'Las terrazas de roca parten el avión. Cerca de los secretos.' },
  cumbre: { nombre: 'La cumbre', dano: 50, avion: 'destruido', riesgo: 'Alto', texto: 'Nieve, frío y rocas. Junto a la vieja antena.' },
  militar: { nombre: 'Campamento militar', dano: 35, avion: 'destruido', riesgo: 'Alto', texto: 'Arrasas las tiendas del campamento abandonado.' },
  acantilados: { nombre: 'Acantilados del viento', dano: 40, avion: 'destruido', riesgo: 'Alto', texto: 'El viento te tumba contra las rocas.' },
  manglar: { nombre: 'El manglar', dano: 20, avion: 'destruido', riesgo: 'Medio', texto: 'El barro amortigua el golpe, pero el avión se hunde en el fango.' },
  mar: { nombre: 'El mar', dano: 0, avion: 'hundido', riesgo: 'Medio', texto: 'El avión se hunde. Llegas nadando a la costa.' },
};

/** Tipo de resultado según la zona y el suelo del tile. */
function resultFor(zone, g) {
  if (g === G.DEEP || g === G.SHALLOW) return 'mar';
  if (g === G.SAND) return 'arena';
  if (LANDING_RESULTS[zone]) return zone;
  return 'selva';
}

/**
 * Qué hay en un punto del mapa (en tiles): { zone, nombre, result }.
 * `result` es la clave de LANDING_RESULTS.
 */
export function landingZoneAt(map, x, y) {
  const tx = Math.max(0, Math.min(map.width - 1, Math.floor(x)));
  const ty = Math.max(0, Math.min(map.height - 1, Math.floor(y)));
  const g = map.groundAt(tx, ty);
  const zone = g === G.DEEP || g === G.SHALLOW ? 'mar' : ZONE_IDS[map.zones[ty * map.width + tx]];
  return { zone, nombre: ZONES[zone][0], result: resultFor(zone, g), explored: true };
}

// ------------------------------------------------------------------ pintado
const P = {
  deep: rgb('#173f6a'), deep2: rgb('#1d5f86'), mid: rgb('#2f95a8'), shallow: rgb('#5fc4c4'), foam: rgb('#effaf2'),
  tall: ['#4a5a1e', '#6a7a2a', '#8a9a3a'].map((c) => rgb(c)),
};

/** Copas vistas desde arriba: grupos con luz por el noroeste y sombra por el sureste. */
function canopy(px, py, tones, seed = 5) {
  const n = fbm(px * 0.22, py * 0.22, seed);
  const nl = fbm((px - 1.5) * 0.22, (py - 1.5) * 0.22, seed);
  let t = 1 + Math.floor(n * 4.4);
  if (nl < n - 0.025) t += 1;
  else if (nl > n + 0.03) t -= 1;
  return tones[Math.max(0, Math.min(tones.length - 1, t))];
}

function seaColor(v, px, py) {
  const t = Math.min(1, -v / 9);
  const dth = bayer(px, py) - 0.5;
  return t + dth * 0.25 < 0.25 ? P.shallow : t + dth * 0.2 < 0.55 ? P.mid : t < 0.85 ? P.deep2 : P.deep;
}

function tileColor(map, tx, ty, px, py) {
  const g = map.groundAt(tx, ty);
  const lvl = map.levelAt(tx, ty);
  const n = fbm(px * 0.35, py * 0.35, 5);
  const d = bayer(px, py);
  const k = (tones, a = 0) => tones[Math.max(0, Math.min(tones.length - 1, Math.floor((n * 0.8 + d * 0.4) * (tones.length - 1)) + a))];
  let c;
  switch (g) {
    case G.DEEP:
    case G.SHALLOW: c = seaColor(landValue(tx + 0.5, ty + 0.5) * 1.4 - 1, px, py); break;
    case G.SAND: c = k(C.sand, 1); break;
    case G.GRASS: c = k(C.grass, 1); break;
    case G.DIRT: c = k(C.dirt, 1); break;
    case G.RIVER: c = P.mid; break;
    case G.WATERFALL: c = P.foam; break;
    case G.BRIDGE: c = C.wood[3]; break;
    case G.CLIFF: c = C.stone[(py % 2) + 1]; break;
    case G.LEDGE_S: c = C.stone[2]; break;
    case G.TALL_GRASS: c = P.tall[Math.min(2, Math.floor((n + d * 0.3) * 3))]; break;
    case G.STONE: c = C.stone[3 + ((n + d) > 0.9 ? 1 : 0)]; break;
    case G.SNOW: c = k(C.snow, 1); break;
    case G.ROCK: c = k(C.stone, 1); break;
    case G.MUD: c = k(C.mud, 1); break;
    case G.SWAMP: c = n + d * 0.25 > 0.6 ? rgb('#4a7a60') : rgb('#3d6a55'); break;
    case G.GRAVEL: c = k(C.gravel, 1); break;
    case G.CONCRETE: c = C.concrete[3]; break;
    case G.NEEDLES: c = canopy(px, py, C.pine, 9); break;
    case G.CHASM: c = rgb('#0a0806'); break;
    default: c = canopy(px, py, C.jungleLeaf);
  }
  if (lvl > 0 && g !== G.CLIFF && g !== G.RIVER) c = shade(c, 1 + lvl * 0.05);
  return c;
}

/** Pinta la isla entera (LAND_PX px por tile). Devuelve { canvas, W, H }. */
export function paintLandingMap(map) {
  const W = map.width * LAND_PX;
  const H = map.height * LAND_PX;
  const pc = new PixelCanvas(W, H);
  const land = new Uint8Array(W * H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const tx = Math.floor(px / LAND_PX);
      const ty = Math.floor(py / LAND_PX);
      const g = map.groundAt(tx, ty);
      land[py * W + px] = g === G.DEEP || g === G.SHALLOW ? 0 : 1;
      pc.data[py * W + px] = tileColor(map, tx, ty, px, py);
    }
  }
  // Espuma y contorno de cómic en la costa.
  const out = new Uint32Array(pc.data);
  for (let py = 1; py < H - 1; py++) {
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      const l = land[i];
      if (land[i - 1] === l && land[i + 1] === l && land[i - W] === l && land[i + W] === l) continue;
      out[i] = l ? shade(pc.data[i], 0.6) : (px + py) % 3 ? P.foam : P.shallow;
    }
  }
  pc.data.set(out);
  // Sombra de la isla sobre el mar y al pie de las paredes: se leen las alturas.
  for (let py = 2; py < H - 2; py++) {
    for (let px = 2; px < W; px++) {
      const i = py * W + px;
      if (!land[i]) { if (land[i - W * 2 - 2]) pc.data[i] = mix(pc.data[i], P.deep, 0.45); continue; }
      const tx = Math.floor(px / LAND_PX);
      const ty = Math.floor(py / LAND_PX);
      if (map.groundAt(tx, ty - 1) === G.CLIFF && map.groundAt(tx, ty) !== G.CLIFF) pc.data[i] = shade(pc.data[i], 0.62);
    }
  }
  return { canvas: pc.toCanvas(), W, H };
}

/**
 * Niebla de guerra del mapa M: tapa las zonas no descubiertas (con borde deshilachado).
 * `discovered`: Set de zonas.
 */
export function paintFog(map, discovered) {
  const W = map.width * LAND_PX;
  const H = map.height * LAND_PX;
  const pc = new PixelCanvas(W, H);
  const hidden = new Uint8Array(map.width * map.height);
  for (let i = 0; i < hidden.length; i++) hidden[i] = discovered.has(ZONE_IDS[map.zones[i]]) ? 0 : 1;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const tx = Math.floor(px / LAND_PX);
      const ty = Math.floor(py / LAND_PX);
      if (!hidden[ty * map.width + tx]) continue;
      let edge = 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const x = tx + dx;
        const y = ty + dy;
        if (x >= 0 && y >= 0 && x < map.width && y < map.height && !hidden[y * map.width + x]) edge = 1;
      }
      if (edge && bayer(px, py) < 0.5) continue;
      const n = fbm(px * 0.05, py * 0.05, 41);
      const tone = n > 0.55 ? '#e4e2d8' : n > 0.45 ? '#cfccc0' : '#b8b6aa';
      pc.data[py * W + px] = rgb(tone, edge ? 170 : 240);
    }
  }
  return pc.toCanvas();
}
