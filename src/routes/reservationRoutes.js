const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
    obtenerReservas,
    crearReserva,
    actualizarEstadoReserva,
    obtenerAcompanantesReserva,
    agregarAcompananteReserva
} = require('../controllers/reservationController');

// Rutas principales de reservas
router.get('/', verificarToken, obtenerReservas);
router.post('/', verificarToken, crearReserva);
router.put('/:id/estado', verificarToken, actualizarEstadoReserva);

// 👥 Nuevas rutas para la gestión de acompañantes y manillas por reserva
router.get('/:reserva_id/acompanantes', verificarToken, obtenerAcompanantesReserva);
router.post('/:reserva_id/acompanantes', verificarToken, agregarAcompananteReserva);

module.exports = router;