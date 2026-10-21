const express = require('express');
const router = express.Router();
const { obtenerUsuarios, actualizarUsuario, eliminarUsuario, restablecerPassword } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Proteger las rutas con autenticación y verificación de rol Admin
router.get('/', authMiddleware, roleMiddleware(['admin', 'administrador']), obtenerUsuarios);

// ⚠️ IMPORTANTE: Esta ruta específica DEBE ir antes de '/:id' para que Express la lea bien
router.put('/:id/password', authMiddleware, roleMiddleware(['admin', 'administrador']), restablecerPassword);

router.put('/:id', authMiddleware, roleMiddleware(['admin', 'administrador']), actualizarUsuario);
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'administrador']), eliminarUsuario);

module.exports = router;