# Informe de traspaso: juego de supervivencia en una isla

**Fecha:** 15/11/2026
**Origen:** conversación de diseño con Javier en Claude (proyecto "Juego")
**Destino:** Claude Code, trabajando sobre el repositorio de GitHub

## 0. Cómo leer este documento

Cada decisión lleva una etiqueta:

| Etiqueta | Significado |
|---|---|
| **[ACORDADO-USUARIO]** | Javier lo pidió explícitamente con sus palabras. No se cambia sin consultarle. |
| **[ACORDADO-DELEGADO]** | Claude lo propuso por escrito y Javier respondió "decide tú". Cuenta como decisión tomada, pero es razonable confirmarla si surge un motivo de peso. |
| **[RECOMENDACIÓN]** | Diseño o propuesta técnica de Claude que **no** se llegó a comunicar ni validar. Es un punto de partida, no una decisión. |
| **[PENDIENTE]** | Pregunta abierta que debe decidir Javier. |

> ⚠️ **Aviso importante sobre el contexto del proyecto.** El proyecto de claude.ai "Juego" tiene unas instrucciones permanentes que describen **otro videojuego**: supervivencia urbana en 3D con Godot 4, ciudad, NPC, economía, etc. **Este traspaso no trata de ese juego.** Javier pidió este juego de la isla como "una prueba", con una visión propia. No hay que mezclar los dos diseños. Las instrucciones del proyecto urbano piden Godot si el repositorio está vacío; para este juego, la tecnología acordada por delegación es otra (ver §2.1). **[ACORDADO-USUARIO] (15/11/2026)** Javier ha confirmado que el repositorio es para **este juego de la isla**.

---

## 1. Visión del juego

### 1.1 Concepto general

**[ACORDADO-USUARIO]** Petición original de Javier, resumida con fidelidad:

- Juego **abierto** en una isla.
- La **primera imagen** es un **mapa de la isla visto desde arriba** con un **aviso de "sin gasolina"**. El jugador debe **aterrizar su avión en algún lugar de la isla**.
- Después hay que **sobrevivir hasta encontrar alguna forma de escapar**.
- El personaje debe **conseguir recursos para sobrevivir y para buscar una salida**.
- La isla **guarda secretos y peligros**. **De noche acechan más.** Hay **zonas de más peligro**, **animales** y "tibus oculpas" (ver la interpretación más abajo).
- Es un juego de **sigilo**: poder **saquear sin ser visto** y **asesinar con sigilo**.
- Es un juego de **plataformas**: por ejemplo, **escalar una montaña para llegar a una zona** o **persecuciones por acantilados**.
- **No hace falta que sea infinito** de momento. Basta con que sea jugable un rato.
- Javier dio **libertad creativa**: "esto es solo una idea, quiero que lo extiendas más" y "te doy libertad".

**[ACORDADO-DELEGADO]** "tibus oculpas" se interpretó como **"tribus ocultas"**, es decir, nativos hostiles. Claude preguntó si era así y Javier respondió "decide tú".

**[RECOMENDACIÓN]** Nombre provisional: *Isla Ceniza*. No se comunicó a Javier.

### 1.2 Mecánicas principales

| Mecánica | Estado | Detalle |
|---|---|---|
| Aterrizaje inicial | [ACORDADO-USUARIO] + [ACORDADO-DELEGADO] | Mapa cenital con el avión sin combustible; eliges dónde aterrizar. Por delegación: **cada zona de aterrizaje tiene su riesgo**. La playa es fácil; la selva daña el avión; la montaña te deja cerca de los secretos. |
| Supervivencia | [ACORDADO-DELEGADO] | **Hambre, sed y energía.** |
| Recolección y fabricación | [ACORDADO-USUARIO] (recursos) + [ACORDADO-DELEGADO] (lista) | Recoger recursos y fabricar. Ejemplos acordados: **lanza, antorcha, cuerda, garfio, balsa**. |
| Refugio | [ACORDADO-DELEGADO] | **Montar un refugio para pasar la noche.** |
| Sigilo | [ACORDADO-USUARIO] + [ACORDADO-DELEGADO] | Saquear sin ser visto y asesinatos sigilosos (Javier). Por delegación: **cono de visión de los enemigos**, **hierba alta para esconderse**, **saquear campamentos sin que te vean**, **eliminaciones silenciosas por la espalda**. |
| Plataformas | [ACORDADO-USUARIO] + [ACORDADO-DELEGADO] | Escalar la montaña y persecuciones por acantilados (Javier). Por delegación: **salientes en acantilados** y **caídas mortales**. |
| Peligros | [ACORDADO-USUARIO] + [ACORDADO-DELEGADO] | Noche más peligrosa, zonas peligrosas, animales y tribus (Javier). Animales concretos por delegación: **jabalíes, serpientes y un depredador nocturno**; además, **la tribu oculta**. |
| Secretos | [ACORDADO-USUARIO] + [ACORDADO-DELEGADO] | Javier pidió secretos. Por delegación: **un búnker, unas ruinas y una radio**. |
| Huidas / finales | [ACORDADO-DELEGADO] | **2 o 3 formas de escapar**: **reparar la radio y pedir rescate**, **construir una balsa** o **conseguir combustible para el avión**. |
| Guardado | [ACORDADO-DELEGADO] | Partida **con guardado**. |
| Duración | [ACORDADO-DELEGADO] | Una partida completa de **unos 30 a 60 minutos**. |

### 1.3 Modos de juego

- **[ACORDADO-DELEGADO]** Un solo jugador, partida con principio y fin (una de las huidas) y guardado.
- **[ACORDADO-USUARIO]** De momento no es un juego infinito.
- No se habló de multijugador, niveles de dificultad ni modo historia aparte. **[PENDIENTE]** si se quieren.

### 1.4 Sistema de progresión

- **[ACORDADO-USUARIO]** Antes de subir al avión se reparten **10 puntos** entre las habilidades que el jugador quiera.
- **[ACORDADO-DELEGADO]** La progresión durante la partida viene de **conseguir recursos, recetas y objetos clave** (garfio, radio, balsa, combustible) que abren nuevas zonas y huidas.
- **[RECOMENDACIÓN]** Experiencia por acciones (descubrir zonas, leer notas, fabricar, cazar, eliminar enemigos, abrir cofres). Cada nivel da +1 punto de atributo, con un máximo de 10 por atributo. Así se ve cómo mejora el personaje. No está validado.

### 1.5 Personaje, habilidades y personalización

**Atributos**

