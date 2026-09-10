const { spawn } = require('child_process');
const fs = require('fs');

// Compresion de videos de propiedad con ffmpeg (10/09/2026).
//
// POR QUE EXISTE: el cliente no podia subir videos de 1 minuto. Un celular moderno graba
// en 1080p a 60-130 MB por minuto y en 4K a 300-400 MB por minuto, y el plan gratuito de
// Cloudinary rechaza cualquier video de mas de 100 MB. Subir ese tope en nuestro codigo
// no sirve de nada porque el limite real lo pone Cloudinary. La salida es comprimir el
// video en el VPS ANTES de mandarlo: un minuto en 4K pasa de ~350 MB a 20-40 MB.
//
// Se eligio hacerlo en el servidor y no en el navegador porque asi funciona igual desde
// cualquier celular (iPhone con HEVC/MOV incluido), no depende de que el admin deje la
// pestana abierta, y el resultado es siempre un mp4 H.264 que reproduce todo navegador.
//
// El binario: en Docker lo instala el Dockerfile con apt (paquete `ffmpeg` de Debian).
// En desarrollo local sin Docker se puede apuntar a un ffmpeg descargado a mano con la
// variable FFMPEG_PATH en backend/.env; si no esta definida se busca `ffmpeg` en el PATH.
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

// Tope duro de tiempo de compresion. Nginx corta la request a los 300 s sin datos del
// backend (proxy_read_timeout), y despues de comprimir todavia hay que subir el archivo
// a Cloudinary. Si ffmpeg no termino en 4 minutos, mejor fallar con un mensaje claro que
// dejar al admin mirando una barra colgada hasta que nginx responda un 504 generico.
const MAX_MS = 4 * 60 * 1000;

// Parametros de salida. Todos elegidos para "se ve bien en la ficha de una propiedad y
// pesa poco", no para archivar el original:
//   - scale: el lado MAYOR queda en 1920 px como maximo (1080p si es horizontal, 1920 de
//     alto si es vertical, que es como filman con el celular). Si el video ya es mas
//     chico no se agranda. trunc(x/2)*2 fuerza dimensiones pares: libx264 con yuv420p
//     falla con anchos o altos impares. Las comillas simples son del parser de filtros
//     de ffmpeg y protegen las comas de las expresiones (min, if).
//   - fps: se limita a 30. Los 60 fps de un celular duplican el peso sin aportar nada en
//     un recorrido de una casa. source_fps es una constante del filtro fps.
//   - format=yuv420p: unico formato de pixel que reproducen TODOS los navegadores y
//     celulares con H.264 (los iPhone graban en 10 bits, que Chrome no reproduce).
const VIDEO_FILTER = [
  "scale='if(gt(iw,ih),trunc(min(1920,iw)/2)*2,-2)':'if(gt(iw,ih),-2,trunc(min(1920,ih)/2)*2)'",
  "fps='min(30,source_fps)'",
  'format=yuv420p',
].join(',');

function buildArgs(input, output) {
  return [
    '-y', '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-i', input,
    // Solo el primer stream de video y, si existe (el `?`), el primero de audio. Los
    // videos de iPhone traen streams extra de metadatos que hacen fallar la conversion
    // si se los deja pasar.
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', VIDEO_FILTER,
    // H.264 perfil high: el codec con mejor soporte universal. preset veryfast es el
    // punto medio entre velocidad y tamano: en un VPS chico de 2 vCPU un minuto de 4K
    // tarda del orden de 1-2 minutos. crf 27 = calidad visual buena para web, ~3-5 Mbps
    // en 1080p (20-40 MB por minuto).
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    // faststart mueve el indice al principio del archivo para que el navegador pueda
    // empezar a reproducir sin descargar todo.
    '-movflags', '+faststart',
    // Se descarta la metadata del original: ahi viajan la ubicacion GPS del celular y la
    // fecha de grabacion, que no tienen por que quedar publicadas en un CDN. La rotacion
    // NO se pierde: ffmpeg la aplica a los pixeles al decodificar (autorotate).
    '-map_metadata', '-1',
    '-f', 'mp4',
    output,
  ];
}

// Comprime `input` a `output` (mp4). Resuelve al terminar; rechaza con un Error que lleva
// `code` para que el middleware de errores de index.js elija el mensaje:
//   VIDEO_COMPRESS_TIMEOUT  -> tardo mas de MAX_MS
//   VIDEO_COMPRESS_FAILED   -> ffmpeg devolvio error (archivo corrupto, formato raro...)
//   VIDEO_COMPRESS_MISSING  -> no se encontro el binario de ffmpeg (error de instalacion)
function compressVideo(input, output) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    let timedOut = false;
    const child = spawn(FFMPEG, buildArgs(input, output), { stdio: ['ignore', 'ignore', 'pipe'] });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, MAX_MS);

    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      const e = new Error(`No se pudo ejecutar ffmpeg (${FFMPEG}): ${err.message}`);
      e.code = err.code === 'ENOENT' ? 'VIDEO_COMPRESS_MISSING' : 'VIDEO_COMPRESS_FAILED';
      reject(e);
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (timedOut) {
        const e = new Error(`ffmpeg superó los ${MAX_MS / 1000} s comprimiendo ${input}`);
        e.code = 'VIDEO_COMPRESS_TIMEOUT';
        return reject(e);
      }
      if (exitCode !== 0 || !fs.existsSync(output)) {
        const e = new Error(`ffmpeg terminó con código ${exitCode}: ${stderr.trim().slice(-500)}`);
        e.code = 'VIDEO_COMPRESS_FAILED';
        return reject(e);
      }
      resolve(output);
    });
  });
}

module.exports = { compressVideo, buildArgs, FFMPEG };
