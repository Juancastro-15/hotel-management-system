const db = require('../config/db');

// ... (mantén tus funciones anteriores: crearBoleta, crearManilla, obtenerBoletas, obtenerManillas) ...

// Registro masivo de boletas por rango
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
      // Inserta y evita duplicados si ya existe el número de boleta
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

// Registro masivo de manillas por rango
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

module.exports = {
  // ... exporta también tus funciones anteriores ...
  registrarBoletasMasivas,
  registrarManillasMasivas
};