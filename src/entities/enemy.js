// Guerrero de la tribu: patrulla, ve con un cono de visión (con línea de visión),
// oye los ruidos, sospecha (?), investiga, persigue (!), ataca, busca y abandona.
// Nunca sabe dónde está el jugador si no lo ve ni lo oye (TRASPASO §2.3).

import { PHYSICS_STEP, TILE } from '../config.js';
import { moveAxis, lineOfSight } from '../world/collision.js';
import { Animator, drawFrame } from '../render/animation.js';
import { glyph } from '../gfx/glyphs.js';

const BOX_W = 14;
const BOX_H = 8;
const WALK = { right: 'walk', left: 'walk_left', up: 'walk_up', down: 'walk_down' };
const RUN = { right: 'run', left: 'run_left', up: 'run_up', down: 'run_down' };

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class Warrior {
  constructor(id, frames, x, y, waypoints, opts = {}) {
    this.id = id;
    this.kind = 'guerrero';
    this.nombre = 'al guerrero';
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.waypoints = waypoints;
    this.wp = 0;
    this.level = 0;
    this.hp = 60;
    this.maxHp = 60;
    this.angle = opts.angle ?? Math.PI / 2;
    this.state = 'patrol';
    this.detect = 0;
    this.timer = 0;
    this.lastSeen = null;
    this.lostTime = 0;
    this.attackT = 0;
    this.cooldown = 0;
    this.hurtT = 0;
    this.kx = 0;
    this.ky = 0;
    this.vx = 0;
    this.vy = 0;
    this.avoid = 0;
    this.avoidDir = 1;
    this.icon = null;
    this.iconT = 0;
    this.sees = false;
    this.range = 150;
    this.anim = new Animator(frames);
    this.anim.hold('walk_down', 0);
    this.guard = !!opts.guard;
  }

  get dead() {
    return this.state === 'dead';
  }

  get alerted() {
    return this.state === 'chase' || this.state === 'attack';
  }

  get sortY() {
    return this.dead ? this.y - 6 : this.y;
  }

  get shadow() {
    return this.dead ? null : { rx: 8, ry: 3, oy: -1 };
  }

  get facing() {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    return Math.abs(c) >= Math.abs(s) ? (c > 0 ? 'right' : 'left') : s > 0 ? 'down' : 'up';
  }

  box() {
    return { x: this.x - BOX_W / 2, y: this.y - BOX_H, w: BOX_W, h: BOX_H };
  }

  /** Alcance de la vista según la hora, la lluvia y si el jugador lleva luz. */
  visionRange(game) {
    const p = game.player;
    let r = 150 * game.weather.visionFactor;
    if (game.clock.darkness > 0.45) {
      const lit = p.torchOn || game.world.lights.some((pr) => Math.hypot(pr.x - p.x, pr.y - p.y) < pr.light.r * 0.6);
      r *= lit ? 1.1 : 0.5;
    }
    return r;
  }

  canSee(game) {
    const p = game.player;
    if (p.dead || p.level !== this.level || p.state === 'climb') return false;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (p.hidden && d > 26) return false;
    if (d < 20) return true;
    if (d > this.range) return false;
    const half = this.alerted ? 1.2 : 0.75;
    if (Math.abs(angDiff(Math.atan2(dy, dx), this.angle)) > half) return false;
    return lineOfSight(game.world, this.x, this.y - 10, p.x, p.y - 10, this.level);
  }

  say(icon, time = 1.2) {
    this.icon = icon;
    this.iconT = time;
  }

  hit(dmg, fx, fy, game) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hurtT = 0.22;
    const d = Math.hypot(this.x - fx, this.y - fy) || 1;
    this.kx = ((this.x - fx) / d) * 200;
    this.ky = ((this.y - fy) / d) * 200;
    if (this.hp <= 0) {
      this.die(game);
      return;
    }
    this.lastSeen = { x: game.player.x, y: game.player.y };
    if (!this.alerted) this.startChase(game);
  }

  die(game, silent = false) {
    this.state = 'dead';
    this.hp = 0;
    this.icon = null;
    game.bodies.push({ x: this.x, y: this.y, nombre: 'al guerrero caído', loot: [['cecina', 1], ['fibra', 1]], looted: false });
    game.stats.eliminaciones++;
    if (silent) game.stats.sigilosas++;
  }

  startChase(game) {
    if (this.state !== 'chase' && this.state !== 'attack') {
      this.say('!', 1.5);
      game.sound('alert');
    }
    this.state = 'chase';
    this.detect = 1;
    this.lostTime = 0;
    // Avisa a los compañeros cercanos.
    for (const o of game.enemies) {
      if (o !== this && !o.dead && !o.alerted && o.kind === 'guerrero' && Math.hypot(o.x - this.x, o.y - this.y) < 230) {
        o.lastSeen = { ...this.lastSeen };
        o.state = 'investigate';
        o.detect = Math.max(o.detect, 0.6);
        o.timer = 0;
        o.say('?', 1.2);
      }
    }
  }

  turnTo(target, dt, rate = 5) {
    const d = angDiff(target, this.angle);
    this.angle += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
  }

  /** Camina hacia (tx, ty) a `speed` px/s. Devuelve la distancia que queda. */
  walkTo(game, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) { this.vx = this.vy = 0; return d; }
    let ux = dx / d;
    let uy = dy / d;
    if (this.avoid > 0) {
      // Rodea el obstáculo moviéndose en perpendicular un momento.
      const px = -uy * this.avoidDir;
      const py = ux * this.avoidDir;
      ux = ux * 0.3 + px;
      uy = uy * 0.3 + py;
      const n = Math.hypot(ux, uy);
      ux /= n; uy /= n;
      this.avoid -= dt;
    }
    this.vx = ux * speed;
    this.vy = uy * speed;
    this.turnTo(Math.atan2(uy, ux), dt, 7);
    const x0 = this.x;
    const y0 = this.y;
    this.move(game, dt);
    const moved = Math.hypot(this.x - x0, this.y - y0);
    if (moved < speed * dt * 0.3 && this.avoid <= 0) {
      this.avoid = 0.5;
      this.avoidDir = Math.random() < 0.5 ? -1 : 1;
    }
    return d;
  }

  move(game, dt) {
    const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP));
    const h = dt / steps;
    const b = this.box();
    for (let i = 0; i < steps; i++) {
      if (moveAxis(game.world, b, 'x', (this.vx + this.kx) * h, this.level, false, 6, 1).length) this.kx = 0;
      if (moveAxis(game.world, b, 'y', (this.vy + this.ky) * h, this.level, false, 6, 1).length) this.ky = 0;
    }
    this.x = b.x + BOX_W / 2;
    this.y = b.y + BOX_H;
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.player;
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.iconT = Math.max(0, this.iconT - dt);
    if (this.iconT <= 0 && !this.alerted && this.state !== 'suspicious') this.icon = null;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const kd = Math.exp(-9 * dt);
    this.kx *= kd;
    this.ky *= kd;

    this.range = this.visionRange(game);
    this.sees = this.canSee(game);
    const dist = Math.hypot(p.x - this.x, p.y - this.y);

    // Percepción: la vista llena el medidor; el oído le hace sospechar.
    if (this.sees) {
      this.lastSeen = { x: p.x, y: p.y };
      let rate = 1.5 * (1.25 - dist / Math.max(1, this.range));
      if (p.crouching) rate *= 0.5;
      if (p.running) rate *= 1.4;
      if (dist < 45) rate *= 3;
      rate *= p.stats.detectFactor; // Sigilo / Percepción
      this.detect = Math.min(1, this.detect + rate * dt);
    } else if (!this.alerted) {
      this.detect = Math.max(0, this.detect - 0.3 * dt);
    }
    const heard = !this.sees && !p.dead && p.level === this.level && dist < p.noise * game.weather.hearingFactor;
    if (heard && !this.alerted) {
      this.lastSeen = { x: p.x, y: p.y };
      this.detect = Math.max(this.detect, 0.4);
      if (this.state === 'patrol' || this.state === 'wait' || this.state === 'return') {
        this.state = 'suspicious';
        this.timer = 0.8;
        this.say('?', 1.5);
      }
    }
    if (this.detect >= 1 && !this.alerted) this.startChase(game);
    else if (this.detect > 0.3 && (this.state === 'patrol' || this.state === 'wait' || this.state === 'return')) {
      this.state = 'suspicious';
      this.timer = 1;
      this.say('?', 1.5);
    }

    switch (this.state) {
      case 'patrol': {
        const [tx, ty] = this.waypoints[this.wp];
        if (this.walkTo(game, tx, ty, 42, dt) < 4) {
          this.state = 'wait';
          this.timer = 1.4 + Math.random() * 1.4;
          this.baseAngle = this.angle;
        }
        break;
      }
      case 'wait': {
        this.vx = this.vy = 0;
        this.timer -= dt;
        // Mira a un lado y a otro.
        this.angle = (this.baseAngle ?? this.angle) + Math.sin((2.8 - this.timer) * 1.6) * 0.9;
        if (this.timer <= 0) {
          this.wp = (this.wp + 1) % this.waypoints.length;
          this.state = 'patrol';
        }
        break;
      }
      case 'suspicious': {
        this.vx = this.vy = 0;
        if (this.lastSeen) this.turnTo(Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), dt, 4);
        this.timer -= dt;
        if (this.timer <= 0 && !this.sees) {
          this.state = this.lastSeen ? 'investigate' : 'return';
          this.timer = 0;
        }
        break;
      }
      case 'investigate': {
        const t = this.lastSeen || this.home;
        if (this.walkTo(game, t.x, t.y, 58, dt) < 10) {
          this.state = 'search';
          this.timer = 2.5;
          this.baseAngle = this.angle;
        }
        break;
      }
      case 'search': {
        this.vx = this.vy = 0;
        this.timer -= dt;
        this.angle = (this.baseAngle ?? 0) + (2.5 - this.timer) * 2.4;
        if (this.timer <= 0) {
          this.state = 'return';
          this.lastSeen = null;
          this.say('…', 1.2);
        }
        break;
      }
      case 'return': {
        let best = 0;
        let bd = Infinity;
        this.waypoints.forEach(([x, y], i) => { const d = Math.hypot(x - this.x, y - this.y); if (d < bd) { bd = d; best = i; } });
        this.wp = best;
        const [tx, ty] = this.waypoints[best];
        if (this.walkTo(game, tx, ty, 42, dt) < 6) this.state = 'patrol';
        break;
      }
      case 'chase': {
        if (this.sees) this.lostTime = 0;
        else this.lostTime += dt;
        const t = this.lastSeen || { x: p.x, y: p.y };
        const tooFar = Math.hypot(this.x - this.home.x, this.y - this.home.y) > 430;
        if (p.dead || tooFar || this.lostTime > 3.5) {
          // Abandona la persecución.
          this.state = 'search';
          this.timer = 3;
          this.detect = 0.5;
          this.baseAngle = this.angle;
          this.say('?', 2);
          if (tooFar) this.lastSeen = null;
          break;
        }
        const d = this.walkTo(game, t.x, t.y, 120, dt);
        if (this.sees && dist < 25 && this.cooldown <= 0) {
          this.state = 'attack';
          this.attackT = 0;
          this.vx = this.vy = 0;
        } else if (!this.sees && d < 8) {
          this.state = 'search';
          this.timer = 3.5;
          this.baseAngle = this.angle;
        }
        break;
      }
      case 'attack': {
        this.vx = this.vy = 0;
        this.attackT += dt;
        this.turnTo(Math.atan2(p.y - this.y, p.x - this.x), dt, 6);
        if (this.attackT >= 0.42 && !this.struck) {
          this.struck = true;
          if (dist < 34 && p.level === this.level && p.takeHit(12, this.x, this.y)) {
            game.onPlayerHit(12);
          }
        }
        if (this.attackT >= 0.65) {
          this.struck = false;
          this.cooldown = 0.6;
          this.state = 'chase';
        }
        break;
      }
    }
    if (this.state === 'wait' || this.state === 'suspicious' || this.state === 'search' || this.state === 'attack') this.move(game, dt);
    this.selectAnimation(dt);
  }

  selectAnimation(dt) {
    const a = this.anim;
    const speed = Math.hypot(this.vx, this.vy);
    if (this.hurtT > 0) a.hold('hurt', 0);
    else if (this.state === 'attack') a.hold(this.attackT < 0.42 ? 'up' : 'reach', 0);
    else if (speed > 80) a.play(RUN[this.facing], 12, dt);
    else if (speed > 5) a.play(WALK[this.facing], 7, dt);
    else a.hold(WALK[this.facing], 0);
  }

  draw(l, game, t) {
    const img = game.sprites.tribe.image;
    const side = Math.cos(this.angle) >= 0 ? 1 : -1;
    const flip = ['hurt', 'up', 'reach'].includes(this.anim.name) ? side : 1;
    if (this.dead) {
      // Tumbado en el suelo.
      const [sx, sy, sw, sh] = this.anim.frames.hurt[0];
      l.save();
      l.translate(Math.round(this.x), Math.round(this.y - 4));
      l.rotate(Math.PI / 2 * side);
      l.drawImage(img, sx, sy, sw, sh, -Math.round(sw / 2), -sh + 6, sw, sh);
      l.restore();
      return;
    }
    // Lanza (detrás si mira hacia arriba).
    const spear = () => {
      const hx = Math.round(this.x + side * 8);
      const top = this.state === 'attack' && this.attackT >= 0.42 ? -30 : -50;
      l.fillStyle = '#5a361b';
      l.fillRect(hx, Math.round(this.y + top + 6), 1, Math.abs(top) - 2);
      l.fillStyle = '#17150f';
      l.fillRect(hx + 1, Math.round(this.y + top + 6), 1, Math.abs(top) - 2);
      l.fillStyle = '#a19e88';
      l.fillRect(hx - 1, Math.round(this.y + top + 2), 3, 4);
      l.fillRect(hx, Math.round(this.y + top), 1, 2);
    };
    if (this.facing === 'up') spear();
    const telegraph = this.state === 'attack' && this.attackT < 0.42 && Math.floor(this.attackT * 16) % 2 === 0;
    if (telegraph) l.filter = 'brightness(1.8)';
    drawFrame(l, img, this.anim.frame, this.x, this.y, flip);
    if (telegraph) l.filter = 'none';
    if (this.facing !== 'up') spear();
    // Plumas.
    l.fillStyle = '#e04a3a';
    l.fillRect(Math.round(this.x - 2), Math.round(this.y - 52), 2, 5);
    l.fillStyle = '#f2d65a';
    l.fillRect(Math.round(this.x + 1), Math.round(this.y - 51), 2, 4);
    void t;
  }

  /** Cono de visión, indicador (? / !) y medidor de detección: se dibujan sobre la iluminación. */
  drawOverlay(l, game) {
    if (this.dead) return;
    const half = this.alerted ? 1.2 : 0.75;
    const col = this.alerted ? '255, 70, 50' : this.detect > 0.3 || this.state === 'suspicious' || this.state === 'investigate' || this.state === 'search' ? '255, 170, 40' : '255, 235, 120';
    const ox = this.x;
    const oy = this.y - 6;
    l.beginPath();
    l.moveTo(ox, oy);
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const a = this.angle - half + (2 * half * i) / N;
      let r = 8;
      for (; r < this.range; r += 8) {
        const x = ox + Math.cos(a) * r;
        const y = oy + Math.sin(a) * r;
        const g = game.map.groundAt(Math.floor(x / TILE), Math.floor(y / TILE));
        if (g === -1 || game.map.levelAt(Math.floor(x / TILE), Math.floor(y / TILE)) > this.level || game.map.isCliff(Math.floor(x / TILE), Math.floor(y / TILE))) break;
        if (!lineOfSight(game.world, ox, oy - 4, x, y - 4, this.level)) break;
      }
      l.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
    }
    l.closePath();
    l.fillStyle = `rgba(${col}, 0.14)`;
    l.fill();
    l.strokeStyle = `rgba(${col}, 0.35)`;
    l.lineWidth = 1;
    l.stroke();
    // Indicador sobre la cabeza.
    const icon = this.alerted ? '!' : this.icon;
    if (icon) {
      const g = glyph(icon, icon === '!' ? 'red' : 'yellow');
      l.drawImage(g, Math.round(this.x - g.width / 2), Math.round(this.y - 66 + Math.sin(game.time * 8) * 1));
    }
    if (!this.alerted && this.detect > 0.02) {
      const w = 14;
      l.fillStyle = '#17150f';
      l.fillRect(Math.round(this.x - w / 2 - 1), Math.round(this.y - 58), w + 2, 4);
      l.fillStyle = this.detect > 0.6 ? '#ff7a30' : '#ffd84a';
      l.fillRect(Math.round(this.x - w / 2), Math.round(this.y - 57), Math.round(w * this.detect), 2);
    }
  }
}
