# Historial de cambios

## Sesión 3 — §4c: estética de verdad y primer espacio jugable (15/11/2026)

Javier rechazó el aspecto de la sesión 2. El objetivo visual es `assets-src/referencias/objetivo-estilo-selva.png`.

### Estética
- **Mundo a baja resolución:** se pinta a 640 × 360 y se escala ×2 sin suavizado.
  - El atlas del protagonista se reduce a la mitad al cargar, para que sea pixel art nítido a la misma escala que el mundo.
  - El HUD se dibuja a 1280 × 720.
- **Terreno pintado por código** y prerenderizado al cargar:
  - bordes orgánicos entre selva, hierba, arena, tierra y agua (pertenencia interpolada entre tiles más ruido), con contorno de cómic;
  - arena mojada en la orilla y barro en las riberas;
  - agua por bandas de profundidad;
  - losas con musgo en las ruinas;
  - puente colgante con tablones y cuerdas;
  - detalles en el suelo: hojas, matas, flores, conchas y piedras.
- **Acantilados:** bloques de piedra irregulares con musgo, lianas colgando, borde de hierba que sobresale y sombra al pie.
- **Props** con sombreado por tonos y contorno, ordenados por profundidad y con sombra:
  - vegetación: palmeras, árboles de selva (dos paletas), helechos, hojas grandes, bromelias con flores rojas y moradas, arbustos (con bayas), hierba alta, rocas con musgo, troncos caídos;
  - madera y piedra: cajas, barriles, cofres (abiertos y cerrados), carteles (flecha y calavera), tótems, pilares, muros en ruinas y un templo escalonado;
  - campamento: tiendas, empalizada, hoguera y antorchas con llamas animadas;
  - restos de la avioneta A-07 con humo.
  - Las copas se vuelven semitransparentes si pasas por detrás y la vegetación se balancea.
- **Agua viva:**
  - espuma que sube y baja por la orilla y olas que llegan a la playa;
  - destellos en el mar;
  - corriente en el río;
  - **cascada** con espuma y bruma.
- **Ambiente:**
  - sombras de nubes que cruzan el suelo;
  - hojas que caen y motas de luz en la selva, luciérnagas de noche;
  - polvo al correr, chispas en los fuegos;
  - gradación de color por zona y viñeta.
- **Iluminación:** capa de luz multiplicativa con luces en anillos (hoguera, antorchas, antorcha del jugador y un pequeño halo propio).
- **Ilustraciones de Javier:** `selva.jpg` en la pantalla de carga y en el cartel de la selva; `avion.jpg` en el título.

### Espacio jugable (mapa a mano, 84 × 36 tiles)
- **Playa del naufragio:**
  - restos del avión con botín inicial (cuchillo, 2 botellas de agua, ración, venda, tela);
  - maleta, barril y caja;
  - palmeras con cocos;
  - cangrejos.
- **Selva:**
  - meseta con acantilado escalable y ruinas (templo, pilares, tótem, cofre con un ídolo);
  - río con cascada y **puente colgante**;
  - jabalí;
  - dos zonas de hierba alta;
  - **campamento de la tribu** con empalizada, hoguera, tiendas, antorchas, dos cofres, caja y barril.

### Mecánicas
- **Buscar y saquear:**
  - **E** abre contenedores, recoge objetos del suelo y bayas y bebe del río;
  - **mochila** de 18 huecos (I / Tab) con 18 objetos con nombre, icono y descripción;
  - comer, beber y curarse (clic, Enter, Q, R, H).
- **Necesidades:** hambre, sed y energía bajan con el tiempo. A cero, quitan vida. Con poca energía no se puede correr.
- **Combate:**
  - ataque hacia el ratón (clic) con tajo visible;
  - con cuchillo hace 20 de daño; a puños, 6; doble si el enemigo no te ve;
  - pausa breve al golpear, retroceso, temblor de pantalla y números de daño.
