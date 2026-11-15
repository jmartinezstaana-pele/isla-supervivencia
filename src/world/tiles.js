// Tipos de tile. De momento se dibujan con rectángulos de color; el arte llega más adelante.

export const T = {
  EMPTY: 0,
  DIRT: 1,      // tierra (sólido)
  ROCK: 2,      // roca (sólido); en la Fase 4 será escalable
  PLATFORM: 3,  // plataforma de un sentido: se atraviesa desde abajo y se puede bajar
  WATER: 4,
};

export const TILE_INFO = {
  [T.EMPTY]: { name: 'vacío', solid: false },
  [T.DIRT]: { name: 'tierra', solid: true },
  [T.ROCK]: { name: 'roca', solid: true },
  [T.PLATFORM]: { name: 'plataforma', solid: false, oneWay: true },
  [T.WATER]: { name: 'agua', solid: false, liquid: true },
};
