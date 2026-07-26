const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware de subida para las imágenes del editor de contenido del sitio (CMS).
// Se guarda en uploads/content (separado de uploads/properties) para no mezclar
// las imágenes de propiedades con las de las páginas. Mismo patrón que
// upload.middleware.js pero con destino y prefijo propios.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/content');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `content_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
