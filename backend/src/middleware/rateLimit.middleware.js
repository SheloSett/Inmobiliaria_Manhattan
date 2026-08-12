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

// Limiter de los endpoints públicos de TRACKING de la ficha de propiedad (11/08/2026):
// el heartbeat de "Viendo ahora" y el clic a WhatsApp. Los dos son POST sin auth.
//
// El heartbeat lo manda el navegador cada ~20s (3 por minuto por pestaña abierta), así
// que el tope es alto a propósito: tiene que ser imposible de alcanzar navegando en serio
// —incluso con varias pestañas, o con varias personas detrás de la IP de una oficina— y
// aun así frenar en seco a un script, que puede mandar miles por segundo.
const heartbeatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 300,                 // 60 por minuto sostenido
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes.' },
});

// El clic a WhatsApp sí INSERTA una fila en la BD por llamada, así que se acota mucho
// más: sin esto, un bot podía inflar la tabla PropertyEvent sin límite y, de paso,
// falsear el ranking de "propiedades más consultadas" del dashboard. Una persona real
// hace esto un puñado de veces por visita.
const contactClickLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes.' },
});

module.exports = { publicFormLimiter, loginLimiter, heartbeatLimiter, contactClickLimiter };
