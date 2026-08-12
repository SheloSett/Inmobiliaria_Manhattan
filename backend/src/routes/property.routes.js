const router = require('express').Router();
const ctrl = require('../controllers/property.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
// Limiters de los POST públicos de tracking (11/08/2026).
const { heartbeatLimiter, contactClickLimiter } = require('../middleware/rateLimit.middleware');

// '/live' va ANTES de '/:id': si no, Express matchearía "live" como si fuera un id.
router.get('/live', authMiddleware, ctrl.getLive);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authMiddleware, upload.array('images', 20), ctrl.create);
router.put('/:id', authMiddleware, upload.array('images', 20), ctrl.update);
router.delete('/:id', authMiddleware, ctrl.remove);
// Tracking de la ficha pública (sin auth): heartbeat de presencia y clic a WhatsApp.
// router.post('/:id/heartbeat', ctrl.trackHeartbeat);
// router.post('/:id/contact-click', ctrl.trackContactClick);
// ↑ Comentadas (11/08/2026): eran los dos únicos POST públicos que quedaban sin rate
//   limit. El heartbeat alimenta un Map en memoria y el contact-click INSERTA una fila
//   por llamada, así que en loop uno se comía la RAM y el otro inflaba la base. Ahora
//   cada uno pasa por su limiter, dimensionado según cuánto lo usa un visitante real
//   (ver rateLimit.middleware.js).
router.post('/:id/heartbeat', heartbeatLimiter, ctrl.trackHeartbeat);
router.post('/:id/contact-click', contactClickLimiter, ctrl.trackContactClick);

module.exports = router;
