# Isla — juego de supervivencia (en desarrollo)

Juego de navegador 2D en **vista cenital** de supervivencia, sigilo y plataformas en una isla. Te estrellas con la avioneta, tienes que sobrevivir y escapar.

- Diseño completo y decisiones: [`docs/TRASPASO.md`](docs/TRASPASO.md)
- Historial de cambios por sesión: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- Instrucciones para Claude Code: [`CLAUDE.md`](CLAUDE.md)

**Estado (sesión 6):** el protagonista ya se ve **nítido** a cualquier resolución (atlas a 144 px, canvas a resolución real) y hay **interiores**: las **cuevas del monte** (de la terraza 1 a la 3 sin escalar), el **búnker** (se abre con una tarjeta) y las **cabañas** del poblado con la **choza del jefe**.

La **isla completa** (200 × 160 tiles, unas 10 × 14 pantallas) ya se puede recorrer de punta a punta:
- **playa del naufragio** y **selva** (el trozo de la sesión 3, integrado en el suroeste);
- **poblado de la tribu** al noroeste, con la choza del jefe y cinco guerreros;
- **monte** con cuatro terrazas separadas por paredes que se escalan, río con cascadas y **cumbre nevada** con la vieja antena;
- **campamento militar** abandonado con la entrada del búnker;
- **acantilados del viento** con grietas que saltar y nidos con huevos;
- **bahía este** con embarcadero, helipuerto y una barca naufragada;
- **manglar** con barro, agua turbia y niebla.

Además: flujo de inicio completo (título, creación de personaje, intro y aterrizaje en cualquier sitio de la isla), atributos con efecto real, **mapa M** con niebla de guerra, saqueo, combate, sigilo, día y noche, lluvia, ventisca en la cumbre y niebla en el manglar.

Todavía no hay fabricación, guardado ni finales.

## Cómo jugar

Abre `dist/isla.html` con doble clic. Es un único archivo (≈3 MB), funciona sin conexión y sin instalar nada (probado en Chrome).

`dist/` no se sube al repositorio. Si no tienes el archivo, genéralo con `npm run build` (ver abajo).

### Antes de jugar

1. **Título:** *Nueva partida*. (*Continuar* está desactivado hasta que exista el guardado, sesión 8.) *Controles* muestra la lista de teclas.
2. **Creación de personaje:** reparte **10 puntos** (de 0 a 6 por atributo) con **W/S** y **A/D** o con los botones **−/+**. Debajo se ve cómo queda el personaje (vida, daño, salto, ruido…). A la derecha eliges el color de **pelo/pañuelo, piel, camiseta y pantalón**; la vista previa gira por las 4 direcciones. **X** reparte al azar. **Enter** o *Empezar* (con los 10 puntos gastados).
3. **Intro:** tres pantallas; **Enter** para seguir, **Esc** para saltarla.
4. **Aterrizaje:** el avión planea perdiendo altura. Gira con **A/D** (o ←/→) y pulsa **Espacio** para aterrizar donde marca la sombra. Cada zona tiene su riesgo:

| Sitio | Daño | Avión |
|---|---|---|
| Arena (cualquier playa) | −10 vida | Se puede reparar |
| Manglar | −20 vida | Destruido (se hunde en el fango) |
| Campamento o poblado de la tribu | −25 vida | Destruido, y la tribu acude |
| Selva | −30 vida | Destruido |
| Campamento militar | −35 vida | Destruido |
| Acantilados del viento | −40 vida | Destruido |
| Monte y meseta de las ruinas | −45 vida | Destruido, pero cerca de los secretos |
| Cumbre | −50 vida | Destruido |
| Mar | ninguno | Se hunde: llegas nadando a la costa más cercana y los restos aparecen en la orilla |

   Si te quedas sin altura, el avión baja donde esté.

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
9. Pulsa **M** para ver el **mapa de la isla**: las zonas que aún no has pisado están tapadas por la niebla y se descubren al entrar en ellas (el cartel avisa con «¡Zona descubierta!»).
10. Explora la isla:
    - al norte de la playa, siguiendo la costa, está el **poblado de la tribu** (hierba alta alrededor, guerreros patrullando, la choza del jefe con un cofre);
    - desde las ruinas, el camino sube por el **monte**: escala las paredes de cada terraza hasta la **cumbre nevada** y la antena;
    - al este del monte, el **campamento militar** (cajas con chatarra y la puerta del búnker) y, más allá, la **bahía** con el embarcadero y el helipuerto;
    - al noreste, los **acantilados del viento**: grietas que se cruzan saltando (Espacio corriendo) y un saliente para bajar de un salto;
    - al sur, el **manglar**, con barro y niebla.
11. **Interiores** (sesión 6). Se entra andando hacia la puerta o con **E**, y se sale andando hacia abajo por la salida:
    - **Cuevas del monte:** la boca de abajo está en una pared de la **terraza 1**, al sur del monte, y la de arriba en la **terraza 3**. Dentro está **oscurísimo**: lleva una antorcha encendida (**T**; hay antorchas en los cofres de la tribu). Busca el **esqueleto del soldado** (tarjeta de acceso y nota), un **bidón** y la **guarida** del norte. Sal por la otra boca y habrás subido dos terrazas sin escalar.
    - **Búnker:** en el campamento militar, pulsa **E** en la puerta. Sin tarjeta no abre; con la tarjeta de la cueva, sí. Dentro hay **radio rota**, **batería**, **cables**, un **bidón** y tres **notas**.
    - **Poblado:** las cinco cabañas y la **choza del jefe** se pueden visitar. El cofre del jefe, con un **bidón**, está dentro de su choza.
    - Las **notas** se leen con **E** y se cierran con **E** o **Esc**.
