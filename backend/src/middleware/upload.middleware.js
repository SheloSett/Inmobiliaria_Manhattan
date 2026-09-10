const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// ↑ Comentadas: ya no se usan. Antes armaban la carpeta de destino en disco
//   local (backend/uploads/properties); ahora las imágenes se suben directo
//   a Cloudinary, así el cliente puede subir fotos sin ocupar espacio del
//   VPS y quedan servidas por su CDN.
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = path.join(__dirname, '../../uploads/properties');
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//     cb(null, dir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `prop_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
//   },
// });
// ↑ Comentado: versión anterior que guardaba los archivos en disco local.
//   Se reemplaza por CloudinaryStorage de abajo, que sube el archivo a la
//   cuenta de Cloudinary y deja la URL resultante en `file.path`.
// params como función para setear resource_type según sea foto o video: Cloudinary
// necesita resource_type 'video' para procesar videos (transcodificación, streaming).
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: isVideo ? 'manhattan/properties/videos' : 'manhattan/properties',
      resource_type: isVideo ? 'video' : 'image',
      // Sin allowed_formats fijo: se deja que Cloudinary acepte los formatos que
      // pasen el fileFilter de abajo (jpg/png/webp y mp4/mov/webm).

      // timeout (03/09/2026): CAUSA RAIZ del "no se pudo guardar" intermitente al subir
      // videos. El SDK de Cloudinary aplica 60000 ms por defecto (ver
      // node_modules/cloudinary/lib/uploader.js, `post_request.setTimeout(...)`) y es un
      // timeout POR INACTIVIDAD del socket, no por duracion total. Mientras el archivo
      // viaja hay trafico y no salta; el problema aparece DESPUES de mandar el ultimo
      // byte: Cloudinary transcodifica el video de forma SINCRONICA antes de responder y,
      // durante ese procesado, el socket queda mudo. Si transcodificar tarda mas de 60 s
      // el SDK aborta con "Request Timeout" (http_code 499) y multer propaga el error.
      // Por eso fallaba solo con mp4 y no con fotos (una foto se procesa en ~1 s) y por
      // eso era intermitente: el tiempo de transcodificacion depende de la duracion,
      // resolucion y codec de cada video.
      // Se sube a 300000 ms (5 min) para videos, alineado con los proxy_read_timeout de
      // nginx. Para imagenes se deja el default: no tiene sentido esperar 5 min por una
      // foto, y un timeout corto ahi ayuda a detectar problemas de red rapido.
      ...(isVideo ? { timeout: 300000 } : {}),
    };
  },
});

// Antes se filtraba por una lista fija de mimetypes (jpeg/png/webp + mp4/mov/webm).
// PROBLEMA: si el usuario subía una foto en otro formato (HEIC de iPhone, AVIF, GIF,
// JFIF, etc.), multer la descartaba EN SILENCIO y la propiedad se "guardaba" sin ella.
// Ahora se acepta cualquier imagen o video y se deja que Cloudinary maneje/convierta el
// formato; si Cloudinary no puede, la request falla con error visible (no en silencio).
const fileFilter = (req, file, cb) => {
  const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
  cb(null, ok);
};

// --- Videos a disco temporal (10/09/2026) ---
// Los videos YA NO van directo a Cloudinary desde multer: el plan gratuito rechaza
// videos de mas de 100 MB y un minuto grabado con un celular pesa eso o mucho mas. Ahora
// multer los deja en un archivo temporal del VPS y videoProcess.middleware.js (que va
// despues en la ruta) los comprime con ffmpeg y sube el resultado, mucho mas chico.
// Las fotos siguen exactamente igual que antes: CloudinaryStorage de arriba. La rama de
// video de `params` queda sin uso pero se deja por si hiciera falta volver atras.
const os = require('os');
const path = require('path');
const fs = require('fs');

// os.tmpdir() es /tmp dentro del contenedor: no es el volumen de uploads (no hay que
// persistir nada, el temporal se borra apenas termina de subirse) y se limpia solo si el
// contenedor se recrea.
const VIDEO_TMP_DIR = path.join(os.tmpdir(), 'manhattan-videos');

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(VIDEO_TMP_DIR, { recursive: true }, (err) => cb(err, VIDEO_TMP_DIR));
  },
  filename: (req, file, cb) => {
    // Se conserva la extension original solo como ayuda para ffmpeg; el contenido lo
    // detecta igual por los bytes.
    const ext = (path.extname(file.originalname) || '.mp4').toLowerCase().slice(0, 8);
    cb(null, `v_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

// Storage compuesto: multer acepta un solo storage por instancia, asi que este objeto
// implementa la interfaz de multer (_handleFile / _removeFile) y delega segun el tipo.
// `isLocalTemp` es la marca que usa videoProcess.middleware.js para saber que archivos
// tiene que comprimir. _removeFile lo llama multer cuando un archivo POSTERIOR falla
// (ej. supera fileSize) para limpiar los que ya habia guardado.
const compositeStorage = {
  _handleFile(req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      return videoStorage._handleFile(req, file, (err, info) =>
        cb(err, info ? { ...info, isLocalTemp: true } : info)
      );
    }
    return storage._handleFile(req, file, cb);
  },
  _removeFile(req, file, cb) {
    return (file.isLocalTemp ? videoStorage : storage)._removeFile(req, file, cb);
  },
};

// Límite subido a 100 MB para permitir videos (las fotos rara vez superan pocos MB).
// 100 MB es el máximo de video en el plan gratuito de Cloudinary.
// module.exports = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });
// ↑ Comentado (10/09/2026): ese tope lo dictaba Cloudinary. Como ahora el video que
//   llega a Cloudinary es el comprimido, el limite de subida solo tiene que dejar entrar
//   un video de celular sin comprimir: 500 MB alcanza para ~1 min de 4K o varios de
//   1080p. Tiene que ser coherente con MAX_VIDEO_MB del panel admin
//   (AdminPropertyForm.jsx) y con client_max_body_size de los dos nginx (520M).
module.exports = multer({ storage: compositeStorage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } });
