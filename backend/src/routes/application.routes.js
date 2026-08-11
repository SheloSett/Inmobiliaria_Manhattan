const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/application.controller');
const authMiddleware = require('../middleware/auth.middleware');
const cvUpload = require('../middleware/cvUpload.middleware');
// Rate-limit anti-spam para los POST públicos (10/08/2026).
const { publicFormLimiter } = require('../middleware/rateLimit.middleware');

// Subida del CV con los errores traducidos a JSON. Sin este wrapper, un archivo
// demasiado grande o con formato inválido llega al handler de error por defecto de
// Express, que responde un HTML de error 500: el frontend lo mostraría como "error
// inesperado" y el postulante no sabría qué corregir.
function uploadCv(req, res, next) {
  cvUpload.single('cv')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      // LIMIT_FILE_SIZE es el único límite que puede saltar acá (single file, 20 MB).
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera los 20 MB. Subí una versión más liviana de tu CV.'
        : 'No se pudo procesar el archivo adjunto.';
      return res.status(400).json({ error: msg });
    }

    // Errores del fileFilter (formato no permitido) y de Cloudinary (por ejemplo,
    // credenciales sin configurar en el .env) caen acá.
    return res.status(400).json({ error: err.message || 'No se pudo subir el CV.' });
  });
}

// --- Postulaciones laborales (con CV) ---
// publicFormLimiter va ANTES de uploadCv a propósito: si se pasó el límite, se corta
// sin llegar a subir el archivo a Cloudinary.
router.post('/jobs', publicFormLimiter, uploadCv, ctrl.createJobApplication);
router.get('/jobs', authMiddleware, ctrl.getJobApplications);
router.patch('/jobs/:id/read', authMiddleware, ctrl.markJobApplicationRead);
router.delete('/jobs/:id', authMiddleware, ctrl.deleteJobApplication);

// --- Solicitudes para abrir una sucursal (sin archivo) ---
router.post('/branches', publicFormLimiter, ctrl.createBranchInquiry);
router.get('/branches', authMiddleware, ctrl.getBranchInquiries);
router.patch('/branches/:id/read', authMiddleware, ctrl.markBranchInquiryRead);
router.delete('/branches/:id', authMiddleware, ctrl.deleteBranchInquiry);

module.exports = router;
