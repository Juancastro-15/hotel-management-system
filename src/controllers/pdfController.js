const PDFDocument = require('pdfkit');
const db = require('../config/db');

/**
 * Genera un comprobante oficial de estancia en PDF con formato horizontal y tabla completa de ocupantes.
 */
const generarComprobantePDF = async (req, res) => {
    const { reserva_id } = req.params;

    try {
        // 1. Consultar la reserva con datos de la habitación y del cliente titular
        const queryReserva = `
            SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado, r.total, r.boleta, r.created_at,
                   r.vehiculo, r.placa, r.observaciones,
                   h.numero AS apto_numero, h.tipo AS habitacion_tipo,
                   c.nombre AS titular_nombre, c.documento AS titular_doc, c.telefono AS titular_tel, 
                   c.email AS titular_email, c.pais AS titular_pais, c.ciudad AS titular_ciudad
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

        // Función auxiliar robusta y segura para formatear fechas
        const formatFecha = (fecha) => {
            if (!fecha) return 'N/A';
            if (typeof fecha === 'string') return fecha.split('T')[0];
            if (fecha instanceof Date) return fecha.toISOString().split('T')[0];
            try {
                return new Date(fecha).toISOString().split('T')[0];
            } catch (e) {
                return String(fecha);
            }
        };

        const fEntrada = formatFecha(reserva.fecha_entrada);
        const fSalida = formatFecha(reserva.fecha_salida);

        // Crear instancia del documento PDF en modo apaisado (landscape)
        const doc = new PDFDocument({ margin: 30, size: 'LETTER', layout: 'landscape' });

        // Configurar encabezados HTTP para previsualización o descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Comprobante_Reserva_${reserva.id}.pdf`);

        doc.pipe(res);

        const primaryColor = '#1a365d';
        const accentColor = '#2b6cb0';
        const textColor = '#2d3748';
        const borderColor = '#cbd5e0';

        // --- Encabezado Institucional ---
        doc.fontSize(15).fillColor(primaryColor).font('Helvetica-Bold').text('TORRE MARINA BAY / PALMETTO BEACH', 30, 25);
        doc.fontSize(9).fillColor(accentColor).font('Helvetica').text('Bocagrande, Cartagena - Control de Accesos y Estancias', 30, 42);

        doc.fontSize(10).fillColor('#000').font('Helvetica-Bold')
           .text(`REGISTRO N° : ${reserva.id}`, 620, 25, { align: 'right' })
           .font('Helvetica').fontSize(9)
           .text(`Emisión: ${new Date().toLocaleDateString('es-CO')}`, 620, 40, { align: 'right' });

        doc.moveDown(1);
        doc.fontSize(9).font('Helvetica-Bold').text(`Huésped Titular: `, 30, 60, { continued: true })
           .font('Helvetica').text(`${reserva.titular_nombre || 'No asignado'}   |   Doc: ${reserva.titular_doc || 'N/A'}   |   Tel: ${reserva.titular_tel || 'N/A'}`);
        
        doc.moveDown(0.8);

        // --- Banda Resumen ---
        doc.rect(30, doc.y, 732, 20).fill('#e9ecef');
        doc.fillColor('#000').fontSize(9).font('Helvetica-Bold')
           .text(`APARTAMENTO : #${reserva.apto_numero || 'N/A'}`, 40, doc.y - 14)
           .text(`BOLETA #: ${reserva.boleta || 'N/A'}`, 260, doc.y - 14)
           .text(`ENTRADA: ${fEntrada}`, 420, doc.y - 14)
           .text(`SALIDA: ${fSalida}`, 580, doc.y - 14);

        doc.moveDown(1.5);

        // --- Tabla de Ocupantes (Titular + Acompañantes) ---
        const tableTop = doc.y;
        doc.rect(30, tableTop, 732, 20).fill('#00a884');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
           .text('DOCUMENTO', 35, tableTop + 6, { width: 90 })
           .text('# MANILLA', 130, tableTop + 6, { width: 70 })
           .text('EDAD', 210, tableTop + 6, { width: 40 })
           .text('PROCEDENCIA', 260, tableTop + 6, { width: 120 })
           .text('NOMBRES Y APELLIDOS', 390, tableTop + 6, { width: 220 })
           .text('ESTADO / ROL', 620, tableTop + 6, { width: 130 });

        let rowTop = tableTop + 20;
        doc.font('Helvetica').fontSize(8).fillColor(textColor);

        const listaOcupantes = [
            {
                documento: reserva.titular_doc || 'N/A',
                codigo_manilla: 'Titular',
                edad: '-',
                procedencia: `${reserva.titular_ciudad ? reserva.titular_ciudad + ', ' : ''}${reserva.titular_pais || 'COLOMBIA'}`,
                nombre_completo: reserva.titular_nombre || 'Titular',
                rol: 'Huésped Titular'
            },
            ...acompanantes.map(a => ({
                documento: a.documento || 'N/A',
                codigo_manilla: a.codigo_manilla || a.manilla || 'N/A',
                edad: a.edad || '-',
                procedencia: `${a.ciudad ? a.ciudad + ', ' : ''}${a.pais || 'COLOMBIA'}`,
                nombre_completo: `${a.nombres || ''} ${a.apellidos || ''}`.trim(),
                rol: 'Acompañante'
            }))
        ];

        listaOcupantes.forEach((item, index) => {
            if (rowTop > 480) {
                doc.addPage();
                rowTop = 40;
            }
            const bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            doc.rect(30, rowTop, 732, 20).fillAndStroke(bg, borderColor);

            doc.fillColor(textColor);
            doc.text(item.documento, 35, rowTop + 6, { width: 90 });
            doc.fillColor(accentColor).font('Helvetica-Bold');
            doc.text(item.codigo_manilla === 'Titular' ? 'TITULAR' : `#${item.codigo_manilla}`, 130, rowTop + 6, { width: 70 });
            doc.font('Helvetica').fillColor(textColor);
            doc.text(String(item.edad), 210, rowTop + 6, { width: 40 });
            doc.text(item.procedencia, 260, rowTop + 6, { width: 120 });
            doc.text(item.nombre_completo, 390, rowTop + 6, { width: 220 });
            doc.text(item.rol, 620, rowTop + 6, { width: 130 });

            rowTop += 20;
        });

        doc.y = rowTop + 15;

        // --- Observaciones / Vehículo ---
        if (reserva.vehiculo === 'SI' || reserva.observaciones) {
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('INFORMACIÓN ADICIONAL Y NOVEDADES:');
            doc.fontSize(8).font('Helvetica').fillColor(textColor);
            if (reserva.vehiculo === 'SI') {
                doc.text(`Vehículo registrado: SÍ (Placa: ${reserva.placa || 'Sin placa especificada'})`);
            }
            if (reserva.observaciones) {
                doc.text(`Observaciones: ${reserva.observaciones}`);
            }
            doc.moveDown(1);
        }

        // --- Bloque de Firmas ---
        if (doc.y > 450) doc.addPage();
        
        const sigY = Math.max(doc.y + 20, 470);
        doc.strokeColor(borderColor).lineWidth(1);
        
        doc.moveTo(60, sigY).lineTo(260, sigY).stroke();
        doc.moveTo(310, sigY).lineTo(510, sigY).stroke();
        doc.moveTo(560, sigY).lineTo(720, sigY).stroke();

        doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold');
        doc.text('Firma del Titular / Huésped', 60, sigY + 5, { align: 'center', width: 200 });
        doc.text('Recepción / Marina Bay', 310, sigY + 5, { align: 'center', width: 200 });
        doc.text('Seguridad / Portería', 560, sigY + 5, { align: 'center', width: 160 });

        // --- Pie de Página ---
        doc.fontSize(7.5).fillColor('#718096').text(
            'Torre Marina Bay - El ingreso no autorizado de personas sin manilla o boleta está prohibido. Conserve este comprobante.',
            30, 545, { align: 'center', width: 732 }
        );

        doc.end();
    } catch (error) {
        console.error('Error al generar PDF oficial:', error);
        res.status(500).json({ error: 'Error interno al generar el documento PDF oficial.' });
    }
};

module.exports = { generarComprobantePDF };