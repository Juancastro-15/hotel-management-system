const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
    obtenerReservas,
    crearReserva,
    actualizarEstadoReserva
} = require('../controllers/reservationController');

router.get('/', verificarToken, obtenerReservas);
router.post('/', verificarToken, crearReserva);
router.put('/:id/estado', verificarToken, actualizarEstadoReserva);

module.exports = router;