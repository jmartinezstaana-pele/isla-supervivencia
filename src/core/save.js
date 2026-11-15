// Guardado en localStorage (siempre dentro de try/catch: en file:// o en modo
// privado puede fallar). En la sesión 4 solo se comprueba si existe una partida
// para activar «Continuar»; el guardado completo llega en la sesión 8.

export const SAVE_KEY = 'isla.partida';

export function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}
