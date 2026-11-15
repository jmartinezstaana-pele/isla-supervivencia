// Bucle principal con requestAnimationFrame. El dt se limita a MAX_DT para que
// un parón (pestaña en segundo plano, depurador…) no provoque un salto enorme.

import { MAX_DT } from '../config.js';

export function startLoop(update, render) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => {
    last = now;
    requestAnimationFrame(frame);
  });
}
