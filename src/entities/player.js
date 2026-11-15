// Jugador en vista cenital: movimiento libre en 8 direcciones, correr, agacharse,
// saltar huecos (arco y sombra), bajar salientes, escalar paredes con aguante y
// agua poco profunda / profunda. (x, y) son los pies; la colisión es una caja
// pequeña en los pies.

import { PLAYER as P, PHYSICS_STEP, TILE, SPRITE_SCALE } from '../config.js';
import { DEFAULT_ATTRS, deriveStats } from '../data/attributes.js';
import { approach, clamp } from '../core/math.js';
import { moveAxis, boxFree, nudgeFree } from '../world/collision.js';
import { G } from '../world/tiles.js';
import { Animator, drawFrame } from '../render/animation.js';

const WALK_ANIM = { right: 'walk', left: 'walk_left', up: 'walk_up', down: 'walk_down' };
const RUN_ANIM = { right: 'run', left: 'run_left', up: 'run_up', down: 'run_down' };

export class Player {
  constructor(atlasFrames) {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.level = 0;            // altura lógica en la que está
    this.facing = 'down';      // 'up' | 'down' | 'left' | 'right'
    this.lastSide = 1;         // último lado (1 derecha, −1 izquierda) para sprites laterales
    this.state = 'walk';       // 'walk' | 'jump' | 'hop' | 'climb' | 'fall' | 'stunned'
    this.stamina = P.staminaMax;
    this.staminaDelay = 0;
    this.running = false;
    this.crouching = false;
    this.terrain = 'land';     // 'land' | 'shallow' | 'deep' | 'tallgrass'
    this.z = 0;                // altura visual (saltos)
    this.timer = 0;
    this.pushTimer = 0;
    this.jump = null;
    this.hop = null;
    this.climb = null;
    this.message = null;       // { text, time }
    this.anim = new Animator(atlasFrames);
    this.anim.hold('walk_down', 0);
    this.flip = 1;
    this.kind = 'jugador';
    // Supervivencia y combate.
    this.maxHp = 100;
    this.hp = 100;
    this.needs = { hambre: 78, sed: 66, energia: 90 };
    this.attack = null;
    this.attackCd = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.pick = 0;
    this.kx = 0;
    this.ky = 0;
    this.torchOn = false;
    this.starve = 0;
    this.sick = 0;             // segundos de intoxicación que quedan
    this.sickTick = 0;
    this.setAttributes(DEFAULT_ATTRS);
    this.hp = this.maxHp;
  }

  /** Aplica los atributos de la creación de personaje (TRASPASO §1.5). */
  setAttributes(attrs) {
    this.attrs = { ...attrs };
    this.stats = deriveStats(this.attrs);
    this.maxHp = this.stats.maxHp;
    this.hp = Math.min(this.hp, this.maxHp);
  }

  get agility() {
    return this.attrs.agilidad;
  }

  /** Probabilidad de enfermar con un alimento de riesgo `riesgo` (0–1), según la Inteligencia. */
  sicknessChance(riesgo) {
    return riesgo * this.stats.sickFactor;
  }

  get dead() {
    return this.hp <= 0;
  }

  /** Agachado en la hierba alta: los enemigos no lo ven salvo muy de cerca. */
  get hidden() {
    return this.crouching && this.terrain === 'tallgrass' && this.state === 'walk';
  }

  /** Radio de ruido (px) que pueden oír los enemigos. */
  get noise() {
    return this.baseNoise * this.stats.noiseFactor;
  }

