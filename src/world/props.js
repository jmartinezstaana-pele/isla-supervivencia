// Colocación de los props del trozo de isla: unos a mano (restos del avión,
// campamento, ruinas, puente…) y la vegetación repartida con semilla.

import { TILE } from '../config.js';
import { RNG } from '../core/rng.js';
import * as S from '../gfx/props.js';
import { G } from './tiles.js';
import { PLACES, distToPaths, shoreX, sandWidth } from './islandMap.js';

const cache = new Map();
/** Sprite cacheado por tipo y variante. */
function sprite(kind, variant, make) {
  const key = `${kind}:${variant}`;
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function makeProp(kind, spr, x, y, extra = {}) {
  const col = spr.col && spr.solid !== false
    ? { x: x - spr.col.w / 2, y: y - spr.col.h, w: spr.col.w, h: spr.col.h }
    : { x: x - 4, y: y - 4, w: 8, h: 4 };
  return {
    kind,
    x,
    y,
    level: 0,
    parts: spr.parts,
    solid: !!spr.col && spr.solid !== false,
    opaque: !!spr.opaque,
    col,
    shadow: spr.shadow,
    phase: (x * 0.013 + y * 0.007) % (Math.PI * 2),
    ...extra,
  };
}

export function buildProps(map) {
  const rng = new RNG(4242);
  const props = [];
  const add = (p) => { props.push(p); return p; };
  const T = (v) => v * TILE;

  // ---- Playa: restos del avión y botín.
  const [wx, wy] = PLACES.wreck;
  add(makeProp('avion', sprite('avion', 0, () => S.planeWreck(7)), T(wx), T(wy), {
    interact: { verbo: 'Registrar', nombre: 'los restos del avión' },
    loot: [['cuchillo', 1], ['botella', 2], ['racion', 1], ['venda', 1], ['tela', 2]],
    smoke: { dx: 46, dy: -40 },
  }));
  add(makeProp('maleta', sprite('maleta', 0, S.suitcase), T(15.6), T(19.4), {
    interact: { verbo: 'Abrir', nombre: 'la maleta' }, loot: [['galletas', 1], ['cuerda', 1]],
  }));
  add(makeProp('barril', sprite('barril', 0, () => S.barrel(1)), T(16.6), T(14.7), {
    interact: { verbo: 'Registrar', nombre: 'el barril' }, loot: [['coco', 2]],
  }));
  add(makeProp('caja', sprite('caja', 0, () => S.crate(3)), T(9.6), T(23.4), {
    interact: { verbo: 'Abrir', nombre: 'la caja' }, loot: [['madera', 2], ['fibra', 2]],
  }));

  // ---- Ruinas en la meseta.
  const lv1 = { level: 1 };
  add(makeProp('templo', sprite('templo', 0, () => S.temple(5)), T(37.6), T(5.3), lv1));
  add(makeProp('pilar', sprite('pilar', 0, () => S.pillar(1)), T(33.6), T(7.7), lv1));
  add(makeProp('pilar', sprite('pilar', 1, () => S.pillar(2, true)), T(42.3), T(7.6), lv1));
  add(makeProp('pilar', sprite('pilar', 2, () => S.pillar(3, true)), T(42.5), T(3.2), lv1));
  add(makeProp('muro', sprite('muro', 0, () => S.ruinWall(1, 2)), T(34.0), T(2.4), lv1));
  add(makeProp('muro', sprite('muro', 1, () => S.ruinWall(2, 1)), T(41.2), T(1.6), lv1));
  add(makeProp('totem', sprite('totem', 0, () => S.totem(3)), T(33.4), T(5.2), lv1));
  add(makeProp('cofre', sprite('cofre', 0, () => S.chest(0)), T(40.3), T(7.4), {
    ...lv1, interact: { verbo: 'Abrir', nombre: 'el cofre de las ruinas' },
    loot: [['idolo', 1], ['venda', 2], ['hierba', 2]], openSprite: sprite('cofre', 1, () => S.chest(0, true)),
  }));

  // ---- Puente: postes en los extremos.
  let bx0 = Infinity;
  let bx1 = -Infinity;
  for (let tx = 0; tx < map.width; tx++) if (map.groundAt(tx, PLACES.bridge.y0) === G.BRIDGE) { bx0 = Math.min(bx0, tx); bx1 = Math.max(bx1, tx); }
  const post = sprite('poste', 0, S.bridgePost);
  for (const px of [T(bx0) - 4, T(bx1 + 1) + 4]) {
    add(makeProp('poste', post, px, T(PLACES.bridge.y0) + 5));
    add(makeProp('poste', post, px, T(PLACES.bridge.y1 + 1) + 2));
  }
  add(makeProp('cartel', sprite('cartel', 0, () => S.sign(0, 'arrow')), T(bx0 - 2.2), T(21.2)));
  add(makeProp('cartel', sprite('cartel', 1, () => S.sign(0, 'skull')), T(61.5), T(19.4)));

  // ---- Campamento de la tribu.
  const [cx, cy] = PLACES.camp;
  const fire = add(makeProp('hoguera', sprite('hoguera', 0, S.campfireBase), T(cx), T(cy), {
    fire: { size: 1.2, dy: -6 }, light: { r: 130, color: [255, 170, 80], flicker: true },
  }));
  void fire;
  for (const [tx, ty, v] of [[71, 15.4, 0], [79.6, 15.6, 1], [78.9, 24.4, 2]]) {
    add(makeProp('tienda', sprite('tienda', v, () => S.tent(11 + v)), T(tx), T(ty)));
  }
  for (const [tx, ty] of [[68.1, 18.2], [68.1, 22.8], [73.6, 27.2], [76.4, 27.2]]) {
    add(makeProp('antorcha', sprite('antorcha', 0, S.torchPole), T(tx), T(ty), {
      fire: { size: 0.55, dy: -38 }, light: { r: 80, color: [255, 160, 70], flicker: true },
    }));
  }
  add(makeProp('caja', sprite('caja', 1, () => S.crate(4, 1.1)), T(78.1), T(21.4), {
    interact: { verbo: 'Abrir', nombre: 'la caja' }, loot: [['fibra', 3], ['cuerda', 1]],
  }));
  add(makeProp('barril', sprite('barril', 0, () => S.barrel(1)), T(71.6), T(24.2), {
    interact: { verbo: 'Registrar', nombre: 'el barril' }, loot: [['coco', 1], ['bayas', 3]],
  }));
  add(makeProp('cofre', sprite('cofre', 0, () => S.chest(0)), T(79.8), T(20.4), {
    interact: { verbo: 'Abrir', nombre: 'el cofre de la tribu' },
    loot: [['cecina', 2], ['antorcha', 1], ['hierba', 1]], openSprite: sprite('cofre', 1, () => S.chest(0, true)),
  }));
  add(makeProp('cofre', sprite('cofre', 0, () => S.chest(0)), T(72.2), T(16.9), {
    interact: { verbo: 'Abrir', nombre: 'el cofre de la tribu' },
    loot: [['cecina', 1], ['venda', 1], ['piedra', 3]], openSprite: sprite('cofre', 1, () => S.chest(0, true)),
  }));
  add(makeProp('totem', sprite('totem', 1, () => S.totem(8)), T(75), T(13.7)));
  // Decoración del campamento: troncos para sentarse, provisiones, piedras y matas.
  add(makeProp('tronco', sprite('tronco', 3, () => S.log(31)), T(75), T(22.3)));
  add(makeProp('tronco', sprite('tronco', 4, () => S.log(32)), T(75.2), T(18.2)));
  for (const [tx, ty, v] of [[81.1, 21.3, 5], [81.0, 22.2, 6], [72.8, 25.2, 7]]) add(makeProp('caja', sprite('caja', v, () => S.crate(v, 0.8)), T(tx), T(ty)));
  for (const [tx, ty] of [[70.3, 19.2], [70.9, 18.7], [82.3, 17.4]]) add(makeProp('barril', sprite('barril', 0, () => S.barrel(1)), T(tx), T(ty)));
  for (const [tx, ty, v] of [[69.6, 24.6, 0], [73.2, 13.9, 1], [81.9, 25.6, 2], [77.8, 27.1, 0]]) add(makeProp('arbusto', sprite('arbusto', v, () => S.bush(40 + v)), T(tx), T(ty)));
  for (const [tx, ty, v] of [[78.6, 26.4, 0], [70.1, 15.9, 1]]) add(makeProp('roca', sprite('rocaCampo', v, () => S.rock(60 + v, 0.9)), T(tx), T(ty)));
  add(makeProp('calavera', sprite('calavera', 0, S.skullPole), T(73.2), T(27.6)));
  add(makeProp('calavera', sprite('calavera', 0, S.skullPole), T(76.8), T(27.6)));
  add(makeProp('calavera', sprite('calavera', 0, S.skullPole), T(69.2), T(20.6)));
  // Empalizada en círculo, con huecos al oeste y al sur.
  const R = PLACES.campRadius * TILE + 6;
  const n = Math.round((2 * Math.PI * R) / 11);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const gapW = Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.22;
    const gapS = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.2;
    if (gapW || gapS) continue;
    const x = T(cx) + Math.cos(a) * R;
    const y = T(cy) + Math.sin(a) * R;
    const [ttx, tty] = [Math.floor(x / TILE), Math.floor(y / TILE)];
    const g = map.groundAt(ttx, tty);
    if (g === G.RIVER || g === -1) continue;
    add(makeProp('estaca', sprite('estaca', k % 4, () => S.stake(k % 4)), x, y));
  }

  // ---- Vegetación con semilla.
  const solids = [];
  const free = (x, y, rad) => solids.every((s) => Math.hypot(s.x - x, s.y - y) > rad + s.rad);
  const reserve = (x, y, rad) => solids.push({ x, y, rad });
  for (const p of props) reserve(p.x, p.y - 4, Math.max(14, (p.col.w || 10) * 0.6));
  reserve(map.spawn.x, map.spawn.y, 40);

  const tileOk = (x, y, allowed, margin = 0.5) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    for (let dy = -margin; dy <= margin; dy += margin || 1) {
      for (let dx = -margin; dx <= margin; dx += margin || 1) {
        const g = map.groundAt(Math.floor(x / TILE + dx), Math.floor(y / TILE + dy));
        if (!allowed.has(g)) return false;
        if (map.levelAt(Math.floor(x / TILE + dx), Math.floor(y / TILE + dy)) !== map.levelAt(tx, ty)) return false;
      }
    }
    return true;
  };
  const inCamp = (x, y) => Math.hypot(x / TILE - cx, y / TILE - cy) < PLACES.campRadius + 1.2;
  const nearCliff = (x, y) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    for (let k = 0; k <= 2; k++) if (map.isCliff(tx, ty - k) || map.groundAt(tx, ty - k) === G.LEDGE_S) return true;
    return false;
  };
  const inRuins = (x, y) => {
    const r = PLACES.ruins;
    return x / TILE > r.x0 - 1 && x / TILE < r.x1 + 1.5 && y / TILE < r.y1 + 1.5;
  };
  const JUNGLE = new Set([G.JUNGLE, G.GRASS]);
  const SAND = new Set([G.SAND]);

  const scatter = (count, tries, allowed, rad, make, opts = {}) => {
    let placed = 0;
    for (let i = 0; i < tries && placed < count; i++) {
      const x = rng.range(TILE, map.pixelWidth - TILE);
      const y = rng.range(TILE * 0.8, map.pixelHeight - 4);
      if (!tileOk(x, y, allowed, opts.margin ?? 0.5)) continue;
      if (opts.pathDist !== undefined && distToPaths(x / TILE, y / TILE) < opts.pathDist) continue;
      if (inCamp(x, y) || inRuins(x, y) || nearCliff(x, y)) continue;
      if (opts.filter && !opts.filter(x, y)) continue;
      if (!free(x, y, rad)) continue;
      const p = make(x, y, rng);
      if (!p) continue;
      p.level = map.levelAt(Math.floor(x / TILE), Math.floor(y / TILE));
      add(p);
      if (opts.reserve !== false) reserve(x, y, rad);
      placed++;
    }
  };

  const beachSide = (x, y) => x / TILE < shoreX(y / TILE) + sandWidth(y / TILE) + 4;
  // Palmeras en la playa y en la transición.
  scatter(16, 3000, new Set([G.SAND, G.GRASS]), 30, (x, y, r) => makeProp('palmera', sprite('palmera', r.int(0, 3), () => S.palm(r.int(1, 999))), x, y), {
    pathDist: 1.4, filter: (x, y) => x / TILE > shoreX(y / TILE) + 1.2,
  });
  // Árboles grandes de selva.
  scatter(110, 9000, JUNGLE, 30, (x, y, r) => makeProp('arbol', sprite('arbol', r.int(0, 4), () => S.jungleTree(r.int(1, 999))), x, y), {
    pathDist: 2.2, filter: (x, y) => !beachSide(x, y), margin: 1,
  });
  // Rocas con musgo y troncos caídos.
  scatter(26, 3000, JUNGLE, 22, (x, y, r) => makeProp('roca', sprite('roca', r.int(0, 3), () => S.rock(r.int(1, 999), r.range(0.8, 1.5))), x, y), { pathDist: 1.5 });
  scatter(8, 2000, JUNGLE, 30, (x, y, r) => makeProp('tronco', sprite('tronco', r.int(0, 1), () => S.log(r.int(1, 99))), x, y), { pathDist: 1.6, filter: (x, y) => !beachSide(x, y) });
  scatter(5, 2000, SAND, 24, (x, y, r) => makeProp('roca', sprite('rocaPlaya', r.int(0, 2), () => S.rock(r.int(1, 999), 1.1)), x, y), { pathDist: 1 });
  scatter(3, 2000, SAND, 30, (x, y, r) => makeProp('tronco', sprite('tronco', 2, () => S.log(77)), x, y), { pathDist: 1 });
  // Arbustos (algunos con bayas para recoger).
  scatter(34, 4000, JUNGLE, 16, (x, y, r) => {
    const berries = r.next() < 0.35;
    return makeProp('arbusto', sprite(berries ? 'arbustoBayas' : 'arbusto', r.int(0, 3), () => S.bush(r.int(1, 999), berries)), x, y,
      berries ? { interact: { verbo: 'Recoger', nombre: 'bayas' }, loot: [['bayas', 2 + r.int(0, 2)]], emptySprite: sprite('arbusto', 9, () => S.bush(9, false)) } : {});
  }, { pathDist: 1.2 });
  // Plantas sin colisión: helechos, hojas grandes, bromelias con flores.
  scatter(300, 14000, JUNGLE, 8, (x, y, r) => makeProp('helecho', sprite('helecho', r.int(0, 5), () => S.fern(r.int(1, 999))), x, y), { pathDist: 1.1, reserve: true });
  scatter(130, 9000, JUNGLE, 11, (x, y, r) => makeProp('hojas', sprite('hojas', r.int(0, 4), () => S.bigLeaves(r.int(1, 999))), x, y), { pathDist: 1.2 });
  scatter(40, 5000, JUNGLE, 10, (x, y, r) => {
    const fl = r.next() < 0.5 ? 'red' : 'purple';
    return makeProp('flor', sprite('flor' + fl, r.int(0, 2), () => S.bromeliad(r.int(1, 999), fl)), x, y);
  }, { pathDist: 1.1 });

  // Sotobosque agrupado al pie de los árboles y en los bordes de los caminos.
  const trees = props.filter((p) => p.kind === 'arbol');
  for (const tr of trees) {
    for (let k = 0; k < 4; k++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(16, 34);
      const x = tr.x + Math.cos(a) * d;
      const y = tr.y + Math.sin(a) * d * 0.6 + 4;
      if (!tileOk(x, y, JUNGLE, 0) || inCamp(x, y) || nearCliff(x, y) || distToPaths(x / TILE, y / TILE) < 1.1) continue;
      if (!free(x, y, 6)) continue;
      const kind = rng.next() < 0.6 ? 'helecho' : 'hojas';
      const spr = kind === 'helecho' ? sprite('helecho', rng.int(0, 5), () => S.fern(rng.int(1, 999))) : sprite('hojas', rng.int(0, 4), () => S.bigLeaves(rng.int(1, 999)));
      const p = add(makeProp(kind, spr, x, y));
      p.level = tr.level;
      reserve(x, y, 6);
    }
  }
  for (let i = 0; i < 2500; i++) {
    const x = rng.range(TILE, map.pixelWidth - TILE);
    const y = rng.range(TILE, map.pixelHeight - 4);
    const d = distToPaths(x / TILE, y / TILE);
    if (d < 1.15 || d > 1.7 || !tileOk(x, y, JUNGLE, 0) || inCamp(x, y) || nearCliff(x, y) || inRuins(x, y) || !free(x, y, 8)) continue;
    const kind = rng.next() < 0.5 ? 'helecho' : rng.next() < 0.5 ? 'hojas' : 'flor';
    const spr = kind === 'helecho' ? sprite('helecho', rng.int(0, 5), () => S.fern(rng.int(1, 999)))
      : kind === 'hojas' ? sprite('hojas', rng.int(0, 4), () => S.bigLeaves(rng.int(1, 999)))
      : sprite('florred', rng.int(0, 2), () => S.bromeliad(rng.int(1, 999), 'red'));
    const p = add(makeProp(kind, spr, x, y));
    p.level = map.levelAt(Math.floor(x / TILE), Math.floor(y / TILE));
    reserve(x, y, 8);
  }

  // ---- Hierba alta: una mata por tile.
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.groundAt(tx, ty) !== G.TALL_GRASS) continue;
      const v = (tx * 7 + ty * 3) % 5;
      add(makeProp('hierbaAlta', sprite('hierbaAlta', v, () => S.tallGrass(50 + v)), T(tx + 0.5), T(ty + 1) - 1, { grass: true }));
    }
  }

  // Los props sin colisión no necesitan caja sólida.
  for (const p of props) if (!p.solid) p.col = { x: p.x - 4, y: p.y - 4, w: 8, h: 4 };
  return props;
}

