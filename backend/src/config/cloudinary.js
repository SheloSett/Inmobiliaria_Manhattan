const cloudinary = require('cloudinary').v2;

// Credenciales de la cuenta de Cloudinary donde se suben las fotos de
// propiedades y del contenido del sitio (en vez de guardarlas en disco
// local del VPS). Se configuran en el .env (ver .env.example).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
