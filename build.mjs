// Empaqueta src/main.js con esbuild (formato IIFE, sin módulos ES) y lo incrusta
// junto con los assets (data URI en base64) en un único dist/isla.html que
// funciona abierto con doble clic desde file://.
//
//   node build.mjs           → compila una vez
//   node build.mjs --watch   → recompila al cambiar cualquier archivo de src/ o assets/

import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(ROOT, 'src', 'index.html');
const OUT = join(ROOT, 'dist', 'isla.html');
const watch = process.argv.includes('--watch');

/** Inserta el JS compilado en la plantilla y escribe dist/isla.html. */
function writeHtml(js) {
  const template = readFileSync(TEMPLATE, 'utf8');
  // Un "</script" dentro del código cerraría la etiqueta antes de tiempo.
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  if (!template.includes('<!--JUEGO-->')) {
    throw new Error('La plantilla src/index.html no contiene el marcador <!--JUEGO-->');
  }
  const html = template.replace('<!--JUEGO-->', () => `<script>\n${safeJs}\n</script>`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`[build] dist/isla.html generado (${kb} KB) — ${new Date().toLocaleTimeString('es-ES')}`);
}

const htmlPlugin = {
  name: 'html-unico',
  setup(build) {
    // La plantilla no la importa nadie: se vigila a mano en modo --watch.
    build.onLoad({ filter: /src[\\/]main\.js$/ }, (args) => ({
      contents: readFileSync(args.path, 'utf8'),
      loader: 'js',
      watchFiles: [TEMPLATE],
    }));
    build.onEnd((result) => {
      if (result.errors.length) {
        console.error(`[build] ${result.errors.length} error(es); no se escribe dist/isla.html`);
        return;
      }
      const js = result.outputFiles.find((f) => f.path.endsWith('.js'));
      writeHtml(js.text);
    });
  },
};

const options = {
  entryPoints: [join(ROOT, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  outfile: join(ROOT, 'dist', 'isla.js'),
  loader: { '.png': 'dataurl', '.jpg': 'dataurl' },
  legalComments: 'none',
  logLevel: 'warning',
  plugins: [htmlPlugin],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[build] Vigilando cambios en src/ y assets/… (Ctrl+C para salir)');
} else {
  await esbuild.build(options);
}
