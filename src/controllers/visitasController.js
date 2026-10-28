const db = require('../config/db');

// GET /api/visitas - Obtener todos los registros
const obtenerVisitas = async (req, res) => {
    try {
        const resultado = await db.query('SELECT * FROM visitas_personal ORDER BY id DESC');
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener visitas:', error);
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
};

// POST /api/visitas - Registrar un nuevo ingreso
const registrarVisita = async (req, res) => {
    const { tipo, apartamento, documento, nombre, detalles, rol, autorizacion } = req.body;

    if (!tipo || !apartamento || !documento || !nombre) {
        return res.status(400).json({ error: 'Campos requeridos faltantes (tipo, apartamento, documento, nombre)' });
    }

    try {
        const query = `
            INSERT INTO visitas_personal (
                tipo, apartamento, documento, nombre, detalles, rol, autorizacion, estado, hora_entrada, registrado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'En Torre', NOW(), $8)
            RETURNING *;
        `;
        
        const values = [
            tipo,
            apartamento,
            documento,
            nombre,
            detalles || null,
            tipo === 'empleado' ? (rol || null) : null,
            tipo === 'visitante' ? (autorizacion || 'Autorizado') : null,
            req.user ? req.user.email : 'Sistema' // Asumiendo que guardas el usuario logueado en el token
        ];

        const resultado = await db.query(query, values);
        res.status(201).json({ mensaje: 'Registro exitoso', registro: resultado.rows[0] });
    } catch (error) {
        console.error('Error al registrar visita:', error);
        res.status(500).json({ error: 'Error interno al guardar en la base de datos' });
    }
};

// PATCH /api/visitas/:id/salida - Registrar hora de salida
const marcarSalida = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE visitas_personal 
            SET estado = 'Retirado', hora_salida = NOW()
            WHERE id = $1 
            RETURNING *;
        `;
        const resultado = await db.query(query, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        res.json({ mensaje: 'Salida registrada correctamente', registro: resultado.rows[0] });
    } catch (error) {
        console.error('Error al registrar salida:', error);
        res.status(500).json({ error: 'Error al actualizar la salida' });
    }
};

// PATCH /api/visitas/:id/autorizacion - Cambiar estado de autorización (Visitantes)
const actualizarAutorizacion = async (req, res) => {
    const { id } = req.params;
    const { autorizacion } = req.body;

    if (!['Autorizado', 'Pendiente', 'Rechazado'].includes(autorizacion)) {
        return res.status(400).json({ error: 'Estado de autorización no válido' });
    }

    try {
        const query = `
            UPDATE visitas_personal 
            SET autorizacion = $1
            WHERE id = $2 
            RETURNING *;
        `;
        const resultado = await db.query(query, [autorizacion, id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        res.json({ mensaje: 'Estado de autorización actualizado', registro: resultado.rows[0] });
    } catch (error) {
        console.error('Error al actualizar autorización:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = {
    obtenerVisitas,
    registrarVisita,
    marcarSalida,
    actualizarAutorizacion
};