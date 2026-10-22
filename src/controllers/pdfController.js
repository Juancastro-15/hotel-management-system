const PDFDocument = require('pdfkit');
const db = require('../config/db');

/**
 * Genera un comprobante oficial de estancia en PDF listo para descargar.
 */
const generarComprobantePDF = async (req, res) => {
    const { reserva_id } = req.params;

    try {
        // Consultar la reserva con datos de la habitación y del cliente
        const query = `
            SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado, r.total, r.created_at,
                   h.numero AS habitacion_numero, h.tipo AS habitacion_tipo,
                   c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono
            FROM reservas r
            JOIN habitaciones h ON r.habitacion_id = h.id
            LEFT JOIN clientes c ON r.cliente_id = c.id
            WHERE r.id = $1
        `;
        const resultado = await db.query(query, [reserva_id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada para generar el comprobante.' });
        }

        const reserva = resultado.rows[0];

        // Crear instancia del documento PDF
        const doc = new PDFDocument({ margin: 50 });

        // Configurar encabezados HTTP para la descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Comprobante_Reserva_${reserva.id}.pdf`);

        doc.pipe(res);

        // --- Encabezado ---
        doc.fontSize(20).fillColor('#0062ff').text('TORRE MARINA BAY', { align: 'center' });
        doc.fontSize(10).fillColor('#555555').text('Sistema de Gestión Hotelera - Cartagena, Colombia', { align: 'center' });
        doc.moveDown(1.5);

        // --- Título del documento ---
        doc.fontSize(14).fillColor('#000000').text(`Comprobante de Estancia # ${reserva.id}`, { underline: true });
        doc.moveDown(0.8);

        // --- Detalles de la Reserva ---
        const fEntrada = reserva.fecha_entrada ? new Date(reserva.fecha_entrada).toISOString().split('T')[0] : 'N/A';
        const fSalida = reserva.fecha_salida ? new Date(reserva.fecha_salida).toISOString().split('T')[0] : 'N/A';

        doc.fontSize(11).fillColor('#333333');
        doc.text(`📅 Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')}`);
        doc.text(`👤 Huésped / Cliente: ${reserva.cliente_nombre || 'No asignado'} (Doc: ${reserva.cliente_documento || 'N/A'})`);
        doc.text(`📞 Teléfono Contacto: ${reserva.cliente_telefono || 'N/A'}`);
        doc.text(`🚪 Apartamento / Habitación: #${reserva.habitacion_numero} (${reserva.habitacion_tipo || 'Estándar'})`);
        doc.text(`📥 Fecha de Entrada: ${fEntrada}`);
        doc.text(`📤 Fecha de Salida: ${fSalida}`);
        doc.text(`📊 Estado de Reserva: ${String(reserva.estado).toUpperCase()}`);
        doc.moveDown(1.2);

        // --- Cuadro de Registro de Manillas / Control de Acceso ---
        const yPos = doc.y;
        doc.rect(50, yPos, 500, 45).fillAndStroke('#f8f9fa', '#e0e4eb');
        doc.fillColor('#000000').fontSize(11).text('CONTROL DE ACCESO Y MANILLAS DE SEGURIDAD', 65, yPos + 8);
        doc.fontSize(9).fillColor('#555555').text('🎟️ Manillas entregadas para acceso a zonas comunes, piscina y ascensores.', 65, yPos + 24);
        doc.moveDown(2.5);

        // --- Total ---
        doc.fontSize(14).fillColor('#0062ff').text(`Total Estancia: $${Number(reserva.total || 0).toLocaleString('es-CO')}`, { align: 'right' });
        doc.moveDown(2);

        // --- Pie de página ---
        doc.fontSize(9).fillColor('#888888').text('Gracias por hospedarse en Torre Marina Bay. Conserve este comprobante durante su estancia.', { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ error: 'Error interno al generar el documento PDF.' });
    }
};

module.exports = { generarComprobantePDF };