// Pruebas de humo de la Fase 1b (vista cenital): el HTML compilado carga desde
// file:// sin errores de consola y el personaje se mueve en todas las direcciones,
// choca con muros, se ordena con los árboles, salta grietas, baja salientes,
// escala paredes y entra en el agua.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;
const TILE = 32;
const WALK = 110;
const BOX_W = 18;

/** Abre el juego y recoge los errores de consola y de página. */
async function openGame(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__isla && window.__isla.ready, null, { timeout: 10_000 });
  return errors;
}

const player = (page) => page.evaluate(() => window.__isla.player());

/** Simulación determinista: congela el bucle y avanza fotogramas a mano. */
async function freeze(page) {
  await page.evaluate(() => window.__isla.freeze(true));
}
const step = (page, seconds, dt = 1 / 60) =>
  page.evaluate(([d, n]) => window.__isla.step(d, n), [dt, Math.round(seconds / dt)]);
const teleport = (page, tx, ty) => page.evaluate(([x, y]) => window.__isla.teleport(x, y), [tx, ty]);

/** Mantiene pulsadas unas teclas durante `seconds` de simulación. */
async function hold(page, keys, seconds) {
  for (const k of keys) await page.keyboard.down(k);
  await step(page, seconds);
  for (const k of keys) await page.keyboard.up(k);
}

test('carga desde file:// sin errores y muestra el mapa', async ({ page }) => {
  const errors = await openGame(page);
  await page.waitForTimeout(400);
  const p = await player(page);
  expect(p.state).toBe('walk');
  expect([p.tx, p.ty]).toEqual([14, 18]); // casilla S del mapa de prueba
  const painted = await page.evaluate(() => {
    const c = document.getElementById('juego');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) colored++;
    return colored;
  });
  expect(painted).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

test('teclado real: se mueve en las 4 direcciones con su animación (con captura)', async ({ page }) => {
  const errors = await openGame(page);
  const cases = [
    ['KeyD', 'walk', 'right', 1, 0],
    ['KeyS', 'walk_down', 'down', 0, 1],
    ['KeyA', 'walk_left', 'left', -1, 0],
    ['KeyW', 'walk_up', 'up', 0, -1],
  ];
  for (const [key, anim, facing, sx, sy] of cases) {
    const before = await player(page);
    await page.keyboard.down(key);
    await page.waitForTimeout(400);
    const p = await player(page);
    await page.keyboard.up(key);
    expect(p.anim).toBe(anim);
    expect(p.facing).toBe(facing);
    if (sx) expect(Math.sign(p.x - before.x)).toBe(sx);
    if (sy) expect(Math.sign(p.y - before.y)).toBe(sy);
    await page.waitForTimeout(200);
  }
  const idle = await player(page);
  expect(idle.anim).toBe('walk_up');
  expect(idle.frame).toBe(0); // reposo = primer fotograma de la dirección

  await page.keyboard.press('F3');
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/output/captura.png' });
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  expect(errors).toEqual([]);
});

test('diagonales: velocidad normalizada y animación de la dirección más cercana', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  const a = await player(page);
  await hold(page, ['KeyD', 'KeyS'], 1);
  const b = await player(page);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  expect(b.x - a.x).toBeGreaterThan(30);
  expect(b.y - a.y).toBeGreaterThan(30);
  expect(Math.abs(b.x - a.x - (b.y - a.y))).toBeLessThan(1);
  expect(dist).toBeLessThan(WALK * 1.02); // no va más rápido en diagonal
  expect(['walk', 'walk_down']).toContain(b.anim);

  // Si ya mira hacia arriba, la diagonal arriba-izquierda mantiene "arriba".
  await hold(page, ['KeyW'], 0.1);
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyA');
  await step(page, 0.5);
  let p = await player(page);
  expect(p.facing).toBe('up');
  expect(p.anim).toBe('walk_up');
  await page.keyboard.up('KeyW');
  await step(page, 0.3);
  p = await player(page);
  expect(p.facing).toBe('left');
  expect(p.anim).toBe('walk_left');
  await page.keyboard.up('KeyA');
  expect(errors).toEqual([]);
});

test('correr es más rápido y usa las animaciones de carrera', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  for (const [key, anim] of [['KeyS', 'run_down'], ['KeyW', 'run_up'], ['KeyA', 'run_left'], ['KeyD', 'run']]) {
    await page.keyboard.down('Shift');
    await page.keyboard.down(key);
    await step(page, 0.4);
    const p = await player(page);
    expect(p.anim).toBe(anim);
    expect(Math.hypot(p.vx, p.vy)).toBeGreaterThan(WALK * 1.5);
    await page.keyboard.up(key);
    await page.keyboard.up('Shift');
    await step(page, 0.3);
  }
  expect(errors).toEqual([]);
});

