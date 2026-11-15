// Punto de entrada: pantalla de carga, generación de sprites y terreno, bucle.

import atlasUrl from '../assets/atlas.png';
import atlasFrames from '../assets/atlas.json';
import selvaUrl from '../assets/selva.jpg';
import avionUrl from '../assets/avion.jpg';
import paisajeUrl from '../assets/paisaje.jpg';
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
import { landingZoneAt } from './world/landingMap.js';
import { useItem } from './systems/interaction.js';

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
  const [atlas, selva, avion, paisaje] = await Promise.all([loadImage(atlasUrl), loadImage(selvaUrl), loadImage(avionUrl), loadImage(paisajeUrl)]);
  drawLoading(ctx, selva);
  await nextFrame();
  await nextFrame();

  const player = scaleAtlas(atlas, atlasFrames);
  const sprites = {
    player, playerBase: player, tribe: tribalAtlas(player), boar: boarFrames(), crab: crabFrames(),
    flames: { big: flameFrames(1.2), small: flameFrames(0.55) }, icons: buildIcons(),
  };
  const game = new Game({ ctx, input, sprites, images: { selva, avion, paisaje }, audio: new Audio() });
  game.zoneNames = ZONE_NAMES;

  let frozen = false;
  startLoop((dt) => {
    if (!frozen) game.update(dt);
  }, () => game.render());

  // Gancho para las pruebas automáticas (Playwright) y para depurar desde la consola.
  window.__isla = {
    game,
    ready: true,
    /** Empieza ya en la playa, sin creación ni aterrizaje. `character`: { attrs, colors } opcional. */
    start(character) { game.quickStart(character); },
    screen() { return game.screen; },
    goto(s) { game.goto(s); },
    /** Aterriza ya en (x, y) de la isla grande (desde la pantalla de aterrizaje). */
    landAt(x, y) { return game.landing.forceAt(x, y); },
    landing() {
      const l = game.landing;
      const z = l.zone;
      return { x: l.x, y: l.y, alt: l.alt, angle: l.angle, phase: l.phase, zone: z.zone, result: z.result, explored: z.explored, msg: l.msg && l.msg.text };
    },
    /** Pone el avión en (x, y) con un rumbo, sin aterrizar. */
    placePlane(x, y, angle = 0) { Object.assign(game.landing, { x, y, angle }); },
    creation() {
      const cr = game.screens.create;
      return { attrs: { ...cr.attrs }, colors: { ...cr.colors }, free: cr.free, sel: cr.sel, dir: cr.previewDir[0] };
    },
    /** Color medio [r, g, b] de los píxeles de una parte (camiseta, piel…) en el atlas recoloreado. */
    partColor(part, which = 'preview') {
      return game.debugPartColor(part, which);
    },
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
        hp: p.hp, maxHp: p.maxHp, attrs: { ...p.attrs }, stats: { ...p.stats }, sick: p.sick, noise: p.noise,
        needs: { ...p.needs }, anim: p.anim.name, frame: p.anim.index, message: p.message && p.message.text,
      };
    },
    /** Usa un objeto de la mochila (como hacer clic en él). */
    use(id) { return useItem(game, id); },
    zone() { return game.zone; },
    /** Zona del mapa del aterrizaje en el tile (x, y), para comparar con la del juego. */
    landingZoneAt(x, y) { return landingZoneAt(game.map, x, y); },
    discovered() { return [...game.discovered]; },
    terrainStats() { const t = game.terrain; return { chunks: t.chunks.size, rendered: t.rendered, avgMs: t.renderMs / Math.max(1, t.rendered), maxMs: t.maxRenderMs }; },
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