| Atributo | Estado | Efecto |
|---|---|---|
| **Fuerza** | [ACORDADO-USUARIO] | Más vida, más daño. |
| **Habilidad / Agilidad** | [ACORDADO-USUARIO] (nombre original "Habilidad") / [ACORDADO-DELEGADO] (renombrado a "Agilidad" con efectos ampliados) | Javier: más agilidad, saltar más, trepar más alto. Ampliación delegada: también **velocidad y aguante**. |
| **Inteligencia** | [ACORDADO-USUARIO] + [ACORDADO-DELEGADO] | Javier: más ayudas del juego al mezclar materiales. Ampliación delegada: **pistas de fabricación, recetas descubiertas e identificar plantas venenosas**. |
| **Sigilo / Percepción** | [ACORDADO-DELEGADO] (atributo nuevo) | **Menos ruido al moverte y ver antes a los enemigos.** |

- **[ACORDADO-USUARIO]** 10 puntos a repartir.
- **[RECOMENDACIÓN]** Valor de 0 a 6 por atributo en la creación. Fórmulas orientativas (sin validar):
  - Vida máxima = 80 + Fuerza × 12.
  - Daño cuerpo a cuerpo × (1 + Fuerza × 0,12).
  - Capacidad de carga = 40 + Fuerza × 6.
  - Altura de salto ≈ (2,6 + Agilidad × 0,25) casillas.
  - Gasto de aguante al escalar = 30 − Agilidad × 3,5 por segundo, sobre 100.
  - Velocidad de escalada = 70 + Agilidad × 10 px/s.
  - Radio de ruido × (1 − Sigilo × 0,1).
  - Ritmo de detección enemiga × (1 − Sigilo × 0,09).
  - Inteligencia: nivel de pistas en recetas, menos riesgo de enfermar por comida o agua y menos materiales perdidos al fallar una mezcla.

**Personalización**

- **[ACORDADO-USUARIO]** Antes de empezar se puede cambiar el **color de pelo, de piel y de vestimenta**.
- **[PENDIENTE]** El personaje de las imágenes de Javier lleva **pañuelo en la cabeza**, que tapa casi todo el pelo. Hay que decidir si el color de "pelo" se aplica al pañuelo o si se añade pelo visible. **[RECOMENDACIÓN]** Recolorear el pañuelo como "pelo/pañuelo" y separar camiseta y pantalón (ver §2.6).

### 1.6 Dirección artística

**[ACORDADO-USUARIO]** Javier aportó una carpeta de imágenes (`C:\Users\Javier\Desktop\Imagenes`, 15 archivos) que marca el estilo. Lo que se observa:

- **"Estilo cel-shaded, cómic indie"**: así lo rotula la propia imagen `2. Personaje.png`.
- Protagonista: **comando con pañuelo, camiseta de tirantes blanca, pantalón militar verde y botas marrones**.
- Hojas de sprites en **pixel art detallado**, al estilo arcade de acción en 2D.
- `Avion.png`: ilustración de una **avioneta militar de camuflaje con matrícula "A-07"** sobre **montañas nevadas**, un bosque de coníferas, un **campamento militar de tiendas** y una torre de vigilancia.
- `3. Paisaje.jpg`: **campamento militar nevado** con tiendas, cajas de suministros, radios y una hoguera, con el protagonista en el centro.

**[ACORDADO-DELEGADO]** En el primer mensaje Claude propuso dos tonos posibles y Javier delegó:

- Tono: Claude preguntó si sería "realista y algo oscuro" o "aventura tipo Uncharted/Lost". **No se llegó a fijar uno.** **[PENDIENTE]**, aunque Javier delegó la decisión.
- Zonas mencionadas por Claude y aceptadas por delegación: **playa, selva y montaña**.

**[ACORDADO-USUARIO] Climas y biomas (15/11/2026).** Javier ha confirmado, con sus palabras: *"Hay que añadir selva, claro, hay que añadir todos los climas que creamos oportunos, lluvias, oscuridad... eso era solo una idea"*. Por tanto:

- **La isla tiene selva** y **varios climas o biomas**, todos los que el equipo considere oportunos. Las imágenes nevadas eran **una idea de estilo, no el escenario literal**.
- **Clima dinámico** con **lluvia** y **oscuridad** como mínimo (Javier lo pide expresamente), además del ciclo de día y noche.
- **[RECOMENDACIÓN]** Biomas posibles:
  - playa tropical;
  - selva densa;
  - manglar o pantano;
  - monte con **cumbre nevada** (aprovecha el estilo de las imágenes);
  - campamento militar abandonado inspirado en `3. Paisaje.jpg` y `Avion.png`;
  - acantilados ventosos;
  - cuevas.
- **[RECOMENDACIÓN]** Clima posible:
  - lluvia y tormenta: menos visibilidad y menos oído enemigo, apaga antorchas, permite recoger agua;
  - niebla;
  - viento en los acantilados;
  - frío o ventisca en la cumbre: hace falta abrigo o fuego;
  - noches muy oscuras;
  - opcionalmente, apagón o eclipse como evento.

**Observaciones sobre los recursos gráficos** (necesitan revisión, ver §3.5):

- Las ilustraciones contienen texto incrustado: "BASE ALFA ALT. 1.250 m", "WHOOOSH", "FX", "SUMINISTROS HELADOS NO RECOPILAR", "NO RECOPILAR". Sirven para pantallas de título o creación, o como referencia, pero no como fondos jugables sin retocar.
- `1. Quieto.png` está en un estilo más realista y en vista 3/4 frontal; no encaja del todo con el pixel art de las demás hojas.
- Las imágenes de "Coger objeto" tienen el objeto tapado por un borrón negro.

---

## 2. Diseño técnico

### 2.1 Tecnología

- **[ACORDADO-DELEGADO]** Juego **para navegador**, entregado como **un solo archivo HTML** que se abre **con doble clic, sin instalar nada**, y se juega con **teclado y ratón**.
- **[ACORDADO-USUARIO] (15/11/2026)** Javier confirma: **juego de navegador en un solo HTML**.
- **[ACORDADO-USUARIO] (15/11/2026, tras ver la sesión 1) — CAMBIO DE VISTA: VISTA CENITAL.** Después de probar la versión lateral, Javier dijo, con sus palabras: *"el juego me lo ha hecho de movimiento atrás y alante, y yo no quiero eso, yo quiero un juego abierto que se pueda mover en todas las posiciones como un Pokémon"*. Por tanto:
  - El juego es **cenital (vista desde arriba)**, con **movimiento en todas las direcciones** por una isla abierta, al estilo Pokémon.
  - **Queda anulada** la vista lateral 2D, acordada antes por delegación y "confirmada" en la sesión 1.
  - El mapa cenital del aterrizaje y el mapa del juego ahora encajan de forma natural: son la misma isla vista desde arriba.
  - Las hojas `Andar.png` y `Correr.png` traen 4 direcciones; el atlas ya se ha regenerado con ellas (§2.6).
