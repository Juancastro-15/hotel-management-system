const db = require('../config/db');

// Obtener habitaciones con filtros opcionales y paginación
const obtenerHabitaciones = async (req, res) => {
    try {
        const { estado, tipo, page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM habitaciones WHERE 1=1';
        const params = [];

        if (estado) {
            params.push(estado);
            query += ` AND estado = $${params.length}`;
        }

        if (tipo) {
            params.push(tipo);
            query += ` AND tipo ILIKE $${params.length}`;
        }

        query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const resultado = await db.query(query, params);

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

// Crear una nueva habitación (Actualizado para recibir datos del propietario)
const crearHabitacion = async (req, res) => {
    try {
        const { 
            numero, 
            tipo, 
            precio_noche, 
            estado, 
            descripcion,
            nombres_propietario,
            apellidos_propietario,
            email_propietario,
            celular_propietario
        } = req.body;

        // Verificar si el número de habitación ya existe
        const habitacionExiste = await db.query('SELECT * FROM habitaciones WHERE numero = $1', [numero]);
        if (habitacionExiste.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe una habitación registrada con ese número.' });
        }

        const nuevaHabitacion = await db.query(
            `INSERT INTO habitaciones (
                numero, tipo, precio_noche, estado, descripcion, 
                nombres_propietario, apellidos_propietario, email_propietario, celular_propietario
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                numero, 
                tipo, 
                precio_noche, 
                estado || 'Disponible', 
                descripcion || null,
                nombres_propietario || null,
                apellidos_propietario || null,
                email_propietario || null,
                celular_propietario || null
            ]
        );

        res.status(201).json({
            mensaje: '¡Propiedad creada con éxito!',
            habitacion: nuevaHabitacion.rows[0]
        });
    } catch (error) {
        console.error('Error al crear habitación:', error);
        res.status(500).json({ error: 'Error interno al crear la habitación.' });
    }
};

// Actualizar una habitación (Actualizado para actualizar datos del propietario)
const actualizarHabitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            numero, 
            tipo, 
            precio_noche, 
            estado, 
            descripcion,
            nombres_propietario,
            apellidos_propietario,
            email_propietario,
            celular_propietario
        } = req.body;

        const habitacionActualizada = await db.query(
            `UPDATE habitaciones 
             SET numero = COALESCE($1, numero), 
                 tipo = COALESCE($2, tipo), 
                 precio_noche = COALESCE($3, precio_noche), 
                 estado = COALESCE($4, estado), 
                 descripcion = COALESCE($5, descripcion),
                 nombres_propietario = COALESCE($6, nombres_propietario),
                 apellidos_propietario = COALESCE($7, apellidos_propietario),
                 email_propietario = COALESCE($8, email_propietario),
                 celular_propietario = COALESCE($9, celular_propietario)
             WHERE id = $10 RETURNING *`,
            [
                numero, 
                tipo, 
                precio_noche, 
                estado, 
                descripcion,
                nombres_propietario,
                apellidos_propietario,
                email_propietario,
                celular_propietario,
                id
            ]
        );

        if (habitacionActualizada.rows.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada para actualizar.' });
        }

        res.json({
            mensaje: '¡Propiedad actualizada con éxito!',
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