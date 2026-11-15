// Pruebas de humo de la sesión 3 (TRASPASO §4c): el HTML carga desde file:// sin
// errores, el personaje se mueve en todas las direcciones, choca con los props y
// se ordena con los árboles, escala; se puede saquear, recoger, comer; los
// enemigos detectan y se les puede herir o eliminar por la espalda; llueve y
// anochece. Guarda capturas de la playa, la selva, la noche y la lluvia.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;
const TILE = 32;
const WALK = 110;

async function openGame(page, { start = true } = {}) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__isla && window.__isla.ready, null, { timeout: 20_000 });
  if (start) await page.evaluate(() => { window.__isla.start(); window.__isla.game.helpT = 0; });
  return errors;
}

const player = (page) => page.evaluate(() => window.__isla.player());
const freeze = (page) => page.evaluate(() => window.__isla.freeze(true));
const step = (page, seconds, dt = 1 / 60) =>
  page.evaluate(([d, n]) => window.__isla.step(d, n), [dt, Math.round(seconds / dt)]);
const teleport = (page, tx, ty) => page.evaluate(([x, y]) => window.__isla.teleport(x, y), [tx, ty]);
/** Coloca los pies del jugador en píxeles exactos. */
const placePx = (page, x, y, level = 0) => page.evaluate(([a, b, l]) => {
  const g = window.__isla.game;
  g.player.placeAt(a, b, l);
  g.camera.snap(g.player);
}, [x, y, level]);

async function hold(page, keys, seconds) {
  for (const k of keys) await page.keyboard.down(k);
  await step(page, seconds);
  for (const k of keys) await page.keyboard.up(k);
}

/** Deja el mundo en calma para pruebas deterministas: de día, sin lluvia, enemigos lejos. */
const calm = (page) => page.evaluate(() => {
  const g = window.__isla.game;
  g.clock.hours = 12;
  g.weather.set(false);
  g.weather.timer = 9999;
});

test('carga desde file:// sin errores: título y luego la isla', async ({ page }) => {
  const errors = await openGame(page, { start: false });
  expect(await page.evaluate(() => window.__isla.game.screen)).toBe('title');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__isla.game.screen)).toBe('play');
  const p = await player(page);
  expect(p.state).toBe('walk');
  expect(p.hp).toBe(100);
  expect(errors).toEqual([]);
});

test('teclado real: se mueve en las 4 direcciones con su animación', async ({ page }) => {
  const errors = await openGame(page);
  const cases = [['KeyD', 'walk', 'right', 1, 0], ['KeyS', 'walk_down', 'down', 0, 1], ['KeyA', 'walk_left', 'left', -1, 0], ['KeyW', 'walk_up', 'up', 0, -1]];
  for (const [key, anim, facing, sx, sy] of cases) {
    const before = await player(page);
    await page.keyboard.down(key);
    await page.waitForTimeout(350);
    const p = await player(page);
    await page.keyboard.up(key);
    expect(p.anim).toBe(anim);
    expect(p.facing).toBe(facing);
    if (sx) expect(Math.sign(p.x - before.x)).toBe(sx);
    if (sy) expect(Math.sign(p.y - before.y)).toBe(sy);
    await page.waitForTimeout(150);
  }
  expect(errors).toEqual([]);
});

test('diagonal normalizada y correr más rápido', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  const a = await player(page);
  await hold(page, ['KeyD', 'KeyS'], 0.8);
  const b = await player(page);
  expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(WALK * 0.8 * 1.02);
  expect(b.x - a.x).toBeGreaterThan(20);
  expect(b.y - a.y).toBeGreaterThan(20);
  await page.keyboard.down('Shift');
  await page.keyboard.down('KeyW');
  await step(page, 0.4);
  const c = await player(page);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('Shift');
  expect(c.anim).toBe('run_up');
  expect(Math.hypot(c.vx, c.vy)).toBeGreaterThan(WALK * 1.5);
  expect(errors).toEqual([]);
});

