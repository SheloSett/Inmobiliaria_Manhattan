const router = require('express').Router();
const ctrl = require('../controllers/property.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authMiddleware, upload.array('images', 20), ctrl.create);
router.put('/:id', authMiddleware, upload.array('images', 20), ctrl.update);
router.delete('/:id', authMiddleware, ctrl.remove);

module.exports = router;
