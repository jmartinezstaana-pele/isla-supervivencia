// Interiores (sesión 6, TRASPASO §4d): mapas aparte a los que se entra por una
// puerta, al estilo Pokémon, con un fundido.
//
//   cueva ..... cuevas del monte: dos bocas (terraza 1 y terraza 3), oscuridad total
//               (hace falta antorcha), guarida del depredador, esqueleto de un
//               soldado con nota y la tarjeta de acceso, y un bidón.
//   bunker .... bajo el campamento militar: radio rota, batería, cables, bidón y notas.
//   cabana1–5 . cabañas del poblado de la tribu.
//   choza ..... choza del jefe, con su cofre y el bidón de combustible.
//
// Cada interior es un TileMap pequeño con su tema (muros de roca, de hormigón o de
// barro y palos), sus props, sus luces y sus salidas. Las salidas están en el
// borde de abajo: se sale andando hacia abajo.

import { TILE } from '../config.js';
import { RNG, hash2 } from '../core/rng.js';
import { TileMap } from './tilemap.js';
import { G } from './tiles.js';
import { makeProp } from './props.js';
import * as S from '../gfx/props.js';
import * as B from '../gfx/biomeProps.js';
import * as I from '../gfx/interiorProps.js';

const cache = new Map();
function sprite(kind, variant, make) {
  const key = `i:${kind}:${variant}`;
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

const T = (v) => v * TILE;

/** Nombre y subtítulo de cada interior (cartel al entrar). */
export const INTERIOR_ZONES = {
  cueva: ['Cuevas del monte', 'Oscuridad total · lleva una antorcha encendida'],
  bunker: ['El búnker', 'Puesto militar abandonado'],
  cabana: ['Cabaña de la tribu', 'Que no te pillen dentro'],
  choza: ['Choza del jefe', 'Peligro muy alto · el cofre del jefe'],
};

/** Notas que se encuentran en los interiores (lore y pistas, TRASPASO §2.5). */
export const NOTES = {
  soldado: {
    titulo: 'Nota arrugada',
    texto: [
      'Día 41. Me he perdido en estas cuevas buscando la salida de arriba.',
      'Se me acaba la antorcha. Algo grande duerme en la galería del norte;',
      'he oído sus garras. No vuelvo por ahí.',
      'Si alguien encuentra esto: la tarjeta abre el búnker del campamento.',
      'La radio de dentro no funciona sin batería. — Cabo R. Méndez',
    ],
  },
  radio: {
    titulo: 'Registro de radio',
    texto: [
      'Equipo de transmisiones, puesto A-07.',
      'La emisora se averió durante la tormenta. Piezas necesarias:',
      'batería de repuesto (almacén de energía) y cables nuevos (almacén).',
      'Con la radio reparada hay que subir a la antena de la cumbre:',
      'desde aquí abajo no hay cobertura.',
    ],
  },
  mapa: {
    titulo: 'Orden de evacuación',
    texto: [
      'A todo el personal: el puesto se abandona.',
      'Los nativos han cortado el camino del poblado y se han llevado',
      'uno de los bidones de combustible a la choza de su jefe.',
      'El helicóptero de rescate solo aterriza en el helipuerto de la bahía',
      'si se le llama por radio.',
    ],
  },
  diario: {
    titulo: 'Diario de un soldado',
    texto: [
      'Méndez no ha vuelto de las cuevas. Dice el sargento que no le busquemos.',
      'Por la noche se oyen tambores en la selva y algo que ronda el campamento.',
      'Tengo la balsa medio pensada: madera, cuerda y tela de las tiendas.',
      'Si el viento sopla del oeste, la corriente lleva a mar abierto desde el embarcadero.',
    ],
  },
};

// ------------------------------------------------------------------ utilidades

function newMap(w, h, fill, theme, outside) {
  const map = new TileMap(w, h);
  map.ground.fill(fill);
  map.theme = theme;
  map.outside = outside;
  return map;
}

function carveRect(map, x0, y0, x1, y1, g) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) map.setTile(x, y, g, 0);
}

/** Interior vacío listo para rellenar. */
function level(id, map, extra) {
  return {
    id,
    map,
    props: [],
    pickups: [],
    lights: [],
    entries: {},
    exits: [],
    indoor: true,
    ...extra,
  };
}

