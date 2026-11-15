// Pruebas de la sesión 6, «nitidez y definición del protagonista» (TRASPASO §4d):
// a 1920 × 1080 y a 1280 × 720 el canvas tiene la resolución real de la pantalla,
// el mundo usa una escala entera, el protagonista se dibuja 1:1 con el atlas a
// resolución completa (sin bloques gordos ni borrosidad), la vista previa de la
// creación usa una escala entera sin cortar la cabeza y el recoloreado no deja
// manchas sueltas. Guarda las capturas en tests/output/nitidez/.

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL = pathToFileURL(resolve('dist/isla.html')).href;
const OUT = 'tests/output/nitidez';

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

const COMBOS = {
  a: { pelo: 0, piel: 0, camiseta: 0, pantalon: 0 },
  b: { pelo: 1, piel: 4, camiseta: 3, pantalon: 2 },
};

for (const [w, h, K] of [[1920, 1080, 3], [1280, 720, 2]]) {
  test.describe(`${w} × ${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    test(`creación: vista previa nítida a escala entera (${w})`, async ({ page }) => {
      const errors = await openGame(page);
      const d = await page.evaluate(() => window.__isla.display());
      expect(d.canvasW).toBe(w);
      expect(d.canvasH).toBe(h);
      expect(d.K).toBe(K);
      await page.evaluate(() => window.__isla.goto('create'));
      for (const [name, colors] of Object.entries(COMBOS)) {
        await page.evaluate((c) => { const cr = window.__isla.game.screens.create; Object.assign(cr.colors, c); cr.t = 0.2; }, colors);
        await page.evaluate(() => { window.__isla.freeze(true); window.__isla.game.render(); });
        const r = await page.evaluate(() => window.__isla.game.screens.create.previewRect);
        // Escala entera de píxeles reales: ×1 a 720p, ×2 a 1080p.
        expect(r.scale).toBe(w >= 1920 ? 2 : 1);
        // La cabeza no se corta: margen por encima dentro del recuadro de la vista previa (y = 142).
        expect(r.y).toBeGreaterThan(142 + 10);
        await page.screenshot({ path: `${OUT}/creacion-${name}-${w}.png` });
      }
      expect(errors).toEqual([]);
    });

    for (const [ground, tx, ty] of [['arena', 14, 133], ['hierba', 48, 137]]) {
      test(`juego: el protagonista se dibuja 1:1, sin bloques, sobre ${ground} (${w})`, async ({ page }) => {
        const errors = await openGame(page);
        await page.evaluate(([x, y]) => {
          window.__isla.start({ colors: { pelo: 1, piel: 2, camiseta: 3, pantalon: 1 } });
          window.__isla.freeze(true);
          const g = window.__isla.game;
          g.helpT = 0; g.clock.hours = 12; g.weather.set(false); g.weather.timer = 9999;
          window.__isla.teleport(x, y);
          window.__isla.step(1 / 60, 20);
        }, [tx, ty]);
        const c = await page.evaluate(() => window.__isla.playerSpriteCheck());
        expect(c.K).toBe(K);
        // Alto real del sprite: el del atlas (≈ 145 px) × K / 3, más el contorno.
        expect(c.spriteH).toBeGreaterThanOrEqual(Math.round((c.frameH * K) / 3));
        expect(c.spriteH).toBeLessThanOrEqual(Math.round((c.frameH * K) / 3) + 6);
        // Lo que hay en pantalla es el sprite preparado, copiado 1:1.
        expect(c.drawn1to1).toBeGreaterThan(0.97);
        // Sin bloques gordos: el pixel art ampliado ×K tendría ≥ 0,5 de píxeles repetidos.
        expect(c.blockiness).toBeLessThan(0.3);
        expect(c.opaque).toBeGreaterThan(1500);
        await page.evaluate(() => window.__isla.game.render());
        await page.screenshot({ path: `${OUT}/juego-${ground}-${w}.png` });
        expect(errors).toEqual([]);
      });
    }
  });
}

test('recoloreado: máscara limpia, sin píxeles sueltos de otro color', async ({ page }) => {
  const errors = await openGame(page);
  const s = await page.evaluate(() => window.__isla.speckle());
  expect(s.total).toBeGreaterThan(50_000);
  expect(s.ratio).toBeLessThan(0.002);
  // Cada combinación de colores tiene su color en su parte (andando de frente).
  await page.evaluate(() => window.__isla.goto('create'));
  await page.evaluate(() => Object.assign(window.__isla.game.screens.create.colors, { camiseta: 3, piel: 4, pantalon: 3, pelo: 1 }));
  const col = await page.evaluate(() => ({
    shirt: window.__isla.partColor('camiseta'), hair: window.__isla.partColor('pelo'), pants: window.__isla.partColor('pantalon'),
  }));
  expect(col.shirt[2]).toBeGreaterThan(col.shirt[0] + 40);
  expect(col.hair[0]).toBeGreaterThan(col.hair[1] + 60);
  expect(Math.max(...col.pants)).toBeLessThan(90);
  expect(errors).toEqual([]);
});

test.describe('rendimiento a 1920 × 1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test('corriendo por la isla con el canvas a resolución real', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__isla.start(); window.__isla.teleport(96, 128); window.__isla.freeze(true); });
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyD');
    const times = await page.evaluate(() => {
      const g = window.__isla.game;
      const out = [];
      for (let i = 0; i < 180; i++) {
        const t0 = performance.now();
        g.update(1 / 60);
        g.render();
        g.ctx.getImageData(0, 0, 1, 1); // rasteriza el fotograma ya
        out.push(performance.now() - t0);
      }
      return out;
    });
    await page.keyboard.up('KeyD');
    await page.keyboard.up('ShiftLeft');
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`1080p · fotograma medio ${avg.toFixed(1)} ms · mediana ${times[90].toFixed(1)} ms (Chrome sin GPU)`);
    // Esta máquina de pruebas dibuja sin GPU; con aceleración por GPU sobra margen.
    // El umbral solo vigila que no empeore.
    expect(avg).toBeLessThan(30);
    expect(errors).toEqual([]);
  });
});
