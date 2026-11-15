// Estado del juego: la isla, el jugador, los enemigos y todos los sistemas
// (tiempo, clima, saqueo, combate, sigilo). Pantallas: título → creación →
// intro → aterrizaje → impacto → juego.

import { TILE, PIXEL_SCALE } from './config.js';
import { Player } from './entities/player.js';
import { Warrior } from './entities/enemy.js';
import { Boar, Crab } from './entities/animals.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { WaterLayer } from './render/water.js';
import { Particles, emitAmbient } from './render/particles.js';
import { Ambience } from './render/ambience.js';
import { Lighting } from './render/lighting.js';
import { drawHud, drawImpact } from './render/hud.js';
import { DEFAULT_ATTRS } from './data/attributes.js';
import { DEFAULT_COLORS, recolorAtlas, partAverage } from './gfx/recolor.js';
import { LANDING_RESULTS } from './world/landingMap.js';
import { TitleScreen } from './ui/title.js';
import { CreationScreen } from './ui/creation.js';
import { IntroScreen } from './ui/intro.js';
import { LandingScreen } from './ui/landing.js';
import { shoreX } from './world/islandMap.js';
import { buildWorld, worldZoneAt, ZONES, WORLD_PLACES } from './world/worldMap.js';
import { buildWorldProps } from './world/worldProps.js';
import { PropIndex } from './world/propIndex.js';
import { PropGrid, nudgeFree } from './world/collision.js';
import { buildProps, initialPickups, makeFlotsam } from './world/props.js';
import { TerrainCache } from './gfx/terrain.js';
import { G } from './world/tiles.js';
import { Clock } from './systems/clock.js';
import { Weather } from './systems/weather.js';
import { Inventory, SLOTS } from './systems/inventory.js';
import { findInteraction, doInteraction, useItem, quickUse } from './systems/interaction.js';
import { ITEMS } from './data/items.js';

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export const ZONE_NAMES = ZONES;
/** Distancia (px) a la que los enemigos y animales siguen activos. */
const ACTIVE_R = 900;

