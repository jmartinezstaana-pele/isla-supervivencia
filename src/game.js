// Estado del juego en la Fase 1: mundo de prueba, jugador y cámara.
// En la Fase 2 esto pasará a ser un estado más (juego) dentro de una máquina de
// pantallas: título → creación → intro → aterrizaje → juego → muerte / final.

import { Player } from './entities/player.js';
import { Camera } from './render/camera.js';
import { WorldRenderer } from './render/worldRenderer.js';
import { drawHud } from './render/hud.js';
import { buildTestLevel } from './world/testLevel.js';

export class Game {
  constructor({ ctx, input, atlas, atlasFrames }) {
    this.ctx = ctx;
    this.input = input;
    this.atlas = atlas;
    this.map = buildTestLevel();
    this.player = new Player(atlasFrames);
    this.player.placeAt(this.map.spawn.x, this.map.spawn.y);
    this.camera = new Camera(this.map.pixelWidth, this.map.pixelHeight);
    this.camera.snap(this.player);
    this.worldRenderer = new WorldRenderer(this.map);
    this.debug = false;
    this.paused = false;
    this.fps = 60;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.paused = true;
    });
  }

  update(dt) {
    const input = this.input;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    if (input.pressed('debug')) this.debug = !this.debug;
    if (input.pressed('pause')) this.paused = !this.paused;
    if (!this.paused) {
      this.player.update(dt, input, this.map);
      this.camera.update(dt, this.player);
      this.worldRenderer.update(dt);
    }
    input.endFrame();
  }

  render() {
    const { ctx, camera, worldRenderer, player } = this;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    worldRenderer.drawBackground(ctx, camera);
    camera.apply(ctx);
    worldRenderer.drawTiles(ctx, camera);
    worldRenderer.drawLabels(ctx);
    player.draw(ctx, this.atlas);
    worldRenderer.drawWater(ctx, camera);
    if (this.debug) {
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(player.x, player.y, player.w, player.h);
    }
    drawHud(ctx, this);
  }
}
