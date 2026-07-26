const router = require('express').Router();
const ctrl = require('../controllers/content.controller');
const authMiddleware = require('../middleware/auth.middleware');
const contentUpload = require('../middleware/contentUpload.middleware');

// Lectura pública (las páginas del sitio leen su contenido).
router.get('/', ctrl.getAll);

// Subida de imágenes del editor (admin). Va antes de '/:page' para que la ruta
// literal /upload no sea capturada por el parámetro dinámico.
router.post('/upload', authMiddleware, contentUpload.single('image'), ctrl.uploadImage);

router.get('/:page', ctrl.getOne);
router.put('/:page', authMiddleware, ctrl.update);

module.exports = router;
