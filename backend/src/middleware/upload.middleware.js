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
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'manhattan/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
