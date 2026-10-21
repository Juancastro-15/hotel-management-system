const pool = require('../config/db');

// Obtener todos los usuarios (Solo Admin)
const obtenerUsuarios = async (req, res) => {
  try {
    const resultado = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ mensaje: 'Error al consultar la base de datos' });
  }
};

// Actualizar usuario / rol (Solo Admin)
const actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol } = req.body;

  try {
    const resultado = await pool.query(
      'UPDATE usuarios SET nombre = $1, email = $2, rol = $3 WHERE id = $4 RETURNING id, nombre, email, rol',
      [nombre, email, rol, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario actualizado con éxito', usuario: resultado.rows[0] });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Eliminar usuario (Solo Admin)
const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el usuario' });
  }
};

module.exports = {
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario
};