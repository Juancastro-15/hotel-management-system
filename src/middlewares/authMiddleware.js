const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // El formato del header suele ser "Bearer [token]"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token de autenticación.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload; // Guardamos los datos del usuario decodificados en la petición
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = verificarToken;