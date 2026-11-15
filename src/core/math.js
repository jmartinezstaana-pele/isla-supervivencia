export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Acerca `v` a `target` como mucho `delta` unidades. */
export function approach(v, target, delta) {
  return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
}

/** Factor de suavizado exponencial independiente de los fps (rate en 1/s). */
export const smoothFactor = (rate, dt) => 1 - Math.exp(-rate * dt);
