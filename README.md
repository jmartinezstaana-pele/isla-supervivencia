# Isla — juego de supervivencia (en desarrollo)

Juego de navegador 2D en **vista cenital** de supervivencia, sigilo y plataformas en una isla. Te estrellas con la avioneta, tienes que sobrevivir y escapar.

- Diseño completo y decisiones: [`docs/TRASPASO.md`](docs/TRASPASO.md)
- Historial de cambios por sesión: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- Instrucciones para Claude Code: [`CLAUDE.md`](CLAUDE.md)

**Estado (sesión 4):** ya hay **flujo de inicio completo**: título, creación de personaje (10 puntos y colores), intro, aterrizaje cenital con el avión sin combustible y resultado según la zona. Los atributos tienen efecto real. El mundo jugable sigue siendo el trozo de isla de la sesión 3 (unas 4 × 3 pantallas, playa y selva):
- saqueo e inventario;
- combate cuerpo a cuerpo;
- tres guerreros de la tribu con cono de visión;
- un jabalí;
- sigilo en la hierba alta;
- día y noche, lluvia con tormenta.

Todavía no hay isla completa, fabricación, guardado ni finales.

## Cómo jugar

Abre `dist/isla.html` con doble clic. Es un único archivo (≈1,9 MB), funciona sin conexión y sin instalar nada (probado en Chrome).

`dist/` no se sube al repositorio. Si no tienes el archivo, genéralo con `npm run build` (ver abajo).

### Antes de jugar

1. **Título:** *Nueva partida*. (*Continuar* está desactivado hasta que exista el guardado, sesión 8.) *Controles* muestra la lista de teclas.
2. **Creación de personaje:** reparte **10 puntos** (de 0 a 6 por atributo) con **W/S** y **A/D** o con los botones **−/+**. Debajo se ve cómo queda el personaje (vida, daño, salto, ruido…). A la derecha eliges el color de **pelo/pañuelo, piel, camiseta y pantalón**; la vista previa gira por las 4 direcciones. **X** reparte al azar. **Enter** o *Empezar* (con los 10 puntos gastados).
3. **Intro:** tres pantallas; **Enter** para seguir, **Esc** para saltarla.
4. **Aterrizaje:** el avión planea perdiendo altura. Gira con **A/D** (o ←/→) y pulsa **Espacio** para aterrizar donde marca la sombra. Cada zona tiene su riesgo:

| Zona | Daño | Avión |
|---|---|---|
| Playa | −10 vida | Se puede reparar |
| Selva | −30 vida | Destruido |
| Campamento de la tribu | −25 vida | Destruido, y la tribu acude |
| Meseta de las ruinas | −45 vida | Destruido, pero cerca de los secretos |
| Mar | ninguno | Se hunde: llegas nadando y los restos aparecen en la playa |

   Las zonas que todavía no existen (monte, manglar, campamento militar, acantilados, bahía y la selva del norte) se ven con niebla y el letrero **«zona sin explorar»**: no se puede aterrizar en ellas. Si te quedas sin altura encima, amerizas junto a la costa.

### Qué probar, en orden

1. Pulsa **E** junto a los **restos del avión** (estén donde estén): consigues un cuchillo, agua, comida y una venda. En la playa hay además una maleta, un barril y una caja.
2. Recoge cocos, piedras y palos del suelo (**E**). Los arbustos con bayas rojas se pueden recoger.
3. Come con **Q**, bebe con **R** o abre la mochila con **I** o **Tab** y haz clic en un objeto. Para beber del río, ponte en la orilla mirando al agua y pulsa **E**. En la mochila verás **pistas** según tu Inteligencia y el **riesgo de intoxicarte** con la carne o las bayas (la hierba medicinal cura la intoxicación).
4. Pulsa **P** para ver tu **personaje**: atributos y sus efectos, vida y estado del avión.
5. Sigue el camino hacia el este, cruza el **puente colgante** y verás la **hierba alta** junto al **campamento de la tribu**.
6. **Agáchate (C)** en la hierba alta: aparece «Oculto». Espera a que el guardia de la entrada te dé la espalda, acércate y pulsa **F**: eliminación silenciosa. Con más **Sigilo** tardan más en descubrirte.
7. Pelea con otro guerrero: **clic izquierdo** ataca hacia el ratón. Con más **Fuerza** pegas más fuerte.
   - Los guerreros muestran **?** cuando sospechan y **!** cuando te persiguen.
   - Si les pierdes de vista, acaban abandonando.
   - En la selva, al oeste del río, hay un **jabalí** que embiste.
