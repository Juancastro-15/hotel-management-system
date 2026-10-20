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

        // Filtro por Estado de la reserva
        if (estado) {
            params.push(estado);
            query += ` AND r.estado = $${params.length}`;
        }

        // Filtro por ID de Cliente
        if (cliente_id) {
            params.push(cliente_id);
            query += ` AND r.cliente_id = $${params.length}`;
        }

        // Ordenamiento y Paginación
        query += ` ORDER BY r.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const resultado = await db.query(query, params);

        // Conteo total para metadata
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
        const { cliente_id, habitacion_id, fecha_entrada, fecha_salida } = req.body;
        const usuario_id = req.usuario.id; // Tomado automáticamente del token JWT

        // 1. Verificar si el cliente existe
        const clienteQuery = await db.query('SELECT * FROM clientes WHERE id = $1', [cliente_id]);
        if (clienteQuery.rows.length === 0) {
            return res.status(404).json({ error: 'El cliente especificado no existe.' });
        }

        // 2. Verificar si la habitación existe
        const habQuery = await db.query('SELECT * FROM habitaciones WHERE id = $1', [habitacion_id]);
        if (habQuery.rows.length === 0) {
            return res.status(404).json({ error: 'La habitación especificada no existe.' });
        }
        const habitacion = habQuery.rows[0];

        // 3. Validar fechas lógicas
        const start = new Date(fecha_entrada);
        const end = new Date(fecha_salida);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0 || isNaN(diffDays) || start >= end) {
            return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de entrada.' });
        }

        // 4. Validación de Disponibilidad (Evitar traslape / overbooking)
        const solapamientoQuery = `
            SELECT * FROM reservas 
            WHERE habitacion_id = $1 
              AND estado IN ('pendiente', 'confirmada')
              AND NOT (fecha_salida <= $2 OR fecha_entrada >= $3);
        `;
        const reservasExistentes = await db.query(solapamientoQuery, [habitacion_id, fecha_entrada, fecha_salida]);

        if (reservasExistentes.rows.length > 0) {
            return res.status(400).json({
                error: 'La habitación ya no se encuentra disponible para el rango de fechas seleccionado.'
            });
        }

        // 5. Calcular costo total
        const total = diffDays * parseFloat(habitacion.precio_noche);

        // 6. Insertar la nueva reserva
        const nuevaReserva = await db.query(
            `INSERT INTO reservas (usuario_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, estado, total)
             VALUES ($1, $2, $3, $4, $5, 'pendiente', $6) RETURNING *`,
            [usuario_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, total]
        );

        // 7. Actualizar el estado de la habitación a 'reservada'
        await db.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', ['reservada', habitacion_id]);

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

        if (estado === 'cancelada') {
            const habitacionId = resultado.rows[0].habitacion_id;
            await db.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', ['disponible', habitacionId]);
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