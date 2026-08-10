const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Middleware de subida de CVs de la página pública de postulaciones (10/08/2026).
// Mismo patrón que upload.middleware.js (propiedades) y contentUpload.middleware.js
// (CMS), pero con carpeta propia y, sobre todo, resource_type 'raw'.
//
// Por qué 'raw' y no 'image'/'auto': un CV es un PDF o un Word, no un archivo que
// Cloudinary deba transformar. Con resource_type 'raw' se guarda tal cual y se sirve
// para descarga; si se subiera como 'image', Cloudinary intentaría procesarlo y
// rechazaría los .doc/.docx.

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

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // public_id explícito con la extensión incluida: los archivos 'raw' se sirven por
    // la URL tal cual se los nombra, y sin extensión el navegador no sabe abrirlos.
    // Se antepone un timestamp + random para que dos "cv.pdf" no se pisen entre sí.
    const ext = path.extname(file.originalname) || '.pdf';
    const base = slugifyFilename(path.basename(file.originalname, ext));
    return {
      folder: 'manhattan/cvs',
      resource_type: 'raw',
      public_id: `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base}${ext}`,
    };
  },
});

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

// 10 MB: un CV rara vez pasa de 2 MB. El límite alto de 100 MB de las propiedades no
// aplica acá porque no hay videos de por medio.
module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