8. Al norte hay un acantilado con lianas. **Escálalo** empujando hacia arriba contra la pared y llegarás a las **ruinas**, con un cofre. Con más **Agilidad** escalas más rápido y saltas más lejos.
9. La partida empieza a las 16:00: **anochece** hacia las 19:00 (unos 75 s de juego) y **llueve** al cabo de uno o dos minutos. Para no esperar: **F5** adelanta 2 horas y **F6** activa o quita la lluvia.

### Controles

| Tecla | Acción |
|---|---|
| WASD o flechas | Moverse en todas las direcciones |
| Mayús | Correr (hace ruido) |
| C | Agacharse (en hierba alta: oculto) |
| Clic izquierdo / J | Atacar hacia el ratón / hacia delante |
| F | Eliminación silenciosa por la espalda |
| E | Abrir, registrar, recoger, beber del río |
| I o Tab | Mochila (clic o Enter para usar un objeto) |
| P | Personaje: atributos y efectos |
| Q · R · H | Comer · beber · curarse (lo mejor que tengas) |
| T | Encender o apagar la antorcha (si la tienes) |
| Espacio | Saltar |
| Empujar contra una pared de roca | Escalar (gasta aguante) |
| F1 | Mostrar u ocultar los controles |
| F5 · F6 | Adelantar 2 horas · lluvia (atajos de prueba) |
| Esc | Pausa |
| F3 | Panel de depuración |

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

Las pruebas guardan capturas en `tests/output/`: `titulo.png`, `creacion.png`, `intro.png`, `aterrizaje.png`, `inicio-playa.png`, `personaje.png`, `mochila-pistas.png`, `playa.png`, `selva.png`, `cascada.png`, `campamento.png`, `noche.png` y `lluvia.png`.

## Cómo está hecho

- **Resolución:** el mundo se pinta en un buffer de **640 × 360** y se escala ×2 sin suavizado. El HUD se dibuja encima a 1280 × 720.
- **Gráficos por código:** terreno, árboles, rocas, ruinas, cajas e iconos se pintan con una pequeña librería de pixel art (`src/gfx/pixel.js`), con sombreado por tonos y contorno de cómic. No hay más imágenes que las de Javier en `assets/`.
- **Terreno:** se prerenderiza una vez al cargar. Los bordes entre suelos son orgánicos (interpolación entre tiles más ruido).

```
build.mjs              esbuild empaqueta src/main.js (IIFE) y lo incrusta con los assets en base64 → dist/isla.html
src/
  main.js              carga (pantalla con selva.jpg), sprites, bucle y gancho de pruebas window.__isla
  game.js              estado del juego y pantallas: nueva partida, aterrizaje, jugador, enemigos, saqueo, combate, sigilo, muerte
  config.js            constantes: pantalla, baja resolución, tiles, movimiento
  ui/                  título, creación de personaje, intro y aterrizaje cenital
  data/attributes.js   atributos y fórmulas de sus efectos (TRASPASO §1.5)
  core/                bucle, input, RNG y ruido con semilla, pantalla, imágenes, sonido (WebAudio)
  gfx/                 pixel art por código: paleta, terreno, props, iconos, personajes, recoloreado del protagonista
  world/               mapa a mano (islandMap.js), mapa del aterrizaje (landingMap.js), suelos, colisiones, props
  entities/            jugador, guerreros de la tribu (IA), jabalí y cangrejos
  systems/             reloj, clima, inventario, interacción
  render/              cámara, composición, agua animada, partículas, ambiente, iluminación, HUD
  data/items.js        objetos y pistas por Inteligencia
tests/                 pruebas de Playwright (smoke.spec.mjs: mundo; inicio.spec.mjs: flujo de inicio y atributos)
assets/                atlas del protagonista e ilustraciones de Javier
assets-src/            originales de Javier y referencias de estilo
tools/extract_sprites.py  regenera el atlas (Python 3 + numpy, Pillow, scipy)
```
