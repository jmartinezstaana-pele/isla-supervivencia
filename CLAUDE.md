# Instrucciones para Claude Code

Este repositorio es el **juego de supervivencia en una isla** de Javier: aterrizaje de emergencia, sigilo, plataformas, supervivencia y huida.

- **Antes de hacer nada, lee `docs/TRASPASO.md` entero.** Contiene todas las decisiones de diseño, etiquetadas como:
  - **ACORDADO-USUARIO:** no se cambia sin preguntar.
  - **ACORDADO-DELEGADO:** decisión tomada por delegación.
  - **RECOMENDACIÓN:** propuesta modificable.
  - **PENDIENTE:** hay que preguntar.
- No mezcles este juego con el juego urbano en Godot de las instrucciones del proyecto de claude.ai: es otro proyecto.
- Toda la interfaz y la documentación, en **español**.
- **La estética importa:** Javier rechazó el aspecto de la sesión 2 (`assets-src/referencias/rechazado-sesion2.png`). El objetivo visual es `assets-src/referencias/objetivo-estilo-selva.png`: cómic cel-shaded con contorno, selva frondosa, piedra con musgo, coherente con el pixel art de los sprites. Revisa siempre una captura comparándola con esa referencia.
- Entregable: `dist/isla.html`, **un único archivo** que funciona abierto con doble clic (file://), sin instalar nada.
- Trabaja **por fases** (§4 del traspaso). **Las sesiones 1–3 están hechas. La hoja de ruta está en §4d del traspaso (sesiones 4 a 11): haz la sesión que Javier indique y no pares hasta cumplir su definición de terminado.** El juego es CENITAL, con movimiento en todas las direcciones, como en Pokémon: la vista lateral está descartada. Termina y prueba cada sistema antes de empezar otro.
- Trabaja en una rama, no en la principal. Haz commits pequeños con mensajes claros.
- Antes de dar una fase por terminada:
  - `npm run build` sin errores;
  - `npm test` (Playwright) en verde, sin errores de consola;
  - revisa una captura de pantalla.
- Al final de cada sesión, informa con honestidad de qué funciona, qué está a medias y qué falta, y actualiza la documentación.
- No pidas permiso para decisiones técnicas menores. Consulta a Javier solo las decisiones que cambien la visión del juego.
- Los sprites del protagonista están en `assets/atlas.png` + `assets/atlas.json`: todos miran a la derecha, el ancla está en los pies y miden 144 px de alto (atlas regenerado a ×1,5 en la sesión 6), pensados para dibujarse a 1/3 (48 px de mundo) a resolución real de pantalla con `src/gfx/charSprite.js`. **No se reducen al cargar** (queja de Javier: personaje poco definido y pixelado; ver TRASPASO §4d, Sesión 6 — añadido). Se regeneran con `tools/extract_sprites.py`.
