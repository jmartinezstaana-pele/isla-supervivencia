// Paleta tomada de la referencia de estilo (assets-src/referencias/objetivo-estilo-selva.png):
// verdes ricos, piedra con musgo, tierra cálida, agua turquesa y contorno muy oscuro.

import { rgb } from './pixel.js';

export const C = {
  outline: rgb('#17150f'),
  outlineGreen: rgb('#0f1f0c'),
  // Vegetación (de oscuro a claro)
  leaf: ['#13280f', '#1f3f18', '#2d5a22', '#3f7a2c', '#5a9a35', '#86bf4a'].map((c) => rgb(c)),
  jungleLeaf: ['#0c1d0c', '#143316', '#1f4a20', '#2d6529', '#428334', '#64a645'].map((c) => rgb(c)),
  oliveLeaf: ['#16200a', '#26360f', '#3a4d16', '#536a1f', '#6f8a2a', '#93ad3a'].map((c) => rgb(c)),
  palmLeaf: ['#1d3d14', '#2f5e1d', '#467f27', '#64a032', '#8dc24a'].map((c) => rgb(c)),
  grass: ['#244a1c', '#2f5d22', '#3b6f28', '#4a812f', '#5c9437'].map((c) => rgb(c)),
  jungleFloor: ['#14270f', '#1a3314', '#213f19', '#294b1e', '#335824'].map((c) => rgb(c)),
  moss: ['#3a5a1e', '#557a26', '#76a033'].map((c) => rgb(c)),
  // Piedra
  stone: ['#30322a', '#47493c', '#5d5f4f', '#757662', '#8f8e75'].map((c) => rgb(c)),
  // Tierra y camino
  dirt: ['#5e4224', '#72522d', '#866237', '#997341', '#ad864f'].map((c) => rgb(c)),
  // Arena
  sand: ['#c9a96b', '#d8bb7e', '#e5cb92', '#efd9a6', '#f6e6bd'].map((c) => rgb(c)),
  wetSand: ['#a68a58', '#b39765', '#bea372'].map((c) => rgb(c)),
  // Madera
  wood: ['#3e2512', '#5a361b', '#7a4c26', '#9a6534', '#b98249'].map((c) => rgb(c)),
  rope: ['#6e5530', '#a2834e', '#cdb07a'].map((c) => rgb(c)),
  // Agua
  waterShallow: rgb('#5fc4c4'),
  waterMid: rgb('#2f95a8'),
  waterDeep: rgb('#1d5f86'),
  waterDeepest: rgb('#173f6a'),
  river: rgb('#2a7f95'),
  foam: rgb('#effaf2'),
  // Flores y detalles
  red: ['#7a1414', '#b82424', '#e04a3a', '#ff8a6a'].map((c) => rgb(c)),
  purple: ['#3e1a5e', '#6a2fa0', '#9a5ad0', '#c79af0'].map((c) => rgb(c)),
  yellow: ['#8a6a12', '#d0a828', '#f2d65a'].map((c) => rgb(c)),
  skin: ['#5a2e16', '#7a4422', '#9a5c30', '#b9773f'].map((c) => rgb(c)),
  metal: ['#2c3236', '#4a5358', '#6d787d', '#9aa5a8', '#cdd6d6'].map((c) => rgb(c)),
  camo: ['#2f3a1c', '#4a5728', '#6a7638', '#8c8a52'].map((c) => rgb(c)),
  cloth: ['#5e1f1a', '#8a2e22', '#b8452e'].map((c) => rgb(c)),
  // Biomas de la isla completa (sesión 5).
  snow: ['#8ea4bc', '#b4c6d8', '#d2dee9', '#e8eff6', '#ffffff'].map((c) => rgb(c)),
  needles: ['#1f2410', '#2e3317', '#3d421d', '#4e5224', '#62652d'].map((c) => rgb(c)),
  mud: ['#2e2214', '#3e2f1c', '#4e3c24', '#5f4b2e', '#715a38'].map((c) => rgb(c)),
  gravel: ['#57513f', '#6e6750', '#857d63', '#9c9378', '#b3aa8e'].map((c) => rgb(c)),
  concrete: ['#4e5050', '#666868', '#7f8180', '#989a98', '#b2b3b0'].map((c) => rgb(c)),
  pine: ['#0d1f16', '#14301f', '#1d4229', '#285634', '#376b40'].map((c) => rgb(c)),
  mangrove: ['#142012', '#1f3119', '#2d4522', '#3d5b2b', '#517336'].map((c) => rgb(c)),
  rust: ['#3a1e10', '#5e3018', '#844822', '#a8642e', '#c88848'].map((c) => rgb(c)),
  canvas: ['#262c18', '#3a4224', '#4f5a30', '#66723e', '#7f8a4e'].map((c) => rgb(c)),
  thatch: ['#4a3414', '#6e5020', '#94722e', '#b8963e', '#d8b85a'].map((c) => rgb(c)),
  shadow: rgb('#000000', 90),
  black: rgb('#000000'),
  white: rgb('#ffffff'),
};
