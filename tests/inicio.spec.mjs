// Pruebas de la sesión 4 (TRASPASO §4d): flujo de inicio título → creación →
// intro → aterrizaje → juego, resultado del aterrizaje según la zona, colores de
// la vista previa y efecto real de los atributos (vida, salto y detección).

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;
const TILE = 32;
// El trozo de la sesión 3 está en (4, 116) de la isla completa; el mapa del
// aterrizaje usa las mismas coordenadas que el mapa del juego.
const OX = 4;
const OY = 116;
const big = (tx, ty) => [OX + tx, OY + ty];

async function openGame(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__isla && window.__isla.ready, null, { timeout: 20_000 });
  return errors;
}

const screen = (page) => page.evaluate(() => window.__isla.screen());
const player = (page) => page.evaluate(() => window.__isla.player());
const step = (page, seconds, dt = 1 / 60) =>
  page.evaluate(([d, n]) => window.__isla.step(d, n), [dt, Math.round(seconds / dt)]);

/** Pulsa una tecla y deja pasar unos fotogramas (dos pulsaciones en el mismo fotograma cuentan como una). */
async function press(page, key, wait = 90) {
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
}

const calm = (page) => page.evaluate(() => {
  const g = window.__isla.game;
  g.clock.hours = 12;
  g.weather.set(false);
  g.weather.timer = 9999;
  g.helpT = 0;
});

test('recorrido completo con teclado: título → creación → intro → aterrizaje en la playa → juego', async ({ page }) => {
  const errors = await openGame(page);
  expect(await screen(page)).toBe('title');
  // «Continuar» está desactivado sin partida guardada: S salta de Nueva partida a Controles.
  await press(page, 'KeyS');
  expect(await page.evaluate(() => window.__isla.game.screens.title.sel)).toBe(2);
  await press(page, 'Enter');
  expect(await page.evaluate(() => window.__isla.game.screens.title.showControls)).toBe(true);
  await press(page, 'Escape');
  await press(page, 'KeyW');
  await press(page, 'Enter');
  expect(await screen(page)).toBe('create');

  // Creación: pasar un punto de Inteligencia a Agilidad y elegir camiseta roja.
  await press(page, 'KeyS');            // Agilidad
  await press(page, 'KeyD');            // sin puntos libres: no sube
  expect((await page.evaluate(() => window.__isla.creation())).attrs.agilidad).toBe(3);
  await press(page, 'KeyS');            // Inteligencia
  await press(page, 'KeyA');            // 2 → 1, queda 1 libre
  let cr = await page.evaluate(() => window.__isla.creation());
  expect(cr.free).toBe(1);
  await press(page, 'Enter');           // con puntos libres no deja empezar
  expect(await screen(page)).toBe('create');
  await press(page, 'KeyW');
  await press(page, 'KeyD');            // Agilidad 3 → 4
  for (let i = 0; i < 5; i++) await press(page, 'KeyS', 60); // camiseta
  await press(page, 'KeyD');
  await press(page, 'KeyD');            // Roja
  cr = await page.evaluate(() => window.__isla.creation());
  expect(cr.attrs).toEqual({ fuerza: 3, agilidad: 4, inteligencia: 1, sigilo: 2 });
  expect(cr.colors.camiseta).toBe(2);
  await press(page, 'Enter');
  expect(await screen(page)).toBe('intro');

  // Intro: 3 pantallas (Enter completa el texto y Enter pasa de página).
  for (let i = 0; i < 6 && (await screen(page)) === 'intro'; i++) await press(page, 'Enter', 120);
  expect(await screen(page)).toBe('landing');
  const l0 = await page.evaluate(() => window.__isla.landing());
  expect(l0.alt).toBeGreaterThan(1100);
  expect(l0.phase).toBe('fly');

  // El avión pierde altura y gira con A / D.
  await page.waitForTimeout(400);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  const l1 = await page.evaluate(() => window.__isla.landing());
  expect(l1.alt).toBeLessThan(l0.alt);
  expect(l1.angle).toBeGreaterThan(l0.angle + 0.3);

  // Sobre la playa, Espacio: bajada, impacto y pantalla de resultado.
  await page.evaluate(([x, y]) => window.__isla.placePlane(x, y, Math.PI / 2), big(15, 18));
  expect((await page.evaluate(() => window.__isla.landing())).result).toBe('arena');
  await press(page, 'Space', 30);
  await page.waitForFunction(() => window.__isla.screen() === 'impact', null, { timeout: 8000 });
  await page.waitForTimeout(700);
  await press(page, 'Enter');
  expect(await screen(page)).toBe('play');
  const p = await player(page);
  const g = await page.evaluate(() => ({ zone: window.__isla.game.zone, plane: window.__isla.game.plane }));
  expect(g.zone).toBe('playa');
  expect(g.plane.estado).toBe('reparable');
  expect(p.maxHp).toBe(116);
  expect(p.hp).toBe(116 - 10);
  expect(p.attrs.agilidad).toBe(4);
  // Los restos del avión están al lado y se pueden registrar.
  const wreck = await page.evaluate(() => {
    const w = window.__isla.game.world.props.find((pr) => pr.kind === 'avion');
    return { x: w.x, y: w.y };
  });
  expect(Math.hypot(wreck.x - p.x, wreck.y - p.y)).toBeLessThan(60);
  // El protagonista lleva la camiseta roja elegida.
  const shirt = await page.evaluate(() => window.__isla.partColor('camiseta', 'game'));
  expect(shirt[0]).toBeGreaterThan(shirt[1] + 50);
  await page.screenshot({ path: 'tests/output/inicio-playa.png' });
  expect(errors).toEqual([]);
});

