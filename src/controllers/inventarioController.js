const db = require('../config/db');

// Registrar una boleta individual
const crearBoleta = async (req, res) => {
  const { numero_boleta, habitacion_id } = req.body;
  try {
    const resultado = await db.query(
      'INSERT INTO boletas (numero_boleta, habitacion_id, usada) VALUES ($1, $2, false) RETURNING *',
      [numero_boleta, habitacion_id]
    );
    res.status(201).json({ mensaje: 'Boleta registrada con éxito', boleta: resultado.rows[0] });
  } catch (err) {
    console.error('Error al crear boleta:', err);
    res.status(500).json({ error: 'Error al registrar la boleta' });
  }
};

// Registro masivo de boletas por rango (Ej. 10001 a 10010)
const registrarBoletasMasivas = async (req, res) => {
  const { habitacion_id, inicio, fin } = req.body;
  try {
    const inicioNum = parseInt(inicio);
    const finNum = parseInt(fin);

    if (isNaN(inicioNum) || isNaN(finNum) || finNum < inicioNum) {
      return res.status(400).json({ error: 'Rango de boletas inválido' });
    }

    for (let i = inicioNum; i <= finNum; i++) {
      const numero_boleta = String(i);
      await db.query(
        `INSERT INTO boletas (numero_boleta, habitacion_id, usada) 
         VALUES ($1, $2, false) 
         ON CONFLICT (numero_boleta) DO NOTHING`,
        [numero_boleta, habitacion_id]
      );
    }

    res.json({ mensaje: `Boletas desde ${inicio} hasta ${fin} creadas con éxito.` });
  } catch (err) {
    console.error('Error al registrar boletas masivas:', err);
    res.status(500).json({ error: 'Error interno del servidor al crear boletas' });
  }
};

// Consultar todas las boletas
const obtenerBoletas = async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT b.*, h.numero as numero_habitacion 
      FROM boletas b 
      LEFT JOIN habitaciones h ON b.habitacion_id = h.id
      ORDER BY b.id DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al obtener boletas:', err);
    res.status(500).json({ error: 'Error al obtener las boletas' });
  }
};

// Registrar una manilla individual
const crearManilla = async (req, res) => {
  const { codigo_manilla } = req.body;
  try {
    const resultado = await db.query(
      'INSERT INTO manillas (codigo_manilla, estado) VALUES ($1, \'libre\') RETURNING *',
      [codigo_manilla]
    );
    res.status(201).json({ mensaje: 'Manilla registrada con éxito', manilla: resultado.rows[0] });
  } catch (err) {
    console.error('Error al crear manilla:', err);
    res.status(500).json({ error: 'Error al registrar la manilla' });
  }
};

// Registro masivo de manillas por rango (Ej. 5001 a 5020)
const registrarManillasMasivas = async (req, res) => {
  const { inicio, fin } = req.body;
  try {
    const inicioNum = parseInt(inicio);
    const finNum = parseInt(fin);

    if (isNaN(inicioNum) || isNaN(finNum) || finNum < inicioNum) {
      return res.status(400).json({ error: 'Rango de manillas inválido' });
    }

    for (let i = inicioNum; i <= finNum; i++) {
      const codigo_manilla = String(i);
      await db.query(
        `INSERT INTO manillas (codigo_manilla, estado) 
         VALUES ($1, 'libre') 
         ON CONFLICT (codigo_manilla) DO NOTHING`,
        [codigo_manilla]
      );
    }

    res.json({ mensaje: `Manillas desde ${inicio} hasta ${fin} creadas con éxito.` });
  } catch (err) {
    console.error('Error al registrar manillas masivas:', err);
    res.status(500).json({ error: 'Error interno del servidor al crear manillas' });
  }
};

// Consultar todas las manillas
const obtenerManillas = async (req, res) => {
  try {
    const resultado = await db.query('SELECT * FROM manillas ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al obtener manillas:', err);
    res.status(500).json({ error: 'Error al obtener las manillas' });
  }
};

module.exports = {
  crearBoleta,
  registrarBoletasMasivas,
  obtenerBoletas,
  crearManilla,
  registrarManillasMasivas,
  obtenerManillas
};