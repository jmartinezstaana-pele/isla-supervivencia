// Objetos del juego. Efectos sobre las necesidades: vida, hambre, sed, energía
// (todas de 0 a 100; comer SUBE la barra de hambre, que representa saciedad).

export const ITEMS = {
  cuchillo: { nombre: 'Cuchillo', tipo: 'arma', dano: 20, desc: 'Del botiquín del avión. Mucho mejor que los puños.' },
  botella: { nombre: 'Botella de agua', tipo: 'bebida', efecto: { sed: 40 }, desc: 'Agua potable del avión.' },
  racion: { nombre: 'Ración militar', tipo: 'comida', efecto: { hambre: 35, energia: 10 }, desc: 'Lata de comida. Sabe a cartón, pero llena.' },
  galletas: { nombre: 'Galletas', tipo: 'comida', efecto: { hambre: 15 }, desc: 'Un paquete algo aplastado.' },
  venda: { nombre: 'Venda', tipo: 'cura', efecto: { vida: 30 }, desc: 'Cura heridas.' },
  tela: { nombre: 'Tela', tipo: 'material', desc: 'Sirve para vendas y para la balsa.' },
  cuerda: { nombre: 'Cuerda', tipo: 'material', desc: 'Resistente. Imprescindible para fabricar.' },
  madera: { nombre: 'Madera', tipo: 'material', desc: 'Palos y ramas.' },
  piedra: { nombre: 'Piedra', tipo: 'material', desc: 'Una piedra con buen filo.' },
  fibra: { nombre: 'Fibra', tipo: 'material', desc: 'Fibras vegetales para trenzar cuerda.' },
  coco: { nombre: 'Coco', tipo: 'comida', efecto: { hambre: 10, sed: 15 }, desc: 'Agua y pulpa.' },
  bayas: { nombre: 'Bayas rojas', tipo: 'comida', efecto: { hambre: 8, sed: 3 }, riesgo: 0.12, desc: 'Dulces. Parecen comestibles.' },
  carne: { nombre: 'Carne cruda', tipo: 'comida', efecto: { hambre: 14, vida: -3 }, riesgo: 0.6, desc: 'Mejor asada… cuando haya hoguera propia.' },
  cangrejo: { nombre: 'Carne de cangrejo', tipo: 'comida', efecto: { hambre: 10 }, riesgo: 0.25, desc: 'Poca, pero algo es algo.' },
  hierba: { nombre: 'Hierba medicinal', tipo: 'cura', efecto: { vida: 12 }, curaVeneno: true, desc: 'Hojas que calman el dolor y asientan el estómago.' },
  cecina: { nombre: 'Carne seca', tipo: 'comida', efecto: { hambre: 25 }, desc: 'Provisiones de la tribu.' },
  antorcha: { nombre: 'Antorcha', tipo: 'herramienta', desc: 'T para encenderla. Da luz de noche, pero te delata.' },
  bidon: { nombre: 'Bidón de combustible', tipo: 'clave', desc: 'Lleno de gasolina de avión. Harán falta tres para volver a volar.' },
  huevo: { nombre: 'Huevo de ave marina', tipo: 'comida', efecto: { hambre: 9 }, riesgo: 0.1, desc: 'Del nido de los acantilados. Mejor cocinado.' },
  metal: { nombre: 'Chatarra', tipo: 'material', desc: 'Piezas de metal del campamento militar.' },
  idolo: { nombre: 'Ídolo de jade', tipo: 'tesoro', desc: 'Una figurilla antigua de las ruinas. ¿Qué secretos guarda la isla?' },
};

/**
 * Pistas de fabricación y de plantas según la Inteligencia (TRASPASO §2.5):
 * { nivel mínimo: texto }. Se muestran en la mochila. La fabricación llega en la sesión 8.
 */
export const HINTS = {
  fibra: { 2: 'Trenzando varias fibras saldría una cuerda.', 4: 'Tres fibras: una cuerda.' },
  madera: { 2: 'Con madera y fibra podrías hacer una antorcha.', 4: 'Antorcha: 1 madera y 1 fibra. Lanza: 2 madera, 1 piedra y 1 cuerda.' },
  piedra: { 2: 'Tiene buen filo: serviría para una lanza o un hacha.', 4: 'Hacha: 2 madera, 2 piedra y 1 cuerda.' },
  cuerda: { 2: 'Con cuerda y algo de metal se podría hacer un garfio.', 4: 'Garfio: 3 cuerdas y 2 piezas de metal.' },
  tela: { 2: 'Con una hierba medicinal saldría una venda.', 4: 'Venda: 1 tela y 1 hierba medicinal. La balsa también necesita tela.' },
  hierba: { 2: 'Con tela se haría una venda.', 4: 'Antídoto: 2 hierbas medicinales y 1 baya roja.' },
  bayas: { 3: 'Las reconoces: no son venenosas, aunque alguna puede estar pasada.' },
  carne: { 2: 'Cruda puede sentarte mal. Asada en una hoguera, no.' },
  cangrejo: { 2: 'Crudo es arriesgado.' },
  metal: { 2: 'Con cuerda y metal se haría un garfio.', 4: 'Garfio: 3 cuerdas y 2 piezas de metal. Kit de reparación: 4 metal, 2 cables y 1 cuerda.' },
  bidon: { 2: 'Si el avión cayó en la arena, quizá vuelva a volar.' },
  coco: { 2: 'La cáscara podría servir de recipiente para hervir agua.' },
};

/** Orden de preferencia para los atajos Q (comer), R (beber) y H (curar). */
export const QUICK = {
  comer: ['cecina', 'racion', 'galletas', 'cangrejo', 'coco', 'huevo', 'bayas', 'carne'],
  beber: ['botella', 'coco'],
  curar: ['venda', 'hierba'],
};
