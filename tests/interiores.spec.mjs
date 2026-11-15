// Pruebas de la sesión 6 (TRASPASO §4d, «Interiores y subsuelo»): se entra y se
// sale de la cueva, el búnker y las cabañas andando o con E y con un fundido; la
// cueva conecta la terraza 1 con la terraza 3 del monte; la tarjeta del esqueleto
// abre el búnker; dentro están la radio rota, la batería, los cables, los bidones
// y las notas; el cofre del jefe está dentro de su choza. Guarda capturas.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;
const OUT = 'tests/output/interiores';

async function openGame(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__isla && window.__isla.ready, null, { timeout: 20_000 });
  await page.evaluate(() => {
    window.__isla.start();
    window.__isla.freeze(true);
    const g = window.__isla.game;
    g.helpT = 0; g.clock.hours = 12; g.weather.set(false); g.weather.timer = 9999;
    // Que la tribu no moleste mientras se prueban las puertas del poblado.
    for (const e of g.enemies) e.dead = true;
  });
  return errors;
}

const step = (page, seconds, dt = 1 / 60) =>
  page.evaluate(([d, n]) => window.__isla.step(d, n), [dt, Math.round(seconds / dt)]);
const level = (page) => page.evaluate(() => window.__isla.level());
const player = (page) => page.evaluate(() => window.__isla.player());
const door = (page, to, entry = 'a') => page.evaluate(([t, e]) => window.__isla.doors().find((d) => d.to === t && d.entry === e), [to, entry]);

async function hold(page, key, seconds) {
  await page.keyboard.down(key);
  await step(page, seconds);
  await page.keyboard.up(key);
}

/** Se planta delante de una puerta de la isla y anda hacia ella. */
async function walkIn(page, to, entry = 'a') {
  const d = await door(page, to, entry);
  await page.evaluate((o) => window.__isla.placePx(o.x, o.y, o.level), d.out);
  await hold(page, 'KeyW', 1.2);
  await step(page, 0.6); // termina el fundido
}

/** Anda hacia abajo hasta salir por la salida `entry` del interior activo. */
async function walkOut(page, entry = 'a') {
  const ex = (await page.evaluate(() => window.__isla.exits())).find((e) => e.entry === entry);
  await page.evaluate((r) => window.__isla.placePx(r.x + r.w / 2, r.y - 26, 0), ex.rect);
  await hold(page, 'KeyS', 1.2);
  await step(page, 0.6);
}

