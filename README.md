# Isla — juego de supervivencia (en desarrollo)

Juego de navegador 2D en **vista cenital** de supervivencia, sigilo y plataformas en una isla. Te estrellas con la avioneta, tienes que sobrevivir y escapar.

- Diseño completo y decisiones: [`docs/TRASPASO.md`](docs/TRASPASO.md)
- Historial de cambios por sesión: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- Instrucciones para Claude Code: [`CLAUDE.md`](CLAUDE.md)

**Estado (sesión 3):** primer espacio jugable con estética de pixel art de cómic. Es un trozo de isla de unas 4 × 3 pantallas, con playa y selva:
- saqueo e inventario;
- combate cuerpo a cuerpo;
- tres guerreros de la tribu con cono de visión;
- un jabalí;
- sigilo en la hierba alta;
- día y noche, lluvia con tormenta.

Todavía no hay creación de personaje, aterrizaje, fabricación, guardado ni finales.

## Cómo jugar

Abre `dist/isla.html` con doble clic. Es un único archivo (≈1,5 MB), funciona sin conexión y sin instalar nada (probado en Chrome).

`dist/` no se sube al repositorio. Si no tienes el archivo, genéralo con `npm run build` (ver abajo).

### Qué probar, en orden

1. En la playa, pulsa **E** junto a los **restos del avión**: consigues un cuchillo, agua, comida y una venda. También hay una maleta, un barril y una caja.
2. Recoge cocos, piedras y palos del suelo (**E**). Los arbustos con bayas rojas se pueden recoger.
3. Come con **Q**, bebe con **R** o abre la mochila con **I** o **Tab** y haz clic en un objeto. Para beber del río, ponte en la orilla mirando al agua y pulsa **E**.
4. Sigue el camino hacia el este, cruza el **puente colgante** y verás la **hierba alta** junto al **campamento de la tribu**.
5. **Agáchate (C)** en la hierba alta: aparece «Oculto». Espera a que el guardia de la entrada te dé la espalda, acércate y pulsa **F**: eliminación silenciosa.
6. Pelea con otro guerrero: **clic izquierdo** ataca hacia el ratón.
   - Los guerreros muestran **?** cuando sospechan y **!** cuando te persiguen.
   - Si les pierdes de vista, acaban abandonando.
   - En la selva, al oeste del río, hay un **jabalí** que embiste.
7. Al norte hay un acantilado con lianas. **Escálalo** empujando hacia arriba contra la pared y llegarás a las **ruinas**, con un cofre.
8. La partida empieza a las 16:00: **anochece** hacia las 19:00 (unos 75 s de juego) y **llueve** al cabo de uno o dos minutos. Para no esperar: **F5** adelanta 2 horas y **F6** activa o quita la lluvia.

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

Las pruebas guardan capturas en `tests/output/`: `playa.png`, `selva.png`, `cascada.png`, `campamento.png`, `noche.png` y `lluvia.png`.

## Cómo está hecho

- **Resolución:** el mundo se pinta en un buffer de **640 × 360** y se escala ×2 sin suavizado. El HUD se dibuja encima a 1280 × 720.
- **Gráficos por código:** terreno, árboles, rocas, ruinas, cajas e iconos se pintan con una pequeña librería de pixel art (`src/gfx/pixel.js`), con sombreado por tonos y contorno de cómic. No hay más imágenes que las de Javier en `assets/`.
- **Terreno:** se prerenderiza una vez al cargar. Los bordes entre suelos son orgánicos (interpolación entre tiles más ruido).

```
build.mjs              esbuild empaqueta src/main.js (IIFE) y lo incrusta con los assets en base64 → dist/isla.html
src/
  main.js              carga (pantalla con selva.jpg), sprites, bucle y gancho de pruebas window.__isla
  game.js              estado del juego: título, jugador, enemigos, saqueo, combate, sigilo, muerte
  config.js            constantes: pantalla, baja resolución, tiles, movimiento, fórmulas por Agilidad
  core/                bucle, input, RNG y ruido con semilla, pantalla, imágenes, sonido (WebAudio)
  gfx/                 pixel art por código: paleta, terreno, props, iconos, personajes (atlas reducido y tribu recoloreada)
  world/               mapa a mano (islandMap.js), tipos de suelo, colisiones, colocación de props
  entities/            jugador, guerreros de la tribu (IA), jabalí y cangrejos
  systems/             reloj, clima, inventario, interacción
  render/              cámara, composición, agua animada, partículas, ambiente, iluminación, HUD
  data/items.js        objetos
tests/smoke.spec.mjs   pruebas de Playwright
assets/                atlas del protagonista e ilustraciones de Javier
assets-src/            originales de Javier y referencias de estilo
tools/extract_sprites.py  regenera el atlas (Python 3 + numpy, Pillow, scipy)
```