  get baseNoise() {
    if (this.attack) return 110;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed < 8) return 0;
    if (this.crouching) return 18;
    if (this.terrain === 'shallow' || this.terrain === 'deep') return 80;
    return this.running ? 150 : 65;
  }

  /** Empieza un ataque cuerpo a cuerpo en la dirección `angle` (radianes). */
  startAttack(angle) {
    if (this.state !== 'walk' || this.swimming || this.attackCd > 0 || this.dead) return false;
    this.attack = { t: 0, angle, resolved: false };
    this.attackCd = 0.42;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.facing = Math.abs(c) >= Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
    if (Math.abs(c) > 0.2) this.lastSide = c > 0 ? 1 : -1;
    return true;
  }

  /** Recibe un golpe desde (fx, fy). Devuelve true si le ha afectado. */
  takeHit(amount, fx, fy) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = 0.7;
    this.hurtT = 0.25;
    const d = Math.hypot(this.x - fx, this.y - fy) || 1;
    this.kx = ((this.x - fx) / d) * 230;
    this.ky = ((this.y - fy) / d) * 230;
    if (this.state === 'climb') this.state = 'walk';
    return true;
  }

  updateNeeds(dt) {
    const n = this.needs;
    const moving = Math.hypot(this.vx, this.vy) > 8;
    n.hambre = Math.max(0, n.hambre - dt / 6);
    n.sed = Math.max(0, n.sed - dt / 4);
    n.energia = Math.max(0, n.energia - (dt / 10) * (this.running && moving ? 3 : 1));
    if (this.sick > 0) {
      // Intoxicación: sed más rápida y pierde vida poco a poco.
      this.sick = Math.max(0, this.sick - dt);
      n.sed = Math.max(0, n.sed - dt / 4);
      this.sickTick += dt;
      if (this.sickTick > 2.5) {
        this.sickTick = 0;
        this.hp = Math.max(1, this.hp - 1);
      }
    }
    if (n.hambre <= 0 || n.sed <= 0) {
      this.starve += dt;
      if (this.starve > 2) {
        this.starve = 0;
        this.hp = Math.max(0, this.hp - 2);
      }
    }
  }

  /** Caja de colisión de los pies. */
  get box() {
    return { x: this.x - P.boxW / 2, y: this.y - P.boxH, w: P.boxW, h: P.boxH };
  }

  setBox(b) {
    this.x = b.x + P.boxW / 2;
    this.y = b.y + P.boxH;
  }

  get swimming() {
    return this.terrain === 'deep' && this.state === 'walk';
  }

  /** Coloca los pies en (fx, fy) en el nivel indicado, quieto y de pie. */
  placeAt(fx, fy, level = this.level) {
    this.x = fx;
    this.y = fy;
    this.level = level;
    this.vx = 0;
    this.vy = 0;
    this.z = 0;
    this.state = 'walk';
    this.jump = this.hop = this.climb = null;
  }

  say(text) {
    this.message = { text, time: 2.5 };
  }

  /** Tipo de suelo bajo el centro de la caja. */
  groundUnder(map) {
    const [tx, ty] = map.tileOf(this.x, this.y - P.boxH / 2);
    return map.groundAt(tx, ty);
  }

  updateTerrain(map) {
    const g = this.groundUnder(map);
    this.terrain = g === G.DEEP ? 'deep' : g === G.SHALLOW ? 'shallow' : g === G.TALL_GRASS ? 'tallgrass' : 'land';
  }

  update(dt, input, world) {
    const map = world.map;
    this.world = world;
    this.updateTerrain(map);
    if (this.message && (this.message.time -= dt) <= 0) this.message = null;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.pick = Math.max(0, this.pick - dt);
    if (this.attack && (this.attack.t += dt) > 0.24) this.attack = null;
    const kd = Math.exp(-10 * dt);
    this.kx *= kd;
    this.ky *= kd;
    if (this.dead) return;
    this.updateNeeds(dt);

    switch (this.state) {
      case 'walk': this.updateWalk(dt, input, world); break;
      case 'jump': this.updateJump(dt, world); break;
      case 'hop': this.updateHop(dt); break;
      case 'climb': this.updateClimb(dt, input, world); break;
      case 'fall': this.updateFall(dt); break;
      case 'stunned':
        if ((this.timer -= dt) <= 0) this.state = 'walk';
        break;
    }

    if (this.state === 'climb') {
      this.staminaDelay = 0.6;
    } else if (this.staminaDelay > 0) {
      this.staminaDelay -= dt;
    } else {
      this.stamina = Math.min(P.staminaMax, this.stamina + P.staminaRegen * dt);
    }

    this.updateTerrain(map);
    this.selectAnimation(dt, input);
  }

  // ---------------------------------------------------------------- andar
  updateWalk(dt, input, world) {
    const map = world.map;
    const ax = input.axisX();
    const ay = input.axisY();
    const len = Math.hypot(ax, ay);
    const dx = len ? ax / len : 0;
    const dy = len ? ay / len : 0;
    const deep = this.terrain === 'deep';

    this.crouching = input.isDown('crouch') && !deep;
    this.running = input.isDown('run') && !this.crouching && !deep && len > 0;
    const sf = this.stats.speedFactor;
    let speed = (this.crouching ? P.crouchSpeed : this.running ? P.runSpeed : P.walkSpeed) * sf;
    if (this.terrain === 'shallow') speed *= P.shallowFactor;
    if (deep) speed = P.swimSpeed * sf;
    if (this.running && this.needs.energia < 12) {
      this.running = false;
      speed = P.walkSpeed * sf;
    }
    if (this.attack) speed *= 0.45;

    const rate = (len ? P.accel : P.decel) * dt;
    this.vx = approach(this.vx, dx * speed, rate);
    this.vy = approach(this.vy, dy * speed, rate);
    if (len) this.updateFacing(ax, ay);

    this.moveSubsteps(dt, world, false, ay === 0, ax === 0, speed);

    // ¿Empujando contra una pared escalable o un saliente?
    const action = this.edgeAction(map, ay);
    if (action === 'hop') {
      this.startHop(world);
    } else if (action === 'climbUp' || action === 'climbDown') {
      this.pushTimer += dt;
      if (this.pushTimer >= P.climbPushTime) this.startClimb(world, action === 'climbUp' ? 'up' : 'down');
    } else {
      this.pushTimer = 0;
    }

    if (this.state === 'walk' && input.pressed('jump') && !deep && !this.crouching) {
      this.startJump(dx, dy);
    }
  }

  /** En diagonal se mantiene la dirección actual si es una de las dos componentes. */
  updateFacing(ax, ay) {
    const h = ax > 0 ? 'right' : ax < 0 ? 'left' : null;
    const v = ay > 0 ? 'down' : ay < 0 ? 'up' : null;
    if (h && v) {
      if (this.facing !== h && this.facing !== v) this.facing = h;
    } else {
      this.facing = h || v;
    }
    if (ax) this.lastSide = ax > 0 ? 1 : -1;
  }

  moveSubsteps(dt, world, airborne, slideX, slideY, speed) {
    const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP - 1e-9));
    const h = dt / steps;
    const box = this.box;
    for (let i = 0; i < steps; i++) {
      const slideStep = speed * h;
      if (moveAxis(world, box, 'x', (this.vx + this.kx) * h, this.level, airborne, slideX ? P.cornerSlide : 0, slideStep).length) { this.vx = 0; this.kx = 0; }
      if (moveAxis(world, box, 'y', (this.vy + this.ky) * h, this.level, airborne, slideY ? P.cornerSlide : 0, slideStep).length) { this.vy = 0; this.ky = 0; }
    }
    this.setBox(box);
  }

  /** Mira qué hay justo delante de la caja en vertical: pared para escalar o saliente. */
  edgeAction(map, ay) {
    if (ay === 0) return null;
    const b = this.box;
    const probeY = ay < 0 ? b.y - 1 : b.y + b.h + 1;
    const ty = Math.floor(probeY / TILE);
    const tx = Math.floor(this.x / TILE);
    const g = map.groundAt(tx, ty);
    const i = map.inBounds(tx, ty) ? map.idx(tx, ty) : -1;
    if (i < 0) return null;
    // La caja tiene que tener libre ese lado salvo por el propio acantilado.
    if (ay < 0 && g === G.CLIFF && map.cliffBase[i] === this.level) return 'climbUp';
    if (ay > 0 && g === G.CLIFF && map.cliffTop[i] === this.level) return 'climbDown';
    if (ay > 0 && g === G.LEDGE_S && map.cliffTop[i] === this.level) {
      const txl = Math.floor((b.x + 0.5) / TILE);
      const txr = Math.floor((b.x + b.w - 0.5) / TILE);
      if (map.groundAt(txl, ty) === G.LEDGE_S && map.groundAt(txr, ty) === G.LEDGE_S) return 'hop';
    }
    return null;
  }

  // ---------------------------------------------------------------- saltar
  startJump(dx, dy) {
    const dist = this.stats.jumpTiles * TILE * (this.running ? 1 : P.walkJumpFactor);
    const v = dist / P.jumpTime;
    this.jump = { t: 0, vx: dx * v, vy: dy * v, startX: this.x, startY: this.y, startLevel: this.level };
    this.vx = this.jump.vx;
    this.vy = this.jump.vy;
    this.state = 'jump';
  }

  updateJump(dt, world) {
    const map = world.map;
    const j = this.jump;
    j.t = Math.min(P.jumpTime, j.t + dt);
    const k = j.t / P.jumpTime;
    this.z = 4 * P.jumpArc * k * (1 - k);
    this.moveSubsteps(dt, world, true, false, false, 0);
    if (j.t < P.jumpTime) return;

    this.z = 0;
    if (this.groundUnder(map) === G.CHASM) {
      this.state = 'fall';
      this.timer = 0.6;
      return;
    }
    // Si ha caído con la caja medio encima de una grieta, se empuja a tierra firme.
    const box = this.box;
    nudgeFree(world, box, this.level, P.boxW);
    this.setBox(box);
    this.state = 'walk';
    this.jump = null;
  }

  updateFall(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const j = this.jump;
    this.placeAt(j.startX, j.startY, j.startLevel);
    this.say('¡Te has caído por la grieta!');
  }

  // ---------------------------------------------------------------- saliente
  startHop(world) {
    const map = world.map;
    const ty = Math.floor((this.y + 1) / TILE);
    const tx = Math.floor(this.x / TILE);
    const toLevel = map.cliffBase[map.idx(tx, ty)];
    const toY = (ty + 1) * TILE + P.boxH + 2;
    const target = { ...this.box, y: toY - P.boxH };
    if (!boxFree(world, target, toLevel)) return;
    this.hop = { t: 0, fromY: this.y, toY, toLevel };
    this.state = 'hop';
    this.facing = 'down';
    this.vx = this.vy = 0;
  }

  updateHop(dt) {
    const h = this.hop;
    h.t = Math.min(P.hopTime, h.t + dt);
    const k = h.t / P.hopTime;
    this.y = h.fromY + (h.toY - h.fromY) * k;
    this.z = 4 * P.hopArc * k * (1 - k);
    if (k >= 1) {
      this.level = h.toLevel;
      this.z = 0;
      this.state = 'walk';
      this.hop = null;
    }
  }

  // ---------------------------------------------------------------- escalar
  startClimb(world, dir) {
    const map = world.map;
    const tx = Math.floor(this.x / TILE);
    const b = this.box;
    const row = Math.floor((dir === 'up' ? b.y - 1 : b.y + b.h + 1) / TILE);
    const i = map.idx(tx, row);
    let l = tx;
    let r = tx;
    while (map.isCliff(l - 1, row)) l--;
    while (map.isCliff(r + 1, row)) r++;
    this.climb = {
      topRow: map.cliffColumnTop(tx, row),
      bottomRow: map.cliffColumnBottom(tx, row),
      top: map.cliffTop[i],
      base: map.cliffBase[i],
      minX: l * TILE + P.boxW / 2,
      maxX: (r + 1) * TILE - P.boxW / 2,
      t: 0,
    };
    this.x = clamp(this.x, this.climb.minX, this.climb.maxX);
    if (dir === 'down') this.y += 2;
    this.state = 'climb';
    this.vx = this.vy = 0;
    this.pushTimer = 0;
    this.crouching = this.running = false;
  }

  updateClimb(dt, input, world) {
    const c = this.climb;
    const ax = input.axisX();
    const ay = input.axisY();
    const speed = this.stats.climbSpeed;
    const moving = ax !== 0 || ay !== 0;
    this.y += ay * speed * dt;
    this.x = clamp(this.x + ax * speed * 0.5 * dt, c.minX, c.maxX);
    this.vy = ay * speed;
    c.t += moving ? dt : 0;
    this.stamina = Math.max(0, this.stamina - this.stats.climbDrain * (moving ? 1 : 0.4) * dt);

    const topY = c.topRow * TILE - 1;               // pies dentro del tile de arriba
    const bottomY = (c.bottomRow + 1) * TILE + P.boxH + 1; // caja entera debajo de la pared
    if (this.y <= topY) {
      const box = { x: this.x - P.boxW / 2, y: topY - P.boxH, w: P.boxW, h: P.boxH };
      if (boxFree(world, box, c.top)) {
        this.placeAt(this.x, topY, c.top);
        this.facing = 'up';
        return;
      }
      this.y = topY + 1; // algo bloquea arriba: se queda colgado
    } else if (this.y >= bottomY) {
      this.placeAt(this.x, bottomY, c.base);
      this.facing = 'down';
      return;
    }
    if (this.stamina <= 0) {
      this.placeAt(this.x, bottomY, c.base);
      this.state = 'stunned';
      this.timer = 0.6;
      this.facing = 'down';
      this.say('¡Sin aguante! Te has caído de la pared.');
    }
  }

  // ---------------------------------------------------------------- animación
  selectAnimation(dt, input) {
    const a = this.anim;
    this.flip = 1;
    const side = this.facing === 'left' || this.facing === 'right';
    if (side) this.lastSide = this.facing === 'right' ? 1 : -1;

    switch (this.state) {
      case 'climb': {
        a.hold('up', 0);
        // Sin animación de escalar: se alterna el volteo del sprite al moverse.
        this.flip = Math.floor(this.climb.t * 6) % 2 ? -1 : 1;
        return;
      }
      case 'jump':
      case 'hop': {
        const k = this.state === 'jump' ? this.jump.t / P.jumpTime : this.hop.t / P.hopTime;
        if (side) {
          a.hold('jump', k < 0.15 ? 1 : k < 0.55 ? 2 : k < 0.9 ? 3 : 4);
          this.flip = this.lastSide;
        } else {
          a.hold(WALK_ANIM[this.facing], 1); // no hay salto mirando arriba/abajo
        }
        return;
      }
      case 'fall':
      case 'stunned':
        a.hold('hurt', 0);
        this.flip = this.lastSide;
        return;
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (this.hurtT > 0 || this.dead) {
      a.hold('hurt', 0);
      this.flip = this.lastSide;
    } else if (this.attack) {
      if (side) {
        a.hold('reach', 0);
        this.flip = this.lastSide;
      } else {
        a.hold(WALK_ANIM[this.facing], 2);
      }
    } else if (this.pick > 0) {
      a.hold('pick', 0);
      this.flip = this.lastSide;
    } else if (this.crouching) {
      if (speed > 5) a.play('crouch', 8, dt);
      else a.hold('crouch', 0);
      this.flip = this.lastSide; // agacharse solo existe de lado
    } else if (this.swimming) {
      if (speed > 5) a.play(WALK_ANIM[this.facing], 5, dt);
      else a.hold(WALK_ANIM[this.facing], 0);
    } else if (speed > P.walkSpeed * this.stats.speedFactor + 10) {
      a.play(RUN_ANIM[this.facing], 13 * (speed / (P.runSpeed * this.stats.speedFactor)), dt);
    } else if (speed > 8) {
      a.play(WALK_ANIM[this.facing], Math.max(4, 9 * (speed / (P.walkSpeed * this.stats.speedFactor))), dt);
    } else {
      a.hold(WALK_ANIM[this.facing], 0);
    }
  }

  /** Nombre legible del estado (HUD de depuración y pruebas). */
  get stateName() {
    switch (this.state) {
      case 'jump': return 'saltando';
      case 'hop': return 'bajando saliente';
      case 'climb': return 'escalando';
      case 'fall': return 'cayendo';
      case 'stunned': return 'aturdido';
    }
    if (this.swimming) return 'nadando';
    const speed = Math.hypot(this.vx, this.vy);
    if (this.crouching) return 'agachado';
    if (speed > P.walkSpeed * this.stats.speedFactor + 10) return 'corriendo';
    if (speed > 8) return 'andando';
    return 'quieto';
  }

  /** Clave de ordenación por profundidad: la y de los pies. */
  get sortY() {
    return this.y;
  }

  get shadow() {
    if (this.state === 'climb' || this.terrain === 'deep') return null;
    const s = 1 - this.z / 60;
    return { rx: 9 * s, ry: 3 * s, oy: -1 };
  }

  draw(ctx, game, time) {
    const atlas = game.sprites.player.image;
    const { x, y } = this;
    let scale = SPRITE_SCALE;
    if (this.state === 'fall') scale *= Math.max(0.15, this.timer / 0.6);

    const inWater = this.state === 'walk' && (this.terrain === 'deep' || this.terrain === 'shallow');
    const sink = !inWater ? 0 : this.terrain === 'deep' ? 18 : 4;
    const waterLine = y - (this.terrain === 'deep' ? 2 : 3);
    if (inWater) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 60, y - 120, 120, waterLine - (y - 120));
      ctx.clip();
    }
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0;
    if (!flicker) drawFrame(ctx, atlas, this.anim.frame, x, y - this.z + sink, this.flip, scale);
    if (this.torchOn && this.state !== 'climb') {
      const fl = game.sprites.flames.small;
      const f = fl[Math.floor(time * 10) % fl.length];
      const tx = Math.round(x + this.lastSide * 9);
      ctx.fillStyle = '#5a361b';
      ctx.fillRect(tx, Math.round(y - 26), 2, 12);
      ctx.drawImage(f, Math.round(tx - f.width / 2 + 1), Math.round(y - 26 - f.height + 3));
    }
    if (this.attack) drawSlash(ctx, x, y - 16, this.attack);
    if (inWater) {
      ctx.restore();
      const r = 12 + Math.sin(time * 4) * 1.5;
      ctx.strokeStyle = 'rgba(220, 245, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, waterLine, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Tajo del ataque: arco de píxeles que barre la dirección del golpe. */
function drawSlash(ctx, x, y, atk) {
  const k = Math.min(1, atk.t / 0.16);
  const a0 = atk.angle - 1.1;
  const a1 = a0 + 2.2 * k;
  for (let a = a0; a <= a1; a += 0.07) {
    const fade = 1 - (a1 - a) / 2.2;
    for (let r = 18; r <= 27; r++) {
      const edge = r === 27 || r === 18;
      ctx.fillStyle = edge ? `rgba(255, 220, 120, ${0.7 * fade})` : `rgba(255, 255, 240, ${0.85 * fade})`;
      if (r % 2 === 0 || edge) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.8), 1, 1);
    }
  }
}
