const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;

        // Validar si el usuario ya existe
        const usuarioExiste = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Guardar en la base de datos de Neon
        const nuevoUsuario = await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol, created_at',
            [nombre, email, hashedPassword, rol || 'recepcionista']
        );

        res.status(201).json({
            mensaje: '¡Usuario registrado con éxito!',
            usuario: nuevoUsuario.rows[0]
        });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar.' });
    }
};

// Iniciar sesión
const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar el usuario por email
        const resultado = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (resultado.rows.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas (correo o contraseña incorrectos).' });
        }

        const usuario = resultado.rows[0];

        // Validar contraseña
        const esPasswordValido = await bcrypt.compare(password, usuario.password);
        if (!esPasswordValido) {
            return res.status(400).json({ error: 'Credenciales inválidas (correo o contraseña incorrectos).' });
        }

        // Generar Token JWT (expira en 8 horas)
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: '¡Inicio de sesión exitoso!',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario
};