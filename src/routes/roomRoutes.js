const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware'); // <-- Importar middleware
const {
    obtenerHabitaciones,
    obtenerHabitacionPorId,
    crearHabitacion,
    actualizarHabitacion,
    eliminarHabitacion
} = require('../controllers/roomController');

// Rutas públicas (cualquiera puede ver las habitaciones)
router.get('/', obtenerHabitaciones);
router.get('/:id', obtenerHabitacionPorId);

// Rutas protegidas (requieren token JWT en los Headers)
router.post('/', verificarToken, crearHabitacion);
router.put('/:id', verificarToken, actualizarHabitacion);
router.delete('/:id', verificarToken, eliminarHabitacion);

module.exports = router;