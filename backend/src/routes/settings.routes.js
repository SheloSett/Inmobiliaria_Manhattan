const router = require('express').Router();
const ctrl = require('../controllers/settings.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', ctrl.get);
router.put('/', authMiddleware, ctrl.update);

module.exports = router;
