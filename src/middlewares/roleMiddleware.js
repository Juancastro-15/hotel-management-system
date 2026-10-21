const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    // req.usuario se obtiene previamente desde verificarToken
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: No tienes los permisos suficientes para esta acción.' });
    }
    next();
  };
};

module.exports = verificarRol;