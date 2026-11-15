// Pruebas de humo de la Fase 0/1: el HTML compilado carga desde file://, no hay
// errores de consola y el personaje anda, corre, salta, se agacha, baja de
// plataformas, nada y no atraviesa el suelo a velocidad máxima de caída.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;
const TILE = 20;
const GROUND_Y = 36 * TILE; // fila del suelo del mundo de prueba

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

test('carga desde file:// sin errores y muestra el mundo', async ({ page }) => {
  const errors = await openGame(page);
  await page.waitForTimeout(500);
  const p = await player(page);
  expect(p.onGround).toBe(true);
  expect(p.feetY).toBe(GROUND_Y);
  // El canvas no está en negro: se ha dibujado algo.
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

test('teclado real: anda, salta y gira (con captura)', async ({ page }) => {
  const errors = await openGame(page);
  const start = await player(page);

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(600);
  let p = await player(page);
  expect(p.x).toBeGreaterThan(start.x + 30);
  expect(p.facing).toBe(1);
  expect(p.anim).toBe('walk');

  await page.keyboard.down('Space');
  await page.waitForTimeout(150);
  p = await player(page);
  expect(p.onGround).toBe(false);
  expect(p.feetY).toBeLessThan(GROUND_Y);
  expect(p.anim).toBe('jump');
  await page.screenshot({ path: 'tests/output/salto.png' });
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');

  await page.waitForTimeout(800);
  p = await player(page);
  expect(p.onGround).toBe(true);

  await page.keyboard.down('KeyA');
  await page.waitForTimeout(300);
  p = await player(page);
  expect(p.facing).toBe(-1);
  await page.keyboard.up('KeyA');

  await page.keyboard.press('F3'); // panel de depuración en la captura
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'tests/output/captura.png' });
  expect(errors).toEqual([]);
});

test('correr es más rápido que andar y salta el hueco', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);

  await page.keyboard.down('KeyD');
  await step(page, 0.6);
  const walk = await player(page);
  await page.keyboard.down('Shift');
  await step(page, 0.6);
  const run = await player(page);
  expect(Math.abs(run.vx)).toBeGreaterThan(Math.abs(walk.vx) * 1.5);
  expect(run.anim).toBe('run');
  await page.keyboard.up('Shift');
  await page.keyboard.up('KeyD');

  // Hueco de 5 tiles (x 62–66): corriendo y saltando desde el borde se cruza.
  await page.evaluate(() => window.__isla.teleport(52, 36));
  await page.keyboard.down('Shift');
  await page.keyboard.down('KeyD');
  for (let i = 0; i < 120; i++) {
    await step(page, 1 / 60);
    const p = await player(page);
    if (p.x + p.w >= 62 * TILE - 2) break;
  }
  await page.keyboard.down('Space'); // mantenido: salto completo
  await step(page, 1.0);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');
  await page.keyboard.up('Shift');
  await step(page, 0.3);
  const after = await player(page);
  expect(after.feetY).toBe(GROUND_Y);
  expect(after.x).toBeGreaterThan(67 * TILE - 8);
  expect(errors).toEqual([]);
});

test('agacharse reduce la caja y permite cruzar el túnel', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await page.evaluate(() => window.__isla.teleport(97, 36));

  // De pie no se entra en el túnel (techo en la fila 33).
  await page.keyboard.down('KeyD');
  await step(page, 1.0);
  let p = await player(page);
  expect(p.x + p.w).toBeLessThanOrEqual(100 * TILE + 0.01);

  // Agachado, sí.
  await page.keyboard.down('KeyS');
  await step(page, 0.1);
  p = await player(page);
  expect(p.crouching).toBe(true);
  expect(p.h).toBe(28);
  expect(p.anim).toBe('crouch');
  await step(page, 2.0);
  p = await player(page);
  expect(p.x).toBeGreaterThan(102 * TILE);

  // Dentro del túnel no se puede poner de pie aunque se suelte S.
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  await step(page, 0.2);
  p = await player(page);
  expect(p.crouching).toBe(true);
  expect(p.feetY).toBe(GROUND_Y);
  expect(errors).toEqual([]);
});

