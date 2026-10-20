const db = require('../config/db');

// Obtener habitaciones con filtros opcionales y paginación
const obtenerHabitaciones = async (req, res) => {
    try {
        const { estado, tipo, page = 1, limit = 10 } = req.query;

        // Calcular desplazamiento (offset) para la paginación
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM habitaciones WHERE 1=1';
        const params = [];

        // Filtro por Estado
        if (estado) {
            params.push(estado);
            query += ` AND estado = $${params.length}`;
        }

        // Filtro por Tipo de Habitación (ILIKE busca sin importar mayúsculas/minúsculas)
        if (tipo) {
            params.push(tipo);
            query += ` AND tipo ILIKE $${params.length}`;
        }

        // Ordenamiento y Paginación
        query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const resultado = await db.query(query, params);

        // Obtener el conteo total de registros filtrados para la metadata
        let countQuery = 'SELECT COUNT(*) FROM habitaciones WHERE 1=1';
        const countParams = [];
        if (estado) {
            countParams.push(estado);
            countQuery += ` AND estado = $${countParams.length}`;
        }
        if (tipo) {
            countParams.push(tipo);
            countQuery += ` AND tipo ILIKE $${countParams.length}`;
        }

        const totalResult = await db.query(countQuery, countParams);
        const totalRegistros = parseInt(totalResult.rows[0].count);

        res.json({
            total: totalRegistros,
            pagina_actual: parseInt(page),
            total_paginas: Math.ceil(totalRegistros / limit),
            data: resultado.rows
        });
    } catch (error) {
        console.error('Error al obtener habitaciones:', error);
        res.status(500).json({ error: 'Error interno al obtener las habitaciones.' });
    }
};

// Obtener una habitación por ID
const obtenerHabitacionPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await db.query('SELECT * FROM habitaciones WHERE id = $1', [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada.' });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al obtener la habitación:', error);
        res.status(500).json({ error: 'Error interno al obtener la habitación.' });
    }
};

// Crear una nueva habitación
const crearHabitacion = async (req, res) => {
    try {
        const { numero, tipo, precio_noche, estado, descripcion } = req.body;

        // Verificar si el número de habitación ya existe
        const habitacionExiste = await db.query('SELECT * FROM habitaciones WHERE numero = $1', [numero]);
        if (habitacionExiste.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe una habitación registrada con ese número.' });
        }

        const nuevaHabitacion = await db.query(
            `INSERT INTO habitaciones (numero, tipo, precio_noche, estado, descripcion) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [numero, tipo, precio_noche, estado || 'disponible', descripcion]
        );

        res.status(201).json({
            mensaje: '¡Habitación creada con éxito!',
            habitacion: nuevaHabitacion.rows[0]
        });
    } catch (error) {
        console.error('Error al crear habitación:', error);
        res.status(500).json({ error: 'Error interno al crear la habitación.' });
    }
};

// Actualizar una habitación
const actualizarHabitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero, tipo, precio_noche, estado, descripcion } = req.body;

        const habitacionActualizada = await db.query(
            `UPDATE habitaciones 
             SET numero = COALESCE($1, numero), 
                 tipo = COALESCE($2, tipo), 
                 precio_noche = COALESCE($3, precio_noche), 
                 estado = COALESCE($4, estado), 
                 descripcion = COALESCE($5, descripcion) 
             WHERE id = $6 RETURNING *`,
            [numero, tipo, precio_noche, estado, descripcion, id]
        );

        if (habitacionActualizada.rows.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada para actualizar.' });
        }

        res.json({
            mensaje: '¡Habitación actualizada con éxito!',
            habitacion: habitacionActualizada.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar habitación:', error);
        res.status(500).json({ error: 'Error interno al actualizar la habitación.' });
    }
};

// Eliminar una habitación
const eliminarHabitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await db.query('DELETE FROM habitaciones WHERE id = $1 RETURNING *', [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada para eliminar.' });
        }

        res.json({ mensaje: '¡Habitación eliminada con éxito!' });
    } catch (error) {
        console.error('Error al eliminar habitación:', error);
        res.status(500).json({ error: 'Error interno al eliminar la habitación.' });
    }
};

module.exports = {
    obtenerHabitaciones,
    obtenerHabitacionPorId,
    crearHabitacion,
    actualizarHabitacion,
    eliminarHabitacion
};