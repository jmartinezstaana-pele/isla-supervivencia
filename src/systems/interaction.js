// Buscar y saquear: qué hay al alcance para la tecla E (contenedores, arbustos,
// objetos del suelo, agua del río) y qué pasa al usarlo. Usar objetos del
// inventario (comer, beber, curarse).

import { TILE } from '../config.js';
import { ITEMS, QUICK } from '../data/items.js';
import { G } from '../world/tiles.js';

const REACH = 30;

function distToRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Lo más cercano con lo que se puede interactuar, o null. */
export function findInteraction(game) {
  const p = game.player;
  if (p.state !== 'walk' || p.swimming) return null;
  let best = null;
  let bestD = Infinity;
  for (const pk of game.pickups) {
    if (pk.level !== p.level) continue;
    const d = Math.hypot(pk.x - p.x, pk.y - p.y);
    if (d < 24 && d < bestD) {
      best = { kind: 'pickup', target: pk, label: `Recoger ${ITEMS[pk.item].nombre.toLowerCase()}` };
      bestD = d;
    }
  }
  for (const pr of game.world.index.query(p.x - 90, p.y - 60, p.x + 90, p.y + 60)) {
    if (!pr.interact || pr.opened || pr.emptied || (pr.level || 0) !== p.level) continue;
    const r = pr.solid ? pr.col : { x: pr.x - 10, y: pr.y - 10, w: 20, h: 12 };
    const d = distToRect(p.x, p.y - 4, r);
    if (d < REACH && d < bestD) {
      best = { kind: 'prop', target: pr, label: `${pr.interact.verbo} ${pr.interact.nombre}` };
      bestD = d;
    }
  }
  for (const body of game.bodies || []) {
    if (body.looted || !body.loot) continue;
    const d = Math.hypot(body.x - p.x, body.y - p.y);
    if (d < 26 && d < bestD) {
      best = { kind: 'body', target: body, label: `Registrar ${body.nombre}` };
      bestD = d;
    }
  }
  if (!best) {
    // Agua del río delante del jugador.
    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing];
    for (const k of [8, 16, 24]) {
      const g = game.map.groundAt(Math.floor((p.x + dir[0] * k) / TILE), Math.floor((p.y - 5 + dir[1] * k) / TILE));
      if (g === G.RIVER) { best = { kind: 'water', label: 'Beber agua del río' }; break; }
    }
  }
  return best;
}

/** Da el botín a la mochila y lo anuncia. */
function giveLoot(game, loot) {
  for (const [id, n] of loot) {
    if (game.inventory.add(id, n)) game.logPickup(id, n);
    else game.player.say('La mochila está llena.');
  }
}

export function doInteraction(game, it) {
  const p = game.player;
  if (!it) return;
  switch (it.kind) {
    case 'pickup':
      giveLoot(game, [[it.target.item, it.target.n]]);
      game.pickups.splice(game.pickups.indexOf(it.target), 1);
      game.sound('pickup');
      break;
    case 'prop': {
      const pr = it.target;
      if (pr.door) {
        game.useDoor(pr);
        break;
      }
      if (pr.note && pr.reread) {
        game.openNote(pr.note);
        break;
      }
      giveLoot(game, pr.loot || []);
      if (pr.emptySprite) pr.emptied = true;
      else pr.opened = true;
      if (pr.kind === 'avion') p.say('Entre los restos encuentras un cuchillo y provisiones.');
      if (pr.msg) p.say(pr.msg);
      if (pr.loot && pr.loot.length) game.stats.saqueos++;
      if (pr.note) game.openNote(pr.note);
      game.sound('open');
      break;
    }
    case 'body':
      giveLoot(game, it.target.loot);
      it.target.looted = true;
      game.sound('open');
      break;
    case 'water':
      p.needs.sed = Math.min(100, p.needs.sed + 30);
      p.say('Bebes agua fresca del río.');
      game.sound('drink');
      break;
  }
  p.pick = 0.25; // animación de recoger
}

/** Usa un objeto del inventario. Devuelve true si se ha consumido. */
export function useItem(game, id) {
  const def = ITEMS[id];
  const p = game.player;
  if (!def || !game.inventory.has(id)) return false;
  if (id === 'antorcha') {
    p.torchOn = !p.torchOn;
    p.say(p.torchOn ? 'Enciendes la antorcha. Ves mejor, pero te verán antes.' : 'Apagas la antorcha.');
    return false;
  }
  if (!def.efecto) {
    p.say(def.desc);
    return false;
  }
  const e = def.efecto;
  if (e.vida) p.hp = Math.max(1, Math.min(p.maxHp, p.hp + e.vida));
  if (e.hambre) p.needs.hambre = Math.min(100, p.needs.hambre + e.hambre);
  if (e.sed) p.needs.sed = Math.min(100, p.needs.sed + e.sed);
  if (e.energia) p.needs.energia = Math.min(100, p.needs.energia + e.energia);
  game.inventory.remove(id, 1);
  const verbo = def.tipo === 'bebida' ? 'Bebes' : def.tipo === 'cura' ? 'Usas' : 'Comes';
  p.say(`${verbo}: ${def.nombre.toLowerCase()}.`);
  if (def.curaVeneno && p.sick > 0) {
    p.sick = 0;
    p.say('Se te asienta el estómago.');
  }
  // Riesgo de intoxicación: menor cuanto más Inteligencia (TRASPASO §1.5).
  if (def.riesgo && game.rng() < p.sicknessChance(def.riesgo)) {
    p.sick = 30;
    p.say('Algo te ha sentado mal… Estás intoxicado.');
  }
  game.sound(def.tipo === 'bebida' ? 'drink' : def.tipo === 'cura' ? 'heal' : 'eat');
  return true;
}

/** Atajos Q / R / H: usa el mejor objeto disponible de cada tipo. */
export function quickUse(game, kind) {
  const id = QUICK[kind].find((x) => game.inventory.has(x));
  if (!id) {
    game.player.say({ comer: 'No tienes nada de comer.', beber: 'No tienes nada de beber.', curar: 'No tienes con qué curarte.' }[kind]);
    return false;
  }
  return useItem(game, id);
}
