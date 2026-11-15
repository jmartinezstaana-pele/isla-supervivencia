// Jugador en vista cenital: movimiento libre en 8 direcciones, correr, agacharse,
// saltar huecos (arco y sombra), bajar salientes, escalar paredes con aguante y
// agua poco profunda / profunda. (x, y) son los pies; la colisión es una caja
// pequeña en los pies.

import {
  PLAYER as P, PHYSICS_STEP, TILE, SPRITE_SCALE, DEFAULT_AGILITY,
  jumpDistanceTiles, climbSpeed, climbDrain,
} from '../config.js';
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
    this.agility = DEFAULT_AGILITY;
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

  update(dt, input, map) {
    this.updateTerrain(map);
    if (this.message && (this.message.time -= dt) <= 0) this.message = null;

    switch (this.state) {
      case 'walk': this.updateWalk(dt, input, map); break;
      case 'jump': this.updateJump(dt, map); break;
      case 'hop': this.updateHop(dt); break;
      case 'climb': this.updateClimb(dt, input, map); break;
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
  updateWalk(dt, input, map) {
    const ax = input.axisX();
    const ay = input.axisY();
    const len = Math.hypot(ax, ay);
    const dx = len ? ax / len : 0;
    const dy = len ? ay / len : 0;
    const deep = this.terrain === 'deep';

    this.crouching = input.isDown('crouch') && !deep;
    this.running = input.isDown('run') && !this.crouching && !deep && len > 0;
    let speed = this.crouching ? P.crouchSpeed : this.running ? P.runSpeed : P.walkSpeed;
    if (this.terrain === 'shallow') speed *= P.shallowFactor;
    if (deep) speed = P.swimSpeed;

    const rate = (len ? P.accel : P.decel) * dt;
    this.vx = approach(this.vx, dx * speed, rate);
    this.vy = approach(this.vy, dy * speed, rate);
    if (len) this.updateFacing(ax, ay);

    this.moveSubsteps(dt, map, false, ay === 0, ax === 0, speed);

    // ¿Empujando contra una pared escalable o un saliente?
    const action = this.edgeAction(map, ay);
    if (action === 'hop') {
      this.startHop(map);
    } else if (action === 'climbUp' || action === 'climbDown') {
      this.pushTimer += dt;
      if (this.pushTimer >= P.climbPushTime) this.startClimb(map, action === 'climbUp' ? 'up' : 'down');
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

  moveSubsteps(dt, map, airborne, slideX, slideY, speed) {
    const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP - 1e-9));
    const h = dt / steps;
    const box = this.box;
    for (let i = 0; i < steps; i++) {
      const slideStep = speed * h;
      if (moveAxis(map, box, 'x', this.vx * h, this.level, airborne, slideX ? P.cornerSlide : 0, slideStep).length) this.vx = 0;
      if (moveAxis(map, box, 'y', this.vy * h, this.level, airborne, slideY ? P.cornerSlide : 0, slideStep).length) this.vy = 0;
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
    const dist = jumpDistanceTiles(this.agility) * TILE * (this.running ? 1 : P.walkJumpFactor);
    const v = dist / P.jumpTime;
    this.jump = { t: 0, vx: dx * v, vy: dy * v, startX: this.x, startY: this.y, startLevel: this.level };
    this.vx = this.jump.vx;
    this.vy = this.jump.vy;
    this.state = 'jump';
  }

  updateJump(dt, map) {
    const j = this.jump;
    j.t = Math.min(P.jumpTime, j.t + dt);
    const k = j.t / P.jumpTime;
    this.z = 4 * P.jumpArc * k * (1 - k);
    this.moveSubsteps(dt, map, true, false, false, 0);
    if (j.t < P.jumpTime) return;

    this.z = 0;
    if (this.groundUnder(map) === G.CHASM) {
      this.state = 'fall';
      this.timer = 0.6;
      return;
    }
    // Si ha caído con la caja medio encima de una grieta, se empuja a tierra firme.
    const box = this.box;
    nudgeFree(map, box, this.level, P.boxW);
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
  startHop(map) {
    const ty = Math.floor((this.y + 1) / TILE);
    const tx = Math.floor(this.x / TILE);
    const toLevel = map.cliffBase[map.idx(tx, ty)];
    const toY = (ty + 1) * TILE + P.boxH + 2;
    const target = { ...this.box, y: toY - P.boxH };
    if (!boxFree(map, target, toLevel)) return;
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
  startClimb(map, dir) {
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

  updateClimb(dt, input, map) {
    const c = this.climb;
    const ax = input.axisX();
    const ay = input.axisY();
    const speed = climbSpeed(this.agility);
    const moving = ax !== 0 || ay !== 0;
    this.y += ay * speed * dt;
    this.x = clamp(this.x + ax * speed * 0.5 * dt, c.minX, c.maxX);
    this.vy = ay * speed;
    c.t += moving ? dt : 0;
    this.stamina = Math.max(0, this.stamina - climbDrain(this.agility) * (moving ? 1 : 0.4) * dt);

    const topY = c.topRow * TILE - 1;               // pies dentro del tile de arriba
    const bottomY = (c.bottomRow + 1) * TILE + P.boxH + 1; // caja entera debajo de la pared
    if (this.y <= topY) {
      const box = { x: this.x - P.boxW / 2, y: topY - P.boxH, w: P.boxW, h: P.boxH };
      if (boxFree(map, box, c.top)) {
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
    if (this.crouching) {
      if (speed > 5) a.play('crouch', 8, dt);
      else a.hold('crouch', 0);
      this.flip = this.lastSide; // agacharse solo existe de lado
    } else if (this.swimming) {
      if (speed > 5) a.play(WALK_ANIM[this.facing], 5, dt);
      else a.hold(WALK_ANIM[this.facing], 0);
    } else if (speed > P.walkSpeed + 10) {
      a.play(RUN_ANIM[this.facing], 13 * (speed / P.runSpeed), dt);
    } else if (speed > 8) {
      a.play(WALK_ANIM[this.facing], Math.max(4, 9 * (speed / P.walkSpeed)), dt);
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
    if (speed > P.walkSpeed + 10) return 'corriendo';
    if (speed > 8) return 'andando';
    return 'quieto';
  }

  /** Clave de ordenación por profundidad: la y de los pies. */
  get sortY() {
    return this.y;
  }

  draw(ctx, atlas, time) {
    const { x, y } = this;
    let scale = SPRITE_SCALE;
    if (this.state === 'fall') scale *= Math.max(0.15, this.timer / 0.6);

    // Sombra (se encoge al saltar).
    if (this.state !== 'climb' && this.terrain !== 'deep') {
      const s = 1 - this.z / 60;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(x, y - 3, 10 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const inWater = this.state === 'walk' && (this.terrain === 'deep' || this.terrain === 'shallow');
    const sink = !inWater ? 0 : this.terrain === 'deep' ? 18 : 4;
    const waterLine = y - (this.terrain === 'deep' ? 2 : 3);
    if (inWater) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 60, y - 120, 120, waterLine - (y - 120));
      ctx.clip();
    }
    drawFrame(ctx, atlas, this.anim.frame, x, y - this.z + sink, this.flip, scale);
    if (inWater) {
      ctx.restore();
      const r = 12 + Math.sin(time * 4) * 1.5;
      ctx.strokeStyle = 'rgba(220, 245, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, waterLine, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.state === 'walk' && this.terrain === 'tallgrass') drawGrassOverlay(ctx, x, y, time);
  }
}

/** Briznas de hierba alta por delante de los pies. */
function drawGrassOverlay(ctx, x, y, time) {
  ctx.strokeStyle = '#2f6b27';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    const bx = x + i * 4;
    const sway = Math.sin(time * 3 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(bx, y + 1);
    ctx.lineTo(bx + sway, y - 13 + Math.abs(i));
    ctx.stroke();
  }
}