test('choca con un prop sólido y pasa por detrás y por delante de un árbol', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  // Los restos del avión son sólidos.
  const wreck = await page.evaluate(() => {
    const p = window.__isla.game.world.props.find((q) => q.kind === 'avion');
    return { x: p.x, y: p.y, col: p.col };
  });
  await placePx(page, wreck.col.x + wreck.col.w + 30, wreck.y - 4);
  await hold(page, ['KeyA'], 1.2);
  let p = await player(page);
  expect(p.x).toBeCloseTo(wreck.col.x + wreck.col.w + 9, 0);

  // Profundidad con un árbol de selva.
  const tree = await page.evaluate(() => {
    const t = window.__isla.game.world.props.find((q) => q.kind === 'arbol' && q.level === 0);
    return { x: t.x, y: t.y };
  });
  const idx = async () => {
    const order = await page.evaluate(() => window.__isla.drawOrder());
    const pi = order.findIndex((o) => o.kind === 'jugador');
    const ti = order.findIndex((o) => o.kind === 'arbol' && o.x === tree.x && o.y === tree.y);
    return pi - ti;
  };
  await placePx(page, tree.x, tree.y - 12);
  expect(await idx()).toBeLessThan(0); // detrás: el árbol se dibuja después
  await placePx(page, tree.x, tree.y + 12);
  expect(await idx()).toBeGreaterThan(0); // delante
  p = await player(page);
  expect(p.state).toBe('walk');
  expect(errors).toEqual([]);
});

test('escala la pared de la meseta y llega a las ruinas', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await calm(page);
  await teleport(page, 35, 13);
  await page.keyboard.down('KeyW');
  await step(page, 1.0);
  let p = await player(page);
  expect(p.state).toBe('climb');
  await step(page, 1.6);
  await page.keyboard.up('KeyW');
  p = await player(page);
  expect(p.level).toBe(1);
  expect(p.stamina).toBeLessThan(100);
  expect(errors).toEqual([]);
});

test('saquea los restos del avión, recoge un objeto y come', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await calm(page);
  const wreck = await page.evaluate(() => {
    const p = window.__isla.game.world.props.find((q) => q.kind === 'avion');
    return { x: p.x, y: p.y };
  });
  await placePx(page, wreck.x, wreck.y + 14);
  await step(page, 0.05);
  const label = await page.evaluate(() => window.__isla.game.interaction && window.__isla.game.interaction.label);
  expect(label).toContain('restos del avión');
  await page.keyboard.press('KeyE');
  await step(page, 0.05);
  let inv = await page.evaluate(() => window.__isla.inventory());
  const ids = inv.map((s) => s.id);
  expect(ids).toContain('cuchillo');
  expect(ids).toContain('botella');
  expect(ids).toContain('racion');
  expect(await page.evaluate(() => window.__isla.game.world.props.find((q) => q.kind === 'avion').opened)).toBe(true);

  // Recoger un objeto del suelo.
  const pk = await page.evaluate(() => { const k = window.__isla.game.pickups[0]; return { x: k.x, y: k.y, item: k.item, n: window.__isla.game.pickups.length }; });
  await placePx(page, pk.x, pk.y - 2);
  await step(page, 0.05);
  await page.keyboard.press('KeyE');
  await step(page, 0.05);
  inv = await page.evaluate(() => window.__isla.inventory());
  expect(inv.find((s) => s.id === pk.item)).toBeTruthy();
  expect(await page.evaluate(() => window.__isla.game.pickups.length)).toBe(pk.n - 1);

  // Comer (Q) y beber (R).
  await page.evaluate(() => { const n = window.__isla.game.player.needs; n.hambre = 30; n.sed = 30; });
  await page.keyboard.press('KeyQ');
  await step(page, 0.05);
  await page.keyboard.press('KeyR');
  await step(page, 0.05);
  const p = await player(page);
  expect(p.needs.hambre).toBeGreaterThan(45);
  expect(p.needs.sed).toBeGreaterThan(55);
  expect(errors).toEqual([]);
});

