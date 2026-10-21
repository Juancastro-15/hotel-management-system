const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/roleMiddleware');
const {
    obtenerHabitaciones,
    obtenerHabitacionPorId,
    crearHabitacion,
    actualizarHabitacion,
    eliminarHabitacion
} = require('../controllers/roomController');

// Rutas públicas de lectura
router.get('/', obtenerHabitaciones);
router.get('/:id', obtenerHabitacionPorId);

// Rutas protegidas por Rol
// Solo 'admin' puede crear o eliminar propiedades
router.post('/', verificarToken, verificarRol(['admin']), crearHabitacion);
router.delete('/:id', verificarToken, verificarRol(['admin']), eliminarHabitacion);

// 'admin', 'operador' y 'propietario' pueden actualizar la propiedad según su caso
router.put('/:id', verificarToken, verificarRol(['admin', 'recepcionista', 'operador', 'propietario']), actualizarHabitacion);

module.exports = router;