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
  bayas: { nombre: 'Bayas rojas', tipo: 'comida', efecto: { hambre: 8, sed: 3 }, desc: 'Dulces. Parecen comestibles.' },
  carne: { nombre: 'Carne cruda', tipo: 'comida', efecto: { hambre: 14, vida: -3 }, desc: 'Mejor asada… cuando haya hoguera propia.' },
  cangrejo: { nombre: 'Carne de cangrejo', tipo: 'comida', efecto: { hambre: 10 }, desc: 'Poca, pero algo es algo.' },
  hierba: { nombre: 'Hierba medicinal', tipo: 'cura', efecto: { vida: 12 }, desc: 'Hojas que calman el dolor.' },
  cecina: { nombre: 'Carne seca', tipo: 'comida', efecto: { hambre: 25 }, desc: 'Provisiones de la tribu.' },
  antorcha: { nombre: 'Antorcha', tipo: 'herramienta', desc: 'T para encenderla. Da luz de noche, pero te delata.' },
  idolo: { nombre: 'Ídolo de jade', tipo: 'tesoro', desc: 'Una figurilla antigua de las ruinas. ¿Qué secretos guarda la isla?' },
};

/** Orden de preferencia para los atajos Q (comer), R (beber) y H (curar). */
export const QUICK = {
  comer: ['cecina', 'racion', 'galletas', 'cangrejo', 'coco', 'bayas', 'carne'],
  beber: ['botella', 'coco'],
  curar: ['venda', 'hierba'],
};
