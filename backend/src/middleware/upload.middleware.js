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

// Límite subido a 100 MB para permitir videos (las fotos rara vez superan pocos MB).
// 100 MB es el máximo de video en el plan gratuito de Cloudinary.
module.exports = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });
