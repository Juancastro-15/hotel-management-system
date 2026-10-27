const PDFDocument = require('pdfkit');
const db = require('../config/db');

/**
 * Genera un comprobante oficial de estancia en PDF con formato completo y detallado (Titular, Ocupantes, Manillas y Boleta).
 */
const generarComprobantePDF = async (req, res) => {
    const { reserva_id } = req.params;

    try {
        // 1. Consultar la reserva con datos de la habitación y del cliente titular
        const queryReserva = `
            SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado, r.total, r.boleta, r.created_at,
                   r.vehiculo, r.placa, r.observaciones,
                   h.numero AS habitacion_numero, h.tipo AS habitacion_tipo,
                   c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono, c.email AS cliente_email, c.pais AS cliente_pais, c.ciudad AS cliente_ciudad
            FROM reservas r
            JOIN habitaciones h ON r.habitacion_id = h.id
            LEFT JOIN clientes c ON r.cliente_id = c.id
            WHERE r.id = $1
        `;
        const resultadoReserva = await db.query(queryReserva, [reserva_id]);

        if (resultadoReserva.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada para generar el comprobante.' });
        }

        const reserva = resultadoReserva.rows[0];

        // 2. Consultar los acompañantes / manillas asociados a la reserva
        const queryAcompanantes = `
            SELECT * FROM acompanantes WHERE reserva_id = $1 ORDER BY id ASC
        `;
        const resultadoAcompanantes = await db.query(queryAcompanantes, [reserva_id]);
        const acompanantes = resultadoAcompanantes.rows;

        // Crear instancia del documento PDF (Margen de 36pt, tamaño Letter)
        const doc = new PDFDocument({ margin: 36, size: 'LETTER' });

        // Configurar encabezados HTTP para previsualización o descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Comprobante_Reserva_${reserva.id}.pdf`);

        doc.pipe(res);

        const primaryColor = '#1a365d';
        const accentColor = '#2b6cb0';
        const textColor = '#2d3748';
        const grayBg = '#f7fafc';
        const borderColor = '#cbd5e0';

        // --- Encabezado Institucional ---
        doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold').text('TORRE MARINA BAY', { align: 'center' });
        doc.fontSize(9).fillColor(accentColor).font('Helvetica').text('Sistema de Gestión Hotelera & Control de Accesos - Bocagrande, Cartagena', { align: 'center' });
        doc.moveDown(0.6);

        // Línea divisoria
        doc.strokeColor(borderColor).lineWidth(1).moveTo(36, doc.y).lineTo(576, doc.y).stroke();
        doc.moveDown(0.6);

        // --- Título del Documento ---
        doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text(`COMPROBANTE OFICIAL DE ESTANCIA / REGISTRO #${reserva.id}`);
        doc.fontSize(8).fillColor(textColor).font('Helvetica').text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`);
        doc.moveDown(0.8);

        // --- Cuadro de Datos de Estancia y Titular ---
        const startY = doc.y;
        doc.rect(36, startY, 540, 85).fillAndStroke(grayBg, borderColor);
        
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('DATOS GENERALES DEL TITULAR Y ESTANCIA', 46, startY + 6);
        
        doc.fillColor(textColor).font('Helvetica').fontSize(8.5);
        const fEntrada = reserva.fecha_entrada ? new Date(reserva.fecha_entrada).toISOString().split('T')[0] : 'N/A';
        const fSalida = reserva.fecha_salida ? new Date(reserva.fecha_salida).toISOString().split('T')[0] : 'N/A';

        // Columna Izquierda
        doc.text(`Titular: ${reserva.cliente_nombre || 'No asignado'}`, 46, startY + 20);
        doc.text(`Documento: ${reserva.cliente_documento || 'N/A'}`, 46, startY + 34);
        doc.text(`Teléfono: ${reserva.cliente_telefono || 'N/A'}`, 46, startY + 48);
        doc.text(`Vehículo / Placa: ${reserva.vehiculo === 'SI' ? `SI (${reserva.placa || 'Sin placa'})` : 'NO'}`, 46, startY + 62);

        // Columna Derecha
        doc.text(`Apartamento: Apto #${reserva.habitacion_numero} (${reserva.habitacion_tipo || 'Estándar'})`, 310, startY + 20);
        doc.text(`Boleta de Acceso: #${reserva.boleta || 'N/A'}`, 310, startY + 34);
        doc.text(`Estancia: ${fEntrada} al ${fSalida}`, 310, startY + 48);
        doc.text(`Estado / Total: ${String(reserva.estado || 'Ocupada').toUpperCase()} - $${Number(reserva.total || 0).toLocaleString('es-CO')}`, 310, startY + 62);

        doc.y = startY + 95;
        doc.moveDown(0.4);

        // --- Sección de Ocupantes y Manillas ---
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10).text('LISTADO DE OCUPANTES Y MANILLAS ASIGNADAS');
        doc.moveDown(0.3);

        // Tabla de Ocupantes Header
        const tableTop = doc.y;
        doc.rect(36, tableTop, 540, 18).fill(primaryColor);
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('DOCUMENTO', 42, tableTop + 5, { width: 85 });
        doc.text('MANILLA', 132, tableTop + 5, { width: 50 });
        doc.text('NOMBRES Y APELLIDOS', 188, tableTop + 5, { width: 170 });
        doc.text('EDAD', 365, tableTop + 5, { width: 35 });
        doc.text('PROCEDENCIA (CIUDAD / PAÍS)', 405, tableTop + 5, { width: 165 });

        let rowTop = tableTop + 18;
        doc.font('Helvetica').fontSize(8).fillColor(textColor);

        // Incluimos al titular como primer ocupante y luego los acompañantes
        const listaOcupantes = [
            {
                documento: reserva.cliente_documento || 'N/A',
                manilla: 'Titular',
                nombres: reserva.cliente_nombre || 'Titular',
                apellidos: '',
                edad: '-',
                pais: reserva.cliente_pais || 'COLOMBIA',
                ciudad: reserva.cliente_ciudad || ''
            },
            ...acompanantes
        ];

        listaOcupantes.forEach((item, index) => {
            if (rowTop > 680) {
                doc.addPage();
                rowTop = 40;
            }
            const bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            doc.rect(36, rowTop, 540, 18).fillAndStroke(bg, borderColor);

            doc.fillColor(textColor);
            doc.text(item.documento || 'N/A', 42, rowTop + 5, { width: 85 });
            doc.fillColor(accentColor).font('Helvetica-Bold');
            doc.text(item.manilla && item.manilla !== 'Titular' ? `#${item.manilla}` : (item.manilla || '-'), 132, rowTop + 5, { width: 50 });
            doc.font('Helvetica').fillColor(textColor);
            doc.text(`${item.nombres || ''} ${item.apellidos || ''}`, 188, rowTop + 5, { width: 170 });
            doc.text(String(item.edad || '-'), 365, rowTop + 5, { width: 35 });
            doc.text(`${item.ciudad ? item.ciudad + ', ' : ''}${item.pais || 'COLOMBIA'}`, 405, rowTop + 5, { width: 165 });

            rowTop += 18;
        });

        doc.y = rowTop + 12;

        // --- Observaciones si existen ---
        if (reserva.observaciones) {
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('OBSERVACIONES / NOVEDADES:');
            doc.fillColor(textColor).font('Helvetica').fontSize(8).text(reserva.observaciones, { width: 540 });
            doc.moveDown(0.8);
        }

        // --- Bloque de Firmas ---
        if (doc.y > 620) doc.addPage();
        
        const sigY = Math.max(doc.y + 15, 640);
        doc.strokeColor(borderColor).lineWidth(1);
        
        // Línea Firma Titular
        doc.moveTo(60, sigY).lineTo(250, sigY).stroke();
        // Línea Firma Administración
        doc.moveTo(330, sigY).lineTo(520, sigY).stroke();

        doc.fontSize(8).fillColor(textColor).font('Helvetica');
        doc.text('Firma del Titular / Huésped', 60, sigY + 4, { align: 'center', width: 190 });
        doc.text('Administración / Recepción Marina Bay', 330, sigY + 4, { align: 'center', width: 190 });

        // --- Pie de Página ---
        doc.fontSize(7.5).fillColor('#718096').text(
            'Torre Marina Bay - El ingreso no autorizado de personas sin manilla o boleta está prohibido. Conserve este comprobante.',
            36, 735, { align: 'center', width: 540 }
        );

        doc.end();
    } catch (error) {
        console.error('Error al generar PDF oficial:', error);
        res.status(500).json({ error: 'Error interno al generar el documento PDF oficial.' });
    }
};

module.exports = { generarComprobantePDF };