- **[RECOMENDACIÓN] Tipo de movimiento:** **libre en 8 direcciones** (como un Zelda o un Stardew Valley), **no por casillas** como en el Pokémon clásico. El movimiento libre funciona mejor para el sigilo, las persecuciones, el combate y apuntar con el ratón. La animación usa la dirección más cercana de las 4 disponibles. **[PENDIENTE]** Confirmar con Javier si quiere libre o por casillas.

**[RECOMENDACIÓN] Cómo mantener las plataformas en vista cenital.** Las plataformas son una petición expresa de Javier ([ACORDADO-USUARIO]: escalar la montaña para llegar a una zona, persecuciones por acantilados), así que no se pueden perder con el cambio de vista. Propuesta:

- **Niveles de altura:** el mapa tiene alturas (playa 0, selva 1, mesetas 2–3, cumbre 5…). Entre ellas hay **paredes de acantilado** que solo se suben **escalando**:
  - mantener la tecla contra la pared;
  - gasta aguante según la Agilidad;
  - mientras se sube, la vista se mantiene, pero el personaje se desplaza "hacia arriba" en la pared y se dibuja con el sprite `up` (brazos arriba).
- **Saltos con arco y sombra:** el personaje salta (Espacio) por encima de huecos, ríos o grietas. Se ve la sombra en el suelo. La distancia depende de la Agilidad.
- **Bajar salientes:** se puede bajar a un nivel inferior saltando por un saliente (como los salientes de Pokémon). Si la caída es grande, hace daño.
- **Garfio:** se lanza hacia un punto de anclaje marcado en un nivel superior o al otro lado de un abismo.
- **Acantilados del viento:**
  - caminos estrechos al borde del mar;
  - **suelo que se derrumba**;
  - ráfagas que empujan;
  - huecos que hay que saltar;
  - si caes, acabas en el agua con tiburones.
  - Las **persecuciones** suceden aquí: te persigue la tribu y tienes que correr, saltar y escalar.
- **Lianas y escaleras:** son conexiones entre niveles que no gastan aguante.

**[RECOMENDACIÓN] Sigilo en cenital.** Encaja de forma natural: conos de visión dibujados en el suelo, hierba alta, sombras y luz, y ruido con radio visible al estilo de los Metal Gear clásicos.

**[RECOMENDACIÓN] Stack**

- **JavaScript moderno sin frameworks + Canvas 2D.** Hay control total, no hay dependencias en tiempo de ejecución y basta para tiles, sprites, luz y partículas.
  - Alternativa: Phaser 3. Da físicas y animaciones hechas, pero añade unos 1 MB y obliga a amoldarse al framework.
- **Código fuente en módulos ES** (`src/`) y **un script de build que genere `dist/isla.html` autocontenido**, con el JS en línea y las imágenes en base64.
  - ⚠️ Los módulos ES **no funcionan abriendo el archivo con file://**, así que el build debe empaquetarlo todo en un único `<script>` normal. Si no, se rompe el requisito acordado del doble clic.
- **esbuild** como única dependencia de desarrollo, para empaquetar. Opcional: un servidor local para desarrollo.
- **Playwright + Chrome headless** para pruebas de humo y capturas automáticas.
- **localStorage** para el guardado, siempre dentro de try/catch.
- **Python 3 + numpy + Pillow + scipy** solo para el script de sprites (no afecta al juego).

### 2.2 Estructura de carpetas propuesta [RECOMENDACIÓN]

```
/
├─ README.md                  # cómo jugar, cómo compilar
├─ docs/
│  └─ TRASPASO.md             # este documento
├─ package.json               # scripts: build, dev, test
├─ build.mjs                  # esbuild + incrustación de assets → dist/isla.html
├─ assets/
│  ├─ atlas.png / atlas.json  # sprites del protagonista (ya generados)
│  ├─ avion.jpg               # pantalla de título (ya generado)
│  └─ paisaje.jpg             # fondo de creación de personaje (ya generado)
├─ assets-src/Imagenes/       # originales de Javier (si él quiere subirlos al repo)
├─ tools/
│  └─ extract_sprites.py      # regenera el atlas desde las hojas originales
├─ src/
│  ├─ main.js                 # arranque y bucle principal
│  ├─ core/                   # input, matemáticas, RNG con semilla, audio, guardado
│  ├─ data/                   # objetos, recetas, armas, botín, zonas, textos
│  ├─ world/                  # tiles, generación de la isla, físicas y colisiones
│  ├─ entities/               # jugador, enemigos, animales, proyectiles, objetos del suelo
│  ├─ ai/                     # máquinas de estados, percepción (vista y oído)
│  ├─ systems/                # necesidades, tiempo y clima, fabricación, sigilo, combate, finales
│  ├─ render/                 # tiles, sprites con recoloreado, luces, cielo, HUD
│  └─ ui/                     # título, creación, aterrizaje, inventario, mapa, diario, muerte, final
├─ tests/
│  └─ smoke.spec.mjs          # Playwright: carga, sin errores de consola, flujo básico
└─ dist/isla.html             # entregable (puede ir en .gitignore o en releases)
```

### 2.3 Sistemas que deben desarrollarse

Las etiquetas de la columna "Origen" son las de §0.

