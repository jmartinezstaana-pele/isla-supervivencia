// Punto de entrada: prepara el canvas, carga los sprites y arranca el bucle.

import atlasUrl from '../assets/atlas.png';
import atlasFrames from '../assets/atlas.json';
import { TILE } from './config.js';
import { Input } from './core/input.js';
import { loadImage } from './core/assets.js';
import { startLoop } from './core/loop.js';
import { setupScreen } from './core/screen.js';
import { Game } from './game.js';

function showError(err) {
  console.error(err);
  const box = document.getElementById('error');
  if (box) {
    box.style.display = 'block';
    box.textContent = `Se ha producido un error al cargar el juego:\n\n${err && err.message ? err.message : err}`;
  }
}

async function boot() {
  const canvas = document.getElementById('juego');
  const ctx = setupScreen(canvas);
  const input = new Input(canvas);
  canvas.focus();
  const atlas = await loadImage(atlasUrl);
  const game = new Game({ ctx, input, atlas, atlasFrames });

  let frozen = false;
  startLoop((dt) => {
    if (!frozen) game.update(dt);
  }, () => game.render());

  // Gancho para las pruebas automáticas (Playwright) y para depurar desde la consola.
  window.__isla = {
    game,
    ready: true,
    /** Detiene (true) o reanuda (false) la actualización automática del bucle. */
    freeze(value = true) {
      frozen = value;
    },
    /** Avanza `frames` actualizaciones de `dt` segundos con el input actual. */
    step(dt, frames = 1) {
      for (let i = 0; i < frames; i++) game.update(dt);
    },
    /** Coloca los pies del jugador en el centro del tile (tx, ty). */
    teleport(tx, ty) {
      game.player.placeAt(tx * TILE + TILE / 2, ty * TILE);
      game.camera.snap(game.player);
    },
    player() {
      const p = game.player;
      return {
        x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy,
        feetY: p.feetY, centerX: p.centerX, facing: p.facing,
        onGround: p.onGround, groundType: p.groundType, crouching: p.crouching,
        swimming: p.swimming, state: p.stateName, anim: p.anim.name, frame: p.anim.index,
      };
    },
  };
}

boot().catch(showError);
