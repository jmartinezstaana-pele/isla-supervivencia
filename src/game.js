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
import { LANDING_RESULTS, OX as LAND_OX, OY as LAND_OY } from './world/landingMap.js';
import { TitleScreen } from './ui/title.js';
import { CreationScreen } from './ui/creation.js';
import { IntroScreen } from './ui/intro.js';
import { LandingScreen } from './ui/landing.js';
import { buildIsland, zoneAt, PLACES, shoreX } from './world/islandMap.js';
import { PropGrid, nudgeFree } from './world/collision.js';
import { buildProps, initialPickups, makeFlotsam } from './world/props.js';
import { renderTerrain } from './gfx/terrain.js';
import { G } from './world/tiles.js';
import { Clock } from './systems/clock.js';
import { Weather } from './systems/weather.js';
import { Inventory, SLOTS } from './systems/inventory.js';
import { findInteraction, doInteraction, useItem, quickUse } from './systems/interaction.js';
import { ITEMS } from './data/items.js';

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export const ZONE_NAMES = {
  playa: ['Playa del naufragio', 'Peligro bajo'],
  selva: ['La selva', 'Peligro medio · jabalíes'],
  ruinas: ['Ruinas antiguas', 'Algo brilla entre las piedras'],
  campamento: ['Campamento de la tribu', 'Peligro alto · no te dejes ver'],
};

export class Game {
  constructor({ ctx, input, sprites, images, audio }) {
    this.ctx = ctx;
    this.input = input;
    this.sprites = sprites;
    this.images = images;
    this.audio = audio;
    this.screen = 'title';
    this.rng = Math.random;
    this.map = buildIsland();
    this.terrain = renderTerrain(this.map);
    this.camera = new Camera(this.map.pixelWidth, this.map.pixelHeight);
    this.renderer = new Renderer(this);
    this.water = new WaterLayer(this.map, this.terrain);
    this.particles = new Particles();
    this.ambience = new Ambience();
    this.lighting = new Lighting();
    this.debug = false;
    this.fps = 60;
    this.waterfall = null;
    this.character = { attrs: { ...DEFAULT_ATTRS }, colors: { ...DEFAULT_COLORS } };
    this.resetWorld();
    this.waterfall = this.findWaterfall();
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
    this.world = { map: this.map, grid: new PropGrid(this.map.pixelWidth, this.map.pixelHeight), props: buildProps(this.map) };
    for (const p of this.world.props) if (p.solid) this.world.grid.add(p);
    this.pickups = initialPickups(this.map, this.world.props);
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
    this.zone = zoneAt(this.player.x, this.player.y);
    this.banner = { zone: this.zone, age: 0 };
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
    const R = LANDING_RESULTS[result.zone];
    const p = this.player;
    const wreck = this.world.props.find((pr) => pr.kind === 'avion');
    const map = this.map;
    let tx = result.x - LAND_OX;
    let ty = result.y - LAND_OY;
    const inside = tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
    let place;
    if (result.zone === 'mar') {
      // El avión se hunde: la corriente te deja nadando cerca de la costa y arrastra los restos a la playa.
      ty = Math.max(3, Math.min(map.height - 4, inside ? ty : ty < 0 ? 4 : map.height - 5));
      const shore = shoreX(ty);
      const sx = inside ? Math.min(tx, shore - 4.5) : shore - 4.5;
      p.placeAt(sx * TILE, (Math.floor(ty) + 0.6) * TILE, 0);
      this.removeProp(wreck);
      const fl = makeFlotsam((shore + 2) * TILE, (Math.floor(ty) + 0.8) * TILE, wreck.loot);
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
    this.plane = { zone: result.zone, estado: R.avion };
    this.camera.snap(p);
    this.zone = zoneAt(p.x, p.y);
    this.impact = { result, R, t: 0, place };
    this.screen = 'impact';
    this.input.clear();
  }

  /** Busca un sitio para los restos del avión cerca del punto de impacto, en la misma zona. */
  findWreckSpot(zone, tx, ty) {
    const map = this.map;
    const wantLevel = zone === 'ruinas' ? 1 : 0;
    const ok = (cx, cy) => {
      // Caja de los restos (96 × 16) y sitio para el jugador debajo, en suelo pisable del mismo nivel.
      for (let y = cy - 16; y <= cy + 34; y += 8) {
        for (let x = cx - 50; x <= cx + 50; x += 8) {
          const gx = Math.floor(x / TILE);
          const gy = Math.floor(y / TILE);
          if (!map.inBounds(gx, gy)) return false;
          const g = map.groundAt(gx, gy);
          if (map.levelAt(gx, gy) !== wantLevel || g === G.RIVER || g === G.WATERFALL || g === G.CLIFF || g === G.LEDGE_S || g === G.DEEP || g === G.SHALLOW || g === G.BRIDGE) return false;
        }
      }
      if (zoneAt(cx, cy) !== zone && zone !== 'ruinas') return false;
      return !this.world.props.some((pr) => pr.interact && pr.kind !== 'avion' && Math.abs(pr.x - cx) < 70 && Math.abs(pr.y - cy) < 46);
    };
    const x0 = Math.max(2, Math.min(map.width - 3, tx)) * TILE;
    const y0 = Math.max(2, Math.min(map.height - 3, ty)) * TILE;
    for (let r = 0; r <= 16 * TILE; r += 8) {
      const n = Math.max(1, Math.round((2 * Math.PI * r) / 16));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = Math.round(x0 + Math.cos(a) * r);
        const cy = Math.round(y0 + Math.sin(a) * r);
        if (ok(cx, cy)) return { x: cx, y: cy, level: wantLevel };
      }
    }
    const [wx, wy] = PLACES.wreck;
    return { x: wx * TILE, y: wy * TILE, level: 0 };
  }

