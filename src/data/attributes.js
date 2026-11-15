// Atributos del personaje (TRASPASO §1.5): 10 puntos a repartir entre Fuerza,
// Agilidad, Inteligencia y Sigilo/Percepción, de 0 a 6 cada uno en la creación.
// Aquí están también las fórmulas de sus efectos, para que el jugador, la
// creación de personaje y la pantalla de personaje (P) usen las mismas.

export const ATTR_POINTS = 10;
export const ATTR_MAX = 6;

export const ATTRS = [
  {
    id: 'fuerza',
    nombre: 'Fuerza',
    desc: 'Más vida y golpes más fuertes. Más adelante, más carga en la mochila.',
  },
  {
    id: 'agilidad',
    nombre: 'Agilidad',
    desc: 'Corres más, saltas más lejos y escalas más rápido gastando menos aguante.',
  },
  {
    id: 'inteligencia',
    nombre: 'Inteligencia',
    desc: 'Pistas al mezclar materiales, reconocer plantas y menos riesgo de enfermar.',
  },
  {
    id: 'sigilo',
    nombre: 'Sigilo / Percepción',
    desc: 'Haces menos ruido y los enemigos tardan más en descubrirte.',
  },
];

/** Reparto por defecto (suma 10). */
export const DEFAULT_ATTRS = { fuerza: 3, agilidad: 3, inteligencia: 2, sigilo: 2 };

export const pointsUsed = (a) => ATTRS.reduce((s, { id }) => s + (a[id] || 0), 0);

/** Valores de juego que salen de los atributos (fórmulas orientativas de §1.5). */
export function deriveStats(a) {
  const F = a.fuerza || 0;
  const A = a.agilidad || 0;
  const I = a.inteligencia || 0;
  const S = a.sigilo || 0;
  return {
    maxHp: 80 + F * 12,
    damageFactor: 1 + F * 0.12,
    carry: 40 + F * 6,
    speedFactor: 0.88 + A * 0.04,
    jumpTiles: 2.6 + A * 0.25,
    climbSpeed: 70 + A * 10,
    climbDrain: 30 - A * 3.5,
    noiseFactor: 1 - S * 0.1,
    detectFactor: 1 - S * 0.09,
    // Inteligencia: nivel de pistas (§2.5) y riesgo de enfermar al comer o beber algo dudoso.
    hintLevel: I,
    sickFactor: Math.max(0, 1 - I * 0.13),
  };
}

/** Líneas legibles con los efectos (creación de personaje y pantalla P). */
export function statLines(a) {
  const s = deriveStats(a);
  const pct = (k) => `${k >= 1 ? '+' : '−'}${Math.round(Math.abs(k - 1) * 100)} %`;
  return [
    ['Vida máxima', `${s.maxHp}`],
    ['Daño cuerpo a cuerpo', `×${s.damageFactor.toFixed(2)}`],
    ['Velocidad', pct(s.speedFactor)],
    ['Salto corriendo', `${s.jumpTiles.toFixed(2)} casillas`],
    ['Escalada', `${s.climbSpeed} px/s · ${s.climbDrain.toFixed(1)} aguante/s`],
    ['Ruido al moverte', pct(s.noiseFactor)],
    ['Te descubren', pct(s.detectFactor)],
    ['Riesgo de enfermar', pct(s.sickFactor)],
    ['Pistas de fabricación', s.hintLevel >= 6 ? 'casi todas' : s.hintLevel >= 4 ? 'ingredientes' : s.hintLevel >= 2 ? 'qué se puede hacer' : 'ninguna'],
  ];
}