/** Objetos sueltos en el suelo al empezar: cocos, piedras, palos, hierbas. */
export function initialPickups(map, props) {
  const rng = new RNG(99);
  const out = [];
  for (const p of props) {
    if (p.kind === 'palmera' && rng.next() < 0.7) out.push({ item: 'coco', n: 1, x: p.x + rng.range(-16, 16), y: p.y + rng.range(6, 14) });
    if (p.kind === 'roca' && rng.next() < 0.25) out.push({ item: 'piedra', n: 1, x: p.x + rng.range(-14, 14), y: p.y + rng.range(6, 12) });
    if (p.kind === 'arbol' && rng.next() < 0.18) out.push({ item: 'madera', n: 1, x: p.x + rng.range(-20, 20), y: p.y + rng.range(8, 16) });
    if (p.kind === 'flor' && p.parts && rng.next() < 0.15) out.push({ item: 'hierba', n: 1, x: p.x + rng.range(-10, 10), y: p.y + rng.range(6, 10) });
  }
  out.push({ item: 'madera', n: 1, x: TILE * 19.5, y: TILE * 21.8 });
  out.push({ item: 'piedra', n: 1, x: TILE * 20.3, y: TILE * 19.6 });
  return out.map((o) => ({ ...o, level: map.levelAt(Math.floor(o.x / TILE), Math.floor(o.y / TILE)) }));
}

/** Restos que el mar arrastra a la playa cuando el avión se hunde (con el botín inicial). */
export function makeFlotsam(x, y, loot) {
  return makeProp('caja', sprite('caja', 0, () => S.crate(3)), x, y, {
    interact: { verbo: 'Registrar', nombre: 'los restos que ha traído la marea' },
    loot: loot.map(([id, n]) => [id, n]),
  });
}
