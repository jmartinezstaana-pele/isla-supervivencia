// Capturas de nitidez del protagonista (sesión 6): creación con dos combinaciones
// de colores y juego sobre hierba y arena, a 1920 × 1080 y 1280 × 720, más un
// recorte ampliado del personaje. Uso: node tools/capturas-nitidez.mjs <carpeta>
// (por defecto tests/output/nitidez). Sirve para comparar antes y después.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'tests/output/nitidez';
mkdirSync(out, { recursive: true });
const URL = pathToFileURL(resolve('dist/isla.html')).href;
const browser = await chromium.launch();
for (const [w, h] of [[1920, 1080], [1280, 720]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.error('ERROR', e));
  await page.goto(URL);
  await page.waitForFunction(() => window.__isla && window.__isla.ready);
  await page.evaluate(() => window.__isla.goto('create'));
  for (const [name, colors] of [['a', { pelo: 0, piel: 0, camiseta: 0, pantalon: 0 }], ['b', { pelo: 1, piel: 4, camiseta: 3, pantalon: 2 }]]) {
    await page.evaluate((c) => { const cr = window.__isla.game.screens.create; Object.assign(cr.colors, c); cr.t = 0.2; }, colors);
    await page.evaluate(() => window.__isla.freeze(true));
    await page.evaluate(() => window.__isla.game.render());
    await page.screenshot({ path: `${out}/creacion-${name}-${w}.png` });
  }
  await page.evaluate(() => { window.__isla.freeze(false); window.__isla.start({ colors: { pelo: 1, piel: 2, camiseta: 3, pantalon: 1 } }); window.__isla.freeze(true); const g = window.__isla.game; g.helpT = 0; g.clock.hours = 12; g.weather.set(false); g.weather.timer = 9999; });
  for (const [name, tx, ty] of [['arena', 19, 135], ['hierba', 48, 137]]) {
    await page.evaluate(([x, y]) => { window.__isla.teleport(x, y); window.__isla.step(1 / 60, 30); window.__isla.game.render(); }, [tx, ty]);
    await page.screenshot({ path: `${out}/juego-${name}-${w}.png` });
    // Recorte del personaje (centro de la pantalla, la cámara lo centra).
    const box = await page.evaluate(() => { const c = document.getElementById('juego').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
    const cam = await page.evaluate(() => { const g = window.__isla.game; return { x: g.player.x - g.camera.ix, y: g.player.y - g.camera.iy }; });
    const k = box.w / 640;
    await page.screenshot({ path: `${out}/zoom-${name}-${w}.png`, clip: { x: box.x + (cam.x - 40) * k, y: box.y + (cam.y - 70) * k, width: 80 * k, height: 90 * k } });
  }
  await page.close();
}
await browser.close();