export class Game {
  constructor({ ctx, input, sprites, images, audio }) {
    this.ctx = ctx;
    this.input = input;
    this.sprites = sprites;
    this.images = images;
    this.audio = audio;
    this.screen = 'title';
    this.rng = Math.random;
    this.map = buildWorld();
    this.terrain = new TerrainCache(this.map);
    this.camera = new Camera(this.map.pixelWidth, this.map.pixelHeight);
    this.renderer = new Renderer(this);
    this.water = new WaterLayer(this.map, this.terrain);
    this.particles = new Particles();
    this.ambience = new Ambience();
    this.lighting = new Lighting();
    this.debug = false;
    this.fps = 60;
    this.waterfalls = this.findWaterfalls();
    this.character = { attrs: { ...DEFAULT_ATTRS }, colors: { ...DEFAULT_COLORS } };
    this.resetWorld();
    this.screens = {
      title: new TitleScreen(this),
      create: new CreationScreen(this),
      intro: new IntroScreen(this),
      landing: new LandingScreen(this),
    };
    this.landing = this.screens.landing;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'play') this.paused = true;
    });
  }

  /** Deja la isla como al principio: props, botín, enemigos, reloj, clima y jugador nuevo. */
  resetWorld() {
    // Props del trozo de la sesión 3 (en sus coordenadas, desplazados a su sitio) y del resto de la isla.
    const pc = this.map.piece;
    const ox = pc.x * TILE;
    const oy = pc.y * TILE;
    const pieceProps = buildProps(pc.map);
    const piecePickups = initialPickups(pc.map, pieceProps);
    for (const pr of pieceProps) {
      pr.x += ox; pr.y += oy;
      pr.col = { ...pr.col, x: pr.col.x + ox, y: pr.col.y + oy };
    }
    for (const pk of piecePickups) { pk.x += ox; pk.y += oy; }
    const rest = buildWorldProps(this.map, pieceProps);
    const props = [...pieceProps, ...rest.props];
    const W = this.map.pixelWidth;
    const H = this.map.pixelHeight;
    this.world = { map: this.map, grid: new PropGrid(W, H), props, index: new PropIndex(W, H), lights: [] };
    for (const p of props) this.indexProp(p);
    this.pickups = [...piecePickups, ...rest.pickups];
    this.bodies = [];
    this.inventory = new Inventory();
    this.player = new Player(this.sprites.playerBase.frames);
    this.player.setAttributes(this.character.attrs);
    this.player.hp = this.player.maxHp;
    this.player.placeAt(this.map.spawn.x, this.map.spawn.y, 0);
    this.player.facing = 'right';
    this.camera.snap(this.player);
    this.particles = new Particles();
    this.clock = new Clock(16);
    this.weather = new Weather(this.map);
    this.zone = this.zoneAt(this.player.x, this.player.y);
    this.banner = { zone: this.zone, age: 0 };
    this.discovered = new Set([this.zone, 'mar']);
    this.mapOpen = false;
    this.time = 0;
    this.paused = false;
    this.invOpen = false;
    this.charOpen = false;
    this.invSel = 0;
    this.helpT = 30;
    this.hitstop = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.deathT = -1;
    this.floaters = [];
    this.log = [];
    this.stats = { saqueos: 0, eliminaciones: 0, sigilosas: 0 };
    this.interaction = null;
    this.killTarget = null;
    this.plane = { zone: 'playa', estado: 'reparable' };
    this.impact = null;
    this.spawnEnemies();
  }

  /** Cambia de pantalla ('title', 'create', 'intro', 'landing', 'impact', 'play'). */
  goto(screen) {
    this.screen = screen;
    const s = this.screens[screen];
    if (s && s.enter) s.enter();
    this.input.clear();
  }

  /**
   * Nueva partida con el personaje creado: atributos y colores (recoloreado del
   * sprite, TRASPASO §2.6). La isla vuelve a su estado inicial.
   */
  newGame({ attrs = DEFAULT_ATTRS, colors = DEFAULT_COLORS } = {}) {
    this.character = { attrs: { ...attrs }, colors: { ...colors } };
    this.sprites.player = { image: recolorAtlas(this.sprites.playerBase, colors), frames: this.sprites.playerBase.frames };
    this.resetWorld();
  }

  /** Color medio de una parte del personaje en la vista previa ('preview') o en el juego ('game'). */
  debugPartColor(part, which) {
    const atlas = which === 'preview' ? this.screens.create.previewAtlas() : this.sprites.player.image;
    return partAverage(this.sprites.playerBase, atlas, part);
  }

  /** Empieza a jugar ya, en la playa y sin aterrizaje (pruebas y depuración). */
  quickStart(character) {
    if (character || !this.sprites.player) this.newGame(character);
    this.start();
  }

  /**
   * Aplica el resultado del aterrizaje (TRASPASO §2.4): daño según la zona,
   * restos del avión con el botín inicial donde ha caído y el jugador al lado.
   * `result`: { zone, x, y, forced } con x, y en casillas de la isla grande.
   */
  landAt(result) {
    const key = result.result || result.zone;
    const R = LANDING_RESULTS[key] || LANDING_RESULTS.selva;
    const p = this.player;
    const wreck = this.world.props.find((pr) => pr.kind === 'avion');
    const map = this.map;
    const tx = Math.max(1, Math.min(map.width - 2, result.x));
    const ty = Math.max(1, Math.min(map.height - 2, result.y));
    let place;
    if (key === 'mar') {
      // El avión se hunde: llegas nadando a la costa más cercana y el mar arrastra los restos a la orilla.
      const coast = this.nearestCoast(tx, ty);
      p.placeAt((coast.water[0] + 0.5) * TILE, (coast.water[1] + 0.6) * TILE, 0);
      this.removeProp(wreck);
      const fl = makeFlotsam((coast.land[0] + 0.5) * TILE, (coast.land[1] + 0.8) * TILE, wreck.loot);
      fl.level = map.levelAt(coast.land[0], coast.land[1]);
      this.addProp(fl);
      place = { x: fl.x, y: fl.y };
    } else {
      place = this.findWreckSpot(result.zone, tx, ty);
      this.clearAround(place.x, place.y, place.level);
      this.removeProp(wreck);
      wreck.x = place.x;
      wreck.y = place.y;
      wreck.level = place.level;
      wreck.col = { x: place.x - 48, y: place.y - 16, w: 96, h: 16 };
      this.addProp(wreck);
      const box = { x: place.x - 9, y: place.y + 26 - 10, w: 18, h: 10 };
      nudgeFree(this.world, box, place.level, 64);
      p.placeAt(box.x + 9, box.y + 10, place.level);
    }
    p.hp = Math.max(1, p.maxHp - R.dano);
    p.facing = 'down';
    this.plane = { zone: key, estado: R.avion, lugar: result.zone };
    this.camera.snap(p);
    this.zone = this.zoneAt(p.x, p.y);
    this.discover(this.zone);
    this.terrain.prefetch(this.camera.ix, this.camera.iy, this.camera.viewW, this.camera.viewH, 400);
    this.impact = { result, R, t: 0, place };
    this.screen = 'impact';
    this.input.clear();
  }

  /** Tile de agua junto a la costa y tile de tierra pegado a él, lo más cerca posible de (tx, ty). */
  nearestCoast(tx, ty) {
    const map = this.map;
    const isWater = (x, y) => { const g = map.groundAt(x, y); return g === G.SHALLOW || g === G.DEEP; };
    const isSand = (x, y) => map.groundAt(x, y) === G.SAND && map.levelAt(x, y) === 0;
    let best = null;
    let bd = Infinity;
    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        if (!isSand(x, y)) continue;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (!isWater(x + dx, y + dy)) continue;
          const d = Math.hypot(x - tx, y - ty);
          if (d < bd) { bd = d; best = { land: [x, y], water: [x + dx * 2, y + dy * 2] }; }
        }
      }
    }
    if (best && !isWater(best.water[0], best.water[1])) best.water = [best.land[0] + (best.water[0] - best.land[0]) / 2, best.land[1] + (best.water[1] - best.land[1]) / 2];
    return best || { land: WORLD_PLACES.spawn, water: [WORLD_PLACES.spawn[0] - 6, WORLD_PLACES.spawn[1]] };
  }

  /** Busca un sitio para los restos del avión cerca del punto de impacto, en la misma zona. */
  findWreckSpot(zone, tx, ty) {
    const map = this.map;
    // Nivel del sitio del impacto (si cae en una pared, el de arriba).
    let wantLevel = map.levelAt(Math.floor(tx), Math.floor(ty));
    const g0 = map.groundAt(Math.floor(tx), Math.floor(ty));
    if (g0 === G.CLIFF || g0 === G.WATERFALL) wantLevel = map.levelAt(Math.floor(tx), map.cliffColumnTop(Math.floor(tx), Math.floor(ty)) - 1);
    const ok = (cx, cy) => {
      // Caja de los restos (96 × 16) y sitio para el jugador debajo, en suelo pisable del mismo nivel.
      for (let y = cy - 16; y <= cy + 34; y += 8) {
        for (let x = cx - 50; x <= cx + 50; x += 8) {
          const gx = Math.floor(x / TILE);
          const gy = Math.floor(y / TILE);
          if (!map.inBounds(gx, gy)) return false;
          const g = map.groundAt(gx, gy);
          if (map.levelAt(gx, gy) !== wantLevel || g === G.RIVER || g === G.WATERFALL || g === G.CLIFF || g === G.LEDGE_S || g === G.DEEP || g === G.SHALLOW || g === G.BRIDGE || g === G.CHASM || g === G.SWAMP) return false;
        }
      }
      if (this.zoneAt(cx, cy) !== zone) return false;
      return !this.world.index.query(cx - 70, cy - 46, cx + 70, cy + 46).some((pr) => pr.interact && pr.kind !== 'avion');
    };
    const x0 = tx * TILE;
    const y0 = ty * TILE;
    for (let r = 0; r <= 16 * TILE; r += 8) {
      const n = Math.max(1, Math.round((2 * Math.PI * r) / 16));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = Math.round(x0 + Math.cos(a) * r);
        const cy = Math.round(y0 + Math.sin(a) * r);
        if (ok(cx, cy)) return { x: cx, y: cy, level: wantLevel };
      }
    }
    const [wx, wy] = WORLD_PLACES.wreck;
    return { x: wx * TILE, y: wy * TILE, level: 0 };
  }

  /** Quita la vegetación y los props sin botín que queden debajo de los restos. */
  clearAround(cx, cy, level) {
    for (const pr of this.world.index.query(cx - 74, cy - 40, cx + 74, cy + 40)) {
      if (pr.interact || pr.kind === 'avion' || (pr.level || 0) !== level) continue;
      this.removeProp(pr);
    }
    this.pickups = this.pickups.filter((pk) => !(pk.x > cx - 56 && pk.x < cx + 56 && pk.y > cy - 20 && pk.y < cy + 8));
  }

  indexProp(pr) {
    if (pr.solid) this.world.grid.add(pr);
    this.world.index.add(pr);
    if (pr.light) this.world.lights.push(pr);
  }

  removeProp(pr) {
    const i = this.world.props.indexOf(pr);
    if (i >= 0) this.world.props.splice(i, 1);
    if (pr.solid) this.world.grid.remove(pr);
    this.world.index.remove(pr);
    const j = this.world.lights.indexOf(pr);
    if (j >= 0) this.world.lights.splice(j, 1);
  }

  addProp(pr) {
    this.world.props.push(pr);
    this.indexProp(pr);
  }

  /** Zona en un punto del mundo (px). */
  zoneAt(x, y) {
    return worldZoneAt(this.map, x, y);
  }

  /** Marca una zona como descubierta (mapa M). */
  discover(zone) {
    if (this.discovered.has(zone)) return false;
    this.discovered.add(zone);
    this.mapDirty = true;
    return true;
  }

  /** Tras la pantalla del impacto: empieza a jugar (y la tribu acude si caíste en su campamento). */
  endImpact() {
    const im = this.impact;
    this.start();
    if (im && (im.result.zone === 'campamento' || im.result.zone === 'poblado')) {
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - im.place.x, e.y - im.place.y) > 700) continue;
        e.lastSeen = { x: im.place.x, y: im.place.y + 20 };
        e.state = 'investigate';
        e.detect = Math.max(e.detect, 0.6);
        e.say('!', 2);
      }
      this.player.say('¡El estruendo ha alertado a la tribu!');
      this.sound('alert');
    } else if (im && (im.result.result || im.result.zone) === 'mar') {
      this.player.say(im.result.forced ? 'Amerizas. La corriente te arrastra hasta la costa.' : 'El avión se hunde. ¡Nada hasta la orilla!');
    } else if (im) {
      this.player.say(im.R.avion === 'reparable' ? 'El avión aguanta. Quizá se pueda reparar.' : 'El avión ha quedado destrozado.');
    }
  }

  spawnEnemies() {
    const T = (v) => v * TILE;
    const pc = this.map.piece;
    const PX = (v) => T(v + pc.x);
    const PY = (v) => T(v + pc.y);
    const f = this.sprites.tribe.frames;
    const wp = (pts) => pts.map(([x, y]) => [PX(x), PY(y)]);
    // Campamento de la tribu (trozo de la sesión 3).
    this.enemies = [
      new Warrior(1, f, PX(67.2), PY(17.4), wp([[67.2, 17.4], [67.2, 24]]), { angle: Math.PI / 2 }),
      new Warrior(2, f, PX(71.5), PY(17.6), wp([[71.5, 17.6], [78.6, 17.6], [78.6, 23.2], [71.5, 23.2]]), { angle: 0 }),
      new Warrior(3, f, PX(77.2), PY(14.6), wp([[77.2, 14.6], [81.3, 18.6], [77.6, 25.6], [74, 22.6]]), { angle: Math.PI / 2 }),
    ];
    // Poblado de la tribu: cinco guerreros.
    const P = WORLD_PLACES.poblado;
    const ring = (r, n, a0) => Array.from({ length: n }, (_, k) => [T(P.x + Math.cos(a0 + (k / n) * Math.PI * 2) * r), T(P.y + Math.sin(a0 + (k / n) * Math.PI * 2) * r)]);
    const pts = [
      [ring(4.2, 4, 0)], [ring(4.2, 4, Math.PI)], [[[T(P.x - 1), T(P.y + 9.6)], [T(P.x + 1.5), T(P.y + 9.6)]]],
      [[[T(P.x + 9.8), T(P.y - 1)], [T(P.x + 9.8), T(P.y + 2)]]], [ring(6.8, 6, 0.5)],
    ];
    pts.forEach(([route], k) => this.enemies.push(new Warrior(4 + k, f, route[0][0], route[0][1], route, { angle: Math.PI / 2 })));
    // Animales: jabalíes por la selva y cangrejos por las playas.
    this.animals = [new Boar(PX(35.5), PY(26.5)), new Boar(T(70), T(104)), new Boar(T(110), T(112)), new Boar(T(40), T(90))];
    for (const y of [12.5, 19.5, 26, 30.5]) this.animals.push(new Crab(PX(shoreX(y) + 1.6), PY(y)));
    for (const [x, y] of [[186, 122], [190, 96], [183, 112], [60, 155], [22, 100]]) {
      if (this.map.groundAt(x, y) === G.SAND) this.animals.push(new Crab(T(x + 0.5), T(y + 0.5)));
    }
    // Que nadie empiece metido dentro de un árbol o una roca.
    for (const e of [...this.enemies, ...this.animals]) {
      const b = { x: e.x - 12, y: e.y - 8, w: 24, h: 8 };
      nudgeFree(this.world, b, 0, 64);
      e.x = b.x + 12;
      e.y = b.y + 8;
      e.home = { x: e.x, y: e.y };
    }
  }

  /** Pie de cada cascada (para la bruma). */
  findWaterfalls() {
    const out = [];
    const map = this.map;
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.groundAt(tx, ty) !== G.WATERFALL || map.groundAt(tx, ty + 1) === G.WATERFALL || map.groundAt(tx - 1, ty) === G.WATERFALL) continue;
        let x1 = tx;
        while (map.groundAt(x1 + 1, ty) === G.WATERFALL) x1++;
        out.push({ x: ((tx + x1 + 1) / 2) * TILE, y: (ty + 1) * TILE + 4, w: (x1 - tx + 1) * TILE });
      }
    }
    return out;
  }

  start() {
    this.screen = 'play';
    this.banner = { zone: this.zone, age: 0 };
  }

  sound(name) {
    if (this.audio) this.audio.play(name);
  }

  logPickup(id, n) {
    this.log.push({ id, n, age: 0 });
    if (this.log.length > 6) this.log.shift();
  }

  floater(x, y, text, color = '#fff') {
    this.floaters.push({ x, y, text, color, age: 0 });
  }

  onPlayerHit(dmg) {
    this.floater(this.player.x, this.player.y - 46, `-${dmg}`, '#ff6a5a');
    this.hurtFlash = 0.35;
    this.shake = Math.max(this.shake, 0.25);
    this.hitstop = Math.max(this.hitstop, 0.05);
    this.sound('hurt');
    for (let i = 0; i < 6; i++) {
      this.particles.add({ type: 'spark', x: this.player.x, y: this.player.y - 18, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 70, g: 200, life: 0.4, color: '#c8281e', fade: true });
    }
  }

  /** Entidades vivas con las que se puede pelear. */
  targets() {
    return [...this.enemies, ...this.animals].filter((e) => !e.dead);
  }

  /** Luces que llevan las entidades (antorcha del jugador). */
  lightSources() {
    const out = [];
    if (this.player.torchOn) out.push({ x: this.player.x, y: this.player.y - 26, r: 125, color: [255, 170, 90] });
    return out;
  }

  /** Entidades que se dibujan ordenadas con los props. */
  entities() {
    const c = this.camera;
    const near = (e) => e.x > c.ix - 120 && e.x < c.ix + c.viewW + 120 && e.y > c.iy - 60 && e.y < c.iy + c.viewH + 160;
    const list = [this.player];
    for (const e of this.enemies) if (near(e)) list.push(e);
    for (const a of this.animals) if (near(a)) list.push(a);
    for (const pk of this.pickups) if (near(pk)) list.push(pickupEntity(pk));
    for (const b of this.bodies) if (!b.looted) list.push(bodySparkle(b));
    return list;
  }

  mouseWorld() {
    const m = this.input.mouse;
    return { x: m.x / PIXEL_SCALE + this.camera.ix, y: m.y / PIXEL_SCALE + this.camera.iy };
  }

  // ------------------------------------------------------------------ actualización
  update(dt) {
    const input = this.input;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    this.lastDt = dt;
    const menu = this.screens[this.screen];
    if (menu) {
      menu.update(dt, input);
      input.endFrame();
      return;
    }
    if (this.screen === 'impact') {
      this.impact.t += dt;
      this.time += dt;
      this.particles.update(dt);
      if (this.impact.t > 0.6 && (input.pressed('confirm') || input.pressed('jump') || input.mouse.pressed[0])) this.endImpact();
      input.endFrame();
      return;
    }
    if (input.pressed('debug')) this.debug = !this.debug;
    if (input.pressed('help')) this.helpT = this.helpT > 0 ? 0 : 9999;
    if (input.pressed('inventory') && !this.player.dead) {
      this.invOpen = !this.invOpen;
      this.charOpen = false;
    }
    if (input.pressed('character') && !this.player.dead) {
      this.charOpen = !this.charOpen;
      this.invOpen = this.mapOpen = false;
    }
    if (input.pressed('map') && !this.player.dead) {
      this.mapOpen = !this.mapOpen;
      this.invOpen = this.charOpen = false;
    }
    if (input.pressed('pause')) {
      if (this.invOpen) this.invOpen = false;
      else if (this.charOpen) this.charOpen = false;
      else if (this.mapOpen) this.mapOpen = false;
      else this.paused = !this.paused;
    }
    if (this.charOpen || this.mapOpen) {
      // Pantalla de personaje: el mundo se detiene.
    } else if (this.invOpen) {
      this.updateInventoryUI();
    } else if (!this.paused) {
      if (input.pressed('timeSkip')) this.clock.advance(2);
      if (input.pressed('rainToggle')) this.weather.set(!this.weather.raining);
      this.step(dt);
    }
    input.endFrame();
  }

  step(dt) {
    const input = this.input;
    const p = this.player;
    this.time += dt;
    this.helpT -= dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.shake = Math.max(0, this.shake - dt);
    for (const f of this.floaters) f.age += dt;
    this.floaters = this.floaters.filter((f) => f.age < 1);
    for (const l of this.log) l.age += dt;
    this.log = this.log.filter((l) => l.age < 4);
    this.banner.age += dt;

    this.clock.update(dt);
    const wasFlash = this.weather.flash;
    this.weather.update(dt, this.camera);
    if (this.weather.flash > wasFlash) setTimeout(() => this.sound('thunder'), 400);
    if (this.audio) this.audio.setRain(this.weather.intensity);
    this.cloudStrength = (1 - this.weather.intensity) * (1 - this.clock.darkness);
    // Niebla en el manglar (más espesa de madrugada y con lluvia).
    const fogTarget = this.zone === 'manglar' ? 0.85 + this.weather.intensity * 0.15 : 0;
    this.fogStrength = (this.fogStrength || 0) + (fogTarget - (this.fogStrength || 0)) * Math.min(1, dt * 1.2);

    // Muerte y reaparición.
    if (p.dead) {
      if (this.deathT < 0) this.deathT = 0;
      this.deathT += dt;
      if (this.deathT > 3) this.respawn();
      this.camera.update(dt, p);
      this.particles.update(dt);
      return;
    }

    // Pausa breve al golpear (hitstop): el mundo se congela un instante.
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    // Acciones del jugador.
    if (input.mouse.pressed[0] || input.pressed('attack')) {
      let ang;
      if (input.mouse.pressed[0]) {
        const m = this.mouseWorld();
        ang = Math.atan2(m.y - (p.y - 14), m.x - p.x);
      } else {
        ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.facing];
      }
      if (p.startAttack(ang)) this.sound('swing');
    }
    this.killTarget = this.findKillTarget();
    this.interaction = findInteraction(this);
    if (input.pressed('stealthKill')) {
      if (this.killTarget) this.stealthKill(this.killTarget);
      else if (this.enemies.some((e) => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 70)) p.say('Tienes que acercarte por la espalda sin que te vea.');
    }
    if (input.pressed('interact') && this.interaction) doInteraction(this, this.interaction);
    if (input.pressed('eat')) quickUse(this, 'comer');
    if (input.pressed('drink')) quickUse(this, 'beber');
    if (input.pressed('heal')) quickUse(this, 'curar');
    if (input.pressed('torch')) {
      if (this.inventory.has('antorcha')) useItem(this, 'antorcha');
      else p.say('No tienes antorcha.');
    }

    p.update(dt, input, this.world);
    this.resolvePlayerAttack();
    for (const e of this.enemies) if (Math.abs(e.x - p.x) < ACTIVE_R && Math.abs(e.y - p.y) < ACTIVE_R) e.update(dt, this);
    for (const a of this.animals) if (Math.abs(a.x - p.x) < ACTIVE_R && Math.abs(a.y - p.y) < ACTIVE_R) a.update(dt, this);
    this.terrain.prefetch(this.camera.ix, this.camera.iy, this.camera.viewW, this.camera.viewH, 4);

    this.camera.update(dt, p);
    const zone = this.zoneAt(p.x, p.y);
    if (zone !== this.zone) {
      this.zone = zone;
      this.banner = { zone, age: 0, nueva: this.discover(zone) };
    }
    emitAmbient(this, dt);
    if (Math.hypot(p.vx, p.vy) > 150 && Math.random() < dt * 12 && p.terrain === 'land') {
      this.particles.add({ type: 'dust', x: p.x, y: p.y - 1, vx: -p.vx * 0.1, vy: -6, life: 0.35, color: '#a08060', fade: true });
    }
    this.particles.update(dt);
  }

  resolvePlayerAttack() {
    const p = this.player;
    const a = p.attack;
    if (!a || a.resolved || a.t < 0.07) return;
    a.resolved = true;
    const knife = this.inventory.has('cuchillo');
    const dmg = Math.round((knife ? ITEMS.cuchillo.dano : 6) * p.stats.damageFactor);
    const range = knife ? 34 : 26;
    let hitAny = false;
    for (const e of this.targets()) {
      if ((e.level || 0) !== p.level) continue;
      const dx = e.x - p.x;
      const dy = e.y - 10 - (p.y - 12);
      const d = Math.hypot(dx, dy);
      if (d > range + 6) continue;
      if (d > 12 && Math.abs(angDiff(Math.atan2(dy, dx), a.angle)) > 1.15) continue;
      const crit = e.kind === 'guerrero' && !e.alerted && !e.sees;
      const amount = crit ? dmg * 2 : dmg;
      e.hit(amount, p.x, p.y, this);
      this.floater(e.x, e.y - 50, crit ? `${amount}!` : `${amount}`, crit ? '#ffd84a' : '#ffffff');
      for (let i = 0; i < 7; i++) {
        this.particles.add({ type: 'spark', x: e.x, y: e.y - 16, vx: Math.cos(a.angle) * 60 + (Math.random() - 0.5) * 80, vy: (Math.random() - 0.8) * 80, g: 220, life: 0.35, color: e.kind === 'cangrejo' ? '#ff8a52' : '#c8281e', fade: true });
      }
      hitAny = true;
    }
    if (hitAny) {
      this.hitstop = 0.07;
      this.shake = Math.max(this.shake, 0.12);
      this.sound('hit');
    }
  }

  /** Enemigo desprevenido al alcance para una eliminación silenciosa por la espalda. */
  findKillTarget() {
    const p = this.player;
    if (p.state !== 'walk' || p.swimming) return null;
    for (const e of this.enemies) {
      if (e.dead || e.alerted || e.level !== p.level) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > 30) continue;
      const behind = Math.abs(angDiff(Math.atan2(p.y - e.y, p.x - e.x), e.angle)) > 1.9;
      if (behind || (!e.sees && e.detect < 0.5)) return e;
    }
    return null;
  }

  stealthKill(e) {
    const p = this.player;
    p.startAttack(Math.atan2(e.y - p.y, e.x - p.x));
    p.attackCd = 0.6;
    e.die(this, true);
    p.say('¡Eliminación silenciosa!');
    this.hitstop = 0.12;
    this.sound('kill');
    for (let i = 0; i < 10; i++) {
      this.particles.add({ type: 'spark', x: e.x, y: e.y - 18, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, g: 200, life: 0.5, color: '#9a1a14', fade: true });
    }
  }

  respawn() {
    const p = this.player;
    const [sx, sy] = WORLD_PLACES.spawn;
    p.placeAt(sx * TILE, sy * TILE, 0);
    p.hp = Math.ceil(p.maxHp / 2);
    p.sick = 0;
    p.needs.hambre = Math.max(p.needs.hambre, 40);
    p.needs.sed = Math.max(p.needs.sed, 40);
    p.invuln = 2;
    p.torchOn = false;
    this.deathT = -1;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.x = e.home.x;
      e.y = e.home.y;
      e.state = 'patrol';
      e.detect = 0;
      e.lastSeen = null;
    }
    this.camera.snap(p);
    p.say('Te despiertas en la playa, magullado.');
  }

  updateInventoryUI() {
    const input = this.input;
    const cols = 6;
    if (input.pressed('right')) this.invSel = Math.min(SLOTS - 1, this.invSel + 1);
    if (input.pressed('left')) this.invSel = Math.max(0, this.invSel - 1);
    if (input.pressed('down')) this.invSel = Math.min(SLOTS - 1, this.invSel + cols);
    if (input.pressed('up')) this.invSel = Math.max(0, this.invSel - cols);
    const hover = this.inventoryHover;
    if (hover !== undefined && hover >= 0) this.invSel = hover;
    const slot = this.inventory.slots[this.invSel];
    if (slot && (input.pressed('confirm') || input.pressed('interact') || (input.mouse.pressed[0] && hover >= 0))) useItem(this, slot.id);
  }

  render() {
    const menu = this.screens[this.screen];
    if (menu) {
      menu.render(this.ctx);
      return;
    }
    this.renderer.render(this.ctx);
    this.ambience.drawGrade(this.ctx, this.zone, this.lastDt || 0.016);
    const c = this.ctx;
    if (this.weather.flash > 0) {
      c.fillStyle = `rgba(235, 240, 255, ${(this.weather.flash * 0.55).toFixed(3)})`;
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    }
    if (this.hurtFlash > 0) {
      c.fillStyle = `rgba(200, 20, 10, ${(this.hurtFlash * 0.5).toFixed(3)})`;
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    }
    if (this.screen === 'impact') drawImpact(c, this);
    else drawHud(c, this);
  }

  /** Dibujo sobre la iluminación (conos de visión, indicadores). */
  afterWorld(l) {
    for (const e of this.enemies) {
      if (Math.abs(e.x - this.camera.ix - 320) < 520 && Math.abs(e.y - this.camera.iy - 180) < 380) e.drawOverlay(l, this);
    }
  }
}

