// Constantes globales del juego. Los valores de juego son provisionales
// (ver docs/TRASPASO.md §1.5) y se ajustarán al equilibrar.

/** Coordenadas lógicas de la interfaz (el canvas real puede ser mayor; ver core/display.js). */
export const VIEW_W = 1280;
export const VIEW_H = 720;

/** Lado de un tile en píxeles de mundo (vista cenital). */
export const TILE = 32;

/** Paso máximo de tiempo por fotograma (evita saltos enormes tras un parón). */
export const MAX_DT = 1 / 30;
/** Paso máximo de cada subpaso de movimiento (a 1/120 s nadie avanza más de 2 px). */
export const PHYSICS_STEP = 1 / 120;

/**
 * El mundo mide 640 × 360 píxeles de mundo (unos 20 × 11 tiles). Terreno y props
 * son pixel art a esa resolución y se amplían con una escala entera K sin
 * suavizado (×2 a 720p, ×3 a 1080p); los personajes se dibujan a resolución real
 * (sesión 6, ver core/display.js y gfx/charSprite.js). La interfaz usa
 * coordenadas lógicas de 1280 × 720 y se dibuja a resolución real.
 */
export const LOW_W = 640;
export const LOW_H = 360;
export const PIXEL_SCALE = VIEW_W / LOW_W;


export const PLAYER = {
  boxW: 18,            // caja de colisión de los pies
  boxH: 10,
  walkSpeed: 110,      // px/s
  runSpeed: 190,
  crouchSpeed: 55,
  shallowFactor: 0.55, // agua poco profunda
  swimSpeed: 55,       // agua profunda
  accel: 1400,         // px/s²
  decel: 1800,
  cornerSlide: 8,      // px máximos de corrección en esquinas
  jumpTime: 0.55,      // s en el aire
  jumpArc: 22,         // altura visual del salto (px)
  walkJumpFactor: 0.6, // fracción de la distancia de salto si no se corre
  hopTime: 0.32,       // salto por un saliente
  hopArc: 16,
  climbPushTime: 0.15, // s empujando contra la pared antes de empezar a escalar
  staminaMax: 100,
  staminaRegen: 30,    // por segundo, en el suelo
};
