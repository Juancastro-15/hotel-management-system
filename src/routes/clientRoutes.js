const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { obtenerClientes, crearCliente } = require('../controllers/clientController');

// Protegemos las rutas con el token JWT que acabamos de probar
router.get('/', verificarToken, obtenerClientes);
router.post('/', verificarToken, crearCliente);

module.exports = router;