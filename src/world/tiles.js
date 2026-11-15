// Tipos de suelo y de objeto del mundo cenital.
// Cada tile tiene: suelo (G), objeto encima (O) y altura (nivel lógico 0, 1, 2…).

/** Suelos. */
export const G = {
  GRASS: 0,
  SAND: 1,
  DIRT: 2,
  SHALLOW: 3,  // agua poco profunda: ralentiza
  DEEP: 4,     // agua profunda: se nada despacio
  CHASM: 5,    // grieta: no se puede pisar; se cruza saltando
  CLIFF: 6,    // pared de acantilado entre dos alturas: se escala
  LEDGE_S: 7,  // saliente hacia el sur: se salta hacia abajo
  TALL_GRASS: 8, // hierba alta: no es sólida; esconde (sigilo, Fase 7)
};

/** Objetos sobre el suelo. */
export const O = {
  NONE: 0,
  TREE: 1,     // sólido solo en el tronco; la copa tapa al jugador si pasa por detrás
  BOULDER: 2,  // roca suelta
  WALL: 3,     // bloque de roca de un tile
};

/**
 * Leyenda de los mapas en texto: carácter → { suelo, objeto, altura }.
 * La altura de las paredes de acantilado (C) se calcula a partir de sus vecinos.
 */
export const LEGEND = {
  ',': { g: G.GRASS, h: 0 },
  'S': { g: G.GRASS, h: 0, spawn: true },
  '.': { g: G.SAND, h: 0 },
  ':': { g: G.DIRT, h: 0 },
  '-': { g: G.SHALLOW, h: 0 },
  '~': { g: G.DEEP, h: 0 },
  'X': { g: G.CHASM, h: 0 },
  '"': { g: G.TALL_GRASS, h: 0 },
  'T': { g: G.GRASS, h: 0, o: O.TREE },
  'O': { g: G.GRASS, h: 0, o: O.BOULDER },
  '#': { g: G.GRASS, h: 0, o: O.WALL },
  '1': { g: G.GRASS, h: 1 },
  '2': { g: G.GRASS, h: 2 },
  't': { g: G.GRASS, h: 1, o: O.TREE },
  'C': { g: G.CLIFF, h: 0 },
  'v': { g: G.LEDGE_S, h: 0 },
};

/** Rectángulos de colisión de los objetos, en coordenadas locales del tile (32 px). */
export const OBJECT_RECTS = {
  [O.TREE]: { x: 10, y: 18, w: 12, h: 12 },
  [O.BOULDER]: { x: 2, y: 8, w: 28, h: 22 },
  [O.WALL]: { x: 0, y: 0, w: 32, h: 32 },
};
