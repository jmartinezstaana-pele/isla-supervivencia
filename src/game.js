// Estado del juego en la Fase 1b: mapa de prueba cenital, jugador y cámara.
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
    this.player.placeAt(this.map.spawn.x, this.map.spawn.y, 0);
    this.camera = new Camera(this.map.pixelWidth, this.map.pixelHeight);
    this.camera.snap(this.player);
    this.worldRenderer = new WorldRenderer(this.map);
    this.debug = false;
    this.paused = false;
    this.fps = 60;
    this.drawOrder = []; // último orden de dibujo (para pruebas y depuración)

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
    const { ctx, camera, worldRenderer: wr, player } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b6cad';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    camera.apply(ctx);
    wr.drawGround(ctx, camera);

    // Objetos y jugador ordenados por la y de su base: así el jugador pasa por
    // delante o por detrás de árboles y muros según su posición.
    const items = [];
    wr.collectObjects(camera, items);
    items.push({ kind: 'jugador', sortY: player.sortY, draw: (c) => player.draw(c, this.atlas, wr.time) });
    items.sort((a, b) => a.sortY - b.sortY);
    for (const it of items) it.draw(ctx);
    this.drawOrder = items.map((it) => (it.kind === 'jugador' ? 'jugador' : `${it.kind}@${it.tx},${it.ty}`));

    wr.drawLabels(ctx);
    if (this.debug) this.drawDebugBoxes(ctx);
    drawHud(ctx, this);
  }

  drawDebugBoxes(ctx) {
    const b = this.player.box;
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 1 / this.camera.zoom;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(this.player.x - 1, this.player.y - 1, 2, 2);
  }
}
