const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// ↑ Comentadas: ya no se usan. Antes armaban la carpeta de destino en disco
//   local (backend/uploads/content); ahora las imágenes del editor se suben
//   directo a Cloudinary, igual que las de propiedades (ver upload.middleware.js).
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Middleware de subida para las imágenes del editor de contenido del sitio (CMS).
// Antes se guardaba en uploads/content (separado de uploads/properties) para no
// mezclar las imágenes de propiedades con las de las páginas; ahora se sube a
// una carpeta separada dentro de la misma cuenta de Cloudinary.
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = path.join(__dirname, '../../uploads/content');
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//     cb(null, dir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `content_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
//   },
// });
// ↑ Comentado: versión anterior que guardaba en disco local. Se reemplaza por
//   CloudinaryStorage de abajo, mismo patrón que upload.middleware.js pero con
//   carpeta propia.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'manhattan/content',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
