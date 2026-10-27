const PDFDocument = require('pdfkit');
const db = require('../config/db');

/**
 * Genera un comprobante oficial de estancia en PDF con formato horizontal y tabla organizada sin solapamientos.
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

        // Función segura para formatear fechas
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

        // Crear instancia del documento PDF en modo apaisado (landscape) tamaño Letter (~792 x 612 pt)
        const doc = new PDFDocument({ margin: 30, size: 'LETTER', layout: 'landscape' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Comprobante_Reserva_${reserva.id}.pdf`);

        doc.pipe(res);

        const primaryColor = '#1a365d';
        const accentColor = '#2b6cb0';
        const textColor = '#2d3748';
        const borderColor = '#cbd5e0';

        // --- ENCABEZADO INSTITUCIONAL ---
        doc.fontSize(14).fillColor(primaryColor).font('Helvetica-Bold').text('TORRE MARINA BAY / PALMETTO BEACH', 30, 25);
        doc.fontSize(8.5).fillColor(accentColor).font('Helvetica').text('Bocagrande, Cartagena - Control de Accesos y Estancias', 30, 42);

        // Datos de la derecha en el encabezado
        doc.fontSize(9).fillColor('#000').font('Helvetica-Bold')
           .text(`REGISTRO N° : ${reserva.id}`, 550, 25, { width: 212, align: 'right' })
           .font('Helvetica').fontSize(8.5)
           .text(`Emisión: ${new Date().toLocaleDateString('es-CO')}`, 550, 38, { width: 212, align: 'right' });

        // Línea divisoria superior
        doc.strokeColor(borderColor).lineWidth(1).moveTo(30, 58).lineTo(762, 58).stroke();

        // --- DATOS DEL TITULAR ---
        doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold').text('DATOS DEL HUÉSPED TITULAR:', 30, 68);
        doc.fontSize(9).fillColor(textColor).font('Helvetica')
           .text(`Nombre: ${reserva.titular_nombre || 'No asignado'}   |   Doc: ${reserva.titular_doc || 'N/A'}   |   Tel: ${reserva.titular_tel || 'N/A'}`, 30, 81);

        // --- BANDA RESUMEN DE ESTANCIA ---
        const bandY = 100;
        doc.rect(30, bandY, 732, 22).fill('#e9ecef');
        doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold')
           .text(`APARTAMENTO: #${reserva.apto_numero || 'N/A'}`, 40, bandY + 7)
           .text(`BOLETA #: ${reserva.boleta || 'N/A'}`, 240, bandY + 7)
           .text(`ENTRADA: ${fEntrada}`, 420, bandY + 7)
           .text(`SALIDA: ${fSalida}`, 590, bandY + 7);

        // --- TABLA DE OCUPANTES ---
        const tableTop = bandY + 32;
        doc.rect(30, tableTop, 732, 20).fill('#00a884');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
           .text('DOCUMENTO', 35, tableTop + 6, { width: 90 })
           .text('MANILLA', 130, tableTop + 6, { width: 70 })
           .text('EDAD', 210, tableTop + 6, { width: 40 })
           .text('PROCEDENCIA', 260, tableTop + 6, { width: 120 })
           .text('NOMBRES Y APELLIDOS', 390, tableTop + 6, { width: 220 })
           .text('ESTADO / ROL', 620, tableTop + 6, { width: 130 });

        let rowTop = tableTop + 20;
        doc.font('Helvetica').fontSize(8).fillColor(textColor);

        const listaOcupantes = [
            {
                documento: reserva.titular_doc || 'N/A',
                codigo_manilla: 'TITULAR',
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
            if (rowTop > 430) {
                doc.addPage();
                rowTop = 40;
            }
            const bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            doc.rect(30, rowTop, 732, 20).fillAndStroke(bg, borderColor);

            doc.fillColor(textColor);
            doc.text(item.documento, 35, rowTop + 6, { width: 90 });
            doc.fillColor(accentColor).font('Helvetica-Bold');
            doc.text(item.codigo_manilla === 'TITULAR' ? 'TITULAR' : `#${item.codigo_manilla}`, 130, rowTop + 6, { width: 70 });
            doc.font('Helvetica').fillColor(textColor);
            doc.text(String(item.edad), 210, rowTop + 6, { width: 40 });
            doc.text(item.procedencia, 260, rowTop + 6, { width: 120 });
            doc.text(item.nombre_completo, 390, rowTop + 6, { width: 220 });
            doc.text(item.rol, 620, rowTop + 6, { width: 130 });

            rowTop += 20;
        });

        // --- INFORMACIÓN ADICIONAL / OBSERVACIONES ---
        let currentY = rowTop + 15;
        if (reserva.vehiculo === 'SI' || reserva.observaciones) {
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('INFORMACIÓN ADICIONAL:', 30, currentY);
            currentY += 12;
            doc.fontSize(8).font('Helvetica').fillColor(textColor);
            if (reserva.vehiculo === 'SI') {
                doc.text(`Vehículo registrado: SÍ (Placa: ${reserva.placa || 'Sin placa especificada'})`, 30, currentY);
                currentY += 12;
            }
            if (reserva.observaciones) {
                doc.text(`Observaciones: ${reserva.observaciones}`, 30, currentY);
                currentY += 12;
            }
        }

        // --- BLOQUE DE FIRMAS (Posicionado de forma fija y segura al pie) ---
        const sigY = Math.max(currentY + 20, 480);
        
        doc.strokeColor(borderColor).lineWidth(1);
        doc.moveTo(60, sigY).lineTo(260, sigY).stroke();
        doc.moveTo(310, sigY).lineTo(510, sigY).stroke();
        doc.moveTo(560, sigY).lineTo(720, sigY).stroke();

        doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold');
        doc.text('Firma del Titular / Huésped', 60, sigY + 5, { align: 'center', width: 200 });
        doc.text('Recepción / Marina Bay', 310, sigY + 5, { align: 'center', width: 200 });
        doc.text('Seguridad / Portería', 560, sigY + 5, { align: 'center', width: 160 });

        // --- PIE DE PÁGINA ---
        doc.fontSize(7.5).fillColor('#718096').text(
            'Torre Marina Bay - El ingreso no autorizado de personas sin manilla o boleta está prohibido. Conserve este comprobante.',
            30, 555, { align: 'center', width: 732 }
        );

        doc.end();
    } catch (error) {
        console.error('Error al generar PDF oficial:', error);
        res.status(500).json({ error: 'Error interno al generar el documento PDF oficial.' });
    }
};

module.exports = { generarComprobantePDF };