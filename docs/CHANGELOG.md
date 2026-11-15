# Historial de cambios

## Sesión 5 — Fase 3 (parte 1): la isla completa, exterior (15/11/2026)

### La isla (`src/world/worldMap.js`)
- **200 × 160 tiles de 32 px**, semiprocedural con semilla y regiones colocadas a mano según TRASPASO §2.4. Se genera en unos 0,2 s.
- El **trozo de la sesión 3** (playa del naufragio, selva, ruinas, río con puente y campamento de la tribu) va incrustado tal cual en el suroeste, en el tile (4, 116). Sus props, enemigos y pruebas se han desplazado a su sitio.
- Biomas:
  - **selva** (oeste y centro) con claros, hierba alta y jabalíes;
  - **poblado de la tribu** (noroeste): claro de tierra, empalizada, cinco cabañas de paja, la **choza del jefe** con un cofre que guarda un **bidón de combustible**, torre de vigía, hoguera, antorchas, tótems, secaderos, calaveras y cinco guerreros más; rodeado de hierba alta;
  - **monte** (centro-norte) con **cuatro terrazas** (niveles 1–4) separadas por paredes de 3 tiles que se escalan; una lengua de nivel 1 enlaza con la meseta de las ruinas. Bosque de pinos (con nieve arriba), roca, **cumbre nevada** con la **antena** oxidada; un **río** baja de la cumbre con **cascadas** en cada pared y se une al del trozo;
  - **campamento militar** abandonado (este del monte): grava, cuatro tiendas de lona, torre metálica, sacos terreros, cajas militares (chatarra, raciones), bidones y la **puerta del búnker**, cerrada con lector de tarjetas (sesión 6);
  - **acantilados del viento** (noreste): meseta de roca de nivel 2 sobre el mar con **paredes de roca en la costa**, **grietas** que se cruzan saltando, un **saliente** para bajar de un salto, agujas de roca, nidos con huevos y carteles de aviso;
  - **bahía este**: playa en forma de bahía, **embarcadero** de madera con pilotes, **helipuerto** de hormigón con la H y la manga de viento, y una **barca naufragada** con cofre;
  - **manglar** (sur): barro y agua turbia, mangles con raíces en arco, juncos y árboles muertos;
  - **costa**: playas con palmeras, cocos, rocas, troncos y cangrejos alrededor de toda la isla.
- Caminos de tierra que unen los biomas, puentes colgantes donde cruzan el río.
- **Zonas** por tile (13, con el mar), con cartel al entrar.

### Gráficos
- **Suelo por trozos** (`TerrainCache` en `src/gfx/terrain.js`): ya no se prerenderiza el mapa entero (serían 33 millones de píxeles). Cada trozo de 128 × 128 px se pinta cuando hace falta con un margen de 32 px y coordenadas globales, así que encajan sin costuras. Se adelantan los de alrededor de la cámara y se guardan los 420 últimos.
- **Suelos nuevos** pintados por código: nieve con ondas de viento, roca con grietas, barro con charcos y raíces, agua turbia con nenúfares, grava, hormigón con juntas y manchas, pinocha con piñas. Paredes con nieve y carámbanos en lo alto; costas altas con **cara de roca sobre el mar**; grietas con pared interior; bordes de terraza según el suelo de arriba.
- **Props nuevos** (`src/gfx/biomeProps.js`): pino (con y sin nieve), roca nevada, antena, mangle, juncos, árbol muerto, cabaña y choza del jefe, torre de vigía (madera y metal), secadero, tienda militar, sacos terreros, caja de munición, bidones, búnker, manga de viento, barca naufragada, nido, aguja de roca y matojos.
- **Ambiente por bioma**: ventisca con copos y rachas en la cumbre (y en lo alto del monte), **niebla** que se arrastra en el manglar, rachas de viento y gaviotas en los acantilados, gaviotas en la costa, polvo en el campamento militar, luciérnagas en el manglar de noche; gradación de color propia de cada zona.
- **Rendimiento**: índice espacial de props (dibujo, luces, partículas e interacción solo miran lo cercano); los enemigos y animales lejanos (más de 900 px) no se actualizan. Medido en Chromium sin GPU corriendo por la isla: **60 fps** de media, p95 de 16,8 ms; cada trozo de suelo tarda unos 9 ms. La carga baja a 0,75 s.

### Mapas
- **Mapa del aterrizaje** pintado a partir del mapa real del juego (ya no hay «zonas sin explorar»): se puede aterrizar en cualquier sitio. El resultado depende del sitio: arena −10 (avión reparable), manglar −20, tribu −25 (acuden), selva −30, militar −35, acantilados −40, monte y ruinas −45, cumbre −50, mar sin daño (llegas nadando a la costa más cercana).
- **Mapa M** (`src/ui/worldmap.js`): la misma isla con **niebla de guerra por zonas**. Empieza con la zona de llegada y cada zona se descubre al entrar (el cartel dice «¡Zona descubierta!»). Marca al jugador (flecha que parpadea según hacia dónde mira) y los restos del avión, nombres de las zonas descubiertas y «?» en las demás.

