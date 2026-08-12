const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
    // const ext = path.extname(file.originalname) || '.pdf';
    // ↑ Comentado (11/08/2026): tomaba la extensión del nombre original TAL CUAL. Como el
    //   fileFilter de abajo solo miraba el mimetype (que lo manda el cliente y se puede
    //   falsificar), se podía subir un archivo llamado "cv.html" declarando
    //   Content-Type: application/pdf y quedaba guardado como .html en uploads/cvs. Ese
    //   archivo lo sirve express.static en el MISMO origen que el panel admin, así que el
    //   navegador lo ejecutaba como HTML/JS y podía robar el token admin del localStorage.
    //   Ahora la extensión se normaliza a minúsculas y se valida contra la whitelist; si
    //   no está en la lista, se cae a .pdf (nunca puede quedar un .html/.svg/.js en disco).
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : '.pdf';
    const base = slugifyFilename(path.basename(file.originalname, path.extname(file.originalname)));
    // cb(null, `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${base}${ext}`);
    // ↑ Comentado (11/08/2026): el tramo aleatorio venía de Math.random() y eran solo 6
    //   caracteres. Dos problemas. Uno, Math.random() NO es criptográficamente seguro: el
    //   generador de V8 se puede reconstruir observando unas pocas salidas, así que quien
    //   subiera un par de CVs propios podía deducir la secuencia y armar los nombres de
    //   los CVs ajenos. Dos, 6 caracteres es poco margen igual. Y esto importa porque la
    //   URL del CV ES la llave de acceso: se manda por WhatsApp y quien la tenga entra
    //   sin credenciales (ver nota en application.controller.js), así que si el nombre es
    //   adivinable, quedan expuestos los datos personales de todos los postulantes.
    //   crypto.randomBytes(16) son 128 bits de entropía real: imposible de predecir o
    //   recorrer a fuerza bruta.
    const token = crypto.randomBytes(16).toString('hex');
    cb(null, `cv_${Date.now()}_${token}_${base}${ext}`);
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

// Extensiones permitidas, espejo de ALLOWED_MIMES. Se valida APARTE del mimetype porque
// el mimetype lo declara el cliente en el multipart y es trivial de falsificar; la
// extensión, en cambio, es la que decide con qué Content-Type lo va a servir después
// express.static — y por lo tanto la que decide si el navegador lo ejecuta o no.
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.odt', '.rtf'];

const fileFilter = (req, file, cb) => {
  // if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
  // ↑ Comentado (11/08/2026): validar SOLO el mimetype era insuficiente. El mimetype
  //   viaja en el multipart y lo pone quien hace el request, así que un curl con
  //   `Content-Type: application/pdf` y `filename="payload.html"` pasaba el filtro y
  //   dejaba un HTML ejecutable servido desde nuestro propio dominio (XSS almacenado →
  //   robo del token admin). Ahora tienen que coincidir LAS DOS cosas: mimetype declarado
  //   Y extensión real del archivo.
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) return cb(null, true);
  // Se rechaza con Error (no `cb(null, false)`) para que el postulante vea el motivo:
  // si se descartara en silencio, la postulación se guardaría sin CV.
  cb(new Error('Formato de archivo no permitido. Subí tu CV en PDF, DOC, DOCX, ODT o RTF.'));
};

// 20 MB (11/08/2026, antes 10): un CV rara vez pasa de 2 MB, pero se deja margen por si
// viene con muchas imágenes/escaneos. El nginx del frontend admite hasta 110 MB, así que
// no hace falta tocarlo.
module.exports = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
