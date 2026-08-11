const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const authMiddleware = require('../middleware/auth.middleware');
// Rate-limit anti-spam para el POST público de consultas (10/08/2026).
const { publicFormLimiter } = require('../middleware/rateLimit.middleware');

router.post('/', publicFormLimiter, ctrl.create);
router.get('/', authMiddleware, ctrl.getAll);
router.patch('/:id/read', authMiddleware, ctrl.markRead);

module.exports = router;