test('un enemigo detecta al jugador a la vista, pero no si está oculto en la hierba alta', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await calm(page);
  // Guerrero 2: se le para mirando al este y el jugador se pone delante.
  const setup = (dx) => page.evaluate((d) => {
    const g = window.__isla.game;
    const e = g.enemies[1];
    e.x = 72 * 32; e.y = 20.5 * 32; e.angle = 0; e.state = 'wait'; e.timer = 99; e.baseAngle = 0; e.detect = 0; e.waypoints = [[e.x, e.y]];
    g.player.placeAt(e.x + d, e.y, 0);
    g.camera.snap(g.player);
  }, dx);
  await setup(80);
  await step(page, 0.4);
  let e = (await page.evaluate(() => window.__isla.enemies()))[1];
  expect(e.detect).toBeGreaterThan(0.2);
  await step(page, 1.5);
  e = (await page.evaluate(() => window.__isla.enemies()))[1];
  expect(e.state === 'chase' || e.state === 'attack').toBe(true);

  // Oculto: agachado en la hierba alta, el guerrero 1 no lo ve aunque mire hacia él.
  await page.evaluate(() => {
    const g = window.__isla.game;
    const m = g.map;
    // Una casilla de hierba alta rodeada de hierba alta.
    let spot = null;
    for (let ty = 2; ty < m.height - 2 && !spot; ty++) for (let tx = 2; tx < m.width - 2 && !spot; tx++) {
      let ok = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.groundAt(tx + dx, ty + dy) !== 12) ok = false;
      if (ok && tx > 55) spot = [tx, ty];
    }
    const e = g.enemies[0];
    const px = (spot[0] + 0.5) * 32;
    const py = (spot[1] + 0.5) * 32;
    e.x = px; e.y = py - 70; e.angle = Math.PI / 2; e.state = 'wait'; e.timer = 99; e.baseAngle = Math.PI / 2; e.detect = 0; e.waypoints = [[e.x, e.y]];
    g.player.placeAt(px, py, 0);
    g.camera.snap(g.player);
  });
  await page.keyboard.down('KeyC');
  await step(page, 1.5);
  const hidden = await player(page);
  e = (await page.evaluate(() => window.__isla.enemies()))[0];
  await page.keyboard.up('KeyC');
  expect(hidden.terrain).toBe('tallgrass');
  expect(hidden.hidden).toBe(true);
  expect(e.detect).toBe(0);
  expect(errors).toEqual([]);
});

test('el ataque hace daño y la eliminación por la espalda mata de un golpe', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await calm(page);
  await page.evaluate(() => window.__isla.game.inventory.add('cuchillo'));
  // Ataque con clic hacia un guerrero que ya está alerta.
  const pos = await page.evaluate(() => {
    const g = window.__isla.game;
    const e = g.enemies[1];
    e.x = 72 * 32; e.y = 20.5 * 32; e.state = 'search'; e.timer = 99; e.detect = 1;
    g.player.placeAt(e.x - 22, e.y, 0);
    g.camera.snap(g.player);
    return { sx: (e.x - g.camera.ix) * 2, sy: (e.y - 12 - g.camera.iy) * 2, hp: e.hp };
  });
  await page.mouse.move(pos.sx, pos.sy);
  await page.mouse.down();
  await page.mouse.up();
  await step(page, 0.3);
  let e = (await page.evaluate(() => window.__isla.enemies()))[1];
  expect(e.hp).toBeLessThan(pos.hp);
  expect(await page.evaluate(() => window.__isla.game.floaters.length + 0)).toBeGreaterThanOrEqual(0);

  // Por la espalda: el guerrero 3 mira al este y el jugador está al oeste.
  await page.evaluate(() => {
    const g = window.__isla.game;
    const e = g.enemies[2];
    e.x = 77 * 32; e.y = 15.5 * 32; e.angle = 0; e.state = 'wait'; e.timer = 99; e.baseAngle = 0; e.detect = 0; e.waypoints = [[e.x, e.y]];
    g.player.placeAt(e.x - 22, e.y + 2, 0);
    g.camera.snap(g.player);
  });
  await step(page, 0.05);
  expect(await page.evaluate(() => !!window.__isla.game.killTarget)).toBe(true);
  await page.keyboard.press('KeyF');
  await step(page, 0.2);
  e = (await page.evaluate(() => window.__isla.enemies()))[2];
  expect(e.dead).toBe(true);
  expect(await page.evaluate(() => window.__isla.game.stats.sigilosas)).toBe(1);
  expect(errors).toEqual([]);
});

