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

// Rate limiter del LOGIN admin (11/08/2026). Era la única ruta pública sin límite, así
// que se le podían tirar contraseñas a mano alzada sin ningún costo: con el usuario por
// defecto del seed (admin@manhattan.com) publicado en el repo, la fuerza bruta era
// cuestión de tiempo. 10 intentos FALLIDOS por IP cada 15 minutos: un humano que se
// equivoca dos o tres veces no lo nota, un script sí.
//
// skipSuccessfulRequests: los logins correctos no consumen cuota. Sin esto, un admin que
// entra y sale varias veces (o varias personas detrás de la misma IP de oficina) se
// quedaría sin intentos aunque nunca haya fallado.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // 10 intentos fallidos por IP
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.' },
});

module.exports = { publicFormLimiter, loginLimiter };