- **Vida, muerte y reaparición** en la playa (con 60 de vida; conservas la mochila).
- **Tribu (3 guerreros):**
  - patrullan con **cono de visión dibujado**, recortado por la línea de visión;
  - tienen un medidor de detección y sospechan (**?**) al verte de lejos o al oír ruido (correr, atacar, chapotear);
  - investigan, persiguen (**!**), atacan con aviso y avisan a sus compañeros;
  - buscan donde te vieron y abandonan si te pierdes o te alejas.
  - Reutilizan el sprite del protagonista recoloreado (piel, pintura, taparrabos, cinta), con lanza y plumas.
- **Jabalí:** te ve, rasca el suelo, embiste en línea recta y se aturde si choca.
- **Cangrejos:** inofensivos, huyen y dan carne.
- **Sigilo:**
  - agachado en la hierba alta estás oculto;
  - por la espalda de un enemigo desprevenido, **F** lo elimina de un golpe;
  - de noche ven menos salvo que lleves antorcha o estés junto a un fuego.
- **Día y noche:** reloj (1 h = 25 s), atardecer naranja y noche oscura con radio de visión reducido.
- **Lluvia:**
  - llega sola cada pocos minutos, con gotas, salpicaduras, ondas en el agua, charcos, cielo encapotado y sonido;
  - **relámpagos y truenos** cuando arrecia;
  - los enemigos ven un 35 % menos y oyen un 60 % menos.
- **HUD:**
  - barras con iconos, reloj con sol, luna y lluvia, cartel de zona y aviso de interacción;
  - registro de objetos, mensajes, «Oculto» y punto de mira;
  - mochila, ayuda de controles (F1), muerte y pausa.
- **Sonido sintetizado** con WebAudio: golpes, recoger, alerta, comer, beber, jabalí, lluvia y trueno.
- **Pruebas:** 12 pruebas de Playwright. Cubren carga y título, movimiento, colisión y profundidad, escalada, saqueo, recoger y comer, detección y escondite, daño y eliminación silenciosa, jabalí, lluvia y noche, muerte, y las capturas.
- **Rendimiento:** 5–8 ms por fotograma en Chromium sin GPU.

### Decisiones tomadas sin consultar (menores, fáciles de cambiar)
- **Recolor del protagonista para la tribu:** los guerreros lo usan. Era una recomendación de §2.6 y la pregunta 9 de §3.6 sigue abierta.
- **Muerte:** reapareces en la playa y conservas todo (versión sencilla de §2.4).
- **Atajos de prueba:** F5 adelanta 2 horas y F6 activa o quita la lluvia.
- **Ídolo de jade:** el cofre de las ruinas guarda un «Ídolo de jade» como tesoro sin uso todavía (gancho para los secretos).
- **Hora de inicio:** la partida empieza a las 16:00 para que anochezca pronto.

### Problemas conocidos y límites
- La escala de los sprites de salto, agacharse, escalar y atacar sigue sin igualar a la de andar (TRASPASO §3.5).
- Atacar, agacharse y recoger mirando arriba o abajo usan sustitutos.
- Los enemigos no rodean bien obstáculos grandes: tienen una evasión simple.
- Al morir no se pierde nada.
- La carne cruda no se puede cocinar: aún no hay fabricación.
- La energía no se recupera durmiendo: aún no hay refugio.
- La lluvia no apaga la antorcha.
- Solo se ha probado en Chromium.


## Sesión 2 — Fase 1b: conversión a vista cenital (15/11/2026)

Javier pidió vista cenital con movimiento en todas las direcciones, como en Pokémon (TRASPASO §2.1). Se rehízo el motor de la Fase 1 manteniendo la infraestructura.

