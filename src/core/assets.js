// Carga de imágenes. En el build, los imports de .png/.jpg se convierten en
// data URI en base64, así que todo va dentro del propio HTML.

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar una imagen del juego'));
    img.src = src;
  });
}