/** Coloca un prop en (tx, ty) en tiles. */
function add(L, kind, spr, tx, ty, extra = {}) {
  const p = makeProp(kind, spr, T(tx), T(ty), extra);
  p.level = 0;
  L.props.push(p);
  return p;
}

/** Salida en las columnas [x0, x1] de la fila de abajo; `entry` dice a qué puerta de fuera lleva. */
function addExit(L, entry, x0, x1, shaft = true) {
  const y = L.map.height - 1;
  carveRect(L.map, x0, y - 1, x1, y, L.floor);
  L.exits.push({ entry, rect: { x: T(x0) + 2, y: T(y) + 14, w: T(x1 - x0 + 1) - 4, h: 18 } });
  L.entries[entry] = { x: T((x0 + x1 + 1) / 2), y: T(y) - 6, facing: 'up' };
  if (shaft) {
    add(L, 'luzSalida', sprite('luzSalida', L.map.theme, () => I.lightShaft(L.map.theme === 'bunker' ? '#d8e0e8' : '#f6e8b0')), (x0 + x1 + 1) / 2, y + 1, {
      light: { r: L.map.theme === 'cueva' ? 90 : 70, color: [235, 220, 170] },
    });
  }
}

// ------------------------------------------------------------------ cueva

/**
 * Cuevas del monte (48 × 32): túneles tallados con semilla entre la boca A
 * (terraza 1, abajo a la izquierda) y la boca B (terraza 3, abajo a la derecha),
 * con galerías laterales: la guarida del depredador al norte, la del esqueleto y
 * una charca.
 */
