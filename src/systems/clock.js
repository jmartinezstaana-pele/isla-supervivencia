// Reloj del juego y color de la luz ambiente según la hora.
// 1 hora de juego = 25 s reales (un día completo, 10 minutos). Se empieza a las
// 16:00 para que el anochecer llegue pronto en una partida de prueba.

export const SECONDS_PER_HOUR = 25;

const KEYS = [
  [0, [24, 32, 74]], [4.6, [24, 32, 74]], [5.6, [110, 96, 140]], [6.6, [235, 185, 160]],
  [7.6, [255, 255, 255]], [17.2, [255, 250, 238]], [18.4, [255, 196, 140]], [19.3, [200, 115, 112]],
  [20.2, [70, 66, 120]], [21, [24, 32, 74]], [24, [24, 32, 74]],
];

export class Clock {
  constructor(hour = 16) {
    this.hours = hour;
    this.day = 1;
  }

  update(dt) {
    this.hours += dt / SECONDS_PER_HOUR;
    if (this.hours >= 24) {
      this.hours -= 24;
      this.day++;
    }
  }

  advance(h) {
    this.update(h * SECONDS_PER_HOUR);
  }

  get label() {
    const h = Math.floor(this.hours);
    const m = Math.floor((this.hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Color de la luz ambiente [r, g, b] (255 = sin cambio). */
  get ambient() {
    const h = this.hours;
    for (let i = 0; i + 1 < KEYS.length; i++) {
      const [h0, c0] = KEYS[i];
      const [h1, c1] = KEYS[i + 1];
      if (h >= h0 && h <= h1) {
        const t = (h - h0) / (h1 - h0);
        return c0.map((v, k) => v + (c1[k] - v) * t);
      }
    }
    return [255, 255, 255];
  }

  /** 0 a pleno día, ~0,8 de noche cerrada. */
  get darkness() {
    const [r, g, b] = this.ambient;
    return 1 - (r * 0.3 + g * 0.5 + b * 0.2) / 255;
  }

  get isNight() {
    return this.hours >= 20.4 || this.hours < 5.6;
  }
}