test('el resultado del aterrizaje depende de la zona, en cualquier parte de la isla', async ({ page }) => {
  const errors = await openGame(page);
  const land = async (tx, ty) => {
    await page.evaluate(() => { window.__isla.game.newGame(); window.__isla.goto('landing'); });
    return page.evaluate(([x, y]) => window.__isla.landAt(x, y), [tx, ty]);
  };
  const state = () => page.evaluate(() => {
    const g = window.__isla.game;
    const p = g.player;
    return { screen: g.screen, hp: p.hp, maxHp: p.maxHp, level: p.level, terrain: p.terrain, zone: g.zone, plane: g.plane, x: p.x, y: p.y };
  });

  // Selva: −30 de vida y el avión destruido.
  expect(await land(...big(28, 27))).toBe(true);
  let s = await state();
  expect(s.screen).toBe('impact');
  expect(s.hp).toBe(s.maxHp - 30);
  expect(s.plane.estado).toBe('destruido');
  expect(s.zone).toBe('selva');

  // Meseta de las ruinas: −45 y el jugador arriba (nivel 1).
  expect(await land(...big(38, 4))).toBe(true);
  s = await state();
  expect(s.hp).toBe(s.maxHp - 45);
  expect(s.level).toBe(1);

  // Campamento de la tribu: −25 y la tribu acude al terminar el impacto.
  expect(await land(...big(75, 22))).toBe(true);
  s = await state();
  expect(s.hp).toBe(s.maxHp - 25);
  await page.evaluate(() => window.__isla.game.endImpact());
  const near = await page.evaluate(() => window.__isla.enemies().filter((e) => e.id <= 3).map((e) => e.state));
  expect(near.every((st) => st === 'investigate')).toBe(true);

  // Mar: el avión se hunde, sin daño, y empiezas en el agua cerca de la costa con los restos en la playa.
  expect(await land(...big(3, 20))).toBe(true);
  s = await state();
  expect(s.hp).toBe(s.maxHp);
  expect(s.plane.estado).toBe('hundido');
  await page.evaluate(() => { window.__isla.game.endImpact(); window.__isla.step(1 / 60, 2); });
  s = await state();
  expect(['deep', 'shallow']).toContain(s.terrain);
  const props = await page.evaluate(() => window.__isla.game.world.props.filter((p) => p.kind === 'avion' || (p.interact && p.interact.nombre.includes('marea'))).map((p) => p.kind));
  expect(props).toEqual(['caja']);

  // Zonas nuevas de la sesión 5: cada una con su daño y en su sitio.
  for (const [tx, ty, zone, dano, level] of [[96, 57, 'cumbre', 50, 4], [168, 79, 'militar', 35, 0], [124, 141, 'manglar', 20, 0], [165, 20, 'acantilados', 40, 2], [32, 72, 'poblado', 25, 0]]) {
    expect(await land(tx, ty)).toBe(true);
    s = await state();
    expect(s.zone).toBe(zone);
    expect(s.hp).toBe(s.maxHp - dano);
    expect(s.level).toBe(level);
  }
  // En el poblado acude toda la tribu cercana.
  await page.evaluate(() => window.__isla.game.endImpact());
  const pob = await page.evaluate(() => window.__isla.enemies().filter((e) => e.id >= 4).map((e) => e.state));
  expect(pob.every((st) => st === 'investigate')).toBe(true);

  // Sin altura, el avión aterriza solo donde esté.
  await page.evaluate(() => { window.__isla.game.newGame(); window.__isla.goto('landing'); window.__isla.freeze(true); window.__isla.placePlane(100, 120, 0); window.__isla.game.landing.alt = 1; });
  await step(page, 0.2);
  expect((await page.evaluate(() => window.__isla.landing())).phase).toBe('descent');
  await step(page, 3.2);
  s = await state();
  expect(s.screen).toBe('impact');
  expect(errors).toEqual([]);
});

