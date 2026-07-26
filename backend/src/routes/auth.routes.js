const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/login', auth.login);
router.get('/me', authMiddleware, auth.me);
// Actualización de perfil y contraseña desde el panel de Ajustes (26/07/2026).
router.put('/profile', authMiddleware, auth.updateProfile);
router.put('/password', authMiddleware, auth.changePassword);

module.exports = router;
