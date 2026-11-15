# Isla — juego de supervivencia (en desarrollo)

Juego de navegador 2D de supervivencia, sigilo y plataformas en una isla. Empiezas con un avión sin combustible y tienes que aterrizar, sobrevivir y escapar.

- Diseño completo y decisiones: [`docs/TRASPASO.md`](docs/TRASPASO.md)
- Historial de cambios por fase: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- Instrucciones para Claude Code: [`CLAUDE.md`](CLAUDE.md)

**Estado:** Fase 1b terminada: **vista cenital** (desde arriba) con movimiento en todas las direcciones, en un mapa de prueba. Todavía no hay isla, supervivencia ni enemigos.

## Cómo jugar

Abre `dist/isla.html` con doble clic. Es un único archivo, funciona sin conexión y sin instalar nada (probado en Chrome).

`dist/` no se sube al repositorio: si no tienes el archivo, genéralo con `npm run build` (ver abajo).

### Controles provisionales

| Tecla | Acción |
|---|---|
| WASD o flechas | Moverse en todas las direcciones (también en diagonal) |
| Mayús (mantener) | Correr |
| Espacio | Saltar en la dirección en la que te mueves (corriendo saltas más lejos) |
| C (mantener) | Agacharse (más lento) |
| Empujar contra una pared de roca | Escalarla (gasta aguante); empujar hacia abajo en el borde de arriba para bajar escalando |
| Andar hacia un saliente | Saltar al nivel de abajo |
| Esc | Pausa |
| F3 | Panel de depuración (FPS, posición, nivel, estado, caja de colisión) |

El mapa de prueba tiene carteles que indican qué probar: hierba alta, árboles, un muro, dos grietas (la estrecha se salta andando y la ancha solo corriendo), un estanque con agua poco profunda y profunda, y una meseta con una pared que se escala, un saliente para bajar y un segundo nivel encima.

## Cómo compilar

Necesitas [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run build      # genera dist/isla.html
npm run dev        # recompila cada vez que cambias algo en src/ o assets/
npm test           # compila y ejecuta las pruebas de Playwright
```

La primera vez que ejecutes las pruebas en un ordenador nuevo, instala el navegador de Playwright:

```bash
npx playwright install chromium
```

Las pruebas guardan una captura en `tests/output/captura.png`.

## Estructura

```
build.mjs              esbuild empaqueta src/main.js (IIFE) y lo incrusta con los assets en base64 → dist/isla.html
src/
  index.html           plantilla HTML (el marcador <!--JUEGO--> se sustituye por el código)
  main.js              arranque: canvas, carga del atlas, bucle y gancho de pruebas window.__isla
  config.js            constantes: pantalla, tiles de 32 px, movimiento del jugador, fórmulas por Agilidad
  game.js              estado de juego de la Fase 1b (mapa de prueba + jugador + cámara, dibujo ordenado por y)
  core/                bucle, input (pulsado / pulsado este fotograma), RNG con semilla, pantalla, carga de imágenes
  world/               tipos de suelo y objeto, mapa con alturas, colisiones de la caja de los pies, mapa de prueba en texto
  entities/player.js   controlador cenital (andar, correr, saltar, saliente, escalar, agua) y animación
  render/              cámara, animaciones del atlas, dibujo del mundo y HUD
tests/smoke.spec.mjs   pruebas de humo con Playwright
assets/                atlas del protagonista e ilustraciones (se incrustan en el HTML al compilar)
assets-src/Imagenes/   originales de Javier
tools/extract_sprites.py  regenera el atlas desde los originales (Python 3 + numpy, Pillow, scipy)
```
