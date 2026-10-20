const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/authController');

// Rutas públicas de autenticación
router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);

module.exports = router;