export function buildCave() {
  const W = 48;
  const H = 32;
  const map = newMap(W, H, G.WALL, 'cueva', G.WALL);
  const L = level('cueva', map, { zone: 'cueva', floor: G.CAVE, ambient: [10, 10, 16], selfLight: 30, dark: true });
  const rng = new RNG(6060);
  const floorAt = (x, y) => map.groundAt(x, y) === G.CAVE;
  const disc = (cx, cy, r) => {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        if (x < 1 || y < 1 || x > W - 2 || y > H - 2) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + (hash2(x, y, 71) - 0.5) * 0.9;
        if (d < r) map.setTile(x, y, G.CAVE, 0);
      }
    }
  };
  const tunnel = (pts, r0, r1) => {
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k];
      const [bx, by] = pts[k + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        disc(ax + (bx - ax) * t, ay + (by - ay) * t, r0 + (r1 - r0) * (0.5 + 0.5 * Math.sin((k + t) * 2.3 + rng.next())));
      }
    }
  };
  // Camino principal de A a B.
  const main = [[8.5, 29], [9, 24], [12, 19], [17, 15], [23, 12], [30, 10], [36, 12], [40, 17], [40.5, 23], [40.5, 29]];
  tunnel(main, 1.7, 2.5);
  // Galerías: guarida (norte), esqueleto (sur-centro) y charca (este).
  tunnel([[17, 15], [15, 10], [13, 6]], 1.6, 2.2);
  disc(12.5, 5.5, 3.6);
  tunnel([[12, 19], [18, 22], [24, 23]], 1.5, 2);
  disc(25, 23, 3.2);
  tunnel([[30, 10], [31, 16], [31, 19]], 1.4, 1.9);
  disc(31.5, 20, 3);
  // Charca de agua en la galería del este.
  for (let y = 19; y <= 21; y++) for (let x = 30; x <= 33; x++) if (floorAt(x, y) && hash2(x, y, 72) < 0.85) map.setTile(x, y, G.SWAMP, 0);
  // Salidas.
  addExit(L, 'a', 7, 9);
  addExit(L, 'b', 39, 41);
  for (let y = H - 4; y < H; y++) for (const x of [7, 8, 9, 39, 40, 41]) map.setTile(x, y, G.CAVE, 0);

  // Estalagmitas pegadas a las paredes, sin tapar el paso.
  const nearWall = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.groundAt(x + dx, y + dy) === G.WALL);
  const distMain = (x, y) => {
    let d = Infinity;
    for (let k = 0; k + 1 < main.length; k++) {
      const [ax, ay] = main[k];
      const [bx, by] = main[k + 1];
      const vx = bx - ax;
      const vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
      d = Math.min(d, Math.hypot(x - ax - t * vx, y - ay - t * vy));
    }
    return d;
  };
  let n = 0;
  for (let y = 2; y < H - 4 && n < 26; y++) {
    for (let x = 2; x < W - 2 && n < 26; x++) {
      if (!floorAt(x, y) || !nearWall(x, y) || distMain(x + 0.5, y + 0.5) < 1.6 || hash2(x, y, 73) > 0.16) continue;
      add(L, 'estalagmita', sprite('estalagmita', n % 6, () => I.stalagmite(100 + (n % 6))), x + 0.5, y + 0.9);
      n++;
    }
  }
  // Setas luminosas (luz tenue para orientarse) a lo largo del camino.
  for (const [x, y] of [[10.5, 22.5], [19.5, 13.2], [28.5, 9.2], [38.2, 14.5], [33.5, 18.2], [22.4, 24.6], [15.3, 9.4], [41.6, 25.4]]) {
    add(L, 'setas', sprite('setas', Math.round(x) % 4, () => I.glowMushrooms(Math.round(x * 7))), x, y, { light: { r: 46, color: [70, 210, 175] } });
  }
  // Guarida del depredador.
  add(L, 'guarida', sprite('guarida', 0, () => I.den(3)), 12.5, 6.4);
  add(L, 'huesos', sprite('huesos', 0, () => I.bonePile(4)), 10.4, 4.6);
  add(L, 'huesos', sprite('huesos', 1, () => I.bonePile(9)), 15, 7.6);
  add(L, 'huesos', sprite('huesos', 2, () => I.bonePile(13)), 13.6, 3.8);
  // Esqueleto del soldado, su nota y el bidón.
  add(L, 'esqueleto', sprite('esqueleto', 0, I.skeleton), 25.2, 23.6, {
    interact: { verbo: 'Registrar', nombre: 'el esqueleto' }, loot: [['tarjeta', 1], ['antorcha', 1]],
    msg: 'Lleva una tarjeta magnética colgada del cuello.',
  });
  add(L, 'nota', sprite('nota', 0, I.notePaper), 23.4, 24.6, { interact: { verbo: 'Leer', nombre: 'la nota' }, note: 'soldado', reread: true });
  add(L, 'bidon', sprite('bidonCueva', 0, () => B.drum(7, 'rojo')), 27.4, 22.4, {
    interact: { verbo: 'Coger', nombre: 'el bidón de combustible' }, loot: [['bidon', 1]],
    emptySprite: sprite('bidonVacio', 0, () => B.drum(8, 'oxido')),
  });
  add(L, 'cofre', sprite('cofre', 0, () => S.chest(0)), 34, 21.6, {
    interact: { verbo: 'Abrir', nombre: 'el cofre oxidado' }, loot: [['venda', 1], ['racion', 1], ['metal', 1]],
    openSprite: sprite('cofre', 1, () => S.chest(0, true)),
  });
  return L;
}

// ------------------------------------------------------------------ búnker