| Sistema | Origen | Notas de implementación ([RECOMENDACIÓN] salvo que se indique otra cosa) |
|---|---|---|
| Bucle, input y estados de pantalla | — | Estados: título → creación → intro → aterrizaje → impacto → juego → muerte / final. Paso de tiempo limitado (dt ≤ 1/30) y física subdividida para evitar atravesar tiles. |
| Creación de personaje | ACORDADO-USUARIO / DELEGADO | 4 atributos, 10 puntos, colores de pelo, piel y ropa, vista previa en vivo. |
| Aterrizaje cenital | ACORDADO-USUARIO / DELEGADO | Mapa de la isla, avión planeando con "SIN COMBUSTIBLE" parpadeando, altímetro, giro con A/D y Espacio para aterrizar. El resultado depende de la zona. |
| Mundo cenital por tiles con alturas | ACORDADO-USUARIO (vista cenital, abierto, todas las direcciones) | Ver la propuesta de isla en §2.4 y las alturas en §2.1. |
| Controlador del jugador | ACORDADO-USUARIO (moverse en todas las direcciones, saltar y trepar) | Movimiento en 8 direcciones, correr, saltar huecos según Agilidad (arco y sombra), agacharse, **escalar paredes de acantilado con aguante**, bajar salientes, escaleras y lianas, **garfio**, nadar, voltereta, daño por caída. |
| Necesidades | ACORDADO-DELEGADO | Hambre, sed y energía, más estados: veneno e intoxicación. |
| Inventario y recolección | ACORDADO-USUARIO / DELEGADO | Peso limitado por Fuerza. Golpear árboles y rocas; recoger arbustos y plantas. |
| Fabricación y mezclas | ACORDADO-USUARIO (ayudas al mezclar según Inteligencia) | Ver la propuesta en §2.5. |
| Refugio, hoguera y dormir | ACORDADO-DELEGADO | Dormir pasa la noche y guarda la partida. |
| Sigilo | ACORDADO-USUARIO / DELEGADO | Vista en cono con línea de visión por raycast, luz, hierba alta, ruido y medidor de detección (? → !). Eliminación por la espalda. |
| IA enemiga | ACORDADO-DELEGADO | Estados: patrulla → sospecha → investigar → persecución → búsqueda → regreso. Nunca saben dónde está el jugador si no lo ven ni lo oyen. |
| Animales | ACORDADO-DELEGADO | Jabalí, serpiente y depredador nocturno. [RECOMENDACIÓN] además tiburones en aguas profundas, cangrejos y peces como comida. |
| Día y noche | ACORDADO-USUARIO | La noche es más peligrosa: aparecen más enemigos y el depredador. |
| Clima y biomas | ACORDADO-USUARIO | Varios biomas con selva; lluvia y oscuridad obligatorias; demás climas a criterio (ver §1.6). El clima debe afectar al juego, no ser solo decorado. |
| Huidas y finales | ACORDADO-DELEGADO | Radio, balsa y avión. |
| Guardado | ACORDADO-DELEGADO | localStorage: autoguardado al dormir y periódico, opción "Continuar". |
| Mapa del juego | ACORDADO-DELEGADO | Mismo mapa cenital con niebla de guerra por zonas descubiertas. |
| HUD e interfaz en español | — | Barras de vida, hambre, sed y energía; reloj; zona; aviso de interacción; detección. |
| Audio | [RECOMENDACIÓN] | Efectos sencillos con WebAudio y un ambiente de mar. Opcional. |

### 2.4 Propuesta de isla [RECOMENDACIÓN, no validada] — revisada para vista cenital

> La primera versión de esta sección organizaba la isla en franjas de oeste a este para la vista lateral. **Con la vista cenital ([ACORDADO-USUARIO], §2.1) la isla es un mapa 2D abierto.** Se mantienen las zonas y su contenido, pero ahora son **regiones del mapa** conectadas en todas las direcciones.

**Tamaño propuesto:** unos **200 × 160 tiles de 32 px**, con mar alrededor. Cada tile guarda tipo de suelo, altura y objetos encima. El mapa cenital del aterrizaje y el mapa del juego son una versión reducida de este mismo mapa.

**Disposición orientativa:**

| Situación | Zona | Contenido | Peligro |
|---|---|---|---|
| Alrededor | Mar abierto | Aguas profundas con tiburones. Bancos de arena cerca de la costa. | Alto |
| Suroeste | Playa del naufragio | Palmeras, cocos, cangrejos. Mejor zona para aterrizar: **el avión solo se puede reparar si aterrizó en arena**. | Bajo |
| Oeste y centro | Selva | Árboles, lianas, hierba alta, arbustos, río y **estanque de agua dulce**, jabalíes, serpientes. **Campamento de un explorador sobre una plataforma en los árboles** (arco y nota). | Medio |
| Sur o sureste | Manglar / pantano (bioma nuevo, §1.6) | Agua poco profunda que ralentiza, niebla frecuente, serpientes. | Medio |
| Norte de la selva | Poblado de la tribu | Cabañas, torre de vigía, hogueras, cofres, guerreros patrullando y **choza del jefe con un bidón de combustible**. Rodeado de hierba alta para entrar a escondidas. | Alto |
| Centro-norte | Monte (cumbre nevada) | Terrazas a varias alturas separadas por **paredes de acantilado** que exigen Agilidad o garfio. Frío en la cumbre. **Antena en la cumbre** (final de la radio). | Medio |
| Bajo el monte | Cuevas del monte | **Ruta alternativa sin escalar**, oscura (hace falta antorcha). Se entra por una boca y se sale en otra altura del monte. Guarida del depredador, serpientes, bidón, tarjeta de acceso y esqueleto de un soldado con nota. | Alto |
| Este del monte | Campamento militar abandonado + búnker | Tiendas y cajas inspiradas en `3. Paisaje.jpg`, trampas y vigilantes de élite. **Búnker** (interior por separado o planta subterránea) con puerta que se abre con tarjeta. Dentro: radio rota, batería, cables, bidón y notas. | Alto |
| Noreste | Acantilados del viento | Caminos estrechos al borde del mar a distintas alturas, **suelo que se derrumba**, huecos que saltar, puentes, lianas para salir del agua, tiburones debajo y nidos con huevos. Escenario de las **persecuciones**. | Medio-alto |
| Este | Bahía este | Embarcadero (final de la balsa), **helipuerto** (rescate por radio) y barca naufragada con cofre. | Bajo |

**Interiores** (búnker, cuevas, cabañas) [RECOMENDACIÓN]: pueden ser mapas aparte a los que se entra por una puerta, al estilo Pokémon, o zonas del mismo mapa con el techo oculto. Para la cueva y el búnker se recomiendan mapas aparte: es más simple y permite oscuridad total.

**Resultado del aterrizaje según la zona** [RECOMENDACIÓN]:

| Zona | Daño | Estado del avión | Efecto |
|---|---|---|---|
| Arena | −10 vida | Reparable | — |
| Selva | −30 vida | Destruido | — |
| Poblado | −25 vida | Destruido | Alerta a la tribu |
| Montaña | −45 vida | Destruido | — |
| Campamento | −35 vida | Destruido | — |
| Acantilados | −40 vida | Destruido | — |
| Mar | — | Se hunde | Empiezas nadando cerca de la costa |

Los restos del avión tienen siempre botín inicial: botellas, tela, venda, cuchillo y comida.

