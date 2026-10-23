const db = require('../config/db');

// Obtener reservas con filtros opcionales (por estado o cliente_id) y paginación
const obtenerReservas = async (req, res) => {
    try {
        const { estado, cliente_id, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado, r.total, r.created_at,
                   u.id AS usuario_id, u.nombre AS usuario_nombre,
                   c.id AS cliente_id, c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono,
                   h.id AS habitacion_id, h.numero AS habitacion_numero, h.tipo AS habitacion_tipo, h.precio_noche
            FROM reservas r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            LEFT JOIN clientes c ON r.cliente_id = c.id
            LEFT JOIN habitaciones h ON r.habitacion_id = h.id
            WHERE 1=1
        `;
        const params = [];

        if (estado) {
            params.push(estado);
            query += ` AND r.estado = $${params.length}`;
        }

        if (cliente_id) {
            params.push(cliente_id);
            query += ` AND r.cliente_id = $${params.length}`;
        }

        query += ` ORDER BY r.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const resultado = await db.query(query, params);

        let countQuery = 'SELECT COUNT(*) FROM reservas WHERE 1=1';
        const countParams = [];
        if (estado) {
            countParams.push(estado);
            countQuery += ` AND estado = $${countParams.length}`;
        }
        if (cliente_id) {
            countParams.push(cliente_id);
            countQuery += ` AND cliente_id = $${countParams.length}`;
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
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ error: 'Error interno al obtener las reservas.' });
    }
};

// Crear una nueva reserva vinculando un cliente y validando disponibilidad
const crearReserva = async (req, res) => {
    try {
        const { cliente_id, habitacion_id, fecha_entrada, fecha_salida, estado: estadoReq, total: totalReq } = req.body;
        const usuario_id = req.usuario.id;

        const clienteQuery = await db.query('SELECT * FROM clientes WHERE id = $1', [cliente_id]);
        if (clienteQuery.rows.length === 0) {
            return res.status(404).json({ error: 'El cliente especificado no existe.' });
        }

        const habQuery = await db.query('SELECT * FROM habitaciones WHERE id = $1', [habitacion_id]);
        if (habQuery.rows.length === 0) {
            return res.status(404).json({ error: 'La habitación especificada no existe.' });
        }
        const habitacion = habQuery.rows[0];

        const start = new Date(fecha_entrada);
        const end = new Date(fecha_salida);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0 || isNaN(diffDays) || start >= end) {
            return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de entrada.' });
        }

        const solapamientoQuery = `
            SELECT * FROM reservas 
            WHERE habitacion_id = $1 
              AND estado IN ('pendiente', 'confirmada', 'ocupada')
              AND NOT (fecha_salida <= $2 OR fecha_entrada >= $3);
        `;
        const reservasExistentes = await db.query(solapamientoQuery, [habitacion_id, fecha_entrada, fecha_salida]);

        if (reservasExistentes.rows.length > 0) {
            return res.status(400).json({
                error: 'La habitación ya no se encuentra disponible para el rango de fechas seleccionado.'
            });
        }

        const precioNoche = parseFloat(habitacion.precio_noche || habitacion.precio || 0);
        const total = totalReq !== undefined && totalReq !== null && totalReq !== '' ? parseFloat(totalReq) : (diffDays * precioNoche);
        
        // Estado que viene de la petición o 'ocupada' por defecto si es check-in oficial
        const estadoFinal = estadoReq || 'ocupada';

        const nuevaReserva = await db.query(
            `INSERT INTO reservas (usuario_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, estado, total)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [usuario_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, estadoFinal, total]
        );

        const estadoHabitacion = (estadoFinal === 'ocupada' || estadoFinal === 'confirmada') ? 'Ocupada' : 'Reservado / Por llegar';
        await db.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', [estadoHabitacion, habitacion_id]);

        res.status(201).json({
            mensaje: '¡Reserva creada con éxito!',
            noches: diffDays,
            reserva: nuevaReserva.rows[0]
        });
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({ error: 'Error interno al crear la reserva.' });
    }
};

const actualizarEstadoReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const resultado = await db.query(
            'UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        const habitacionId = resultado.rows[0].habitacion_id;

        if (estado === 'cancelada' || estado === 'finalizada') {
            await db.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', ['Disponible', habitacionId]);
        } else if (estado === 'ocupada' || estado === 'confirmada') {
            await db.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', ['Ocupada', habitacionId]);
        }

        res.json({
            mensaje: `¡Reserva actualizada a estado '${estado}' con éxito!`,
            reserva: resultado.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        res.status(500).json({ error: 'Error interno al actualizar la reserva.' });
    }
};

module.exports = {
    obtenerReservas,
    crearReserva,
    actualizarEstadoReserva
};