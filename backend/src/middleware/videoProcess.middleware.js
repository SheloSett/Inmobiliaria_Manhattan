const fs = require('fs/promises');
const cloudinary = require('../config/cloudinary');
const { compressVideo } = require('../services/videoCompress.service');

// Middleware de compresion y subida de videos de propiedad (10/09/2026).
//
// Va en la ruta DESPUES de multer (upload.middleware.js) y ANTES del controller. Para
// cuando corre, las fotos ya estan en Cloudinary (las sube multer directo) y los videos
// estan en un archivo temporal del disco del VPS (marcados con `isLocalTemp`). Aca cada
// video se comprime con ffmpeg y recien el archivo comprimido se sube a Cloudinary.
//
// Al terminar deja en `req.files` EXACTAMENTE lo que el controller ya esperaba de
// CloudinaryStorage: `f.path` = URL https://res.cloudinary.com/... y `f.filename` =
// public_id. Asi property.controller.js no necesito ningun cambio: create(), update() y
// discardUploads() siguen leyendo los mismos campos que antes.
//
// Los videos se procesan DE A UNO, no en paralelo: ffmpeg ya usa todos los nucleos del
// VPS, y dos a la vez tardarian lo mismo en total pero con el doble de RAM.

const FOLDER = 'manhattan/properties/videos';

function uploadToCloudinary(filePath) {
  // upload_large sube en trozos de 6 MB (evita el tope de 100 MB por request de la API
  // y es mas robusto ante cortes). Ojo con el orden de argumentos del SDK v1:
  // (path, callback, options). NO devuelve promesa, por eso se envuelve a mano.
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      (err, result) => (err ? reject(err) : resolve(result)),
      {
        resource_type: 'video',
        folder: FOLDER,
        chunk_size: 6 * 1024 * 1024,
        // Mismo timeout de 5 min que usaba CloudinaryStorage para videos: Cloudinary
        // transcodifica de forma sincronica antes de responder (ver upload.middleware.js).
        // Como el archivo ya llega chico y en H.264, en la practica tarda segundos.
        timeout: 300000,
      }
    );
  });
}

async function unlinkQuiet(p) {
  if (!p) return;
  try { await fs.unlink(p); } catch { /* ya no existe o no se pudo borrar: no es critico */ }
}

// Si un video falla a mitad de camino, lo que ya se subio a Cloudinary en esta misma
// request (fotos y videos anteriores) quedaria huerfano: no va a haber propiedad que lo
// referencie porque la request termina en error. Se borra, igual que hace
// discardUploads() en el controller para los 400 de validacion.
async function discardAlreadyUploaded(files) {
  await Promise.all(
    files
      .filter((f) => !f.isLocalTemp && f.filename)
      .map((f) =>
        cloudinary.uploader
          .destroy(f.filename, { resource_type: f.mimetype?.startsWith('video/') ? 'video' : 'image' })
          .catch(() => {})
      )
  );
}

module.exports = async function processVideos(req, res, next) {
  const files = req.files || [];
  const videos = files.filter((f) => f.isLocalTemp);
  if (!videos.length) return next();

  for (const f of videos) {
    const original = f.path;
    const compressed = `${original}.c.mp4`;
    try {
      console.log(`[video] comprimiendo ${f.originalname} (${(f.size / 1048576).toFixed(1)} MB)`);
      const t0 = Date.now();
      await compressVideo(original, compressed);
      const { size } = await fs.stat(compressed);
      console.log(`[video] listo en ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${(size / 1048576).toFixed(1)} MB, subiendo a Cloudinary`);

      const result = await uploadToCloudinary(compressed);

      // Se reescribe el file de multer para que el controller lo vea como si lo hubiera
      // subido CloudinaryStorage.
      f.path = result.secure_url;
      f.filename = result.public_id;
      f.size = result.bytes;
      f.mimetype = 'video/mp4';
      f.isLocalTemp = false;
    } catch (err) {
      // Los temporales de ESTE video se borran abajo en el finally (que corre igual
      // antes del return); los de los videos que todavia no se procesaron, aca.
      await Promise.all(videos.filter((v) => v.isLocalTemp && v !== f).map((v) => unlinkQuiet(v.path)));
      await discardAlreadyUploaded(files);
      return next(err);
    } finally {
      await unlinkQuiet(original);
      await unlinkQuiet(compressed);
    }
  }

  next();
};
