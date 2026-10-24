const express = require('express');
const router = express.Router();
const { crearBoleta, crearManilla } = require('../controllers/inventarioController');

// Rutas para registrar elementos en el inventario
router.post('/boletas', crearBoleta);
router.post('/manillas', crearManilla);

module.exports = router;