**Secreto extra** [RECOMENDACIÓN]: hay 3 cristales escondidos (en la cueva, en un saliente del acantilado y en lo alto de una columna del campamento). Si se llevan al altar del poblado, **la tribu deja de ser hostil**.

**Muerte** [RECOMENDACIÓN, Javier delegó la pregunta]:

- Reapareces en el último lugar donde dormiste, con la mitad de la vida.
- Los recursos y la comida quedan en una **mochila en el lugar de la muerte** y se pueden recuperar.
- Las herramientas y los objetos clave se conservan.

### 2.5 Fabricación y mezclas [RECOMENDACIÓN]

**Recetas iniciales**

| Objeto | Materiales |
|---|---|
| Cuerda | 3 fibra |
| Antorcha | 1 madera, 1 fibra |
| Lanza | 2 madera, 1 piedra, 1 cuerda |
| Hacha | 2 madera, 2 piedra, 1 cuerda |
| Hoguera | 4 madera, 3 piedra |
| Cama de hojas | 5 madera, 6 fibra |
| Venda | 1 tela, 1 hierba medicinal |
| Antídoto | 2 hierba medicinal, 1 baya roja |
| Arco | 3 madera, 2 cuerda |
| Flechas ×5 | 1 madera, 1 piedra, 1 fibra |
| Garfio | 3 cuerda, 2 metal |
| Kit de reparación | 4 metal, 2 cables, 1 cuerda |
| Radio | radio rota, batería, cables |
| Balsa | 14 madera, 5 cuerda, 3 tela |

**Cocina en la hoguera:** carne y pescado crudos pasan a asados; el agua sucia pasa a potable.

**Mecánica de mezcla**, que concreta lo que pidió Javier sobre la Inteligencia:

- Las recetas desconocidas aparecen como "???".
- El jugador elige materiales y pulsa **Mezclar**.
- Si la combinación coincide con una receta, la descubre y la fabrica.
- Si falla, puede perder un material. La probabilidad de no perderlo crece con la Inteligencia.
- Las pistas dependen de la Inteligencia:

| Inteligencia | Pista que ve el jugador |
|---|---|
| 0–1 | Ninguna |
| 2–3 | Qué objeto sale de la receta |
| 4–5 | Parte de los ingredientes |
| 6 o más | La mayoría de las recetas ya conocidas |

**Finales:**

| Final | Requisitos y desarrollo |
|---|---|
| **Radio** | Reparar la radio con piezas del búnker y usarla en la antena de la cumbre. Llega un rescate en unas horas al helipuerto, mientras la tribu caza al jugador. |
| **Balsa** | Fabricarla y usarla en el embarcadero llevando agua y comida. |
| **Avión** | 3 bidones (poblado, cueva y búnker) más el kit de reparación, en un avión que aterrizó en arena. |

La pantalla final muestra estadísticas: días sobrevividos, eliminaciones, eliminaciones sigilosas y notas encontradas.

**Notas (lore)** [RECOMENDACIÓN]: 6 notas sobre un antiguo puesto militar en la isla. Además de contar la historia, dan pistas de cada huida.

### 2.6 Sprites y recoloreado [RECOMENDACIÓN]

- **Actualización 15/11/2026 (vista cenital):** el atlas se ha regenerado con las **4 direcciones** de andar y correr, sacadas de las hojas de Javier. Animaciones: `walk_down`, `walk_up`, `walk_left` y `walk` (= derecha), 6 fotogramas cada una; `run_down`, `run_up`, `run_left` y `run` (= derecha), 8 fotogramas cada una. Se mantienen los nombres `walk` y `run` para no romper el código existente. Atlas: 1024 × 481, 90 fotogramas.
- Las demás animaciones (`jump`, `crouch`, `roll`, `dodge`, `hurt`, `pick`, `reach`, `up`, `idle`) **solo existen de lado**, mirando a la derecha. Para arriba y abajo hay que usar un sustituto: por ejemplo, la animación lateral más cercana o el fotograma de andar con un efecto (sombra, escala o parpadeo). **[PENDIENTE]** Preguntar a Javier si puede conseguir esas animaciones en 4 direcciones.
- Los fotogramas laterales **miran a la derecha**; para ir a la izquierda se voltean al dibujar (salvo `walk_left` y `run_left`, que ya existen).
- **Ancla abajo en el centro** (los pies).
- Altura de pie en el atlas: **96 px**. Pensado para dibujarse a **0,5 (48 px)**. En vista cenital, la caja de colisión debe cubrir **solo los pies** (por ejemplo, unos 18 × 10 px), con ordenación por la y de los pies para que el personaje pase por delante o por detrás de árboles y objetos.
- **Recoloreado en tiempo de ejecución**, clasificando los píxeles por HSV:

| Píxeles (HSV) | Se convierten en |
|---|---|
| Verdes | Pantalón |
| Tonos de piel (excepto el 15 % inferior, donde están las botas) | Piel |
| Beige o blancos en el 25 % superior | Pañuelo / pelo |
| Beige o blancos en el resto | Camiseta |

  Se conserva la luminancia de cada píxel. Se calcula una vez al empezar la partida.
- El mismo sprite recoloreado (piel, pintura corporal, máscara y lanza dibujadas encima) puede servir para **guerreros de la tribu** y **vigilantes** sin arte nuevo.

**Faltan animaciones** de atacar, escalar, nadar, morir y eliminar con sigilo. Mientras no las haya, se pueden usar como sustitutas:

| Acción | Sprite sustituto |
|---|---|
| Atacar | `reach` (alcanzar a media altura) |
| Escalar | `up` (brazos arriba) |
| Recoger | `pick` |
| Voltereta | `roll` |
| Esquivar | `dodge` |

Las hojas de Javier están numeradas: 5 Girar, 6 Esquivar, 7 Rodar, 8 Agacharse, 9 Saltar, 12 Recibir golpe. **Faltan los números 1–4, 10 y 11**, quizá con más animaciones. **[PENDIENTE]** Preguntarle si las tiene.

---

## 3. Estado actual

### 3.1 Qué se llegó a desarrollar