### Objetos
- Nuevos: **bidón de combustible** (choza del jefe), **huevo** (nidos de los acantilados) y **chatarra** (campamento militar), con icono y pistas de Inteligencia.
- Examinar la antena y la puerta del búnker da una pista de lo que hará falta.

### Pruebas
- 24 pruebas de Playwright (6 nuevas en `tests/isla.spec.mjs`, y las de las sesiones 3 y 4 adaptadas a la isla grande):
  - tamaño de la isla, biomas, suelos nuevos y 4 niveles;
  - recorrido por los 12 biomas con su cartel y **una captura por bioma** (`tests/output/bioma-*.png`), y carrera real cruzando trozos;
  - el mapa M empieza con la zona de llegada, se descubre al entrar y la niebla tapa lo demás;
  - el mapa del aterrizaje da la misma zona que el juego;
  - se escala una pared del monte de la terraza 1 a la 2;
  - aterrizajes en cumbre, militar, manglar, acantilados y poblado (la tribu acude);
  - rendimiento: actualizar y dibujar corriendo por la isla tarda de media unos 8 ms (límite de la prueba: 16,7 ms).

### Decisiones tomadas sin consultar (menores, fáciles de cambiar)
- **Isla semiprocedural** (forma, terrazas y suelos con ruido y semilla; lugares clave colocados a mano), con el trozo de la sesión 3 sin tocar.
- **Las paredes solo se escalan por la cara sur** (como hasta ahora): las terrazas del monte se suben de sur a norte.
- **El campamento de la tribu del trozo se mantiene** como puesto avanzado; el poblado grande es otro lugar.
- **El bidón de la choza del jefe** ya está en su cofre, aunque el final del avión llega en la sesión 10.
- **Aterrizar en arena de cualquier playa** deja el avión reparable (§2.4: «solo se puede reparar si aterrizó en arena»).

### Problemas conocidos y límites
- Las paredes de las terrazas siguen la cuadrícula: en las curvas del monte quedan escalonadas.
- Las caras este, oeste y norte de las terrazas no se pueden escalar; la ruta de la cueva para Agilidad baja llega en la sesión 6–7.
- Los guerreros del poblado solo patrullan en círculos; no hay vigilantes en el campamento militar (sesión 9).
- La primera vez que se pinta un trozo puede tardar hasta unos 40 ms (aviso de JIT); al teletransportarse (atajos de prueba) se nota un pequeño tirón.
- La ventisca y la niebla son decorativas: el frío y la visibilidad reducida llegan en la sesión 9.
- Solo se ha probado en Chromium.

## Sesión 4 — Fase 2: flujo de inicio y atributos (15/11/2026)

### Pantallas
- **Título** con `avion.jpg`: *Nueva partida*, *Continuar* (desactivado mientras no haya partida guardada; se comprueba `localStorage` dentro de try/catch) y *Controles* (lista de teclas). Se maneja con teclado y ratón; cursor de flecha en pixel art.
- **Creación de personaje** con `paisaje.jpg` de fondo:
  - **10 puntos** entre Fuerza, Agilidad, Inteligencia y Sigilo/Percepción, de 0 a 6 cada uno, con descripción de cada atributo y un recuadro con los efectos calculados (vida, daño, velocidad, salto, escalada, ruido, detección, riesgo de enfermar y nivel de pistas);
  - colores de **pelo/pañuelo, piel, camiseta y pantalón** (5–7 opciones cada uno) con **recoloreado** del sprite por HSV conservando la luminosidad (TRASPASO §2.6);
  - **vista previa animada** a ×5, andando y girando por las 4 direcciones sobre una peana de hierba;
  - botón *Aleatorio* (X); no deja empezar con puntos sin repartir.
- **Intro** de tres pantallas con texto a máquina de escribir y bandas de cine: el vuelo A-07, la alarma de «¡sin combustible!» (con destellos rojos) y la isla vista desde arriba. Esc la salta.
- **Aterrizaje cenital** (`src/ui/landing.js`, `src/world/landingMap.js`):
  - **mapa de la isla entera** pintado en pixel art a 640 × 360: el trozo jugable sale de sus datos reales y el resto (monte con cumbre nevada, campamento militar, acantilados, bahía, manglar y selva del norte) se pinta de forma aproximada, bajo **niebla** y con el letrero **«zona sin explorar»**;
  - avioneta vista desde arriba con camuflaje y hélice parada, sombra en el suelo que marca dónde tocarás tierra (con anillo de color según el riesgo), humo a ratos, nubes por encima y sombras de nubes en el suelo;
  - panel con **«SIN COMBUSTIBLE»** parpadeando, **altímetro** de esfera y lectura digital (empieza en 1.250 m y baja 20 m/s), indicador de combustible vacío, zona bajo el avión con riesgo, daño y estado del avión, y leyenda;
  - **A/D** gira, **Espacio** aterriza; bajada final con bandazos, destello, temblor y restos del color del suelo;
  - en las zonas sin explorar no deja aterrizar; sin altura sobre ellas, amerizaje forzoso.
- **Impacto:** cartel con la zona, el daño y el estado del avión sobre el mundo ya colocado. Enter para jugar.

