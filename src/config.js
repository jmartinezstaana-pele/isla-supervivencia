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

/** Zoom de la cámara: con 1,5 se ven unos 27 × 15 tiles. */
export const CAMERA_ZOOM = 1.5;

/** Escala a la que se dibujan los sprites del atlas (96 px → 48 px). */
export const SPRITE_SCALE = 0.5;

/**
 * Agilidad provisional del jugador hasta que exista la creación de personaje (Fase 2).
 * Rango previsto en la creación: 0–6.
 */
export const DEFAULT_AGILITY = 3;

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

/** Distancia de salto corriendo, en tiles, según la Agilidad (TRASPASO §1.5). */
export function jumpDistanceTiles(agility) {
  return 2.6 + agility * 0.25;
}

/** Velocidad de escalada en px/s (TRASPASO §1.5). */
export function climbSpeed(agility) {
  return 70 + agility * 10;
}

/** Gasto de aguante por segundo al escalar (TRASPASO §1.5). */
export function climbDrain(agility) {
  return 30 - agility * 3.5;
}
