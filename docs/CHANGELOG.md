# Historial de cambios

## Sesión 1 — Fases 0 y 1 (15/11/2026)

### Fase 0: infraestructura
- `package.json` con `npm run build`, `npm run dev` (recompila al guardar) y `npm test`.
- `build.mjs`: esbuild empaqueta `src/main.js` en formato IIFE (sin módulos ES, para que funcione desde file://) y lo incrusta en `src/index.html` junto con las imágenes en base64. Resultado: `dist/isla.html`, un único archivo de unos 430 KB.
- Estructura `src/` según TRASPASO §2.2 (`core/`, `world/`, `entities/`, `render/`; el resto de carpetas se crearán cuando haya contenido).
- Pruebas de humo con Playwright (`tests/smoke.spec.mjs`), 8 pruebas.
- Dependencias de desarrollo fijadas a versión exacta: esbuild 0.28.2 y @playwright/test 1.63.0. El juego no tiene dependencias en tiempo de ejecución.

### Fase 1: motor y personaje
- Bucle con `requestAnimationFrame`, dt limitado a 1/30 s y física con subpasos de 1/120 s.
- Input de teclado y ratón con "pulsado" / "pulsado este fotograma" / "soltado este fotograma". Las teclas se sueltan solas si la ventana pierde el foco.
- Canvas interno de 1280 × 720 escalado a la ventana con bandas negras.
- RNG con semilla (mulberry32), usado ya para el fondo y las variaciones de los tiles.
- Mundo de prueba de 200 × 45 tiles de 20 px: suelo, bloque bajo, escalera de plataformas de un sentido, pared de 10 tiles, hueco de 5 tiles con plataformas para salir, estanque, túnel bajo, torre para caídas largas, terreno escalonado.
- Colisiones AABB por ejes contra tiles sólidos y plataformas de un sentido.
- Jugador: caja de 16 × 44 px (28 px agachado), sprite del atlas a 0,5 anclado en los pies y volteado según la dirección. Andar, correr con Mayús, salto de altura variable (mantener = más alto), margen tras salir de un borde (coyote time), pulsación de salto recordada, agacharse (no se levanta si no cabe), bajar de plataformas con S + Espacio, nado básico (flota, bucea con S, nada hacia arriba con Espacio y sale del agua de un salto).
- Salto según Agilidad (2,6 + Agilidad × 0,25 tiles), de momento con Agilidad fija 3 (3,35 tiles).
- Cámara con seguimiento suave, mirada adelantada, zoom 1,5, sin seguir cada salto en vertical, y límites del mundo.
- HUD provisional con controles, pausa (Esc) y panel de depuración (F3).

### Decisiones técnicas menores tomadas en esta sesión
- **Reposo = primer fotograma de `walk`.** El fotograma `idle` del atlas está de frente y en otro estilo (TRASPASO §3.5), así que no se usa por ahora.
- **Caja del jugador de 16 × 44 px** en lugar de 16 × 40: con tiles de 20 px, así existe un túnel (40 px de alto) que obliga a agacharse.
- **Zoom de cámara 1,5** (el personaje se ve a 72 px en pantalla). Con zoom 1 se veía demasiado pequeño. Es la constante `CAMERA_ZOOM` de `src/config.js`.
- **El nado es provisional** y usa la animación de andar; el nado completo es de la Fase 4.

### Problemas conocidos
- Los fotogramas de `jump` y `crouch` se ven algo más grandes que los de `walk` y `run` (escalas del atlas ajustadas a ojo, TRASPASO §3.5). Se corrige en `tools/extract_sprites.py` (`scales`).
- Solo se ha probado en Chromium (pruebas automáticas desde file://). Falta probarlo en Firefox, Safari y Edge.
- El ratón ya se lee, pero todavía no hace nada.
- Todavía no hay daño por caída, escaleras, lianas ni escalada (Fase 4).

### Siguiente: sesión 2 — Fase 2 (flujo de inicio)
Título con `avion.jpg`, creación de personaje (10 puntos entre 4 atributos, colores con recoloreado y vista previa), intro breve y aterrizaje cenital con el resultado según la zona.