### Resultado del aterrizaje (TRASPASO §2.4)
- Playa −10 (avión reparable), selva −30, campamento de la tribu −25 (la tribu acude a investigar), meseta de las ruinas −45 (apareces arriba), mar sin daño (el avión se hunde, empiezas nadando cerca de la costa y los restos con el botín llegan a la playa).
- Los **restos del avión con el botín inicial** se colocan donde caes: se busca un hueco en la misma zona y se despeja la vegetación de debajo.
- El estado del avión queda guardado en la partida (`game.plane`) para el final del avión (sesión 10).

### Atributos con efecto real (`src/data/attributes.js`, fórmulas de §1.5)
- **Fuerza:** vida máxima 80 + F × 12; daño × (1 + F × 0,12).
- **Agilidad:** velocidad × (0,88 + A × 0,04); salto 2,6 + A × 0,25 casillas; escalada 70 + A × 10 px/s con un gasto de 30 − A × 3,5 de aguante por segundo.
- **Inteligencia:** pistas de fabricación y de plantas en la mochila (nada con 0–1, qué se puede hacer con 2–3, ingredientes con 4 o más); riesgo de intoxicación × (1 − I × 0,13) al comer carne cruda, cangrejo o bayas.
- **Sigilo/Percepción:** radio de ruido × (1 − S × 0,1); ritmo de detección enemiga × (1 − S × 0,09).
- **Intoxicación** (nuevo estado): durante 30 s quita 1 de vida cada 2,5 s y da más sed; aparece en el HUD. La hierba medicinal la cura.
- **Pantalla de personaje (P):** retrato con los colores elegidos, atributos, efectos, vida, estado y avión.
- Al morir reapareces con la **mitad de la vida máxima** (antes, 60 fijos).

### Pruebas
- 18 pruebas de Playwright (6 nuevas en `tests/inicio.spec.mjs`):
  - recorrido completo **con teclado** título → creación → intro → aterrizaje en la playa → juego (incluye que *Continuar* se salta, que no se puede empezar con puntos libres y que el protagonista lleva la camiseta elegida);
  - resultado del aterrizaje en selva, meseta, campamento (la tribu acude), mar y zona sin explorar, y amerizaje forzoso sin altura;
  - la vista previa cambia de color y gira por las 4 direcciones;
  - **dos personajes muy distintos** (F4 A6 I0 S0 frente a F0 A0 I4 S6): vida 128 frente a 80, salto 4,1 frente a 2,6 casillas medido en el juego, velocidad, ruido y detección medida con un guerrero real;
  - Inteligencia (riesgo de intoxicarse, pistas, curación) y la pantalla P;
  - capturas de título, creación, intro, aterrizaje, llegada a la playa, personaje y mochila.
- Rendimiento: el mapa del aterrizaje se pinta una vez (≈0,16 s, al entrar en la intro); 3–6 ms por fotograma en el aterrizaje y la creación.

### Decisiones tomadas sin consultar (menores, fáciles de cambiar)
- **Pregunta 7 (color de pelo):** se aplica al **pañuelo**, como recomendaba §1.5. Se ha separado camiseta y pantalón.
- **Pregunta 3b:** se mantiene el movimiento libre en 8 direcciones.
- **Zonas del mapa del aterrizaje:** el trozo jugable va al suroeste de la isla, como pide §2.4. La meseta de las ruinas hace de «montaña» (−45) hasta que exista el monte.
- **Amerizaje lejos de la costa conocida:** la corriente te lleva a la costa oeste del trozo jugable.
- **Atajo de pruebas:** `window.__isla.start()` sigue empezando directamente en la playa con el personaje por defecto (F3 A3 I2 S2), sin aterrizaje.
- **Velocidad por Agilidad** (no estaba en §1.5): ±4 % por punto alrededor de Agilidad 3.

### Problemas conocidos y límites
- *Continuar* no hace nada útil todavía: no hay guardado (sesión 8).
- El mapa del aterrizaje es aproximado fuera del trozo jugable; en la sesión 5 saldrá del mapa grande real.
- El recoloreado separa pañuelo y camiseta por la altura en el fotograma: en algunos fotogramas agachado o saltando se cuela algún píxel de un color en el otro.
- La intoxicación y las pistas están listas, pero no hay fabricación todavía para usarlas a fondo.
- Solo se ha probado en Chromium.

## Arreglo entre sesiones: pierna del protagonista (15/11/2026)

- Javier: "en muchos movimientos se le desaparece una pierna". El script de recorte (`tools/extract_sprites.py`) confundía con el fondo la pierna trasera, pintada en verde casi negro.
- Ahora el fondo se quita con un relleno desde fuera de cada fotograma, que se detiene en el contorno negro del dibujo. Los borrones negros solo se eliminan en las hojas que los tienen (recoger, alcanzar, brazos arriba, rodar).
- Atlas regenerado (1024 × 486, 90 fotogramas, mismos nombres y número de fotogramas). Las 12 pruebas siguen en verde.
- Hoja de ruta por sesiones añadida en TRASPASO §4d.

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
