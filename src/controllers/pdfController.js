const PDFDocument = require('pdfkit');
const db = require('../config/db');

/**
 * Genera un comprobante oficial de estancia en PDF con formato detallado (Titular, Acompañantes, Manillas y Boleta).
 */
const generarComprobantePDF = async (req, res) => {
    const { reserva_id } = req.params;

    try {
        // 1. Consultar la reserva con datos de la habitación y del cliente titular
        const queryReserva = `
            SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado, r.total, r.boleta, r.created_at,
                   r.vehiculo, r.placa, r.observaciones,
                   h.numero AS habitacion_numero, h.tipo AS habitacion_tipo,
                   c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono, c.email AS cliente_email
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
            SELECT * FROM acompanantes WHERE reserva_id = $1
        `;
        const resultadoAcompanantes = await db.query(queryAcompanantes, [reserva_id]);
        const acompanantes = resultadoAcompanantes.rows;

        // Crear instancia del documento PDF (Margen de 40pt)
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });

        // Configurar encabezados HTTP para previsualización o descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Comprobante_Reserva_${reserva.id}.pdf`);

        doc.pipe(res);

        const primaryColor = '#1a365d';
        const accentColor = '#2b6cb0';
        const textColor = '#2d3748';
        const grayBg = '#f7fafc';
        const borderColor = '#e2e8f0';

        // --- Encabezado Institucional ---
        doc.fontSize(18).fillColor(primaryColor).font('Helvetica-Bold').text('TORRE MARINA BAY', { align: 'center' });
        doc.fontSize(10).fillColor(accentColor).font('Helvetica').text('Sistema de Gestión Hotelera & Control de Accesos - Bocagrande, Cartagena', { align: 'center' });
        doc.moveDown(0.8);

        // Línea divisoria
        doc.strokeColor(borderColor).lineWidth(1).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown(0.8);

        // --- Título del Documento ---
        doc.fontSize(13).fillColor(primaryColor).font('Helvetica-Bold').text(`COMPROBANTE OFICIAL DE ESTANCIA #${reserva.id}`);
        doc.fontSize(9).fillColor(textColor).font('Helvetica').text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`);
        doc.moveDown(1);

        // --- Cuadro de Datos de Estancia y Titular ---
        const startY = doc.y;
        doc.rect(40, startY, 532, 95).fillAndStroke(grayBg, borderColor);
        
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10).text('DATOS GENERALES Y TITULAR', 50, startY + 8);
        
        doc.fillColor(textColor).font('Helvetica').fontSize(9);
        const fEntrada = reserva.fecha_entrada ? new Date(reserva.fecha_entrada).toISOString().split('T')[0] : 'N/A';
        const fSalida = reserva.fecha_salida ? new Date(reserva.fecha_salida).toISOString().split('T')[0] : 'N/A';

        // Columna Izquierda
        doc.text(`Titular: ${reserva.cliente_nombre || 'No asignado'}`, 50, startY + 25);
        doc.text(`Documento: ${reserva.cliente_documento || 'N/A'}`, 50, startY + 40);
        doc.text(`Teléfono: ${reserva.cliente_telefono || 'N/A'}`, 50, startY + 55);
        doc.text(`Vehículo / Placa: ${reserva.vehiculo === 'SI' ? `SI (${reserva.placa || 'Sin placa'})` : 'NO'}`, 50, startY + 70);

        // Columna Derecha
        doc.text(`Apartamento: Apto #${reserva.habitacion_numero} (${reserva.habitacion_tipo || 'Estándar'})`, 310, startY + 25);
        doc.text(`Boleta de Acceso: #${reserva.boleta || 'N/A'}`, 310, startY + 40);
        doc.text(`Entrada: ${fEntrada}  |  Salida: ${fSalida}`, 310, startY + 55);
        doc.text(`Estado: ${String(reserva.estado || 'Ocupada').toUpperCase()}`, 310, startY + 70);

        doc.y = startY + 110;
        doc.moveDown(0.5);

        // --- Sección de Acompañantes y Manillas ---
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('REGISTRO DE OCUPANTES Y MANILLAS ASIGNADAS');
        doc.moveDown(0.4);

        // Tabla de Acompañantes Header
        const tableTop = doc.y;
        doc.rect(40, tableTop, 532, 20).fill(primaryColor);
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('DOCUMENTO', 45, tableTop + 6, { width: 90 });
        doc.text('MANILLA', 140, tableTop + 6, { width: 60 });
        doc.text('NOMBRES Y APELLIDOS', 205, tableTop + 6, { width: 180 });
        doc.text('EDAD', 390, tableTop + 6, { width: 40 });
        doc.text('PROCEDENCIA', 440, tableTop + 6, { width: 125 });

        let rowTop = tableTop + 20;
        doc.font('Helvetica').fontSize(8).fillColor(textColor);

        if (acompanantes.length === 0) {
            doc.rect(40, rowTop, 532, 20).stroke(borderColor);
            doc.text('No hay acompañantes adicionales registrados en esta estancia.', 48, rowTop + 6);
            rowTop += 20;
        } else {
            acompanantes.forEach((acomp, index) => {
                if (rowTop > 700) {
                    doc.addPage();
                    rowTop = 40;
                }
                const bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                doc.rect(40, rowTop, 532, 20).fillAndStroke(bg, borderColor);

                doc.fillColor(textColor);
                doc.text(acomp.documento || 'N/A', 45, rowTop + 6, { width: 90 });
                doc.fillColor(accentColor).font('Helvetica-Bold');
                doc.text(`#${acomp.codigo_manilla || acomp.manilla || 'N/A'}`, 140, rowTop + 6, { width: 60 });
                doc.font('Helvetica').fillColor(textColor);
                doc.text(`${acomp.nombres || ''} ${acomp.apellidos || ''}`, 205, rowTop + 6, { width: 180 });
                doc.text(String(acomp.edad || '-'), 390, rowTop + 6, { width: 40 });
                doc.text(`${acomp.ciudad || ''}, ${acomp.pais || 'COLOMBIA'}`, 440, rowTop + 6, { width: 125 });

                rowTop += 20;
            });
        }

        doc.y = rowTop + 15;

        // --- Observaciones si existen ---
        if (reserva.observaciones) {
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('OBSERVACIONES / NOVEDADES:');
            doc.fillColor(textColor).font('Helvetica').fontSize(8).text(reserva.observaciones, { width: 532 });
            doc.moveDown(1);
        }

        // --- Bloque de Firmas ---
        if (doc.y > 620) doc.addPage();
        
        const sigY = Math.max(doc.y + 20, 650);
        doc.strokeColor(borderColor).lineWidth(1);
        
        // Línea Firma Titular
        doc.moveTo(60, sigY).lineTo(250, sigY).stroke();
        // Línea Firma Administración
        doc.moveTo(330, sigY).lineTo(520, sigY).stroke();

        doc.fontSize(8).fillColor(textColor).font('Helvetica');
        doc.text('Firma del Titular / Huésped', 60, sigY + 5, { align: 'center', width: 190 });
        doc.text('Administración / Recepción Marina Bay', 330, sigY + 5, { align: 'center', width: 190 });

        // --- Pie de Página ---
        doc.fontSize(8).fillColor('#718096').text(
            'Torre Marina Bay - El ingreso no autorizado de personas sin manilla o boleta está prohibido. Conserve este comprobante.',
            40, 740, { align: 'center', width: 532 }
        );

        doc.end();
    } catch (error) {
        console.error('Error al generar PDF oficial:', error);
        res.status(500).json({ error: 'Error interno al generar el documento PDF oficial.' });
    }
};

module.exports = { generarComprobantePDF };