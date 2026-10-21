const pool = require('../config/db');
const bcrypt = require('bcrypt');

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

// Restablecer contraseña de un usuario
const restablecerPassword = async (req, res) => {
  const { id } = req.params;
  const { nuevoPassword } = req.body;

  try {
    if (!nuevoPassword || nuevoPassword.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Encriptar la nueva contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevoPassword, salt);

    const resultado = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING id, email',
      [hashedPassword, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: '¡Contraseña restablecida con éxito!' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  restablecerPassword
};