test('la vista previa de la creación refleja los colores elegidos y gira por las 4 direcciones', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__isla.goto('create'));
  const base = await page.evaluate(() => ({
    shirt: window.__isla.partColor('camiseta'), skin: window.__isla.partColor('piel'), pants: window.__isla.partColor('pantalon'), hair: window.__isla.partColor('pelo'),
  }));
  // Camiseta azul, piel oscura, pantalón negro y pañuelo rojo.
  await page.evaluate(() => Object.assign(window.__isla.game.screens.create.colors, { camiseta: 3, piel: 4, pantalon: 3, pelo: 1 }));
  const after = await page.evaluate(() => ({
    shirt: window.__isla.partColor('camiseta'), skin: window.__isla.partColor('piel'), pants: window.__isla.partColor('pantalon'), hair: window.__isla.partColor('pelo'),
  }));
  expect(after.shirt[2]).toBeGreaterThan(after.shirt[0] + 40);         // azul
  expect(after.skin[0] + after.skin[1] + after.skin[2]).toBeLessThan(base.skin[0] + base.skin[1] + base.skin[2] - 60); // más oscura
  const greenish = (c) => c[1] - Math.max(c[0], c[2]);
  expect(greenish(base.pants)).toBeGreaterThan(8);                     // militar: verdoso
  expect(greenish(after.pants)).toBeLessThan(4);                       // negro: ya no
  expect(after.hair[0]).toBeGreaterThan(after.hair[1] + 60);           // rojo
  // Gira: en 6 s pasa por las 4 direcciones.
  const dirs = new Set();
  for (let i = 0; i < 12; i++) {
    dirs.add((await page.evaluate(() => window.__isla.creation())).dir);
    await page.evaluate(() => window.__isla.step(0.5, 1));
  }
  expect([...dirs].sort()).toEqual(['walk', 'walk_down', 'walk_left', 'walk_up']);
  await page.screenshot({ path: 'tests/output/creacion.png' });
  expect(errors).toEqual([]);
});

test('dos personajes muy distintos se notan al jugar: vida, salto, velocidad, ruido y detección', async ({ page }) => {
  const errors = await openGame(page);
  const fuerte = { fuerza: 4, agilidad: 6, inteligencia: 0, sigilo: 0 };
  const sigiloso = { fuerza: 0, agilidad: 0, inteligencia: 4, sigilo: 6 };

  async function measure(attrs) {
    await page.evaluate((a) => { window.__isla.start({ attrs: a }); window.__isla.freeze(true); }, attrs);
    await calm(page);
    const p0 = await player(page);
    // Salto corriendo por la arena despejada hacia el sur.
    await page.evaluate(() => {
      const g = window.__isla.game;
      g.player.placeAt((17 + 4) * 32, (21.6 + 116) * 32, 0);
      g.camera.snap(g.player);
    });
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyD');
    await step(page, 0.5);
    const run = (await player(page)).vx;
    await page.keyboard.down('Space');
    await step(page, 1 / 60);
    await page.keyboard.up('Space');
    const j0 = await page.evaluate(() => window.__isla.game.player.jump.startX);
    for (let i = 0; i < 60 && (await player(page)).state === 'jump'; i++) await step(page, 1 / 60);
    await page.keyboard.up('KeyD');
    await page.keyboard.up('ShiftLeft');
    const jump = (await player(page)).x - j0;
    // Ruido al correr.
    const noise = await page.evaluate(() => {
      const p = window.__isla.game.player;
      p.running = true;
      p.vx = 190;
      return p.noise;
    });
    // Detección: un guerrero quieto mirando al jugador a 96 px en el claro del campamento.
    const detect = await page.evaluate(() => {
      const g = window.__isla.game;
      const p = g.player;
      const e = g.enemies[0];
      for (const o of g.enemies) if (o !== e) o.state = 'dead';
      e.x = (75 + 4) * 32; e.y = (20 + 116) * 32; e.angle = 0; e.baseAngle = 0;
      e.state = 'wait'; e.timer = 2.8; e.detect = 0;
      p.placeAt(e.x + 96, e.y, 0);
      p.vx = p.vy = 0;
      return e.detect;
    });
    expect(detect).toBe(0);
    await step(page, 0.4);
    const seen = await page.evaluate(() => window.__isla.game.enemies[0].detect);
    return { maxHp: p0.maxHp, hp: p0.hp, run, jump, noise, seen, stats: p0.stats };
  }

  const a = await measure(fuerte);
  const b = await measure(sigiloso);
  // Vida (Fuerza): 80 + F × 12.
  expect(a.maxHp).toBe(128);
  expect(b.maxHp).toBe(80);
  expect(a.hp).toBe(128);
  expect(a.stats.damageFactor).toBeGreaterThan(b.stats.damageFactor);
  // Salto (Agilidad): 2,6 + A × 0,25 casillas corriendo.
  expect(a.jump).toBeGreaterThan(b.jump + 1.2 * TILE);
  expect(a.jump).toBeCloseTo(4.1 * TILE, -1);
  expect(b.jump).toBeCloseTo(2.6 * TILE, -1);
  expect(a.run).toBeGreaterThan(b.run * 1.2);
  // Ruido y detección (Sigilo).
  expect(b.noise).toBeLessThan(a.noise * 0.5);
  expect(a.seen).toBeGreaterThan(0.25);
  expect(b.seen).toBeLessThan(a.seen * 0.6);
  expect(errors).toEqual([]);
});

