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
    /** Coloca los pies del jugador en el centro del tile (tx, ty), en el nivel de ese tile. */
    teleport(tx, ty) {
      const m = game.map;
      game.player.placeAt((tx + 0.5) * TILE, (ty + 0.5) * TILE, m.levelAt(tx, ty));
      game.camera.snap(game.player);
    },
    player() {
      const p = game.player;
      return {
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, z: p.z, level: p.level,
        tx: Math.floor(p.x / TILE), ty: Math.floor((p.y - 5) / TILE),
        facing: p.facing, state: p.state, stateName: p.stateName, terrain: p.terrain,
        stamina: p.stamina, crouching: p.crouching, running: p.running,
        anim: p.anim.name, frame: p.anim.index, message: p.message && p.message.text,
      };
    },
    /** Orden de dibujo del último fotograma ("jugador", "árbol@x,y", …). */
    drawOrder() {
      game.render();
      return game.drawOrder;
    },
  };
}

boot().catch(showError);