async function shot(page, name, bright = false) {
  await page.evaluate((b) => {
    const g = window.__isla.game;
    if (b) g.level.ambient = [255, 255, 255];
    g.banner.age = 99;
    g.render();
  }, bright);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('la cueva conecta la terraza 1 con la terraza 3 del monte, en los dos sentidos', async ({ page }) => {
  const errors = await openGame(page);
  const a = await door(page, 'cueva', 'a');
  const b = await door(page, 'cueva', 'b');
  expect(a.level).toBe(1);
  expect(b.level).toBe(3);
  await shot(page, 'boca-terraza-1');

  // Entra por la boca A andando hacia la pared: fundido y dentro de la cueva.
  await page.evaluate((o) => window.__isla.placePx(o.x, o.y, o.level), a.out);
  await page.keyboard.down('KeyW');
  await step(page, 0.4);
  // A mitad de camino: fundido en marcha.
  expect(await page.evaluate(() => window.__isla.transition())).not.toBeNull();
  await page.keyboard.up('KeyW');
  await step(page, 0.6);
  expect(await page.evaluate(() => window.__isla.transition())).toBeNull();
  let L = await level(page);
  expect(L.id).toBe('cueva');
  expect(L.indoor).toBe(true);
  expect((await player(page)).state).toBe('walk');

  // Sale por la boca B: en la terraza 3, sin haber escalado.
  await walkOut(page, 'b');
  L = await level(page);
  expect(L.id).toBe('isla');
  let p = await player(page);
  expect(p.level).toBe(3);
  expect(Math.abs(p.x - b.out.x)).toBeLessThan(40);
  expect(p.y - b.out.y).toBeLessThan(90);
  expect(L.zone === 'monte' || L.zone === 'cumbre').toBe(true);
  await shot(page, 'boca-terraza-3');

  // Y de vuelta: entra por B y sale por A, en la terraza 1.
  await walkIn(page, 'cueva', 'b');
  expect((await level(page)).id).toBe('cueva');
  await walkOut(page, 'a');
  p = await player(page);
  expect((await level(page)).id).toBe('isla');
  expect(p.level).toBe(1);
  expect(errors).toEqual([]);
});

test('cueva a oscuras: sin antorcha casi no se ve; con antorcha sí. Esqueleto, nota, tarjeta y bidón', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__isla.changeLevel({ to: 'cueva', entry: 'a' }));
  // Brillo medio de la pantalla alrededor del jugador, sin y con antorcha.
  const brightness = () => page.evaluate(() => {
    const g = window.__isla.game;
    g.render();
    const c = g.ctx.canvas;
    const d = g.ctx.getImageData(c.width / 2 - 200, c.height / 2 - 150, 400, 300).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
    return s / (d.length / 4) / 3;
  });
  await page.evaluate(() => window.__isla.placePx(16 * 32, 15 * 32, 0));
  await step(page, 0.2);
  const dark = await brightness();
  await page.evaluate(() => { window.__isla.give('antorcha'); window.__isla.game.player.torchOn = true; });
  const lit = await brightness();
  expect(dark).toBeLessThan(25);
  expect(lit).toBeGreaterThan(dark * 2);
  await shot(page, 'cueva-antorcha');

  // Esqueleto: se registra con E y da la tarjeta de acceso.
  await page.evaluate(() => window.__isla.placePx(25.2 * 32, 24.4 * 32, 0));
  await step(page, 0.1);
  expect((await page.evaluate(() => window.__isla.interaction())).label).toContain('esqueleto');
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  let inv = await page.evaluate(() => window.__isla.inventory().map((s) => s.id));
  expect(inv).toContain('tarjeta');
  // Nota: se lee (panel abierto, el mundo parado) y se cierra con E.
  await page.evaluate(() => window.__isla.placePx(23.4 * 32, 25.2 * 32, 0));
  await step(page, 0.1);
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  expect((await page.evaluate(() => window.__isla.note())).id).toBe('soldado');
  await shot(page, 'nota');
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  expect(await page.evaluate(() => window.__isla.note())).toBeNull();
  // Bidón.
  await page.evaluate(() => window.__isla.placePx(27.4 * 32, 23.2 * 32, 0));
  await step(page, 0.1);
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  inv = await page.evaluate(() => window.__isla.inventory().map((s) => s.id));
  expect(inv).toContain('bidon');
  await shot(page, 'cueva-esqueleto', true);
  await page.evaluate(() => window.__isla.placePx(12.5 * 32, 8 * 32, 0));
  await shot(page, 'cueva-guarida', true);
  expect(errors).toEqual([]);
});

