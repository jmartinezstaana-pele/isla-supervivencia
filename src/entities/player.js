// Jugador: controlador de plataformas (andar, correr, saltar, agacharse, bajar
// de plataformas y nado básico) y selección de animación.

import { PLAYER as P, PHYSICS_STEP, TILE, DEFAULT_AGILITY, jumpHeightTiles } from '../config.js';
import { approach, sign } from '../core/math.js';
import { moveX, moveY, groundBelow, boxFree } from '../world/physics.js';
import { Animator, drawFrame } from '../render/animation.js';

export class Player {
  constructor(atlasFrames) {
    this.w = P.width;
    this.h = P.height;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.agility = DEFAULT_AGILITY;

    this.onGround = false;
    this.groundType = null; // 'solid' | 'platform' | null
    this.crouching = false;
    this.running = false;
    this.swimming = false;
    this.headUnderwater = false;

    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = false;   // subiendo por un salto (para el salto de altura variable)
    this.jumpTime = 0;      // tiempo desde el último salto
    this.dropTimer = 0;     // bajando a través de una plataforma
    this.landTimer = 0;     // animación de aterrizaje
    this.lastLandSpeed = 0;

    this.anim = new Animator(atlasFrames);
    this.anim.hold('walk', 0);
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get feetY() {
    return this.y + this.h;
  }

  /** Coloca al jugador con los pies en (fx, fy) y sin velocidad. */
  placeAt(fx, fy) {
    this.x = fx - this.w / 2;
    this.y = fy - this.h;
    this.vx = 0;
    this.vy = 0;
    this.jumping = false;
    this.dropTimer = 0;
  }

  /** Velocidad inicial de salto para alcanzar la altura que da la Agilidad. */
  get jumpVelocity() {
    return Math.sqrt(2 * P.gravity * jumpHeightTiles(this.agility) * TILE);
  }

  /** Cambia la altura de la caja manteniendo los pies. Devuelve false si no cabe. */
  setHeight(h, map) {
    if (h === this.h) return true;
    const newY = this.y + this.h - h;
    if (h > this.h && !boxFree(map, this.x, newY, this.w, h)) return false;
    this.y = newY;
    this.h = h;
    return true;
  }

  updateWater(map) {
    const cx = this.centerX;
    this.swimming = map.isWater(Math.floor(cx / TILE), Math.floor((this.y + this.h * 0.5) / TILE));
    this.chestInWater = map.isWater(Math.floor(cx / TILE), Math.floor((this.y + this.h * 0.3) / TILE));
    this.headUnderwater = map.isWater(Math.floor(cx / TILE), Math.floor((this.y + 4) / TILE));
  }

  update(dt, input, map) {
    const ax = input.axisX();
    const wantDown = input.isDown('down');
    const jumpHeld = input.isDown('jump');
    this.running = input.isDown('run');

    if (input.pressed('jump')) this.jumpBuffer = P.jumpBuffer;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.jumpTime += dt;
    this.landTimer = Math.max(0, this.landTimer - dt);

    this.updateWater(map);

    // --- Agacharse (solo en el suelo y fuera del agua). Para levantarse hace falta sitio.
    if (wantDown && this.onGround && !this.swimming) {
      this.crouching = this.setHeight(P.crouchHeight, map) || this.crouching;
    } else if (this.crouching && this.setHeight(P.height, map)) {
      this.crouching = false;
    }

    // --- Bajar de una plataforma de un sentido: S + Espacio encima de ella.
    if (wantDown && this.jumpBuffer > 0 && this.onGround && this.groundType === 'platform') {
      this.dropTimer = P.dropThroughTime;
      this.jumpBuffer = 0;
      this.onGround = false;
      this.coyote = 0;
    }

    // --- Movimiento horizontal.
    let maxSpeed = this.crouching ? P.crouchSpeed : this.running ? P.runSpeed : P.walkSpeed;
    let accel;
    if (this.swimming) {
      maxSpeed = P.water.maxSpeed;
      accel = 600;
    } else if (this.onGround) {
      const turning = ax !== 0 && this.vx !== 0 && sign(ax) !== sign(this.vx);
      accel = ax === 0 || turning ? P.groundDecel : P.groundAccel;
    } else {
      accel = P.airAccel;
    }
    const target = ax * maxSpeed;
    // En el aire se conserva el impulso de la carrera aunque se suelte Mayús.
    const keepMomentum = !this.onGround && !this.swimming && ax !== 0 &&
      sign(ax) === sign(this.vx) && Math.abs(this.vx) > maxSpeed;
    if (!keepMomentum) this.vx = approach(this.vx, target, accel * dt);
    if (ax !== 0) this.facing = ax;

    // --- Salto (con margen tras salir de un borde y pulsación recordada).
    this.coyote = this.onGround ? P.coyoteTime : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.swimming && this.dropTimer <= 0) {
      if (!this.crouching || this.setHeight(P.height, map)) {
        this.crouching = false;
        this.startJump(this.jumpVelocity);
      }
    }
    // Salir del agua de un impulso cuando la cabeza asoma.
    if (this.swimming && !this.headUnderwater && this.jumpBuffer > 0) {
      this.startJump(this.jumpVelocity);
    }

    // --- Integración con subpasos (ningún subpaso mueve más de medio tile).
    const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP - 1e-9));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.integrate(h, map, jumpHeld, wantDown);
    }

    // Si cae fuera del mundo (no debería ocurrir en el mapa de prueba), reaparece.
    if (this.y > map.pixelHeight + 200) {
      this.placeAt(map.spawn.x, map.spawn.y);
    }

    this.updateWater(map);
    this.selectAnimation(dt, ax);
  }

  startJump(v) {
    this.vy = -v;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = true;
    this.jumpTime = 0;
  }

  integrate(h, map, jumpHeld, wantDown) {
    this.updateWater(map);
    if (this.swimming && !(this.jumping && this.vy < 0)) {
      const W = P.water;
      this.vy += W.gravity * h;
      if (wantDown) this.vy = approach(this.vy, W.swimDown, 900 * h);
      else if (this.chestInWater) this.vy -= W.buoyancy * h;
      if (jumpHeld && !wantDown) this.vy = approach(this.vy, -W.swimUp, 900 * h);
      this.vy *= Math.exp(-W.drag * h);
      this.vy = Math.min(this.vy, W.maxSink);
    } else {
      let g = P.gravity;
      if (this.jumping && this.vy < 0 && !jumpHeld) g *= P.jumpCutGravity;
      this.vy = Math.min(this.vy + g * h, P.maxFall);
    }
    if (this.vy >= 0) this.jumping = false;

    if (moveX(this, map, this.vx * h) !== 0) this.vx = 0;

    const ignorePlatforms = this.dropTimer > 0;
    const fallSpeed = this.vy;
    const hitY = moveY(this, map, this.vy * h, ignorePlatforms);
    if (hitY === 1) {
      if (!this.onGround && fallSpeed > 380) {
        this.landTimer = 0.12;
        this.lastLandSpeed = fallSpeed;
      }
      this.vy = 0;
    } else if (hitY === -1) {
      this.vy = 0;
      this.jumping = false;
    }

    const ground = this.vy >= 0 ? groundBelow(this, map, ignorePlatforms) : null;
    this.onGround = ground !== null;
    this.groundType = ground;
    if (this.onGround) this.jumping = false;
    this.dropTimer = Math.max(0, this.dropTimer - h);
  }

  selectAnimation(dt, ax) {
    const a = this.anim;
    const speed = Math.abs(this.vx);
    if (this.swimming) {
      // Sustituto hasta tener animación de nado (Fase 4).
      a.play('walk', 5, dt);
    } else if (!this.onGround) {
      if (this.jumping && this.jumpTime < 0.08) a.hold('jump', 0);
      else if (this.vy < -120) a.hold('jump', 1);
      else if (this.vy < 160) a.hold('jump', 2);
      else a.hold('jump', 3);
    } else if (this.landTimer > 0 && ax === 0) {
      a.hold('jump', this.landTimer > 0.06 ? 4 : 5);
    } else if (this.crouching) {
      if (speed > 5) a.play('crouch', 8, dt);
      else a.hold('crouch', 0);
    } else if (speed > P.walkSpeed + 10) {
      a.play('run', 14 * (speed / P.runSpeed), dt);
    } else if (speed > 8) {
      a.play('walk', Math.max(4, 10 * (speed / P.walkSpeed)), dt);
    } else {
      // Reposo: primer fotograma de "walk". El fotograma "idle" del atlas está de
      // frente y con otro estilo (TRASPASO §3.5), así que de momento no se usa.
      a.hold('walk', 0);
    }
  }

  /** Nombre legible del estado actual (HUD de depuración y pruebas). */
  get stateName() {
    if (this.swimming) return 'nadando';
    if (!this.onGround) return this.vy < 0 ? 'saltando' : 'cayendo';
    if (this.crouching) return 'agachado';
    const speed = Math.abs(this.vx);
    if (speed > P.walkSpeed + 10) return 'corriendo';
    if (speed > 8) return 'andando';
    return 'quieto';
  }

  draw(ctx, atlas) {
    drawFrame(ctx, atlas, this.anim.frame, this.centerX, this.feetY, this.facing);
  }
}
