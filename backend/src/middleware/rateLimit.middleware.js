const rateLimit = require('express-rate-limit');

// Rate limiter para los formularios PÚBLICOS (postulaciones, "abrí una sucursal" y
// contacto). Motivo (10/08/2026): esos POST no tienen auth (los usan visitantes), así
// que un bot podría spamear cientos de envíos —y en el caso de postulaciones, subir
// cientos de CVs a Cloudinary, inflando almacenamiento y costo—. Este límite deja pasar
// el uso humano normal (varios envíos por si alguien se equivoca y reintenta) pero corta
// el spam automatizado. Se combina con el honeypot de los controllers (capa independiente
// de la IP), así una sola de las dos que falle no deja el formulario desprotegido.
const publicFormLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 8,                    // 8 envíos por IP cada 10 min
  standardHeaders: true,     // devuelve los headers RateLimit-*
  legacyHeaders: false,
  message: { error: 'Demasiados envíos desde esta conexión. Esperá unos minutos e intentá de nuevo.' },
});

module.exports = { publicFormLimiter };
