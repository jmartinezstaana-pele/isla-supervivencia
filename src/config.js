// Constantes globales del juego. Los valores de juego son provisionales
// (ver docs/TRASPASO.md §1.5) y se ajustarán al equilibrar.

/** Resolución interna del canvas; se escala a la ventana con letterbox. */
export const VIEW_W = 1280;
export const VIEW_H = 720;

/** Lado de un tile en píxeles de mundo. */
export const TILE = 20;

/** Paso máximo de tiempo por fotograma (evita saltos enormes tras un parón). */
export const MAX_DT = 1 / 30;
/** Paso máximo de cada subpaso de física (≤ 7,5 px por subpaso a velocidad máxima). */
export const PHYSICS_STEP = 1 / 120;

/** Zoom de la cámara: 1 = 64 × 36 tiles visibles. */
export const CAMERA_ZOOM = 1.5;

/** Escala a la que se dibujan los sprites del atlas (96 px → 48 px). */
export const SPRITE_SCALE = 0.5;

/**
 * Agilidad provisional del jugador hasta que exista la creación de personaje (Fase 2).
 * Rango previsto en la creación: 0–6.
 */
export const DEFAULT_AGILITY = 3;

export const PLAYER = {
  width: 16,
  height: 44,          // de pie
  crouchHeight: 28,    // agachado
  walkSpeed: 120,      // px/s
  runSpeed: 230,
  crouchSpeed: 60,
  groundAccel: 1500,   // px/s²
  groundDecel: 2000,
  airAccel: 1000,
  gravity: 1800,
  jumpCutGravity: 2.4, // multiplicador de gravedad al soltar el salto mientras sube
  maxFall: 900,        // velocidad terminal (px/s)
  coyoteTime: 0.1,     // s de margen para saltar tras salir de un borde
  jumpBuffer: 0.12,    // s que se recuerda una pulsación de salto antes de tocar suelo
  dropThroughTime: 0.25,
  // Agua (versión básica; el nado completo llega en la Fase 4)
  water: {
    gravity: 380,
    buoyancy: 900,     // empuje hacia arriba cuando el pecho está sumergido
    drag: 3.5,
    maxSpeed: 70,
    swimUp: 170,
    swimDown: 130,
    maxSink: 150,
  },
};

/** Altura de salto en tiles según la Agilidad (TRASPASO §1.5). */
export function jumpHeightTiles(agility) {
  return 2.6 + agility * 0.25;
}
