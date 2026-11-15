// Tipos de suelo del mundo cenital. Los objetos (árboles, cajas, ruinas…) ya no
// van en la cuadrícula: son props con posición libre (ver world/props.js).

export const G = {
  JUNGLE: 0,      // suelo de selva
  GRASS: 1,       // hierba clara (transición playa-selva)
  SAND: 2,
  DIRT: 3,        // camino de tierra
  SHALLOW: 4,     // mar poco profundo: ralentiza
  DEEP: 5,        // mar profundo: se nada
  RIVER: 6,       // río: no se puede cruzar (salvo por el puente)
  BRIDGE: 7,      // puente colgante
  WATERFALL: 8,   // cascada (sólida)
  CLIFF: 9,       // pared de acantilado: se escala
  LEDGE_S: 10,    // saliente hacia el sur: se salta hacia abajo
  CHASM: 11,      // grieta: se cruza saltando
  TALL_GRASS: 12, // hierba alta: agachado, te oculta
  STONE: 13,      // suelo de losas de las ruinas
};

/** Agua de cualquier tipo (para el dibujo animado). */
export const isWaterGround = (g) => g === G.SHALLOW || g === G.DEEP || g === G.RIVER || g === G.WATERFALL;

/** Suelos que nunca se pisan andando. */
export const isBlockingGround = (g) => g === G.RIVER || g === G.WATERFALL || g === G.CLIFF || g === G.LEDGE_S;