test('choca con el muro, se desliza por él y no se engancha en la esquina', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  // Muro de roca en la columna 23, filas 16–22.
  await teleport(page, 20, 19);
  await hold(page, ['KeyD'], 1.5);
  let p = await player(page);
  expect(p.x).toBeCloseTo(23 * TILE - BOX_W / 2, 3);

  // Empujando en diagonal contra el muro, se desliza hacia abajo.
  const y0 = p.y;
  await hold(page, ['KeyD', 'KeyS'], 0.5);
  p = await player(page);
  expect(p.y).toBeGreaterThan(y0 + 20);
  expect(p.x).toBeCloseTo(23 * TILE - BOX_W / 2, 3);

  // Rozando la esquina superior del muro por 3 px: la corrección de esquinas lo deja pasar.
  await teleport(page, 21, 15);
  await page.evaluate((y) => { window.__isla.game.player.y = y; }, 16 * TILE + 3);
  await hold(page, ['KeyD'], 1.2);
  p = await player(page);
  expect(p.x).toBeGreaterThan(24 * TILE + BOX_W);
  expect(errors).toEqual([]);
});

test('profundidad: el jugador pasa por detrás y por delante de un árbol', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  const tree = 'árbol@20,14';
  const order = async () => {
    const list = await page.evaluate(() => window.__isla.drawOrder());
    return list.indexOf('jugador') - list.indexOf(tree);
  };
  // Detrás: los pies por encima (más al norte) de la base del tronco.
  await teleport(page, 20, 13);
  await hold(page, ['KeyS'], 0.3);
  let p = await player(page);
  expect(p.ty).toBe(14); // ya se solapa con la copa, pero el tronco lo frena
  expect(await order()).toBeLessThan(0);
  // Delante: rodea el árbol y se coloca al sur del tronco.
  await teleport(page, 20, 15);
  p = await player(page);
  expect(await order()).toBeGreaterThan(0);
  // El tronco es sólido: subiendo desde el sur se detiene.
  await hold(page, ['KeyW'], 1);
  p = await player(page);
  expect(p.y).toBeGreaterThan(14 * TILE + 29);
  expect(errors).toEqual([]);
});

test('salta grietas: la estrecha andando, la ancha solo corriendo', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  // Andando no se puede entrar en la grieta: se queda en el borde.
  await teleport(page, 8, 30);
  await hold(page, ['KeyD'], 1);
  let p = await player(page);
  expect(p.x).toBeCloseTo(10 * TILE - BOX_W / 2, 3);
  // Salto andando sobre la grieta de 1 tile (columna 10).
  await page.keyboard.down('KeyD');
  await page.keyboard.press('Space');
  await step(page, 0.2);
  p = await player(page);
  expect(p.state).toBe('jump');
  expect(p.z).toBeGreaterThan(5);
  expect(p.anim).toBe('jump');
  await step(page, 0.6);
  await page.keyboard.up('KeyD');
  p = await player(page);
  expect(p.state).toBe('walk');
  expect(p.x).toBeGreaterThan(11 * TILE);

  // Grieta de 2 tiles (columnas 15–16): andando no llega, cae y vuelve al borde.
  await teleport(page, 13, 30);
  await hold(page, ['KeyD'], 1);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('Space');
  await step(page, 0.7);
  p = await player(page);
  expect(p.state).toBe('fall');
  await step(page, 0.8);
  await page.keyboard.up('KeyD');
  p = await player(page);
  expect(p.state).toBe('walk');
  expect(p.message).toContain('grieta');
  expect(p.x).toBeLessThan(15 * TILE);

  // Corriendo, sí.
  await page.keyboard.down('Shift');
  await page.keyboard.down('KeyD');
  await step(page, 0.3);
  await page.keyboard.press('Space');
  await step(page, 0.8);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('Shift');
  p = await player(page);
  expect(p.state).toBe('walk');
  expect(p.x).toBeGreaterThan(17 * TILE);
  expect(errors).toEqual([]);
});

test('saliente: se salta hacia abajo, pero no se sube por él', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await teleport(page, 43, 19);
  let p = await player(page);
  expect(p.level).toBe(1);
  await page.keyboard.down('KeyS');
  await step(page, 0.55);
  p = await player(page);
  expect(p.state).toBe('hop');
  await step(page, 0.5);
  await page.keyboard.up('KeyS');
  p = await player(page);
  expect(p.state).toBe('walk');
  expect(p.level).toBe(0);
  expect(p.ty).toBeGreaterThanOrEqual(22);
  // Desde abajo, el saliente es una pared.
  await hold(page, ['KeyW'], 1);
  p = await player(page);
  expect(p.level).toBe(0);
  expect(p.y).toBeGreaterThanOrEqual(22 * TILE + 10);
  expect(errors).toEqual([]);
});