> **Actualización 15/11/2026 (después de la sesión 1): cambio a vista cenital.** Javier ha probado la versión lateral y la rechaza: quiere moverse en todas las direcciones, como en Pokémon (§2.1). De la sesión 1:
> - **Se conserva:** build a un HTML (`build.mjs`), `package.json`, Playwright, `src/core/*` (input, bucle, RNG, pantalla, assets, matemáticas), cámara (hay que adaptarla para que siga en x e y por igual), HUD, la pausa y el panel de depuración.
> - **Hay que rehacer para la vista cenital:** `src/world/physics.js` (gravedad y plataformas de un sentido), `src/world/testLevel.js`, `src/entities/player.js` (salto con gravedad, agacharse y nado laterales), parte de `worldRenderer.js` y las pruebas de humo que comprueban el movimiento lateral.
> - El atlas ya trae las 4 direcciones (§2.6).
>
> **Actualización 15/11/2026 (sesión 1 de Claude Code):** Fases 0 y 1 terminadas. Hay build a un único HTML, pruebas de Playwright y un personaje que anda, corre, salta, se agacha, baja de plataformas y nada en un mundo de prueba. Detalle en `docs/CHANGELOG.md`. Lo que sigue en esta sección describe el estado anterior a la sesión 1.

**No hay código del juego.** Se paró la implementación antes de escribir el motor. Lo que sí existe:

1. **Diseño acordado:** §1 y la parte de §2 marcada como acordada.
2. **Pipeline de sprites funcional** y verificado. Al ejecutarlo de nuevo produce exactamente el mismo atlas.
3. **Recursos procesados** listos para usar:

| Archivo | Contenido |
|---|---|
| `assets/atlas.png` | (actualizado: 1024 × 481, 90 fotogramas, con 4 direcciones de andar y correr; ver §2.6) — versión original: 1024 × 263, RGBA, 42 fotogramas. Fondo eliminado: se recortaron los borrones negros y se dejó solo la figura principal. |
| `assets/atlas.json` | `{ animación: [[x, y, ancho, alto], …] }`. Animaciones: `walk` 6, `run` 8, `jump` 6, `crouch` 4, `roll` 7, `dodge` 6, `hurt` 1, `pick` 1, `reach` 1, `up` 1, `idle` 1. |
| `assets/avion.jpg` | 1280 px de ancho, unos 196 KB, a partir de `Avion.png`. |
| `assets/paisaje.jpg` | 1280 px de ancho, unos 180 KB, a partir de `3. Paisaje.jpg`. |

### 3.2 Código generado

**`tools/extract_sprites.py`**

- Uso: `python3 tools/extract_sprites.py <carpeta_imágenes> <carpeta_salida>`.
- Dependencias: numpy, Pillow y scipy.
- Qué hace:
  - Recorta la fila **lateral derecha** de `Andar.png` y `Correr.png`.
  - Recorta las tiras de `Saltar.png`, `Agacharse.png`, `Rodar.png`, `Deslizarse.png` (rotulada "Esquivar"), `Recibir golpe.png` y las de "Coger objeto".
  - Recorta `1. Quieto.png`, que tiene fondo gris claro.
  - Separa el fondo oscuro por diferencia de color con el borde. Rellena huecos y elimina las zonas negras gruesas (los borrones) y las piezas sueltas.
  - Escala cada hoja con un factor propio para igualar el tamaño del personaje y empaqueta todo en el atlas.
  - Genera de paso unas imágenes `dbg_*.png` de control.
- Descarta `Girar.png`. **Actualización:** ahora también extrae las filas abajo, arriba e izquierda de andar y correr (vista cenital).
- Limitación: las cajas de recorte y las escalas están fijadas para estas imágenes concretas. Si Javier cambia o añade hojas, hay que ajustarlas.

### 3.3 Decisiones tomadas

Todas las marcadas **[ACORDADO-USUARIO]** y **[ACORDADO-DELEGADO]** en §1 y §2.1. En resumen:

- Isla abierta, inicio con el mapa cenital y el avión sin combustible, aterrizaje elegido por el jugador con riesgo según la zona.
- Sobrevivir y escapar, con 2 o 3 huidas: radio, balsa y avión.
- 10 puntos repartidos entre Fuerza, Agilidad (antes "Habilidad"), Inteligencia y Sigilo/Percepción.
- Colores de pelo, piel y ropa.
- Hambre, sed y energía; recursos; fabricación (lanza, antorcha, cuerda, garfio, balsa); refugio.
- Sigilo (cono de visión, hierba alta, saqueo y eliminaciones silenciosas) y plataformas (escalada y acantilados con caídas mortales).
- Noche más peligrosa, zonas peligrosas, animales (jabalí, serpiente, depredador nocturno) y una tribu oculta.
- Secretos: búnker, ruinas y radio.
- Partida de 30 a 60 minutos con guardado.
- Juego de navegador en un único HTML, sin instalación, con teclado y ratón.
- ~~Vista lateral 2D~~ → **vista cenital con movimiento en todas las direcciones, como en Pokémon** ([ACORDADO-USUARIO], 15/11/2026), con alturas, escalada y saltos para mantener las plataformas.
- Estilo marcado por las imágenes de Javier (cel-shaded / cómic indie / pixel art de acción).

### 3.4 Pendiente

- Todo el desarrollo del juego (§4).
- Respuestas de Javier a los **[PENDIENTE]** (lista consolidada en §3.6).

### 3.5 Aspectos que necesitan revisión

1. **Coherencia de estilo:** `idle` (de `1. Quieto.png`) se ve más realista y de frente que el resto. Puede chocar en pantalla; quizá convenga usar un fotograma de `walk` como reposo.
2. **Calidad del recorte:** se escalan al alza las hojas pequeñas (Agacharse, Rodar, Esquivar: × 1,5), así que se verán algo borrosas. El ruido de compresión JPEG del fondo original puede dejar algún píxel de halo.
3. **Escalas entre animaciones:** se ajustaron a ojo (`scales` en el script). Hay que revisarlas en el juego para que el personaje no "cambie de tamaño" entre andar, correr y saltar.
4. **Orientación de `jump`:** casi todos los fotogramas miran a la derecha, pero conviene confirmarlo fotograma a fotograma.
5. **Texto incrustado** en `avion.jpg` y `paisaje.jpg` (ver §1.6).
6. ~~**Vista lateral frente a cenital**~~ (resuelto: **vista cenital**, Javier lo decidió tras probar la lateral; ver §2.1). El clima ya está resuelto: varios biomas con selva, lluvia y oscuridad (ver §1.6).
7. ~~**Contradicción con las instrucciones del proyecto "Juego"**~~ (resuelto: el repositorio es del juego de la isla).

### 3.6 Preguntas abiertas para Javier

