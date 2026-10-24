const express = require('express');
const router = express.Router();
const { 
    crearBoleta, 
    crearManilla, 
    obtenerBoletas, 
    obtenerManillas 
} = require('../controllers/inventarioController');

// 🎟️ Rutas para Boletas
router.post('/boletas', crearBoleta);       // Registrar nueva boleta
router.get('/boletas', obtenerBoletas);     // Consultar historial de boletas

// 📿 Rutas para Manillas
router.post('/manillas', crearManilla);     // Registrar nueva manilla
router.get('/manillas', obtenerManillas);   // Consultar inventario de manillas

module.exports = router;