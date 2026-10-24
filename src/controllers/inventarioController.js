const db = require('../config/db');

// Registrar una nueva boleta para un apartamento
const crearBoleta = async (req, res) => {
    try {
        const { numero_boleta, habitacion_id } = req.body;
        
        const nueva = await db.query(
            'INSERT INTO boletas (numero_boleta, habitacion_id) VALUES ($1, $2) RETURNING *',
            [numero_boleta, habitacion_id]
        );
        res.status(201).json({ mensaje: 'Boleta registrada con éxito', boleta: nueva.rows[0] });
    } catch (error) {
        console.error('Error al registrar boleta:', error);
        res.status(500).json({ error: 'Error al registrar la boleta (puede que ya exista).' });
    }
};

// Registrar una manilla en el inventario general
const crearManilla = async (req, res) => {
    try {
        const { codigo_manilla } = req.body;
        
        const nueva = await db.query(
            'INSERT INTO manillas (codigo_manilla) VALUES ($1) RETURNING *',
            [codigo_manilla]
        );
        res.status(201).json({ mensaje: 'Manilla registrada con éxito', manilla: nueva.rows[0] });
    } catch (error) {
        console.error('Error al registrar manilla:', error);
        res.status(500).json({ error: 'Error al registrar la manilla (puede que ya exista).' });
    }
};

// Obtener todas las boletas registradas con su apartamento
const obtenerBoletas = async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT b.id, b.numero_boleta, b.habitacion_id, b.usada, b.created_at, h.numero AS numero_habitacion 
             FROM boletas b 
             LEFT JOIN habitaciones h ON b.habitacion_id = h.id 
             ORDER BY b.id DESC`
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener boletas:', error);
        res.status(500).json({ error: 'Error al obtener las boletas.' });
    }
};

// Obtener todas las manillas registradas
const obtenerManillas = async (req, res) => {
    try {
        const resultado = await db.query(
            'SELECT * FROM manillas ORDER BY id DESC'
        );
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener manillas:', error);
        res.status(500).json({ error: 'Error al obtener las manillas.' });
    }
};

module.exports = { 
    crearBoleta, 
    crearManilla, 
    obtenerBoletas, 
    obtenerManillas 
};