/** Búnker (32 × 22): vestíbulo con la escalera de salida, pasillo y cinco salas. */
export function buildBunker() {
  const W = 32;
  const H = 22;
  const map = newMap(W, H, G.WALL, 'bunker', G.WALL);
  const L = level('bunker', map, { zone: 'bunker', floor: G.CONCRETE, ambient: [60, 60, 70], selfLight: 60 });
  const room = (x0, y0, x1, y1) => carveRect(map, x0, y0, x1, y1, G.CONCRETE);
  room(12, 12, 19, 19);   // vestíbulo
  room(14, 8, 17, 11);    // pasillo
  room(13, 2, 18, 7);     // sala de mapas
  room(2, 2, 10, 9);      // radio
  room(21, 2, 29, 9);     // almacén
  room(2, 12, 9, 19);     // dormitorio
  room(22, 12, 29, 19);   // energía
  room(11, 5, 12, 6);     // puerta radio ↔ sala de mapas
  room(19, 5, 20, 6);     // puerta sala de mapas ↔ almacén
  room(10, 15, 11, 16);   // puerta dormitorio ↔ vestíbulo
  room(20, 15, 21, 16);   // puerta vestíbulo ↔ energía
  addExit(L, 'a', 14, 17, false);
  add(L, 'escalera', sprite('escalera', 0, I.stairsUp), 16, 22);
  const lamp = (x, y) => add(L, 'lampara', sprite('lampara', 0, I.wallLamp), x, y, { light: { r: 78, color: [255, 70, 50], flicker: true } });
  for (const [x, y] of [[16, 12.2], [6, 2.2], [25, 2.2], [15.5, 2.2], [5.5, 12.2], [25.5, 12.2], [16, 8.2]]) lamp(x, y);

  // Radio.
  add(L, 'mesa', sprite('mesaRadio', 0, () => I.desk(true)), 5.5, 4.4, {
    interact: { verbo: 'Coger', nombre: 'la radio rota' }, loot: [['radio_rota', 1]],
    openSprite: sprite('mesaRadio', 1, () => I.desk(false)), msg: 'Una emisora militar. Está rota, pero quizá se pueda arreglar.',
  });
  add(L, 'estanteria', sprite('estanteria', 0, () => I.shelf(1)), 9, 3.4);
  add(L, 'nota', sprite('nota', 0, I.notePaper), 4, 7, { interact: { verbo: 'Leer', nombre: 'el registro de radio' }, note: 'radio', reread: true });
  add(L, 'caja', sprite('cajaMil', 0, () => S.crate(70, 1)), 3, 8.8);
  // Sala de mapas.
  add(L, 'mesa', sprite('mesaMapas', 0, () => I.desk(false)), 15.5, 4.6);
  add(L, 'nota', sprite('nota', 0, I.notePaper), 15.2, 5.6, { interact: { verbo: 'Leer', nombre: 'la orden de evacuación' }, note: 'mapa', reread: true });
  add(L, 'taquillas', sprite('taquillas', 3, () => I.lockers(3)), 17.4, 2.9);
  // Almacén: cables y bidón.
  add(L, 'estanteria', sprite('estanteria', 1, () => I.shelf(2)), 23, 3.4, { interact: { verbo: 'Registrar', nombre: 'la estantería' }, loot: [['cables', 1], ['cuerda', 1]] });
  add(L, 'estanteria', sprite('estanteria', 2, () => I.shelf(3)), 27, 3.4, { interact: { verbo: 'Registrar', nombre: 'la estantería' }, loot: [['racion', 1], ['botella', 1]] });
  add(L, 'bidon', sprite('bidonBunker', 0, () => B.drum(5, 'verde')), 28, 8.6, {
    interact: { verbo: 'Coger', nombre: 'el bidón de combustible' }, loot: [['bidon', 1]],
    emptySprite: sprite('bidonVacio', 0, () => B.drum(8, 'oxido')),
  });
  for (const [x, y, v] of [[22.4, 8.6, 1], [24, 8.8, 2]]) add(L, 'cajaMunicion', sprite('cajaMun', v, () => B.ammoCrate(v)), x, y, { interact: { verbo: 'Abrir', nombre: 'la caja militar' }, loot: [['metal', 1]] });
  // Dormitorio.
  add(L, 'litera', sprite('litera', 0, () => I.bunkBed(1)), 4.2, 14.6);
  add(L, 'litera', sprite('litera', 1, () => I.bunkBed(2)), 4.2, 18.4);
  add(L, 'taquillas', sprite('taquillas', 2, () => I.lockers(2)), 8.4, 13.2, { interact: { verbo: 'Abrir', nombre: 'la taquilla' }, loot: [['venda', 1], ['tela', 1]] });
  add(L, 'nota', sprite('nota', 0, I.notePaper), 7.6, 17.5, { interact: { verbo: 'Leer', nombre: 'el diario' }, note: 'diario', reread: true });
  // Energía: la batería.
  add(L, 'estanteria', sprite('estanteria', 3, () => I.shelf(4)), 27.5, 13.4, { interact: { verbo: 'Registrar', nombre: 'la estantería de repuestos' }, loot: [['bateria', 1]] });
  for (const [x, y, c] of [[23, 13.4, 'oxido'], [24, 13.6, 'rojo'], [28.6, 18.6, 'verde']]) add(L, 'bidonDeco', sprite('bidonDeco', c, () => B.drum(9, c)), x, y);
  add(L, 'caja', sprite('cajaMil', 1, () => S.crate(71, 1)), 23, 18.6);
  // Vestíbulo.
  add(L, 'sacos', sprite('sacos', 3, () => B.sandbags(3, 3)), 13.4, 13.6);
  add(L, 'cartel', sprite('cartelCalavera', 0, () => S.sign(0, 'skull')), 18.6, 13.2);
  return L;
}