/** Objeto del suelo como entidad dibujable (icono con sombra y vaivén). */
function pickupEntity(pk) {
  return {
    kind: 'objeto',
    x: pk.x,
    y: pk.y,
    sortY: pk.y,
    shadow: { rx: 6, ry: 2 },
    draw(l, game, t) {
      const icon = game.sprites.icons[pk.item];
      const bob = Math.round(Math.sin(t * 3 + pk.x) * 1.5);
      l.drawImage(icon, Math.round(pk.x - 8), Math.round(pk.y - 17 + bob));
      if (Math.sin(t * 4 + pk.y) > 0.92) {
        l.fillStyle = '#fff';
        l.fillRect(Math.round(pk.x + 4), Math.round(pk.y - 16 + bob), 1, 1);
      }
    },
  };
}

/** Destello sobre un cuerpo con botín sin registrar. */
function bodySparkle(b) {
  return {
    kind: 'botin',
    x: b.x,
    y: b.y + 1,
    sortY: b.y + 1,
    draw(l, game, t) {
      if (Math.sin(t * 5) > 0.6) {
        l.fillStyle = '#ffe066';
        l.fillRect(Math.round(b.x + 6), Math.round(b.y - 14), 1, 3);
        l.fillRect(Math.round(b.x + 5), Math.round(b.y - 13), 3, 1);
      }
    },
  };
}
