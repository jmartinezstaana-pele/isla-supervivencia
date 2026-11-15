// Constantes globales del juego. Los valores de juego son provisionales
// (ver docs/TRASPASO.md §1.5) y se ajustarán al equilibrar.

/** Resolución interna del canvas; se escala a la ventana con letterbox. */
export const VIEW_W = 1280;
export const VIEW_H = 720;

/** Lado de un tile en píxeles de mundo (vista cenital). */
export const TILE = 32;

/** Paso máximo de tiempo por fotograma (evita saltos enormes tras un parón). */
export const MAX_DT = 1 / 30;
/** Paso máximo de cada subpaso de movimiento (a 1/120 s nadie avanza más de 2 px). */
export const PHYSICS_STEP = 1 / 120;

/**
 * El mundo se pinta a baja resolución (640 × 360, unos 20 × 11 tiles) y se
 * escala ×2 sin suavizado, para que terreno, props y sprites sean pixel art
 * coherente (TRASPASO §4c-A). El HUD se dibuja encima a 1280 × 720.
 */
export const LOW_W = 640;
export const LOW_H = 360;
export const PIXEL_SCALE = VIEW_W / LOW_W;

/** Escala de dibujo de los sprites: el atlas ya se reduce a la mitad al cargar. */
export const SPRITE_SCALE = 1;

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