test('plataformas de un sentido: se suben desde abajo y se baja con S + Espacio', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  // Debajo de la plataforma de la fila 33 (x 30–34): saltar la atraviesa y aterriza encima.
  await page.evaluate(() => window.__isla.teleport(32, 36));
  await page.keyboard.down('Space');
  await step(page, 0.5);
  await page.keyboard.up('Space');
  await step(page, 0.5);
  let p = await player(page);
  expect(p.onGround).toBe(true);
  expect(p.groundType).toBe('platform');
  expect(p.feetY).toBe(33 * TILE);

  await page.keyboard.down('KeyS');
  await page.keyboard.press('Space');
  await step(page, 0.6);
  await page.keyboard.up('KeyS');
  await step(page, 0.2);
  p = await player(page);
  expect(p.feetY).toBe(GROUND_Y);
  expect(p.groundType).toBe('solid');
  expect(errors).toEqual([]);
});

test('no atraviesa tiles a velocidad máxima de caída, ni con dt grande', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
    // Desde lo alto del mundo (fila 1) hasta el suelo: más de 600 px de caída.
    await page.evaluate(() => window.__isla.teleport(140, 1));
    let maxVy = 0;
    for (let i = 0; i < 40; i++) {
      await step(page, 0.05, dt);
      const p = await player(page);
      maxVy = Math.max(maxVy, p.vy);
    }
    const p = await player(page);
    expect(maxVy).toBe(900); // llega a la velocidad terminal
    expect(p.onGround).toBe(true);
    expect(p.feetY).toBe(GROUND_Y);
  }
  // Una caída contra una plataforma de un sentido tampoco la atraviesa.
  await page.evaluate(() => window.__isla.teleport(130, 1));
  await step(page, 2, 1 / 30);
  const p = await player(page);
  expect(p.feetY).toBe(12 * TILE); // cornisa alta de la torre
  expect(errors).toEqual([]);
});

test('agua: se flota, se bucea con S y se sale saltando', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await page.evaluate(() => window.__isla.teleport(83, 41));
  await step(page, 0.2);
  let p = await player(page);
  expect(p.swimming).toBe(true);
  await step(page, 3);
  p = await player(page);
  // Flota con la cabeza fuera, cerca de la superficie (fila 36).
  expect(p.y).toBeLessThan(GROUND_Y);
  expect(p.feetY).toBeGreaterThan(GROUND_Y);

  await page.keyboard.down('KeyS');
  await step(page, 1);
  await page.keyboard.up('KeyS');
  const dived = await player(page);
  expect(dived.y).toBeGreaterThan(GROUND_Y + 10);

  // Vuelve a flotar y sale por el borde derecho (x 92) saltando.
  await step(page, 3);
  await page.evaluate(() => window.__isla.teleport(90, 38));
  await step(page, 2);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Space');
  await step(page, 1.2);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');
  p = await player(page);
  expect(p.swimming).toBe(false);
  expect(p.onGround).toBe(true);
  expect(p.feetY).toBe(GROUND_Y);
  expect(errors).toEqual([]);
});

test('la cámara sigue sin tirones al correr y al girar', async ({ page }) => {
  const errors = await openGame(page);
  await freeze(page);
  await page.evaluate(() => window.__isla.teleport(120, 36));
  const camX = () => page.evaluate(() => window.__isla.game.camera.x);
  const xs = [];
  await page.keyboard.down('Shift');
  await page.keyboard.down('KeyD');
  for (let i = 0; i < 90; i++) {
    await step(page, 1 / 60);
    xs.push(await camX());
  }
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyA'); // giro brusco
  for (let i = 0; i < 90; i++) {
    await step(page, 1 / 60);
    xs.push(await camX());
  }
  await page.keyboard.up('KeyA');
  await page.keyboard.up('Shift');
  const deltas = xs.slice(1).map((x, i) => x - xs[i]);
  const jerks = deltas.slice(1).map((d, i) => Math.abs(d - deltas[i]));
  // Nunca se mueve más rápido que el jugador corriendo con margen, ni cambia de golpe.
  expect(Math.max(...deltas.map(Math.abs))).toBeLessThan(230 / 60 * 2);
  expect(Math.max(...jerks)).toBeLessThan(1);
  expect(errors).toEqual([]);
});