// ------------------------------------------------------------------ cabañas

/** Cabaña de la tribu (21 × 12, una sala de tierra apisonada con esteras). `chief`: choza del jefe, más grande. */
export function buildHut(id, chief = false, seed = 1) {
  const W = 21;
  const H = 12;
  const map = newMap(W, H, G.VOID, 'cabana', G.VOID);
  const x0 = chief ? 4 : 6;
  const x1 = chief ? 16 : 14;
  const y0 = chief ? 2 : 3;
  const y1 = 9;
  carveRect(map, x0 - 1, y0 - 1, x1 + 1, y1 + 1, G.WALL);
  carveRect(map, x0, y0, x1, y1, G.DIRT);
  const L = level(id, map, { zone: chief ? 'choza' : 'cabana', floor: G.DIRT, ambient: null, interiorShade: 0.62, selfLight: 60 });
  addExit(L, 'a', 10, 10);
  map.setTile(9, H - 1, G.VOID, 0);
  map.setTile(11, H - 1, G.VOID, 0);
  const rng = new RNG(900 + seed);
  // Hogar en el centro.
  add(L, 'hoguera', sprite('hoguera', 0, S.campfireBase), 10.5, chief ? 5.6 : 6.4, {
    fire: { size: 0.7, dy: -6 }, light: { r: 110, color: [255, 160, 80], flicker: true },
  });
  add(L, 'estera', sprite('estera', seed % 3, () => I.mat(seed)), x0 + 1.8, y1 - 0.6);
  add(L, 'estera', sprite('estera', (seed + 1) % 3, () => I.mat(seed + 5)), chief ? x1 - 2.4 : x1 - 1, chief ? y1 - 0.8 : y0 + 1.6);
  add(L, 'vasijas', sprite('vasijas', seed % 4, () => I.pots(seed)), x0 + 0.9, y0 + 0.9);
  if (chief) {
    add(L, 'cofre', sprite('cofre', 0, () => S.chest(0)), 14.6, 3.2, {
      interact: { verbo: 'Abrir', nombre: 'el cofre del jefe' }, loot: [['bidon', 1], ['cecina', 2], ['venda', 1]],
      openSprite: sprite('cofre', 1, () => S.chest(0, true)),
    });
    add(L, 'armas', sprite('armas', 0, I.weaponRack), 6.2, 3.1);
    add(L, 'totem', sprite('totemChoza', 0, () => S.totem(21)), 8.4, 2.8);
    add(L, 'calavera', sprite('calavera', 0, S.skullPole), 12.8, 2.9);
    add(L, 'vasijas', sprite('vasijas', 9, () => I.pots(9)), 15.6, 8.8);
  } else {
    if (rng.next() < 0.7) {
      add(L, 'cofre', sprite('cofre', 0, () => S.chest(0)), x1 - 0.6, y1 - 0.4, {
        interact: { verbo: 'Abrir', nombre: 'el cofre' }, loot: [[rng.pick(['cecina', 'coco', 'hierba']), 1], [rng.pick(['fibra', 'cuerda', 'piedra']), 2]],
        openSprite: sprite('cofre', 1, () => S.chest(0, true)),
      });
    }
    add(L, 'secadero', sprite('secadero', seed % 2, () => B.dryingRack(seed)), x1 - 1.2, y0 + 0.4);
  }
  return L;
}

/** Construye el interior `id`. */
export function buildInterior(id) {
  if (id === 'cueva') return buildCave();
  if (id === 'bunker') return buildBunker();
  if (id === 'choza') return buildHut('choza', true, 7);
  const m = /^cabana(\d)$/.exec(id);
  if (m) return buildHut(id, false, Number(m[1]));
  throw new Error(`Interior desconocido: ${id}`);
}