### Hecho
- **Tiles de 32 px** con tres capas: suelo (hierba, arena, tierra, agua poco profunda, agua profunda, grieta, pared de acantilado, saliente, hierba alta), objeto (árbol, roca, muro) y **altura** (nivel 0, 1, 2…).
- **Mapa de prueba en texto** (`src/world/testLevel.js`, 60 × 40 tiles), fácil de editar a mano, con leyenda.
- **Movimiento libre en 8 direcciones**, normalizado (no se va más rápido en diagonal), con aceleración y frenada. Mayús para correr; C para agacharse.
- **Animaciones en 4 direcciones** (`walk_*`, `run_*`). En diagonal se mantiene la dirección actual si es una de las dos componentes y, si no, se usa la lateral. Reposo = primer fotograma de la dirección.
- **Colisión por la caja de los pies** (18 × 10 px), por ejes, con deslizamiento contra las paredes y **corrección de esquinas** (hasta 8 px) para no engancharse.
- **Ordenación por profundidad** (y de los pies): el jugador pasa por delante o por detrás de árboles, rocas y muros. Los árboles solo son sólidos en el tronco.
- **Alturas:** entre niveles distintos no se puede pasar andando.
  - **Pared de acantilado:** se escala empujando contra ella durante 0,15 s. Velocidad (70 + Agilidad × 10 px/s) y gasto de aguante (30 − Agilidad × 3,5 por segundo) según TRASPASO §1.5. Sprite `up` alternando el volteo. Se puede bajar escalando desde arriba. Si se agota el aguante, el personaje cae al pie de la pared.
  - **Saliente:** se salta hacia abajo andando contra él (salto corto con arco). Desde abajo es una pared.
  - Barra de **aguante** en el HUD; se recupera en el suelo.
- **Salto** (Espacio) con arco, sombra que se encoge y sprite `jump` de lado. Distancia corriendo = 2,6 + Agilidad × 0,25 tiles (3,35 con Agilidad 3); andando, el 60 %. En el aire se cruzan las **grietas**; si se aterriza en una, el personaje cae y vuelve a donde saltó.
- **Agua:** la poco profunda ralentiza (× 0,55) y tapa los pies; en la profunda se nada a 55 px/s, se ve medio cuerpo y no se puede saltar ni correr.
- **Hierba alta:** briznas por delante de los pies; el juego ya sabe cuándo estás dentro (para el sigilo de la Fase 7).
- **Cámara** con seguimiento suave en x e y, un poco adelantada hacia donde te mueves, y con límites del mapa.
- **Pruebas de humo** reescritas: 12 pruebas (4 direcciones con teclado real, diagonales, correr, muro y esquina, profundidad con un árbol, grietas, saliente, escalada y falta de aguante, agua, cámara, agacharse e hierba alta).
- **Física lateral retirada:** `src/world/physics.js` (gravedad y plataformas de un sentido) se ha borrado. Queda en el historial de Git, en el commit `ce4d2b1`.

### Decisiones técnicas menores
- **Tiles de 32 px** (lo que propone §4b): el personaje mide 1,5 tiles, proporción parecida a la de Pokémon.
- **Movimiento libre** (no por casillas), como recomienda §2.1. Sigue pendiente confirmarlo con Javier (pregunta 3b).
- **Sin sprites de saltar mirando arriba o abajo:** en esas direcciones se usa un fotograma de andar con el arco y la sombra. Agacharse siempre usa el sprite lateral.
- **No se puede entrar andando en una grieta:** solo se cae en ella saltando mal, para que no haya caídas por descuido.
- **Las caídas no hacen daño todavía**: aún no hay vida (Fase 2 y Fase 4).

### Problemas conocidos
- Los fotogramas de `jump`, `crouch` y `up` se ven algo más grandes que los de andar (escalas del atlas, TRASPASO §3.5).
- La escalada no tiene animación propia: se alterna el volteo del sprite `up`.
- Las mesetas se distinguen por un verde algo más claro, un borde de roca y sombra. El efecto de altura es sencillo; mejorará con el arte de tiles.
- Las paredes de acantilado solo funcionan en el lado sur de una meseta (en vista cenital las caras norte, este y oeste son bordes que no se escalan). Por ahora los salientes solo miran al sur.
- Solo se ha probado en Chromium.

### Siguiente: Fase 2 (flujo de inicio)
Título con `avion.jpg`, creación de personaje (10 puntos, colores con recoloreado y vista previa), intro breve y aterrizaje cenital con el resultado según la zona. Antes conviene que Javier responda las preguntas 3b (libre o por casillas) y 7 (color de pelo y pañuelo).

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