test('el búnker está cerrado sin tarjeta y la tarjeta lo abre; dentro, radio, batería, cables, bidón y notas', async ({ page }) => {
  const errors = await openGame(page);
  const d = await door(page, 'bunker');
  expect(d.needs).toBe('tarjeta');
  await page.evaluate((o) => window.__isla.placePx(o.x, o.y - 6, o.level), d.out);
  await step(page, 0.1);
  expect((await page.evaluate(() => window.__isla.interaction())).label).toContain('búnker');
  await page.keyboard.press('KeyE');
  await step(page, 0.8);
  expect((await level(page)).id).toBe('isla');
  expect((await player(page)).message).toContain('tarjeta');
  await shot(page, 'bunker-cerrado');

  await page.evaluate(() => window.__isla.give('tarjeta'));
  await page.keyboard.press('KeyE');
  await step(page, 0.8);
  expect((await level(page)).id).toBe('bunker');
  await shot(page, 'bunker-vestibulo');

  // Recoge lo importante de cada sala con E.
  const loot = async (x, y) => {
    await page.evaluate(([a, b]) => window.__isla.placePx(a * 32, b * 32, 0), [x, y]);
    await step(page, 0.1);
    await page.keyboard.press('KeyE');
    await step(page, 0.1);
  };
  await loot(5.5, 5.4);    // mesa de la radio
  await loot(23, 4.4);     // estantería del almacén (cables)
  await loot(28, 9.4);     // bidón
  await loot(27.5, 14.4);  // estantería de repuestos (batería)
  const inv = await page.evaluate(() => window.__isla.inventory().map((s) => s.id));
  for (const id of ['radio_rota', 'cables', 'bidon', 'bateria']) expect(inv).toContain(id);
  await loot(4, 7.8);      // registro de radio
  expect((await page.evaluate(() => window.__isla.note())).id).toBe('radio');
  await page.keyboard.press('Escape');
  await step(page, 0.1);
  expect(await page.evaluate(() => window.__isla.note())).toBeNull();
  await page.evaluate(() => window.__isla.placePx(6 * 32, 6 * 32, 0));
  await shot(page, 'bunker-radio', true);

  // Sale por la escalera: delante de la puerta del búnker.
  await walkOut(page, 'a');
  expect((await level(page)).id).toBe('isla');
  const p = await player(page);
  // Delante de la puerta (puede haber dado unos pasos más hacia abajo con la tecla pulsada).
  expect(Math.abs(p.x - d.out.x)).toBeLessThan(24);
  expect(p.y - d.out.y).toBeGreaterThan(-10);
  expect(p.y - d.out.y).toBeLessThan(90);
  expect(errors).toEqual([]);
});

test('se entra y se sale de las cabañas del poblado; el cofre del jefe (con el bidón) está en su choza', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => { const o = window.__isla.doors().find((d) => d.to === 'choza').out; window.__isla.placePx(o.x, o.y + 40, 0); });
  await shot(page, 'poblado');
  for (const id of ['cabana1', 'cabana4']) {
    await walkIn(page, id);
    const L = await level(page);
    expect(L.id).toBe(id);
    expect(L.zone).toBe('cabana');
    await walkOut(page);
    expect((await level(page)).id).toBe('isla');
  }
  // Ya no hay cofre del jefe fuera.
  const outside = await page.evaluate(() => window.__isla.game.world.props.filter((p) => p.interact && /jefe/.test(p.interact.nombre) && !p.door).length);
  expect(outside).toBe(0);
  await walkIn(page, 'choza');
  expect((await level(page)).id).toBe('choza');
  await shot(page, 'choza');
  await page.evaluate(() => window.__isla.placePx(14.6 * 32, 4 * 32, 0));
  await step(page, 0.1);
  expect((await page.evaluate(() => window.__isla.interaction())).label).toContain('cofre del jefe');
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  expect(await page.evaluate(() => window.__isla.inventory().map((s) => s.id))).toContain('bidon');
  await walkOut(page);
  expect((await level(page)).id).toBe('isla');
  // El estado de los interiores se conserva: el cofre sigue abierto al volver.
  await walkIn(page, 'choza');
  const opened = await page.evaluate(() => window.__isla.game.world.props.find((p) => p.kind === 'cofre').opened);
  expect(opened).toBe(true);
  expect(errors).toEqual([]);
});

test('morir dentro de un interior te devuelve a la playa de la isla; el mapa M sigue mostrando la isla', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__isla.changeLevel({ to: 'bunker', entry: 'a' }));
  await page.keyboard.press('KeyM');
  await step(page, 0.1);
  await page.evaluate(() => window.__isla.game.render());
  await page.screenshot({ path: `${OUT}/mapa-desde-bunker.png` });
  await page.keyboard.press('KeyM');
  await step(page, 0.1);
  await page.evaluate(() => { window.__isla.game.player.hp = 0; window.__isla.game.player.dead = true; });
  await step(page, 3.6);
  expect((await level(page)).id).toBe('isla');
  expect((await player(page)).hp).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