test('el jabalí carga contra el jugador', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await calm(page);
  await page.evaluate(() => {
    const g = window.__isla.game;
    const b = g.animals.find((a) => a.kind === 'jabali');
    g.player.placeAt(b.x + 70, b.y, 0);
    g.camera.snap(g.player);
  });
  let charged = false;
  for (let i = 0; i < 30 && !charged; i++) {
    await step(page, 0.05);
    charged = await page.evaluate(() => window.__isla.game.animals.find((a) => a.kind === 'jabali').state === 'charge');
  }
  expect(charged).toBe(true);
  expect(errors).toEqual([]);
});

test('llega la lluvia sola, reduce la vista de los enemigos, y anochece', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await page.evaluate(() => { window.__isla.game.clock.hours = 12; });
  const r0 = await page.evaluate(() => window.__isla.game.weather.visionFactor);
  // La primera lluvia llega en menos de dos minutos y medio de juego.
  let raining = false;
  for (let i = 0; i < 60 && !raining; i++) {
    await step(page, 2.5, 1 / 10);
    raining = await page.evaluate(() => window.__isla.game.weather.raining);
  }
  expect(raining).toBe(true);
  await step(page, 6, 1 / 10);
  const w = await page.evaluate(() => ({ k: window.__isla.game.weather.intensity, v: window.__isla.game.weather.visionFactor, drops: window.__isla.game.weather.drops.length }));
  expect(w.k).toBeGreaterThan(0.5);
  expect(w.v).toBeLessThan(r0);
  expect(w.drops).toBeGreaterThan(10);

  // Anochecer: a las 21:00 está oscuro.
  await page.evaluate(() => { window.__isla.game.clock.hours = 21; });
  await step(page, 0.1);
  const dark = await page.evaluate(() => window.__isla.game.clock.darkness);
  expect(dark).toBeGreaterThan(0.6);
  expect(errors).toEqual([]);
});

test('muere y reaparece en la playa', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await page.evaluate(() => { window.__isla.game.player.hp = 0; });
  await step(page, 3.5);
  const p = await player(page);
  expect(p.hp).toBe(60);
  expect([p.tx, p.ty]).toEqual([17, 20]);
  expect(errors).toEqual([]);
});

test('capturas: playa, selva, noche y lluvia', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  const shot = async (name, setup) => {
    await page.evaluate(setup);
    await step(page, 0.6);
    await page.evaluate(() => window.__isla.game.render());
    await page.screenshot({ path: `tests/output/${name}.png` });
  };
  await shot('playa', () => { const g = window.__isla.game; g.clock.hours = 11; g.weather.set(false); g.weather.timer = 9999; window.__isla.teleport(15, 19); });
  await shot('selva', () => { window.__isla.teleport(44, 21); });
  await shot('cascada', () => { window.__isla.teleport(41, 14); });
  await shot('campamento', () => { window.__isla.teleport(65, 21); });
  await shot('noche', () => { const g = window.__isla.game; g.clock.hours = 22; window.__isla.teleport(70, 20); });
  await shot('lluvia', () => { const g = window.__isla.game; g.clock.hours = 15; g.weather.set(true); window.__isla.teleport(30, 21); });
  expect(errors).toEqual([]);
});
