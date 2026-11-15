// Mundo de prueba de la Fase 1: suelo, paredes, plataformas de un sentido,
// un hueco, agua, un túnel bajo y una torre para caídas largas.
// Se sustituirá por la isla generada con semilla en la Fase 3.

import { TILE } from '../config.js';
import { TileMap } from './tilemap.js';
import { T } from './tiles.js';

export const TEST_LEVEL = {
  width: 200,
  height: 45,
  groundRow: 36, // primera fila de suelo
};

export function buildTestLevel() {
  const { width, height, groundRow: G } = TEST_LEVEL;
  const map = new TileMap(width, height);
  const labels = [];
  const label = (tx, ty, text) => labels.push({ x: tx * TILE, y: ty * TILE, text });

  // Suelo base y muros de los extremos.
  map.fill(0, G, width - 1, height - 1, T.DIRT);
  map.fill(0, 18, 1, G - 1, T.ROCK);
  map.fill(width - 2, 18, width - 1, G - 1, T.ROCK);

  // Bloque bajo (2 tiles): se salta sin problema.
  map.fill(20, G - 2, 21, G - 1, T.ROCK);
  label(17, G - 4, 'Bloque bajo');

  // Escalera de plataformas de un sentido hasta lo alto de una pared de 10 tiles.
  map.fill(30, G - 3, 34, G - 3, T.PLATFORM);
  map.fill(36, G - 6, 40, G - 6, T.PLATFORM);
  map.fill(41, G - 9, 45, G - 9, T.PLATFORM);
  map.fill(46, G - 10, 48, G - 1, T.ROCK);
  label(29, G - 12, 'Plataformas (S + Espacio para bajar)');
  label(46, G - 12, 'Pared alta');

  // Hueco de 5 tiles: andando no llega el salto; corriendo, sí.
  // Dentro hay plataformas para volver a subir.
  map.fill(62, G, 66, height - 2, T.EMPTY);
  map.fill(62, G + 5, 63, G + 5, T.PLATFORM);
  map.fill(65, G + 2, 66, G + 2, T.PLATFORM);
  label(58, G - 4, 'Hueco: corre (Mayús) y salta');

  // Estanque a ras de suelo con una plataforma encima.
  map.fill(76, G, 91, G + 6, T.WATER);
  map.fill(81, G - 4, 85, G - 4, T.PLATFORM);
  label(78, G - 7, 'Agua (Espacio para nadar hacia arriba)');

  // Túnel de 2 tiles de alto: solo se pasa agachado.
  map.fill(100, G - 6, 111, G - 3, T.ROCK);
  label(98, G - 8, 'Túnel: agáchate (S)');

  // Torre de plataformas en zigzag con una cornisa alta: caída larga a velocidad máxima.
  for (let i = 0; i < 7; i++) {
    const row = G - 3 - i * 3;
    const x0 = i % 2 === 0 ? 122 : 127;
    map.fill(x0, row, x0 + 3, row, T.PLATFORM);
  }
  map.fill(127, G - 24, 138, G - 24, T.PLATFORM);
  label(121, G - 27, 'Torre: salta desde arriba (caída larga)');

  // Terreno escalonado.
  map.fill(145, G - 1, 150, G - 1, T.DIRT);
  map.fill(151, G - 2, 155, G - 1, T.DIRT);
  map.fill(158, G, 162, G + 1, T.EMPTY);
  map.fill(166, G, 170, G + 2, T.WATER);

  // Colina de roca escalonada.
  map.fill(174, G - 1, 177, G - 1, T.ROCK);
  map.fill(178, G - 2, 181, G - 1, T.ROCK);
  map.fill(182, G - 3, 185, G - 1, T.ROCK);
  map.fill(186, G - 5, 190, G - 5, T.PLATFORM);
  label(186, G - 8, 'Fin del mundo de prueba');

  map.spawn = { x: 8 * TILE + TILE / 2, y: G * TILE };
  map.labels = labels;
  return map;
}
