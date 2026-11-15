// Animales: el jabalí (avisa, embiste en línea recta, se aturde si choca) y los
// cangrejos de la playa (inofensivos, huyen; dan algo de comida).

import { PHYSICS_STEP } from '../config.js';
import { moveAxis, lineOfSight } from '../world/collision.js';
import { G } from '../world/tiles.js';

function moveBody(e, game, dt, w, h) {
  const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP));
  const s = dt / steps;
  const b = { x: e.x - w / 2, y: e.y - h, w, h };
  let blocked = false;
  for (let i = 0; i < steps; i++) {
    if (moveAxis(game.world, b, 'x', (e.vx + (e.kx || 0)) * s, 0).length) blocked = true;
    if (moveAxis(game.world, b, 'y', (e.vy + (e.ky || 0)) * s, 0).length) blocked = true;
  }
  e.x = b.x + w / 2;
  e.y = b.y + h;
  return blocked;
}

export class Boar {
  constructor(x, y) {
    this.kind = 'jabali';
    this.nombre = 'al jabalí';
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.level = 0;
    this.hp = 45;
    this.maxHp = 45;
    this.state = 'wander';
    this.timer = 1;
    this.vx = 0;
    this.vy = 0;
    this.kx = 0;
    this.ky = 0;
    this.side = 1;
    this.hurtT = 0;
    this.target = null;
    this.t = 0;
  }

  get dead() {
    return this.state === 'dead';
  }

  get sortY() {
    return this.y;
  }

  get shadow() {
    return this.dead ? null : { rx: 14, ry: 4, oy: -1 };
  }

  hit(dmg, fx, fy, game) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hurtT = 0.2;
    const d = Math.hypot(this.x - fx, this.y - fy) || 1;
    this.kx = ((this.x - fx) / d) * 150;
    this.ky = ((this.y - fy) / d) * 150;
    if (this.hp <= 0) {
      this.state = 'dead';
      game.bodies.push({ x: this.x, y: this.y, nombre: 'el jabalí', loot: [['carne', 2]], looted: false });
      game.stats.eliminaciones++;
      return;
    }
    if (this.state === 'wander' || this.state === 'cooldown') {
      this.state = 'windup';
      this.timer = 0.5;
    }
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.player;
    this.t += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    const kd = Math.exp(-8 * dt);
    this.kx *= kd;
    this.ky *= kd;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);
    const notices = !p.dead && p.level === 0 && dist < 125 && !p.hidden && lineOfSight(game.world, this.x, this.y - 8, p.x, p.y - 8);
    switch (this.state) {
      case 'wander': {
        this.timer -= dt;
        if (!this.target || this.timer <= 0) {
          const a = Math.random() * Math.PI * 2;
          this.target = { x: this.home.x + Math.cos(a) * 70, y: this.home.y + Math.sin(a) * 45 };
          this.timer = 2 + Math.random() * 3;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) { this.vx = (dx / d) * 26; this.vy = (dy / d) * 26; } else { this.vx = this.vy = 0; }
        if (moveBody(this, game, dt, 24, 8)) this.target = null;
        if (notices) {
          this.state = 'windup';
          this.timer = 0.75;
          game.sound('boar');
        }
        break;
      }
      case 'windup': {
        // Rasca el suelo y resopla antes de embestir.
        this.vx = this.vy = 0;
        moveBody(this, game, dt, 24, 8);
        this.side = p.x >= this.x ? 1 : -1;
        this.timer -= dt;
        if (Math.random() < dt * 20) game.particles.add({ type: 'dust', x: this.x - this.side * 10, y: this.y - 2, vx: -this.side * 30, vy: -10, life: 0.4, color: '#7f5a2f', fade: true, size: 1 });
        if (this.timer <= 0) {
          const d = Math.max(1, dist);
          this.cdx = (p.x - this.x) / d;
          this.cdy = (p.y - this.y) / d;
          this.state = 'charge';
          this.timer = 1.1;
          this.hitPlayer = false;
        }
        break;
      }
      case 'charge': {
        this.vx = this.cdx * 255;
        this.vy = this.cdy * 255;
        this.side = this.vx >= 0 ? 1 : -1;
        const blocked = moveBody(this, game, dt, 24, 8);
        if (Math.random() < dt * 30) game.particles.add({ type: 'dust', x: this.x, y: this.y - 1, vx: -this.vx * 0.1, vy: -8, life: 0.35, color: '#8a6a45', fade: true, size: 1 });
        if (!this.hitPlayer && dist < 20 && p.takeHit(16, this.x - this.cdx * 10, this.y - this.cdy * 10)) {
          this.hitPlayer = true;
          game.onPlayerHit(16);
        }
        this.timer -= dt;
        if (blocked) {
          this.state = 'stunned';
          this.timer = 1.4;
          this.vx = this.vy = 0;
          game.shake = Math.max(game.shake, 0.15);
        } else if (this.timer <= 0) {
          this.state = 'cooldown';
          this.timer = 1.2;
        }
        break;
      }
      case 'stunned':
      case 'cooldown': {
        this.vx = this.vy = 0;
        moveBody(this, game, dt, 24, 8);
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = notices ? 'windup' : 'wander';
          this.timer = 0.7;
        }
        break;
      }
    }
  }

  draw(l, game) {
    const frames = game.sprites.boar;
    if (this.dead) {
      const f = frames[0];
      l.save();
      l.translate(Math.round(this.x), Math.round(this.y - 6));
      l.scale(this.side, -1);
      l.drawImage(f, -Math.round(f.width / 2), -f.height / 2 - 4);
      l.restore();
      return;
    }
    const moving = Math.hypot(this.vx, this.vy) > 5;
    const f = frames[moving ? Math.floor(this.t * (this.state === 'charge' ? 16 : 7)) % 3 : 0];
    const shake = this.state === 'windup' ? (Math.floor(this.t * 30) % 2 ? 1 : -1) : 0;
    l.save();
    l.translate(Math.round(this.x + shake), Math.round(this.y));
    l.scale(this.side, 1);
    if (this.hurtT > 0) l.filter = 'brightness(2)';
    l.drawImage(f, -Math.round(f.width / 2), -f.height + 2);
    l.restore();
    if (this.state === 'stunned') {
      for (let k = 0; k < 3; k++) {
        const a = this.t * 5 + (k * Math.PI * 2) / 3;
        l.fillStyle = '#ffe066';
        l.fillRect(Math.round(this.x + Math.cos(a) * 9), Math.round(this.y - 28 + Math.sin(a) * 3), 2, 2);
      }
    }
  }
}

