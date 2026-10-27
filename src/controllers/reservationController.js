const db = require('../config/db');

// Obtener reservas con filtros opcionales (por estado o cliente_id) y paginación
const obtenerReservas = async (req, res) => {
    try {
        const { estado, cliente_id, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado, r.total, r.created_at,
                   r.boleta, r.vehiculo, r.placa, r.observaciones,
                   r.manilla_titular, r.tipo_documento_titular, r.foto_titular,
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

// Crear una nueva reserva validando boleta, guardando titular (con manilla/foto) y acompañantes de forma transaccional
const crearReserva = async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { 
            cliente_id, habitacion_id, fecha_entrada, fecha_salida, 
            estado: estadoReq, total: totalReq, boleta: numeroBoleta, 
            vehiculo, placa, observaciones, 
            manilla_titular, tipo_documento_titular, foto_titular,
            huespedes_detalle 
        } = req.body;
        
        const usuario_id = req.usuario.id;

        // 1. Validar que se envíe el número de boleta
        if (!numeroBoleta) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El número de boleta es obligatorio para autorizar el Check-In.' });
        }

        // 2. Verificar que la boleta exista, pertenezca al apartamento y no haya sido usada
        const boletaQuery = await client.query(
            'SELECT * FROM boletas WHERE numero_boleta = $1 AND habitacion_id = $2 FOR UPDATE',
            [numeroBoleta, habitacion_id]
        );

        if (boletaQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El número de boleta ingresado no es válido o no corresponde a este apartamento.' });
        }

        const boleta = boletaQuery.rows[0];
        if (boleta.usada) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Esta boleta ya fue utilizada previamente en otro registro.' });
        }

        // 3. Validar existencia del cliente
        const clienteQuery = await client.query('SELECT * FROM clientes WHERE id = $1', [cliente_id]);
        if (clienteQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El cliente especificado no existe.' });
        }

        // 4. Validar existencia de la habitación
        const habQuery = await client.query('SELECT * FROM habitaciones WHERE id = $1', [habitacion_id]);
        if (habQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'La habitación especificada no existe.' });
        }
        const habitacion = habQuery.rows[0];

        // 5. Validar fechas de estancia
        const start = new Date(fecha_entrada);
        const end = new Date(fecha_salida);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0 || isNaN(diffDays) || start >= end) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de entrada.' });
        }

        // 6. Validar solapamiento de reservas
        const solapamientoQuery = `
            SELECT * FROM reservas 
            WHERE habitacion_id = $1 
              AND estado IN ('pendiente', 'confirmada', 'ocupada')
              AND NOT (fecha_salida <= $2 OR fecha_entrada >= $3);
        `;
        const reservasExistentes = await client.query(solapamientoQuery, [habitacion_id, fecha_entrada, fecha_salida]);

        if (reservasExistentes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'La habitación ya no se encuentra disponible para el rango de fechas seleccionado.'
            });
        }

        // 7. Calcular total y definir estado final
        const precioNoche = parseFloat(habitacion.precio_noche || habitacion.precio || 0);
        const total = totalReq !== undefined && totalReq !== null && totalReq !== '' ? parseFloat(totalReq) : (diffDays * precioNoche);
        const estadoFinal = estadoReq || 'ocupada';

        // 8. Insertar la reserva (incluyendo manilla, tipo de documento y foto del titular)
        const nuevaReserva = await client.query(
            `INSERT INTO reservas (usuario_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, estado, total, boleta, vehiculo, placa, observaciones, manilla_titular, tipo_documento_titular, foto_titular)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [
                usuario_id, cliente_id, habitacion_id, fecha_entrada, fecha_salida, 
                estadoFinal, total, numeroBoleta, vehiculo || 'NO', placa || '', 
                observaciones || '', manilla_titular || '', tipo_documento_titular || 'CC', foto_titular || ''
            ]
        );

        const reservaCreada = nuevaReserva.rows[0];

        // 9. Actualizar el estado de la manilla del titular a 'asignada' si se asignó
        if (manilla_titular) {
            await client.query(
                `UPDATE manillas SET estado = 'asignada' WHERE codigo_manilla = $1`,
                [manilla_titular]
            );
        }

        // 10. Guardar los acompañantes detallados y actualizar estado de sus manillas a 'asignada'
        if (huespedes_detalle && Array.isArray(huespedes_detalle) && huespedes_detalle.length > 0) {
            for (const acomp of huespedes_detalle) {
                await client.query(
                    `INSERT INTO acompanantes (reserva_id, nombres, apellidos, tipo_documento, documento, codigo_manilla, edad, pais, ciudad, foto)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        reservaCreada.id,
                        acomp.nombres || acomp.nombre || '',
                        acomp.apellidos || '',
                        acomp.tipo_documento || 'CC',
                        acomp.documento || '',
                        acomp.manilla || '',
                        acomp.edad || null,
                        acomp.pais || 'COLOMBIA',
                        acomp.ciudad || '',
                        acomp.foto || ''
                    ]
                );

                if (acomp.manilla) {
                    await client.query(
                        `UPDATE manillas SET estado = 'asignada' WHERE codigo_manilla = $1`,
                        [acomp.manilla]
                    );
                }
            }
        }

        // 11. Marcar la boleta como utilizada
        await client.query('UPDATE boletas SET usada = TRUE WHERE id = $1', [boleta.id]);

        // 12. Actualizar el estado de la habitación
        const estadoHabitacion = (estadoFinal === 'ocupada' || estadoFinal === 'confirmada') ? 'Ocupada' : 'Reservado / Por llegar';
        await client.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', [estadoHabitacion, habitacion_id]);

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: '¡Check-In oficial completado con éxito, boleta validada y ocupantes registrados!',
            noches: diffDays,
            reserva: reservaCreada
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear reserva con boleta:', error);
        res.status(500).json({ error: 'Error interno al procesar el Check-In.' });
    } finally {
        client.release();
    }
};

