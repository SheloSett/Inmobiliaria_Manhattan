const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware de subida de CVs de la página pública de postulaciones.
//
// CAMBIO 10/08/2026: los CVs se guardan en el DISCO del backend (backend/uploads/cvs),
// NO en Cloudinary. Motivo: la cuenta de Cloudinary quedó marcada como "untrusted"
// (pasa con cuentas gratuitas), y eso BLOQUEA la entrega de PDFs ("Customer is marked as
// untrusted" / "Blocked for delivery") por más que se active "Allow delivery of PDF and
// ZIP files". Las imágenes de propiedades sí se entregan, pero los CVs (PDF/DOC) no. Al
// servirlos desde nuestro propio backend evitamos por completo esa restricción y, de
// paso, quedan más privados (los sirve nuestra app, no un CDN público de terceros).
//
// La versión anterior (CloudinaryStorage, resource_type 'raw') quedó comentada abajo.
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cloudinary = require('../config/cloudinary');

// Carpeta destino en disco. Es la misma carpeta `uploads` que sirve el backend como
// estático (ver src/index.js) y que en el VPS está montada como volumen de Docker, así
// que los CVs persisten entre despliegues.
const CV_DIR = path.join(__dirname, '../../uploads/cvs');

// Marcas diacríticas combinantes (los acentos que quedan sueltos al normalizar en NFD).
// Se declara como constante con escapes \u para que el fuente no dependa de que el
// editor conserve caracteres combinantes sueltos, que son invisibles y frágiles.
const COMBINING_MARKS = /[̀-ͯ]/g;

// Convierte el nombre original del archivo en algo seguro para usar en una URL:
// "CV Análisis Final.pdf" -> "CV_Analisis_Final"
function slugifyFilename(name) {
  return name
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 40) || 'cv';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // recursive: no falla si ya existe; crea la carpeta la primera vez.
    fs.mkdirSync(CV_DIR, { recursive: true });
    cb(null, CV_DIR);
  },
  filename: (req, file, cb) => {
    // Se antepone timestamp + random para que dos "cv.pdf" no se pisen entre sí, y se
    // conserva la extensión para que el navegador sepa abrirlo/descargarlo.
    const ext = path.extname(file.originalname) || '.pdf';
    const base = slugifyFilename(path.basename(file.originalname, ext));
    cb(null, `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base}${ext}`);
  },
});

// Versión anterior en Cloudinary (comentada, no eliminada, según regla del proyecto):
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: (req, file) => {
//     const ext = path.extname(file.originalname) || '.pdf';
//     const base = slugifyFilename(path.basename(file.originalname, ext));
//     return {
//       folder: 'manhattan/cvs',
//       resource_type: 'raw',
//       public_id: `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base}${ext}`,
//     };
//   },
// });

// Solo documentos: PDF, DOC, DOCX, ODT y RTF. A diferencia de las fotos de propiedades
// (donde se acepta cualquier image/* para no descartar formatos raros en silencio),
// acá la lista corta es intencional: un CV que no sea documento casi siempre es un
// error del postulante, y conviene rebotarlo antes de subirlo.
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/rtf',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
  // Se rechaza con Error (no `cb(null, false)`) para que el postulante vea el motivo:
  // si se descartara en silencio, la postulación se guardaría sin CV.
  cb(new Error('Formato de archivo no permitido. Subí tu CV en PDF, DOC, DOCX, ODT o RTF.'));
};

// 20 MB (11/08/2026, antes 10): un CV rara vez pasa de 2 MB, pero se deja margen por si
// viene con muchas imágenes/escaneos. El nginx del frontend admite hasta 110 MB, así que
// no hace falta tocarlo.
module.exports = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