  /** Quita la vegetación y los props sin botín que queden debajo de los restos. */
  clearAround(cx, cy, level) {
    for (const pr of [...this.world.props]) {
      if (pr.interact || pr.kind === 'avion' || (pr.level || 0) !== level) continue;
      if (pr.x > cx - 74 && pr.x < cx + 74 && pr.y > cy - 40 && pr.y < cy + 40) this.removeProp(pr);
    }
    this.pickups = this.pickups.filter((pk) => !(pk.x > cx - 56 && pk.x < cx + 56 && pk.y > cy - 20 && pk.y < cy + 8));
  }

  removeProp(pr) {
    const i = this.world.props.indexOf(pr);
    if (i >= 0) this.world.props.splice(i, 1);
    if (pr.solid) this.world.grid.remove(pr);
  }

  addProp(pr) {
    this.world.props.push(pr);
    if (pr.solid) this.world.grid.add(pr);
  }

  /** Tras la pantalla del impacto: empieza a jugar (y la tribu acude si caíste en su campamento). */
  endImpact() {
    const im = this.impact;
    this.start();
    if (im && im.result.zone === 'campamento') {
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.lastSeen = { x: im.place.x, y: im.place.y + 20 };
        e.state = 'investigate';
        e.detect = Math.max(e.detect, 0.6);
        e.say('!', 2);
      }
      this.player.say('¡El estruendo ha alertado a la tribu!');
      this.sound('alert');
    } else if (im && im.result.zone === 'mar') {
      this.player.say(im.result.forced ? 'Amerizas. La corriente te arrastra hasta la costa.' : 'El avión se hunde. ¡Nada hasta la orilla!');
    } else if (im) {
      this.player.say(im.R.avion === 'reparable' ? 'El avión aguanta. Quizá se pueda reparar.' : 'El avión ha quedado destrozado.');
    }
  }

  spawnEnemies() {
    const T = (v) => v * TILE;
    const f = this.sprites.tribe.frames;
    this.enemies = [
      new Warrior(1, f, T(67.2), T(17.4), [[T(67.2), T(17.4)], [T(67.2), T(24)]], { angle: Math.PI / 2 }),
      new Warrior(2, f, T(71.5), T(17.6), [[T(71.5), T(17.6)], [T(78.6), T(17.6)], [T(78.6), T(23.2)], [T(71.5), T(23.2)]], { angle: 0 }),
      new Warrior(3, f, T(77.2), T(14.6), [[T(77.2), T(14.6)], [T(81.3), T(18.6)], [T(77.6), T(25.6)], [T(74), T(22.6)]], { angle: Math.PI / 2 }),
    ];
    this.animals = [new Boar(T(35.5), T(26.5))];
    for (const y of [12.5, 19.5, 26, 30.5]) this.animals.push(new Crab(T(shoreX(y) + 1.6), T(y)));
    // Que nadie empiece metido dentro de un árbol o una roca.
    for (const e of [...this.enemies, ...this.animals]) {
      const b = { x: e.x - 12, y: e.y - 8, w: 24, h: 8 };
      nudgeFree(this.world, b, 0, 64);
      e.x = b.x + 12;
      e.y = b.y + 8;
      e.home = { x: e.x, y: e.y };
    }
  }

  findWaterfall() {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y1 = 0;
    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        if (this.map.groundAt(tx, ty) === G.WATERFALL) { x0 = Math.min(x0, tx); x1 = Math.max(x1, tx); y1 = Math.max(y1, ty); }
      }
    }
    return { x: ((x0 + x1 + 1) / 2) * TILE, y: (y1 + 1) * TILE + 4, w: (x1 - x0 + 1) * TILE };
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
    const list = [this.player, ...this.enemies, ...this.animals];
    for (const pk of this.pickups) list.push(pickupEntity(pk));
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
      this.invOpen = false;
    }
    if (input.pressed('pause')) {
      if (this.invOpen) this.invOpen = false;
      else if (this.charOpen) this.charOpen = false;
      else this.paused = !this.paused;
    }
    if (this.charOpen) {
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
    for (const e of this.enemies) e.update(dt, this);
    for (const a of this.animals) a.update(dt, this);

    this.camera.update(dt, p);
    const zone = zoneAt(p.x, p.y);
    if (zone !== this.zone) {
      this.zone = zone;
      this.banner = { zone, age: 0 };
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
    const [sx, sy] = PLACES.spawn;
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
