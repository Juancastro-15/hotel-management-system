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

// Registrar un nuevo cliente
const crearCliente = async (req, res) => {
    try {
        const { nombre, email, telefono, documento } = req.body;

        // Verificar si ya existe por documento o email
        const clienteExiste = await db.query(
            'SELECT * FROM clientes WHERE email = $1 OR documento = $2',
            [email, documento]
        );
        if (clienteExiste.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un cliente registrado con ese correo o documento.' });
        }

        const nuevoCliente = await db.query(
            `INSERT INTO clientes (nombre, email, telefono, documento) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, email, telefono, documento]
        );

        res.status(201).json({
            mensaje: '¡Cliente registrado con éxito!',
            cliente: nuevoCliente.rows[0]
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