export class Crab {
  constructor(x, y) {
    this.kind = 'cangrejo';
    this.nombre = 'el cangrejo';
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.level = 0;
    this.hp = 6;
    this.state = 'wander';
    this.vx = 0;
    this.vy = 0;
    this.timer = Math.random() * 2;
    this.t = Math.random() * 5;
  }

  get dead() {
    return this.state === 'dead';
  }

  get sortY() {
    return this.y;
  }

  get shadow() {
    return this.dead ? null : { rx: 6, ry: 2 };
  }

  hit(dmg, fx, fy, game) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.state = 'dead';
      game.pickups.push({ item: 'cangrejo', n: 1, x: this.x, y: this.y + 2, level: 0 });
    }
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    const p = game.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    this.timer -= dt;
    if (d < 55) {
      // Huye de lado.
      this.vx = Math.sign(this.x - p.x || 1) * 55;
      this.vy = Math.sign(this.y - p.y) * 15;
    } else if (this.timer <= 0) {
      this.timer = 1 + Math.random() * 2.5;
      const a = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1);
      this.vx = a * 30;
      this.vy = (Math.random() - 0.5) * 10;
    }
    // No se aleja de la arena.
    const g = game.map.groundAtPx(this.x + this.vx * 0.3, this.y);
    if (g !== G.SAND && g !== G.SHALLOW) { this.vx = (this.home.x - this.x) * 0.5; }
    moveBody(this, game, dt, 10, 5);
  }

  draw(l, game) {
    if (this.dead) return;
    const frames = game.sprites.crab;
    const moving = Math.abs(this.vx) > 3;
    const f = frames[moving ? Math.floor(this.t * 10) % 2 : 0];
    l.drawImage(f, Math.round(this.x - f.width / 2), Math.round(this.y - f.height + 2));
  }
}
