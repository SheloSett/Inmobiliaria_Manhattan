const router = require('express').Router();
const ctrl = require('../controllers/property.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// '/live' va ANTES de '/:id': si no, Express matchearía "live" como si fuera un id.
router.get('/live', authMiddleware, ctrl.getLive);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authMiddleware, upload.array('images', 20), ctrl.create);
router.put('/:id', authMiddleware, upload.array('images', 20), ctrl.update);
router.delete('/:id', authMiddleware, ctrl.remove);
// Tracking de la ficha pública (sin auth): heartbeat de presencia y clic a WhatsApp.
router.post('/:id/heartbeat', ctrl.trackHeartbeat);
router.post('/:id/contact-click', ctrl.trackContactClick);

module.exports = router;
