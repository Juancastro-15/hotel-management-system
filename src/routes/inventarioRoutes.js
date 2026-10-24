const express = require('express');
const router = express.Router();
const { 
    crearBoleta, 
    crearManilla, 
    obtenerBoletas, 
    obtenerManillas,
    registrarBoletasMasivas,
    registrarManillasMasivas
} = require('../controllers/inventarioController');

// 🎟️ Rutas para Boletas
router.post('/boletas', crearBoleta);             // Registrar nueva boleta individual[cite: 6]
router.post('/boletas/masivo', registrarBoletasMasivas); // Registrar boletas por rango masivo
router.get('/boletas', obtenerBoletas);           // Consultar historial de boletas[cite: 6]

// 📿 Rutas para Manillas
router.post('/manillas', crearManilla);           // Registrar nueva manilla individual[cite: 6]
router.post('/manillas/masivo', registrarManillasMasivas); // Registrar manillas por rango masivo
router.get('/manillas', obtenerManillas);         // Consultar inventario de manillas[cite: 6]

module.exports = router;