const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/dashboard', authMiddleware, ctrl.getDashboard);
router.get('/range', authMiddleware, ctrl.getByRange);

module.exports = router;
