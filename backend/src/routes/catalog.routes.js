const router = require('express').Router();
const ctrl = require('../controllers/catalog.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Lectura pública (formulario de alta, filtros y páginas públicas).
router.get('/', ctrl.getAll);

// CRUD admin. :kind ∈ { operations, propertyTypes, amenities }
router.post('/:kind', authMiddleware, ctrl.create);
router.put('/:kind/:id', authMiddleware, ctrl.update);
router.delete('/:kind/:id', authMiddleware, ctrl.remove);

module.exports = router;
