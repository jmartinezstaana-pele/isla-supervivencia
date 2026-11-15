// Pruebas de la sesión 5 (TRASPASO §4d): la isla completa de 200 × 160 tiles con
// sus biomas, el mapa M con niebla de guerra, el mapa del aterrizaje sacado del
// mismo mapa, el terreno por trozos y el rendimiento. Guarda una captura por bioma.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;

async function openGame(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__isla && window.__isla.ready, null, { timeout: 20_000 });
  await page.evaluate(() => {
    window.__isla.start();
    const g = window.__isla.game;
    g.helpT = 0;
    g.clock.hours = 11;
    g.weather.set(false);
    g.weather.timer = 9999;
    g.player.invuln = 9999;
  });
  return errors;
}

const step = (page, seconds, dt = 1 / 60) => page.evaluate(([d, n]) => window.__isla.step(d, n), [dt, Math.round(seconds / dt)]);
const player = (page) => page.evaluate(() => window.__isla.player());

/** Un punto de cada bioma (tiles de la isla). */
const BIOMES = {
  playa: [21, 136], selva: [100, 120], ruinas: [42, 120], campamento: [79, 138], poblado: [32, 73],
  monte: [62, 96], cumbre: [95, 61], militar: [166, 79], acantilados: [168, 24], bahia: [180, 108],
  manglar: [124, 140], costa: [13, 45],
};

test('la isla mide 200 × 160 y tiene todos los biomas en su sitio', async ({ page }) => {
  const errors = await openGame(page);
  const info = await page.evaluate(() => {
    const m = window.__isla.game.map;
    const counts = {};
    for (let i = 0; i < m.zones.length; i++) counts[m.zones[i]] = (counts[m.zones[i]] || 0) + 1;
    const g = {};
    for (let i = 0; i < m.ground.length; i++) g[m.ground[i]] = (g[m.ground[i]] || 0) + 1;
    let maxLevel = 0;
    for (let i = 0; i < m.level.length; i++) maxLevel = Math.max(maxLevel, m.level[i]);
    return { w: m.width, h: m.height, zones: Object.keys(m.zoneCenters), ground: g, maxLevel };
  });
  expect(info.w).toBe(200);
  expect(info.h).toBe(160);
  for (const z of Object.keys(BIOMES)) expect(info.zones).toContain(z);
  // Nieve, roca, barro, agua del manglar, grava, hormigón y pinocha existen.
  for (const g of [14, 15, 16, 17, 18, 19, 20]) expect(info.ground[g] || 0).toBeGreaterThan(5);
  expect(info.maxLevel).toBe(4);
  expect(errors).toEqual([]);
});

test('se recorre la isla de punta a punta: cada bioma tiene su cartel y su captura', async ({ page }) => {
  const errors = await openGame(page);
  for (const [zone, [tx, ty]] of Object.entries(BIOMES)) {
    await page.evaluate(([x, y]) => window.__isla.teleport(x, y), [tx, ty]);
    await page.waitForTimeout(250);
    const z = await page.evaluate(() => ({ zone: window.__isla.zone(), banner: window.__isla.game.banner.zone }));
    expect(z.zone, `zona en ${tx}, ${ty}`).toBe(zone);
    expect(z.banner).toBe(zone);
    await page.evaluate(() => { window.__isla.game.banner.age = 9; });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `tests/output/bioma-${zone}.png` });
  }
  // Andando de verdad (cruzando trozos del terreno) desde la selva hacia el este.
  await page.evaluate(() => window.__isla.teleport(96, 128));
  const x0 = (await player(page)).x;
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('ShiftLeft');
  expect((await player(page)).x - x0).toBeGreaterThan(150);
  const t = await page.evaluate(() => window.__isla.terrainStats());
  expect(t.rendered).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

test('el mapa M empieza con la zona de llegada y se va descubriendo', async ({ page }) => {
  const errors = await openGame(page);
  let d = await page.evaluate(() => window.__isla.discovered());
  expect(d.sort()).toEqual(['mar', 'playa']);
  await page.evaluate(() => window.__isla.freeze(true));
  for (const [x, y] of [BIOMES.selva, BIOMES.poblado, BIOMES.manglar]) {
    await page.evaluate(([a, b]) => window.__isla.teleport(a, b), [x, y]);
    await step(page, 1 / 30);
  }
  d = await page.evaluate(() => window.__isla.discovered());
  for (const z of ['playa', 'selva', 'poblado', 'manglar']) expect(d).toContain(z);
  expect(d).not.toContain('cumbre');
  // El cartel avisa de la zona nueva.
  expect(await page.evaluate(() => window.__isla.game.banner.nueva)).toBe(true);
  await page.keyboard.press('KeyM');
  await step(page, 1 / 60);
  expect(await page.evaluate(() => window.__isla.game.mapOpen)).toBe(true);
  // La niebla tapa lo no descubierto y deja ver lo descubierto.
  const fog = await page.evaluate(() => {
    const g = window.__isla.game;
    g.render();
    const c = g.mapFog;
    const x = c.getContext('2d');
    const at = ([tx, ty]) => x.getImageData(tx * 2, ty * 2, 1, 1).data[3];
    return { cumbre: at([96, 57]), poblado: at([32, 72]), militar: at([168, 76]) };
  });
  expect(fog.cumbre).toBeGreaterThan(200);
  expect(fog.militar).toBeGreaterThan(200);
  expect(fog.poblado).toBe(0);
  await page.screenshot({ path: 'tests/output/mapa-m.png' });
  await page.keyboard.press('KeyM');
  await step(page, 1 / 60);
  expect(await page.evaluate(() => window.__isla.game.mapOpen)).toBe(false);
  expect(errors).toEqual([]);
});

