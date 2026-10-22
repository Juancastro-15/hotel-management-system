const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); // Tu verificarToken
const { generarComprobantePDF } = require('../controllers/pdfController');

// Obtener comprobante en PDF por id de reserva (requiere JWT)
router.get('/comprobante/:reserva_id', authMiddleware, generarComprobantePDF);

module.exports = router;