// Actualizar estado de la reserva
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

// Obtener los acompañantes de una reserva específica
const obtenerAcompanantesReserva = async (req, res) => {
    const { reserva_id } = req.params;
    try {
        const query = `SELECT * FROM acompanantes WHERE reserva_id = $1 ORDER BY id ASC`;
        const resultado = await db.query(query, [reserva_id]);
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener acompañantes:', error);
        res.status(500).json({ error: 'Error al obtener los acompañantes de la reserva.' });
    }
};

// Agregar un nuevo acompañante a una reserva existente y marcar manilla como asignada
const agregarAcompananteReserva = async (req, res) => {
    const { reserva_id } = req.params;
    const { nombres, apellidos, tipo_documento, documento, manilla, edad, pais, ciudad, foto } = req.body;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const query = `
            INSERT INTO acompanantes (reserva_id, nombres, apellidos, tipo_documento, documento, codigo_manilla, edad, pais, ciudad, foto)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const values = [
            reserva_id, 
            nombres || '', 
            apellidos || '', 
            tipo_documento || 'CC',
            documento || '', 
            manilla || '', 
            edad || null, 
            pais || 'COLOMBIA', 
            ciudad || '',
            foto || ''
        ];

        const resultado = await client.query(query, values);

        if (manilla) {
            await client.query(
                `UPDATE manillas SET estado = 'asignada' WHERE codigo_manilla = $1`,
                [manilla]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: 'Acompañante agregado y manilla actualizada exitosamente',
            acompanante: resultado.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al agregar acompañante:', error);
        res.status(500).json({ error: 'Error al registrar el acompañante en la base de datos.' });
    } finally {
        client.release();
    }
};

module.exports = {
    obtenerReservas,
    crearReserva,
    actualizarEstadoReserva,
    obtenerAcompanantesReserva,
    agregarAcompananteReserva
};