test('escala una pared con aguante, baja escalando y se cae si se agota', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  // Pared de 3 tiles (filas 18–20) bajo la meseta de nivel 1.
  await teleport(page, 34, 23);
  await page.keyboard.down('KeyW');
  await step(page, 1.2);
  let p = await player(page);
  expect(p.state).toBe('climb');
  expect(p.anim).toBe('up');
  await step(page, 1.2);
  await page.keyboard.up('KeyW');
  p = await player(page);
  expect(p.state).toBe('walk');
  expect(p.level).toBe(1);
  expect(p.ty).toBeLessThanOrEqual(17); // ya en la meseta (sigue andando con W)
  expect(p.stamina).toBeLessThan(100);

  // Al borde de la meseta no se puede bajar andando por el lado oeste (borde de altura).
  await teleport(page, 31, 10);
  await hold(page, ['KeyA'], 1);
  p = await player(page);
  expect(p.x).toBeCloseTo(30 * TILE + BOX_W / 2, 3);
  expect(p.level).toBe(1);

  // Bajar escalando.
  await teleport(page, 34, 17);
  await hold(page, ['KeyS'], 2);
  p = await player(page);
  expect(p.level).toBe(0);
  expect(p.ty).toBeGreaterThanOrEqual(21);

  // Sin aguante a media pared: se cae al pie.
  await teleport(page, 34, 21); // al pie de la pared
  await page.evaluate(() => { window.__isla.game.player.agility = 0; });
  await page.keyboard.down('KeyW');
  await step(page, 0.5);
  expect((await player(page)).state).toBe('climb');
  await page.evaluate(() => { window.__isla.game.player.stamina = 3; });
  await step(page, 0.5);
  await page.keyboard.up('KeyW');
  p = await player(page);
  expect(p.level).toBe(0);
  expect(['stunned', 'walk']).toContain(p.state);
  expect(p.message).toContain('aguante');
  expect(errors).toEqual([]);
});

test('agua: la poco profunda ralentiza y en la profunda se nada sin poder saltar', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await teleport(page, 22, 26); // agua poco profunda
  await hold(page, ['KeyD'], 0.6);
  let p = await player(page);
  expect(p.terrain).toBe('shallow');
  expect(Math.abs(p.vx)).toBeLessThan(WALK * 0.6);

  await teleport(page, 27, 30); // agua profunda
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Shift');
  await step(page, 0.5);
  await page.keyboard.press('Space');
  await step(page, 0.1);
  p = await player(page);
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyD');
  expect(p.terrain).toBe('deep');
  expect(p.stateName).toBe('nadando');
  expect(p.state).toBe('walk'); // no salta
  expect(Math.abs(p.vx)).toBeLessThanOrEqual(56);
  expect(errors).toEqual([]);
});

test('la cámara sigue en x e y sin tirones y respeta los límites', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await teleport(page, 30, 30);
  const cam = () => page.evaluate(() => {
    const c = window.__isla.game.camera;
    return { x: c.x, y: c.y, vw: c.viewW, vh: c.viewH };
  });
  const xs = [];
  const ys = [];
  for (const keys of [['KeyD', 'Shift'], ['KeyS', 'KeyA'], ['KeyW']]) {
    for (const k of keys) await page.keyboard.down(k);
    for (let i = 0; i < 60; i++) {
      await step(page, 1 / 60);
      const c = await cam();
      xs.push(c.x);
      ys.push(c.y);
    }
    for (const k of keys) await page.keyboard.up(k);
  }
  for (const s of [xs, ys]) {
    const d = s.slice(1).map((v, i) => v - s[i]);
    const jerk = d.slice(1).map((v, i) => Math.abs(v - d[i]));
    expect(Math.max(...d.map(Math.abs))).toBeLessThan(190 / 60 * 2);
    expect(Math.max(...jerk)).toBeLessThan(1);
  }
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(30);
  expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(30);

  // En una esquina del mapa la cámara no se sale.
  await teleport(page, 3, 3);
  await step(page, 1);
  const c = await cam();
  expect(c.x).toBe(0);
  expect(c.y).toBe(0);
  expect(errors).toEqual([]);
});

test('agacharse (C) va más despacio; la hierba alta se detecta', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await teleport(page, 12, 18);
  await page.keyboard.down('KeyC');
  await page.keyboard.down('KeyA');
  await step(page, 1);
  let p = await player(page);
  expect(p.crouching).toBe(true);
  expect(p.anim).toBe('crouch');
  expect(Math.abs(p.vx)).toBeLessThan(WALK * 0.6);
  await step(page, 1.5);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyC');
  p = await player(page);
  expect(p.terrain).toBe('tallgrass'); // hierba alta en las columnas 5–10
  expect(errors).toEqual([]);
});
