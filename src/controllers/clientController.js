const db = require('../config/db');

// Obtener todos los clientes
const obtenerClientes = async (req, res) => {
    try {
        const resultado = await db.query('SELECT * FROM clientes ORDER BY id ASC');
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error interno al obtener los clientes.' });
    }
};

// Registrar un nuevo cliente o reutilizar el existente si ya está registrado
const crearCliente = async (req, res) => {
    try {
        const { nombre, email, telefono, documento } = req.body;

        // Generar un correo temporal automático si no se proporciona uno
        const emailCliente = email || `cliente_${documento || Date.now()}@marinabay.com`;

        // Verificar si ya existe por documento o email
        const clienteExiste = await db.query(
            'SELECT * FROM clientes WHERE documento = $1 OR email = $2',
            [documento, emailCliente]
        );

        if (clienteExiste.rows.length > 0) {
            // Si ya existe, devolvemos el cliente existente con éxito (Reutilización de ID para la reserva)
            return res.status(200).json({
                mensaje: 'Cliente existente recuperado.',
                cliente: clienteExiste.rows[0],
                id: clienteExiste.rows[0].id
            });
        }

        // Si no existe, lo insertamos
        const nuevoCliente = await db.query(
            `INSERT INTO clientes (nombre, email, telefono, documento) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, emailCliente, telefono, documento]
        );

        res.status(201).json({
            mensaje: '¡Cliente registrado con éxito!',
            cliente: nuevoCliente.rows[0],
            id: nuevoCliente.rows[0].id
        });
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        res.status(500).json({ error: 'Error interno al registrar el cliente.' });
    }
};

module.exports = {
    obtenerClientes,
    crearCliente
};