test('el mapa del aterrizaje sale del mismo mapa del juego', async ({ page }) => {
  const errors = await openGame(page);
  const r = await page.evaluate((biomes) => {
    const g = window.__isla.game;
    g.landing.prepare();
    const out = { size: [g.landing.paint.W, g.landing.paint.H], same: [] };
    for (const [tx, ty] of Object.values(biomes)) {
      const l = window.__isla.landingZoneAt(tx + 0.5, ty + 0.5);
      out.same.push([l.zone, g.zoneAt((tx + 0.5) * 32, (ty + 0.5) * 32)]);
    }
    return out;
  }, BIOMES);
  expect(r.size).toEqual([400, 320]);
  for (const [a, b] of r.same) expect(a).toBe(b);
  expect(errors).toEqual([]);
});

test('se escala una pared del monte de una terraza a la siguiente', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__isla.freeze(true));
  const spot = await page.evaluate(() => {
    const m = window.__isla.game.map;
    // Pared de 3 tiles entre las terrazas 1 y 2, con suelo libre debajo.
    for (let ty = 20; ty < 110; ty++) {
      for (let tx = 60; tx < 130; tx++) {
        if (m.groundAt(tx, ty) !== 9 || m.groundAt(tx, ty - 1) === 9) continue;
        if (m.cliffTop[ty * m.width + tx] !== 2 || m.cliffBase[ty * m.width + tx] !== 1) continue;
        if (m.cliffColumnBottom(tx, ty) - ty !== 2) continue;
        const ok = [-1, 0, 1].every((d) => m.groundAt(tx + d, ty) === 9 && m.groundAt(tx + d, ty + 3) !== 9 && m.levelAt(tx + d, ty + 3) === 1 && m.groundAt(tx + d, ty - 1) !== 6 && m.groundAt(tx + d, ty + 3) !== 6);
        if (ok) return [tx, ty + 3];
      }
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await page.evaluate(([x, y]) => {
    const g = window.__isla.game;
    g.player.placeAt((x + 0.5) * 32, y * 32 + 12, 1);
    // Nada sólido alrededor que estorbe.
    for (const pr of g.world.index.query((x - 1) * 32, (y - 4) * 32, (x + 2) * 32, (y + 1) * 32)) if (pr.solid) g.removeProp(pr);
    g.camera.snap(g.player);
  }, spot);
  await page.keyboard.down('KeyW');
  await step(page, 0.5);
  expect((await player(page)).state).toBe('climb');
  await step(page, 2.5);
  await page.keyboard.up('KeyW');
  const p = await player(page);
  expect(p.level).toBe(2);
  expect(errors).toEqual([]);
});

test('rendimiento: corriendo por la isla, actualizar y dibujar cabe en un fotograma de 60 fps', async ({ page }) => {
  const errors = await openGame(page);
  await page.evaluate(() => window.__isla.teleport(96, 128));
  await page.evaluate(() => window.__isla.freeze(true));
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyD');
  const times = await page.evaluate(() => {
    const g = window.__isla.game;
    const out = [];
    for (let i = 0; i < 240; i++) {
      const t0 = performance.now();
      g.update(1 / 60);
      g.render();
      // Leer un píxel obliga a rasterizar el fotograma ya (si no, el navegador
      // acumula el dibujo y el tiempo medido no es el real).
      g.ctx.getImageData(0, 0, 1, 1);
      out.push(performance.now() - t0);
    }
    return out;
  });
  await page.keyboard.up('KeyD');
  await page.keyboard.up('ShiftLeft');
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p90 = times[Math.floor(times.length * 0.9)];
  console.log(`fotograma medio ${avg.toFixed(1)} ms · p90 ${p90.toFixed(1)} ms · máx ${times[times.length - 1].toFixed(1)} ms`);
  expect(avg).toBeLessThan(16.7);
  expect(p90).toBeLessThan(25);
  expect(errors).toEqual([]);
});
