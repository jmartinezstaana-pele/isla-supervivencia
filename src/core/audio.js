// Efectos de sonido sintetizados con WebAudio (sin archivos). Se activa con la
// primera tecla o clic, como exigen los navegadores. Si algo falla, el juego
// sigue sin sonido.

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.rainGain = null;
    const unlock = () => this.init();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('mousedown', unlock, { once: true });
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Ruido blanco reutilizable.
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // Lluvia: ruido filtrado en bucle, con volumen según la intensidad.
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      src.connect(f).connect(this.rainGain).connect(this.master);
      src.start();
    } catch {
      this.ctx = null;
    }
  }

  setRain(k) {
    if (this.rainGain) this.rainGain.gain.value = this.muted ? 0 : k * 0.25;
  }

  tone(freq, dur, type = 'square', vol = 0.2, slide = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(c.currentTime + dur);
  }

  burst(dur, freq, vol = 0.3) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start();
    s.stop(c.currentTime + dur);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    try {
      switch (name) {
        case 'swing': this.burst(0.08, 2500, 0.15); break;
        case 'hit': this.burst(0.1, 900, 0.4); this.tone(140, 0.1, 'square', 0.15, -60); break;
        case 'hurt': this.tone(220, 0.25, 'sawtooth', 0.2, -150); break;
        case 'pickup': this.tone(660, 0.07, 'square', 0.12); setTimeout(() => this.tone(990, 0.09, 'square', 0.12), 60); break;
        case 'open': this.tone(300, 0.12, 'triangle', 0.25, 200); break;
        case 'eat': this.burst(0.12, 1200, 0.2); break;
        case 'drink': this.tone(500, 0.15, 'sine', 0.2, -200); break;
        case 'heal': this.tone(520, 0.2, 'sine', 0.15, 300); break;
        case 'alert': this.tone(880, 0.12, 'square', 0.15); setTimeout(() => this.tone(1180, 0.15, 'square', 0.15), 90); break;
        case 'kill': this.burst(0.18, 600, 0.35); break;
        case 'boar': this.burst(0.3, 400, 0.3); break;
        case 'thunder': this.burst(1.8, 180, 0.6); break;
        default: break;
      }
    } catch {
      /* sin sonido */
    }
  }
}
