const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/', ctrl.create);
router.get('/', authMiddleware, ctrl.getAll);
router.patch('/:id/read', authMiddleware, ctrl.markRead);

module.exports = router;
