// Punto de entrada: pantalla de carga, generación de sprites y terreno, bucle.

import atlasUrl from '../assets/atlas.png';
import atlasFrames from '../assets/atlas.json';
import selvaUrl from '../assets/selva.jpg';
import avionUrl from '../assets/avion.jpg';
import { TILE } from './config.js';
import { Input } from './core/input.js';
import { loadImage } from './core/assets.js';
import { startLoop } from './core/loop.js';
import { setupScreen } from './core/screen.js';
import { Audio } from './core/audio.js';
import { Game, ZONE_NAMES } from './game.js';
import { scaleAtlas, tribalAtlas, boarFrames, crabFrames } from './gfx/characters.js';
import { flameFrames } from './gfx/props.js';
import { buildIcons } from './gfx/icons.js';
import { drawLoading } from './render/hud.js';

function showError(err) {
  console.error(err);
  const box = document.getElementById('error');
  if (box) {
    box.style.display = 'block';
    box.textContent = `Se ha producido un error al cargar el juego:\n\n${err && err.message ? err.message : err}`;
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function boot() {
  const canvas = document.getElementById('juego');
  const ctx = setupScreen(canvas);
  const input = new Input(canvas);
  canvas.focus();
  const [atlas, selva, avion] = await Promise.all([loadImage(atlasUrl), loadImage(selvaUrl), loadImage(avionUrl)]);
  drawLoading(ctx, selva);
  await nextFrame();
  await nextFrame();

  const player = scaleAtlas(atlas, atlasFrames);
  const sprites = {
    player, tribe: tribalAtlas(player), boar: boarFrames(), crab: crabFrames(),
    flames: { big: flameFrames(1.2), small: flameFrames(0.55) }, icons: buildIcons(),
  };
  const game = new Game({ ctx, input, sprites, images: { selva, avion }, audio: new Audio() });
  game.zoneNames = ZONE_NAMES;

  let frozen = false;
  startLoop((dt) => {
    if (!frozen) game.update(dt);
  }, () => game.render());

  // Gancho para las pruebas automáticas (Playwright) y para depurar desde la consola.
  window.__isla = {
    game,
    ready: true,
    start() { game.start(); },
    freeze(value = true) { frozen = value; },
    step(dt, frames = 1) { for (let i = 0; i < frames; i++) game.update(dt); },
    /** Coloca los pies del jugador en el centro del tile (tx, ty), en el nivel de ese tile. */
    teleport(tx, ty) {
      game.player.placeAt((tx + 0.5) * TILE, (ty + 0.5) * TILE, game.map.levelAt(tx, ty));
      game.camera.snap(game.player);
    },
    player() {
      const p = game.player;
      return {
        x: p.x, y: p.y, vx: p.vx, vy: p.vy, z: p.z, level: p.level,
        tx: Math.floor(p.x / TILE), ty: Math.floor((p.y - 5) / TILE),
        facing: p.facing, state: p.state, stateName: p.stateName, terrain: p.terrain,
        stamina: p.stamina, crouching: p.crouching, running: p.running, hidden: p.hidden,
        hp: p.hp, needs: { ...p.needs }, anim: p.anim.name, frame: p.anim.index, message: p.message && p.message.text,
      };
    },
    inventory() { return game.inventory.slots.map((s) => ({ ...s })); },
    enemies() { return game.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y, state: e.state, detect: e.detect, hp: e.hp, dead: e.dead, angle: e.angle })); },
    /** Orden de dibujo del último fotograma ("jugador", "arbol", …). */
    drawOrder() {
      game.render();
      return game.renderer.lastOrder.map((it) => ({ kind: it.kind, x: it.x, y: it.y }));
    },
  };
}

boot().catch(showError);
