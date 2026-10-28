const express = require('express');
const router = express.Router();
const { 
    obtenerVisitas, 
    registrarVisita, 
    marcarSalida, 
    actualizarAutorizacion 
} = require('../controllers/visitasController');

// Nota: Si ya tienes un middleware de autenticación global o por token, puedes importarlo aquí:
// const verificarToken = require('../middlewares/authMiddleware');
// router.use(verificarToken);

// 👮 Rutas para el módulo de Visitas & Personal
router.get('/', obtenerVisitas);                     // Obtener todos los registros
router.post('/', registrarVisita);                   // Registrar nueva entrada (Empleado o Visitante)
router.patch('/:id/salida', marcarSalida);           // Registrar hora de salida (1 clic)
router.patch('/:id/autorizacion', actualizarAutorizacion); // Actualizar estado (Autorizado, Pendiente, Rechazado)

module.exports = router;