1. ~~¿El repositorio es para este juego de la isla o para el juego urbano de las instrucciones del proyecto?~~ **Resuelta:** es para el juego de la isla.
2. ~~¿Se mantiene "un solo HTML para navegador", o, al pasar a un repositorio, preferiría otro motor (por ejemplo, Godot)?~~ **Resuelta:** un solo HTML para navegador.
3. ~~¿Vista lateral (acordada por delegación) o cenital, ahora que hay hojas de sprites en 4 direcciones?~~ **Resuelta:** **vista cenital**, con movimiento en todas las direcciones, como en Pokémon (decisión de Javier tras probar la lateral).
3b. ¿Movimiento **libre en 8 direcciones** (lo recomendado) o **por casillas** como en el Pokémon clásico?
3c. ¿Puede conseguir animaciones de saltar, agacharse, rodar, golpe y recoger también **mirando arriba y abajo**?
4. ~~¿Isla tropical, nevada o mixta?~~ **Resuelta:** varios climas y biomas, con selva, lluvia y oscuridad (§1.6).
5. ¿Tono realista y oscuro, o aventura?
6. Al morir: ¿reaparecer en el refugio (lo recomendado) o empezar de cero?
7. El color de "pelo": ¿se aplica al pañuelo?
8. ¿Hay más hojas de animación (números 1–4, 10, 11), por ejemplo de atacar, escalar o nadar?
9. ¿Se acepta que los guerreros de la tribu reutilicen el sprite del protagonista recoloreado?

---

## 4. Plan de desarrollo [RECOMENDACIÓN]

Principio general: **terminar cada sistema y dejarlo jugable antes de empezar el siguiente**. Cada fase acaba con un `dist/isla.html` que se abre con doble clic, una prueba de Playwright sin errores de consola y una entrada en el changelog.

| Fase | Objetivo | Criterio de terminada |
|---|---|---|
| **0. Infraestructura** | Repositorio, `package.json`, `build.mjs` (esbuild + assets en base64 → un HTML), estructura `src/`, test de humo con Playwright, README | `npm run build` genera `dist/isla.html`. Abierto desde file:// en Chrome muestra una pantalla y no hay errores en consola. `npm test` pasa. |
| **1. Motor y personaje** | ~~Versión lateral~~ (hecha en la sesión 1, descartada) | — |
| **1b. Motor y personaje en cenital** | Rehacer mundo de prueba, colisiones y jugador para la vista cenital: movimiento en 8 direcciones, animaciones en 4 direcciones, colisión por los pies, ordenación por profundidad (y), alturas básicas con una pared escalable y un saliente para bajar, salto con sombra por encima de un hueco, agua poco profunda y profunda, cámara en x e y | Se anda y se corre en todas las direcciones con la animación correcta (incluidas diagonales). No se atraviesan paredes ni objetos, y el personaje pasa por delante y por detrás de un árbol según su posición. Se salta un hueco, se baja un saliente y se escala una pared básica. Las pruebas de humo están adaptadas y en verde. |
| **2. Flujo de inicio** | Título (avion.jpg), creación (10 puntos, 4 atributos, colores con recoloreado y vista previa), intro breve, aterrizaje cenital con el resultado según la zona | Se puede hacer el recorrido completo de título → creación → aterrizaje → aparecer en el mundo, en la zona correspondiente. Los atributos afectan al salto y a la vida. |
| **3. La isla** | Generación con semilla de todas las zonas de §2.4: paredes escalables, cueva, poblado, campamento y búnker, acantilados, bahía. Mapa cenital con niebla de guerra | Se puede recorrer la isla de punta a punta. Cada zona tiene un cartel de descubrimiento. La cueva conecta ambos lados del monte. |
| **4. Movilidad avanzada** | Escalada entre alturas con aguante (Agilidad), lianas y escaleras, garfio a puntos de anclaje, saltos de huecos según la Agilidad, nado, daño por caída, suelo que se derrumba, ráfagas de viento, voltereta | Con Agilidad 0 se llega a la cumbre por la ruta de la cueva, y con Agilidad alta escalando. El garfio se engancha a sus anclajes. Bajar de mucha altura hace daño. Hay una persecución jugable por los acantilados. |
| **5. Supervivencia** | Necesidades, recolección, inventario con peso, cofres, comida y agua (dulce / salada / sucia), hoguera, cama, dormir, ciclo día/noche, guardado y carga | Una noche completa se puede sobrevivir gestionando recursos. Guardar, recargar la página y continuar mantiene el estado. |
| **6. Fabricación y mezclas** | Recetas, cocina, mezcla con pistas por Inteligencia | Cada receta consume sus materiales. Mezclar bien descubre la receta; mezclar mal aplica la penalización. Las pistas cambian con la Inteligencia. |
| **7. Sigilo y combate** | Percepción (cono, línea de visión, luz, hierba, ruido), estados de la IA, combate cuerpo a cuerpo y arco, eliminación sigilosa, lanzas arrojadizas | Se puede saquear el poblado sin ser detectado si se juega con cuidado. El enemigo investiga los ruidos y abandona la persecución. Funciona la eliminación por la espalda. |
| **8. Fauna, noche y clima** | Jabalí, serpiente, depredador nocturno, tiburones, cazadores nocturnos, antorcha (da luz pero también te delata). Lluvia y tormenta, niebla, frío en la cumbre, oscuridad real | La noche es claramente más peligrosa. La antorcha ahuyenta al depredador. La lluvia y la oscuridad cambian cómo se juega (visibilidad, sigilo, agua, fuego). |
| **9. Finales y secretos** | Radio, balsa, avión, notas, diario de objetivos, secreto de los cristales, pantalla final con estadísticas | Los 3 finales se pueden completar en una partida de prueba. El diario refleja las pistas encontradas. |
| **10. Pulido** | Equilibrio (30–60 min por partida), HUD, audio, rendimiento a 60 fps, documento de funciones hechas / parciales / pendientes | Una partida completa sin bloqueos ni errores de consola. Documentación al día. |

---

## 4b. SIGUIENTE TAREA para Claude Code (sesión 2): conversión a vista cenital

> Esta sección manda sobre el apartado 5, que queda como historial de la sesión 1.

**Objetivo: Fase 1b.** Rehacer el movimiento y el mundo de prueba en **vista cenital**, al estilo Pokémon, reutilizando toda la infraestructura de la sesión 1. Sigue en pie todo lo demás: un único HTML que funciona con doble clic y pruebas con Playwright.

