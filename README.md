# Isla — juego de supervivencia (en desarrollo)

Juego de navegador 2D de supervivencia, sigilo y plataformas en una isla. Empiezas con un avión sin combustible y tienes que aterrizar, sobrevivir y escapar.

- Diseño completo y decisiones: [`docs/TRASPASO.md`](docs/TRASPASO.md)
- Historial de cambios por fase: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- Instrucciones para Claude Code: [`CLAUDE.md`](CLAUDE.md)

**Estado:** Fases 0 y 1 terminadas: infraestructura y un personaje que se mueve en un mundo de prueba. Todavía no hay isla, supervivencia ni enemigos.

## Cómo jugar

Abre `dist/isla.html` con doble clic. Es un único archivo, funciona sin conexión y sin instalar nada (probado en Chrome).

`dist/` no se sube al repositorio: si no tienes el archivo, genéralo con `npm run build` (ver abajo).

### Controles provisionales

| Tecla | Acción |
|---|---|
| A / D o ← / → | Moverse |
| Mayús (mantener) | Correr |
| Espacio, W o ↑ | Saltar (mantener = salto más alto) / nadar hacia arriba |
| S o ↓ | Agacharse / bucear |
| S + Espacio | Bajar de una plataforma de madera |
| Esc | Pausa |
| F3 | Panel de depuración (FPS, posición, estado, caja de colisión) |

El mundo de prueba tiene carteles que indican qué probar en cada zona: plataformas, pared alta, hueco (solo se cruza corriendo), agua, túnel (solo agachado) y una torre para caídas largas.

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

Las pruebas guardan capturas en `tests/output/` (`captura.png`, `salto.png`).

## Estructura

```
build.mjs              esbuild empaqueta src/main.js (IIFE) y lo incrusta con los assets en base64 → dist/isla.html
src/
  index.html           plantilla HTML (el marcador <!--JUEGO--> se sustituye por el código)
  main.js              arranque: canvas, carga del atlas, bucle y gancho de pruebas window.__isla
  config.js            constantes: tamaño de pantalla, tiles, física del jugador, zoom de cámara
  game.js              estado de juego de la Fase 1 (mundo de prueba + jugador + cámara)
  core/                bucle, input (pulsado / pulsado este fotograma), RNG con semilla, pantalla, carga de imágenes
  world/               tipos de tile, mapa, colisiones AABB y mundo de prueba
  entities/player.js   controlador del jugador y selección de animación
  render/              cámara, animaciones del atlas, dibujo del mundo y HUD
tests/smoke.spec.mjs   pruebas de humo con Playwright
assets/                atlas del protagonista e ilustraciones (se incrustan en el HTML al compilar)
assets-src/Imagenes/   originales de Javier
tools/extract_sprites.py  regenera el atlas desde los originales (Python 3 + numpy, Pillow, scipy)
```