12. La partida empieza a las 16:00: **anochece** hacia las 19:00 (unos 75 s de juego) y **llueve** al cabo de uno o dos minutos. Para no esperar: **F5** adelanta 2 horas y **F6** activa o quita la lluvia.

### Controles

| Tecla | Acción |
|---|---|
| WASD o flechas | Moverse en todas las direcciones |
| Mayús | Correr (hace ruido) |
| C | Agacharse (en hierba alta: oculto) |
| Clic izquierdo / J | Atacar hacia el ratón / hacia delante |
| F | Eliminación silenciosa por la espalda |
| E | Abrir, registrar, recoger, beber del río, entrar, leer notas |
| I o Tab | Mochila (clic o Enter para usar un objeto) |
| P | Personaje: atributos y efectos |
| M | Mapa de la isla (niebla de guerra) |
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

Las pruebas guardan capturas en `tests/output/`: `titulo.png`, `creacion.png`, `intro.png`, `aterrizaje.png`, `inicio-playa.png`, `personaje.png`, `mochila-pistas.png`, `bioma-*.png` (una por bioma), `mapa-m.png`, `playa.png`, `selva.png`, `cascada.png`, `campamento.png`, `noche.png` y `lluvia.png`. Además, `nitidez/` (protagonista en la creación y en el juego a 1920 × 1080 y 1280 × 720) e `interiores/` (bocas de la cueva, cueva, búnker, cabañas, notas y mapa).

`node tools/capturas-nitidez.mjs <carpeta>` repite las capturas de nitidez para comparar versiones (la comparación de la sesión 6 está en `docs/capturas/nitidez-antes-despues.png`).

## Cómo está hecho

- **Resolución:** el canvas mide lo mismo que la pantalla (CSS × `devicePixelRatio`). El mundo es pixel art de **640 × 360** que se amplía con una escala entera sin suavizado (×2 a 720p, ×3 a 1080p). Los **personajes** se dibujan a resolución real con el atlas grande (144 px de alto, remuestreado una vez por escala). La interfaz usa coordenadas lógicas de 1280 × 720 y se dibuja a resolución real.
- **Niveles:** la isla y cada interior (cueva, búnker, cabañas) tienen su mapa, su terreno, sus props y entidades; el juego cambia de uno a otro con un fundido.
- **Gráficos por código:** terreno, árboles, rocas, ruinas, cajas e iconos se pintan con una pequeña librería de pixel art (`src/gfx/pixel.js`), con sombreado por tonos y contorno de cómic. No hay más imágenes que las de Javier en `assets/`.
- **Terreno:** la isla tiene unos 33 millones de píxeles, así que el suelo se pinta **por trozos de 128 × 128 px** cuando hace falta (unos 9 ms cada uno), con un margen para que encajen sin costuras. Se adelantan los trozos de alrededor de la cámara (como mucho unos milisegundos por fotograma) y se guardan los últimos 420. Los props se buscan con un índice espacial. Resultado: 60 fps corriendo por la isla y carga en menos de un segundo.
- **Bordes:** orgánicos entre suelos (interpolación entre tiles más ruido), con contorno de cómic.

```
build.mjs              esbuild empaqueta src/main.js (IIFE) y lo incrusta con los assets en base64 → dist/isla.html
src/
  main.js              carga (pantalla con selva.jpg), sprites, bucle y gancho de pruebas window.__isla
  game.js              estado del juego y pantallas: nueva partida, aterrizaje, jugador, enemigos, saqueo, combate, sigilo, muerte, niveles e interiores
  config.js            constantes: pantalla, baja resolución, tiles, movimiento
  ui/                  título, creación de personaje, intro, aterrizaje cenital y mapa M
  data/attributes.js   atributos y fórmulas de sus efectos (TRASPASO §1.5)
  core/                bucle, input, RNG y ruido con semilla, pantalla y escalas (display.js), imágenes, sonido (WebAudio)
  gfx/                 pixel art por código: paleta, terreno por trozos, props (y de los biomas en biomeProps.js), iconos, personajes (charSprite.js: sprites nítidos), recoloreado, props de interiores (interiorProps.js)
  world/               isla completa (worldMap.js), trozo a mano de la sesión 3 (islandMap.js), mapa del aterrizaje y del mapa M (landingMap.js), props (props.js, worldProps.js), interiores (interiors.js), índice espacial, colisiones
  entities/            jugador, guerreros de la tribu (IA), jabalí y cangrejos
  systems/             reloj, clima, inventario, interacción
  render/              cámara, composición, agua animada, partículas, ambiente, iluminación, HUD
  data/items.js        objetos y pistas por Inteligencia
tests/                 pruebas de Playwright (smoke.spec.mjs: mundo; inicio.spec.mjs: flujo de inicio y atributos; isla.spec.mjs: isla completa, mapa M y rendimiento; nitidez.spec.mjs: nitidez del protagonista; interiores.spec.mjs: cueva, búnker y cabañas)
assets/                atlas del protagonista e ilustraciones de Javier
assets-src/            originales de Javier y referencias de estilo
tools/extract_sprites.py  regenera el atlas (Python 3 + numpy, Pillow, scipy)
tools/capturas-nitidez.mjs capturas de comparación del protagonista
```
