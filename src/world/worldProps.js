// Props de la isla completa fuera del trozo de la sesión 3 (sesión 5): lugares
// hechos a mano (poblado, campamento militar, búnker, bahía, cumbre) y vegetación
// repartida con semilla según el bioma.

import { TILE } from '../config.js';
import { RNG } from '../core/rng.js';
import * as S from '../gfx/props.js';
import * as B from '../gfx/biomeProps.js';
import * as I from '../gfx/interiorProps.js';
import { C } from '../gfx/palette.js';
import { G } from './tiles.js';
import { makeProp } from './props.js';
import { SpacingGrid } from './propIndex.js';
import { WORLD_PLACES as W, distToWorldPaths, worldZoneAt } from './worldMap.js';

const cache = new Map();
function sprite(kind, variant, make) {
  const key = `w:${kind}:${variant}`;
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

const T = (v) => v * TILE;

/**
 * Props de la isla fuera del trozo. `taken` son los props del trozo (ya colocados)
 * para no montar nada encima. Devuelve { props, pickups }.
 */
export function buildWorldProps(map, taken = []) {
  const rng = new RNG(5151);
  const props = [];
  const pickups = [];
  const space = new SpacingGrid();
  const pc = map.piece;
  const inPiece = (x, y) => x >= T(pc.x) - 8 && x < T(pc.x + pc.w) + 8 && y >= T(pc.y) - 8 && y < T(pc.y + pc.h) + 8;
  const add = (p, rad = null) => {
    props.push(p);
    space.reserve(p.x, p.y - 4, rad ?? Math.max(14, (p.col.w || 10) * 0.6));
    return p;
  };
  for (const p of taken) space.reserve(p.x, p.y - 4, Math.max(10, (p.col.w || 10) * 0.5));
  const lvlAt = (x, y) => map.levelAt(Math.floor(x / TILE), Math.floor(y / TILE));
  const place = (kind, spr, tx, ty, extra = {}) => {
    const p = makeProp(kind, spr, T(tx), T(ty), extra);
    p.level = lvlAt(p.x, p.y - 2);
    return add(p);
  };
  const chest = (tx, ty, nombre, loot) => place('cofre', sprite('cofre', 0, () => S.chest(0)), tx, ty, {
    interact: { verbo: 'Abrir', nombre }, loot, openSprite: sprite('cofre', 1, () => S.chest(0, true)),
  });

  // ---------------------------------------------------------------- poblado de la tribu
  {
    const P = W.poblado;
    place('hoguera', sprite('hoguera', 0, S.campfireBase), P.x, P.y + 0.4, {
      fire: { size: 1.2, dy: -6 }, light: { r: 140, color: [255, 170, 80], flicker: true },
    });
    // Choza del jefe al norte; dentro, su cofre con el bidón de combustible
    // (TRASPASO §2.4). Las cabañas también tienen interior (sesión 6).
    const hutDoor = (to, x, y) => ({
      interact: { verbo: 'Entrar en', nombre: to === 'choza' ? 'la choza del jefe' : 'la cabaña' },
      door: { to, entry: 'a', trigger: { x: T(x) - 11, y: T(y), w: 22, h: 16 }, out: { x: T(x), y: T(y) + 22, level: 0 } },
    });
    place('choza', sprite('chozaJefe', 0, () => B.hut(3, true)), P.x, P.y - 5.2, hutDoor('choza', P.x, P.y - 5.2));
    const huts = [[-6.2, -2.4, 1], [6.4, -2.2, 2], [-6.8, 3.2, 3], [6.2, 3.6, 4], [-1.5, 6.6, 5]];
    for (const [dx, dy, v] of huts) place('cabana', sprite('cabana', v, () => B.hut(20 + v)), P.x + dx, P.y + dy, hutDoor(`cabana${v}`, P.x + dx, P.y + dy));
    place('torre', sprite('torreMadera', 0, () => B.watchtower(1)), P.x + 3.4, P.y + 7.4);
    for (const [dx, dy] of [[-3, -1], [3, -1], [-3, 2.6], [3, 2.8], [0.2, -3.2]]) {
      place('antorcha', sprite('antorcha', 0, S.torchPole), P.x + dx, P.y + dy, { fire: { size: 0.55, dy: -38 }, light: { r: 80, color: [255, 160, 70], flicker: true } });
    }
    for (const [dx, dy, v] of [[-2.2, 1.1, 0], [2.4, 1.3, 1]]) place('tronco', sprite('tronco', 10 + v, () => S.log(40 + v)), P.x + dx, P.y + dy);
    place('secadero', sprite('secadero', 0, () => B.dryingRack(2)), P.x - 3.8, P.y - 4.6);
    place('secadero', sprite('secadero', 1, () => B.dryingRack(5)), P.x + 4.6, P.y + 6.2);
    place('totem', sprite('totem', 2, () => S.totem(12)), P.x - 1.6, P.y - 2.6);
    place('totem', sprite('totem', 3, () => S.totem(15)), P.x + 1.8, P.y - 2.6);
    chest(P.x - 7.4, P.y + 0.6, 'el cofre de la tribu', [['cecina', 1], ['cuerda', 2], ['hierba', 1]]);
    chest(P.x + 7.6, P.y + 1, 'el cofre de la tribu', [['antorcha', 1], ['piedra', 2], ['fibra', 3]]);
    place('barril', sprite('barril', 0, () => S.barrel(1)), P.x + 5, P.y - 0.4, { interact: { verbo: 'Registrar', nombre: 'el barril' }, loot: [['coco', 2]] });
    for (const [dx, dy] of [[-4.6, 5.8], [-0.4, 8.6], [4.2, -6.4]]) place('calavera', sprite('calavera', 0, S.skullPole), P.x + dx, P.y + dy);
    // Empalizada con huecos al sur y al este.
    const R = T(P.r) + 6;
    const n = Math.round((2 * Math.PI * R) / 11);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const gap = Math.abs(Math.sin(a - Math.PI / 2)) > 0.985 || Math.abs(Math.sin(a)) > 0.985 && Math.cos(a) > 0;
      if (gap || (Math.cos(a) > 0.97)) continue;
      const x = T(P.x) + Math.cos(a) * R;
      const y = T(P.y) + Math.sin(a) * R;
      const g = map.groundAtPx(x, y);
      if (g === -1 || g === G.DEEP || g === G.SHALLOW) continue;
      const p = makeProp('estaca', sprite('estaca', k % 4, () => S.stake(k % 4)), x, y);
      p.level = lvlAt(x, y);
      props.push(p);
    }
    space.reserve(T(P.x), T(P.y), T(P.r) + 10);
  }

  // ---------------------------------------------------------------- campamento militar y búnker
  {
    const M = W.militar;
    const [bx, by] = W.bunker;
    place('bunker', sprite('bunker', 0, B.bunker), bx, by + 1.4, {
      interact: { verbo: 'Abrir', nombre: 'la puerta del búnker' },
      door: {
        to: 'bunker', entry: 'a', needs: 'tarjeta', out: { x: T(bx), y: T(by + 1.4) + 20, level: 0 },
        locked: 'Puerta de acero cerrada. Tiene un lector de tarjetas: hará falta una tarjeta de acceso.',
        unlockMsg: 'Pasas la tarjeta. La luz se pone verde y la puerta cede con un chirrido.',
      },
    });
    for (const [dx, dy, v] of [[-6, -2, 0], [-6.5, 3.6, 1], [5.6, 3.8, 2], [0, 6.2, 3]]) place('tiendaMilitar', sprite('tiendaMil', v, () => B.milTent(30 + v)), M.x + dx, M.y + dy);
    place('torre', sprite('torreMetal', 0, () => B.watchtower(2, true)), M.x + 7.6, M.y - 3.6);
    for (const [dx, dy, len] of [[-2.6, -1.2, 4], [2.6, 0.2, 3], [-1.2, 3, 3], [8.6, 1.4, 4], [-9.4, 0.6, 3]]) place('sacos', sprite('sacos', len, () => B.sandbags(len, len)), M.x + dx, M.y + dy);
    const crateLoot = [[['metal', 2], ['tela', 1]], [['metal', 1], ['cuerda', 1]], [['racion', 1], ['botella', 1]], [['metal', 2]], [['venda', 1], ['galletas', 1]]];
    [[-3.4, 1.6], [3.8, -2.6], [1.4, 2.4], [-7.6, 6], [4.4, 7.4]].forEach(([dx, dy], i) => place('cajaMunicion', sprite('cajaMun', i % 3, () => B.ammoCrate(i)), M.x + dx, M.y + dy, {
      interact: { verbo: 'Abrir', nombre: 'la caja militar' }, loot: crateLoot[i],
    }));
    for (const [dx, dy, c] of [[-1, -3.4, 'rojo'], [-0.2, -3.6, 'oxido'], [6.6, 6, 'verde'], [7.2, 6.4, 'oxido'], [-4.8, -4.8, 'rojo']]) place('bidon', sprite('bidon', c, () => B.drum(3, c)), M.x + dx, M.y + dy);
    for (const [dx, dy, v] of [[2.4, -5.6, 0], [-8.6, -3.4, 1]]) place('caja', sprite('cajaMil', v, () => S.crate(70 + v, 1)), M.x + dx, M.y + dy);
    place('cartel', sprite('cartel', 1, () => S.sign(0, 'skull')), M.x - 11.5, M.y + 3);
    space.reserve(T(M.x), T(M.y), T(M.r));
  }

  // ---------------------------------------------------------------- bocas de la cueva
  // Dos bocas en paredes del monte: una en la terraza 1 y otra en la 3. Por dentro
  // se va de una a otra sin escalar (ruta alternativa a la escalada).
  for (const entry of ['a', 'b']) {
    const [cx, cy] = W.cueva[entry];
    const base = map.levelAt(cx, cy + 1);
    place('bocaCueva', sprite('bocaCueva', entry, () => I.caveMouth(entry === 'a' ? 11 : 12)), cx + 0.5, cy + 1, {
      interact: { verbo: 'Entrar en', nombre: 'la cueva' },
      door: {
        to: 'cueva', entry, trigger: { x: T(cx - 1) + 8, y: T(cy + 1), w: T(3) - 16, h: 16 },
        out: { x: T(cx + 0.5), y: T(cy + 1) + 22, level: base },
      },
    });
    space.reserve(T(cx + 0.5), T(cy + 1.5), T(2));
  }

  // ---------------------------------------------------------------- bahía este
  {
    const H = W.helipuerto;
    place('manga', sprite('manga', 0, B.windsock), H.x + 3.4, H.y - 2.6);
    space.reserve(T(H.x + 0.5), T(H.y + 0.5), T(3.2));
    place('barca', sprite('barca', 0, () => B.boatWreck(4)), W.barca[0], W.barca[1]);
    chest(W.barca[0] + 2.6, W.barca[1] + 0.8, 'el cofre de la barca', [['tela', 2], ['cuerda', 2], ['botella', 1]]);
    const mu = W.muelle;
    if (mu.x0 !== undefined) {
      for (const [dx, v] of [[-1.6, 0], [-2.4, 1]]) place('barril', sprite('barril', 0, () => S.barrel(1)), mu.x0 + dx, mu.y + 1.6 + v * 0.4);
      place('caja', sprite('caja', 2, () => S.crate(9, 1)), mu.x0 - 1.2, mu.y - 0.6, { interact: { verbo: 'Abrir', nombre: 'la caja del embarcadero' }, loot: [['cuerda', 1], ['madera', 3]] });
      place('cartel', sprite('cartel', 0, () => S.sign(0, 'arrow')), mu.x0 - 3, mu.y + 3);
    }
  }

  // ---------------------------------------------------------------- cumbre: la antena
  place('antena', sprite('antena', 0, B.antenna), W.cumbre[0], W.cumbre[1], {
    interact: { verbo: 'Examinar', nombre: 'la antena' }, loot: [],
    msg: 'Una antena militar oxidada. Con una radio que funcione, desde aquí se podría pedir ayuda.',
  });

  // ---------------------------------------------------------------- vegetación por bioma
  const tileOk = (x, y, allowed, margin = 0.5) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const l = map.levelAt(tx, ty);
    for (let dy = -margin; dy <= margin; dy += margin || 1) {
      for (let dx = -margin; dx <= margin; dx += margin || 1) {
        const ax = Math.floor(x / TILE + dx);
        const ay = Math.floor(y / TILE + dy);
        if (!allowed.has(map.groundAt(ax, ay)) || map.levelAt(ax, ay) !== l) return false;
      }
    }
    return true;
  };
  const nearCliff = (x, y) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    for (let k = 0; k <= 2; k++) {
      const g = map.groundAt(tx, ty - k);
      if (g === G.CLIFF || g === G.LEDGE_S || g === G.WATERFALL) return true;
    }
    return false;
  };
  const scatter = (count, tries, allowed, rad, zones, make, opts = {}) => {
    let placed = 0;
    for (let i = 0; i < tries && placed < count; i++) {
      const x = rng.range(TILE, map.pixelWidth - TILE);
      const y = rng.range(TILE, map.pixelHeight - 4);
      if (inPiece(x, y) || !tileOk(x, y, allowed, opts.margin ?? 0.5) || nearCliff(x, y)) continue;
      if (zones && !zones.includes(worldZoneAt(map, x, y))) continue;
      if (distToWorldPaths(x / TILE, y / TILE) < (opts.pathDist ?? 1.2)) continue;
      if (opts.filter && !opts.filter(x, y)) continue;
      if (!space.free(x, y, rad)) continue;
      const p = make(x, y, rng);
      if (!p) continue;
      p.level = lvlAt(x, y);
      props.push(p);
      space.reserve(x, y, rad);
      placed++;
    }
  };
  const set = (...g) => new Set(g);
  const JUNGLE = set(G.JUNGLE, G.GRASS);
  const lvl = (a, b = a) => (x, y) => { const l = lvlAt(x, y); return l >= a && l <= b; };

  // Selva (y la terraza baja del monte).
  scatter(260, 30000, JUNGLE, 30, ['selva', 'monte', 'poblado'], (x, y, r) => makeProp('arbol', sprite('arbol', r.int(0, 5), () => S.jungleTree(r.int(1, 999))), x, y), { pathDist: 2.2, margin: 1, filter: lvl(0, 1) });
  scatter(50, 8000, JUNGLE, 22, ['selva', 'monte'], (x, y, r) => makeProp('roca', sprite('roca', r.int(0, 3), () => S.rock(r.int(1, 999), r.range(0.8, 1.5))), x, y), { pathDist: 1.5 });
  scatter(18, 6000, JUNGLE, 30, ['selva'], (x, y, r) => makeProp('tronco', sprite('tronco', r.int(0, 1), () => S.log(r.int(1, 99))), x, y), { pathDist: 1.6 });
  scatter(80, 12000, JUNGLE, 16, ['selva', 'monte'], (x, y, r) => {
    const berries = r.next() < 0.35;
    return makeProp('arbusto', sprite(berries ? 'arbustoBayas' : 'arbusto', r.int(0, 3), () => S.bush(r.int(1, 999), berries)), x, y,
      berries ? { interact: { verbo: 'Recoger', nombre: 'bayas' }, loot: [['bayas', 2 + r.int(0, 2)]], emptySprite: sprite('arbusto', 9, () => S.bush(9, false)) } : {});
  }, { pathDist: 1.2, filter: lvl(0, 1) });
  scatter(700, 40000, JUNGLE, 8, ['selva', 'monte', 'poblado'], (x, y, r) => makeProp('helecho', sprite('helecho', r.int(0, 5), () => S.fern(r.int(1, 999))), x, y), { pathDist: 1.1, filter: lvl(0, 1) });
  scatter(300, 25000, JUNGLE, 11, ['selva', 'monte'], (x, y, r) => makeProp('hojas', sprite('hojas', r.int(0, 4), () => S.bigLeaves(r.int(1, 999))), x, y), { pathDist: 1.2, filter: lvl(0, 1) });
  scatter(90, 12000, JUNGLE, 10, ['selva'], (x, y, r) => {
    const fl = r.next() < 0.5 ? 'red' : 'purple';
    return makeProp('flor', sprite('flor' + fl, r.int(0, 2), () => S.bromeliad(r.int(1, 999), fl)), x, y);
  }, { pathDist: 1.1 });

  // Costa y bahía: palmeras, rocas, troncos.
  scatter(90, 20000, set(G.SAND, G.GRASS), 30, ['costa', 'bahia', 'selva'], (x, y, r) => makeProp('palmera', sprite('palmera', r.int(0, 3), () => S.palm(r.int(1, 999))), x, y), {
    pathDist: 1.4, filter: (x, y) => map.groundAtPx(x, y) === G.SAND || r0(x, y, map),
  });
  scatter(30, 8000, set(G.SAND), 24, null, (x, y, r) => makeProp('roca', sprite('rocaPlaya', r.int(0, 2), () => S.rock(r.int(1, 999), 1.1)), x, y), { pathDist: 1 });
  scatter(12, 6000, set(G.SAND), 30, null, (x, y) => makeProp('tronco', sprite('tronco', 2, () => S.log(77)), x, y), { pathDist: 1 });

  // Monte: pinos por terrazas (con nieve arriba), rocas y matojos.
  scatter(170, 30000, set(G.NEEDLES, G.GRASS, G.JUNGLE), 22, ['monte'], (x, y, r) => makeProp('pino', sprite('pino', r.int(0, 5), () => B.pine(r.int(1, 999))), x, y), { pathDist: 1.6, filter: lvl(1, 2) });
  scatter(90, 20000, set(G.NEEDLES, G.GRASS, G.ROCK, G.SNOW), 22, ['monte', 'cumbre'], (x, y, r) => makeProp('pino', sprite('pinoNieve', r.int(0, 4), () => B.pine(r.int(1000, 1999), true)), x, y), { pathDist: 1.6, filter: lvl(2, 3) });
  scatter(70, 15000, set(G.ROCK, G.SNOW, G.GRASS), 22, ['monte', 'cumbre'], (x, y, r) => makeProp('roca', sprite('rocaNieve', r.int(0, 3), () => B.snowRock(r.int(1, 999), r.range(0.8, 1.6))), x, y), { pathDist: 1.3, filter: lvl(3, 4) });
  scatter(60, 12000, set(G.NEEDLES, G.ROCK, G.GRASS), 20, ['monte'], (x, y, r) => makeProp('roca', sprite('roca', r.int(4, 7), () => S.rock(r.int(1, 999), r.range(0.8, 1.4))), x, y), { pathDist: 1.3, filter: lvl(1, 3) });
  scatter(220, 20000, set(G.NEEDLES, G.GRASS, G.ROCK), 8, ['monte', 'cumbre'], (x, y, r) => makeProp('matojo', sprite('matojo', r.int(0, 4), () => B.grassTuft(r.int(1, 999))), x, y), { pathDist: 1, filter: lvl(1, 3) });
  scatter(140, 14000, set(G.NEEDLES), 8, ['monte'], (x, y, r) => makeProp('helecho', sprite('helecho', r.int(0, 5), () => S.fern(r.int(1, 999))), x, y), { pathDist: 1 });

  // Manglar: mangles, juncos y árboles muertos.
  scatter(80, 20000, set(G.MUD, G.SWAMP), 30, ['manglar'], (x, y, r) => makeProp('mangle', sprite('mangle', r.int(0, 4), () => B.mangrove(r.int(1, 999))), x, y), { pathDist: 1.8, margin: 0.4 });
  scatter(200, 20000, set(G.MUD, G.SWAMP), 8, ['manglar'], (x, y, r) => makeProp('juncos', sprite('juncos', r.int(0, 5), () => B.reeds(r.int(1, 999))), x, y), { pathDist: 1, margin: 0 });
  scatter(12, 6000, set(G.MUD), 24, ['manglar'], (x, y, r) => makeProp('arbolMuerto', sprite('arbolMuerto', r.int(0, 2), () => B.deadTree(r.int(1, 99))), x, y), { pathDist: 1.4 });
  scatter(14, 6000, set(G.MUD), 30, ['manglar'], (x, y, r) => makeProp('tronco', sprite('tronco', r.int(0, 1), () => S.log(r.int(1, 99))), x, y), { pathDist: 1.4 });

  // Acantilados del viento: agujas de roca, matojos, nidos con huevos y árboles muertos.
  scatter(26, 10000, set(G.ROCK, G.GRASS), 34, ['acantilados'], (x, y, r) => makeProp('aguja', sprite('aguja', r.int(0, 4), () => B.rockSpire(r.int(1, 999))), x, y), { pathDist: 1.5, margin: 1 });
  scatter(150, 14000, set(G.ROCK, G.GRASS), 8, ['acantilados'], (x, y, r) => makeProp('matojo', sprite('matojoCosta', r.int(0, 4), () => B.grassTuft(r.int(1, 999), C.oliveLeaf)), x, y), { pathDist: 1 });
  scatter(8, 12000, set(G.ROCK, G.GRASS), 20, ['acantilados'], (x, y, r) => makeProp('nido', sprite('nido', 0, () => B.nest(r.int(1, 99))), x, y, {
    interact: { verbo: 'Coger', nombre: 'los huevos del nido' }, loot: [['huevo', 2]], emptySprite: sprite('nido', 1, () => B.nest(7, false)),
  }), { pathDist: 1, filter: (x, y) => map.groundAtPx(x, y - 40) === G.SHALLOW || map.groundAtPx(x, y - 40) === G.DEEP || map.groundAtPx(x + 48, y) === G.DEEP || map.groundAtPx(x, y - 70) === G.DEEP });
  scatter(6, 6000, set(G.ROCK, G.GRASS), 24, ['acantilados'], (x, y, r) => makeProp('arbolMuerto', sprite('arbolMuerto', r.int(0, 2), () => B.deadTree(r.int(1, 99))), x, y), { pathDist: 1.4 });
  // Carteles de aviso junto a las grietas.
  for (let ty = 0; ty < 50; ty++) {
    for (let tx = 140; tx < map.width; tx++) {
      if (map.groundAt(tx, ty) === G.CHASM && map.groundAt(tx, ty - 1) !== G.CHASM && map.groundAt(tx - 1, ty) !== G.CHASM && rng.next() < 0.6) {
        const x = T(tx - 1.2);
        const y = T(ty + 0.8);
        if (space.free(x, y, 10)) { const p = makeProp('cartel', sprite('cartel', 1, () => S.sign(0, 'skull')), x, y); p.level = lvlAt(x, y); add(p, 10); }
      }
    }
  }

  // Hierba alta: una mata por tile.
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.groundAt(tx, ty) !== G.TALL_GRASS || inPiece(T(tx + 0.5), T(ty + 0.5))) continue;
      const v = (tx * 7 + ty * 3) % 5;
      const p = makeProp('hierbaAlta', sprite('hierbaAlta', v, () => S.tallGrass(50 + v)), T(tx + 0.5), T(ty + 1) - 1, { grass: true });
      p.level = map.levelAt(tx, ty);
      props.push(p);
    }
  }

  // Objetos sueltos: cocos bajo las palmeras, piedras, palos.
  for (const p of props) {
    if (p.kind === 'palmera' && rng.next() < 0.6) pickups.push({ item: 'coco', n: 1, x: p.x + rng.range(-16, 16), y: p.y + rng.range(6, 14) });
    if (p.kind === 'roca' && rng.next() < 0.2) pickups.push({ item: 'piedra', n: 1, x: p.x + rng.range(-14, 14), y: p.y + rng.range(6, 12) });
    if ((p.kind === 'arbol' || p.kind === 'pino') && rng.next() < 0.12) pickups.push({ item: 'madera', n: 1, x: p.x + rng.range(-20, 20), y: p.y + rng.range(8, 16) });
    if (p.kind === 'juncos' && rng.next() < 0.1) pickups.push({ item: 'fibra', n: 1, x: p.x + rng.range(-8, 8), y: p.y + rng.range(4, 8) });
  }

  for (const p of props) if (!p.solid) p.col = { x: p.x - 4, y: p.y - 4, w: 8, h: 4 };
  const okPickup = (o) => {
    const g = map.groundAtPx(o.x, o.y);
    return g !== G.DEEP && g !== G.SHALLOW && g !== G.RIVER && g !== G.CLIFF && g !== G.WATERFALL && g !== -1;
  };
  return {
    props,
    pickups: pickups.filter(okPickup).map((o) => ({ ...o, level: lvlAt(o.x, o.y) })),
  };
}

// Las palmeras salen en la arena y en la hierba pegada a ella.
function r0(x, y, map) {
  for (const [dx, dy] of [[-40, 0], [40, 0], [0, -40], [0, 40]]) if (map.groundAtPx(x + dx, y + dy) === G.SAND) return true;
  return false;
}