1. Trabajar en la rama `claude/vista-cenital`, que ya contiene el trabajo de la sesión 1, el atlas en 4 direcciones y este documento actualizado.
2. Leer §2.1 (vista cenital y propuesta de plataformas en cenital), §2.4 (isla revisada) y §2.6 (atlas en 4 direcciones).
3. **Tiles en cenital** de 32 px (o mantener 20 px si se justifica). Tipos: hierba, arena, tierra, agua poco profunda (ralentiza), agua profunda (nado), roca o pared (sólida), árbol (sólido, por partes), hierba alta (no sólida; esconde) y **altura** por tile.
4. **Jugador:**
   - Movimiento en 8 direcciones normalizado; Mayús para correr.
   - Animación `walk_*` o `run_*` según la dirección dominante; las diagonales usan la más cercana.
   - Reposo = primer fotograma de la dirección actual.
   - Caja de colisión en los pies, deslizamiento contra las paredes (sin quedarse enganchado en esquinas) y dibujado ordenado por la y de los pies.
5. **Alturas básicas** (prueba de concepto de las plataformas):
   - una meseta con una pared que se escala manteniendo la dirección contra ella, con aguante y sprite `up`;
   - un saliente por el que se salta hacia abajo;
   - un hueco que se cruza con Espacio, con un salto en arco, sombra y sprite `jump`.
6. **Agua:** la poco profunda ralentiza; la profunda obliga a nadar despacio (provisional).
7. **Cámara** que sigue en x e y con suavizado y respeta los límites del mapa.
8. **Retirar o archivar** la física lateral: gravedad y plataformas de un sentido.
9. **Adaptar `tests/smoke.spec.mjs`:** moverse en las 4 direcciones y en diagonal, chocar con una pared, cruzar el hueco con salto, sin errores de consola, y captura de pantalla.
10. Actualizar `README.md` (controles nuevos), `docs/CHANGELOG.md` y este documento.
11. Hacer commit, subir la rama e informar con honestidad de qué funciona y qué no.

**Controles propuestos para cenital** [RECOMENDACIÓN]:

| Tecla | Acción |
|---|---|
| WASD / flechas | Moverse en todas las direcciones |
| Mayús | Correr |
| Espacio | Saltar |
| C | Agacharse (sigilo) |
| V | Voltereta |
| E | Interactuar |
| Clic izquierdo | Atacar hacia el ratón |
| Clic derecho / G | Garfio |
| F | Eliminación sigilosa |
| T | Antorcha |
| Q / R / H | Comer / beber / curar |
| I o Tab | Inventario |
| M | Mapa |
| L | Diario |
| Esc | Pausa |

**Definición de terminado:**

- El personaje se mueve por un mapa de prueba cenital en todas las direcciones, con las animaciones correctas.
- Choca bien con las paredes y se ordena bien con los árboles.
- Escala una pared, baja un saliente y salta un hueco.
- `npm run build` y `npm test` en verde.
- Captura de pantalla revisada.
- Rama subida.

---

## 5. Primera tarea para Claude Code (sesión 1 — HISTORIAL, ya hecha)

**Objetivo de la sesión 1: Fases 0 y 1. Una base sólida y un personaje que se mueve bien en un mundo de prueba.**

1. **Antes de tocar nada:**
   - Leer este documento entero.
   - Revisar el repositorio y el estado de Git.
   - **Comprobar con Javier la pregunta 1 de §3.6** (qué juego va en este repositorio) y, si puede responder, las preguntas 2 y 3. Si no responde, seguir con lo acordado: navegador, un HTML y vista lateral.
2. **Crear una rama** de trabajo (no trabajar en la principal) y montar la estructura de §2.2.
3. **Añadir los recursos:**
   - `assets/atlas.png`, `assets/atlas.json`, `assets/avion.jpg` y `assets/paisaje.jpg`.
   - `tools/extract_sprites.py`.
   - Este documento como `docs/TRASPASO.md`.
   - Preguntar a Javier si quiere subir sus originales a `assets-src/Imagenes/`. Están en `C:\Users\Javier\Desktop\Imagenes`.
4. **Pipeline de build:**
   - `build.mjs` con esbuild empaqueta `src/main.js` en formato IIFE y lo inserta en una plantilla HTML con los assets en base64 como data URI.
   - Resultado: `dist/isla.html`, que **debe funcionar abierto desde file://**.
   - Scripts: `npm run build`, `npm run dev` (vigila cambios y recompila) y `npm test`.
5. **Núcleo:**
   - Bucle con `requestAnimationFrame` y dt limitado.
   - Input de teclado y ratón con "pulsado este fotograma".
   - Canvas interno de 1280 × 720 escalado para llenar la ventana con letterbox.
   - RNG con semilla.
6. **Mundo de prueba:**
   - Tiles de 20 px.
   - Suelo, una pared, plataformas de un sentido, un hueco y una zona de agua.
   - Dibujo con rectángulos de color: el arte de los tiles llega más adelante.
7. **Jugador:**
   - Caja de colisión de unos 16 × 40 px y sprite del atlas dibujado a 0,5, anclado en los pies y volteado según la dirección.
   - Animaciones `idle`, `walk`, `run` (con Mayús), `jump` (subida y caída) y `crouch` (con S).
   - Física con subpasos.
   - Salto parametrizado por Agilidad, de momento con un valor fijo.
8. **Cámara:** seguimiento suave con mirada adelantada y límites del mundo.
9. **Prueba de humo con Playwright:**
   - Abre `dist/isla.html`.
   - Simula unos segundos de teclas (andar, saltar).
   - Comprueba que no hay errores de consola.
   - Guarda una captura en `tests/output/`.
10. **README:** cómo jugar, cómo compilar y controles provisionales.
11. **Commit** con un mensaje claro y un resumen para Javier de qué funciona, qué no y qué toca en la sesión 2 (Fase 2: flujo de inicio).

**Definición de terminado de la sesión 1:**

- Doble clic en `dist/isla.html` y el personaje del atlas se mueve, corre, salta y se agacha en el mundo de prueba, con animaciones correctas en ambas direcciones.
- La cámara es fluida.
- No hay errores en consola.
- `npm test` está en verde.
- El trabajo está en una rama.

**Controles provisionales** [RECOMENDACIÓN]:

| Tecla | Acción |
|---|---|
| A / D (o flechas) | Moverse |
| Mayús | Correr |
| Espacio / W | Saltar |
| S | Agacharse |
| E | Interactuar |
| Clic izquierdo | Atacar |
| Clic derecho / G | Garfio |
| F | Eliminación sigilosa |
| C | Voltereta |
| T | Antorcha |
| Q / R / H | Comer / beber / curar |
| I o Tab | Inventario |
| M | Mapa |
| L | Diario |
| Esc | Pausa |
