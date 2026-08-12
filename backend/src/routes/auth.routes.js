const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimit.middleware');

// router.post('/login', auth.login);
// ↑ Comentado (11/08/2026): el login era la única ruta pública sin rate limit, o sea que
//   admitía intentos de contraseña ilimitados. Ahora pasa por loginLimiter (10 fallidos
//   por IP cada 15 min); los aciertos no consumen cuota, así que el uso normal no cambia.
router.post('/login', loginLimiter, auth.login);
router.get('/me', authMiddleware, auth.me);
// Actualización de perfil y contraseña desde el panel de Ajustes (26/07/2026).
router.put('/profile', authMiddleware, auth.updateProfile);
router.put('/password', authMiddleware, auth.changePassword);

module.exports = router;