test('Inteligencia: pistas en la mochila y menos riesgo de intoxicarse; P abre la pantalla de personaje', async ({ page }) => {
  const errors = await openGame(page);
  const probe = async (inteligencia) => {
    await page.evaluate((i) => window.__isla.start({ attrs: { fuerza: 10 - i - 0, agilidad: 0, inteligencia: i, sigilo: 0 } }), inteligencia);
    return page.evaluate(() => ({ chance: window.__isla.game.player.sicknessChance(0.6), attrs: window.__isla.game.player.attrs }));
  };
  const tonto = await probe(0);
  const listo = await probe(6);
  expect(listo.chance).toBeLessThan(tonto.chance * 0.3);

  // Con Inteligencia 6, la mochila da pistas de fabricación y el riesgo de la carne cruda.
  await calm(page);
  await page.evaluate(() => {
    const g = window.__isla.game;
    g.inventory.add('fibra', 2);
    g.inventory.add('carne', 1);
  });
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'tests/output/mochila-pistas.png' });
  await page.keyboard.press('KeyI');

  // Comer carne cruda con mala suerte intoxica; la hierba medicinal lo cura.
  await page.evaluate(() => {
    const g = window.__isla.game;
    g.rng = () => 0;
    g.inventory.add('hierba', 1);
  });
  await page.evaluate(() => window.__isla.freeze(true));
  expect(await page.evaluate(() => window.__isla.use('carne'))).toBe(true);
  await step(page, 1 / 60);
  expect((await player(page)).sick).toBeGreaterThan(0);
  await page.evaluate(() => { window.__isla.game.invOpen = false; });
  await page.keyboard.press('KeyH');
  await step(page, 1 / 60);
  expect((await player(page)).sick).toBe(0);

  // Pantalla de personaje.
  await page.keyboard.press('KeyP');
  await step(page, 1 / 60);
  expect(await page.evaluate(() => window.__isla.game.charOpen)).toBe(true);
  await page.evaluate(() => window.__isla.game.render());
  await page.screenshot({ path: 'tests/output/personaje.png' });
  await page.keyboard.press('KeyP');
  await step(page, 1 / 60);
  expect(await page.evaluate(() => window.__isla.game.charOpen)).toBe(false);
  expect(errors).toEqual([]);
});

test('capturas del flujo de inicio: título, intro y aterrizaje', async ({ page }) => {
  const errors = await openGame(page);
  await page.mouse.move(640, 600);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/output/titulo.png' });
  await page.evaluate(() => window.__isla.goto('intro'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/output/intro.png' });
  await page.evaluate(() => { window.__isla.goto('landing'); window.__isla.placePlane(60, 120, -0.6); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tests/output/aterrizaje.png' });
  expect(errors).toEqual([]);
});
