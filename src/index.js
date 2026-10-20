const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const reservationRoutes = require('./routes/reservationRoutes'); // <-- Importar rutas de reservas
const clientRoutes = require('./routes/clientRoutes'); // <-- Importar

const app = express();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/habitaciones', roomRoutes);
app.use('/api/reservas', reservationRoutes); // <-- Registrar endpoint de reservas
app.use('/api/clientes', clientRoutes); // <-- Registrar endpoint

// Ruta de prueba inicial
app.get('/', (req, res) => {
    res.json({ mensaje: '¡API del Sistema Hotelero funcionando al 100% con Neon!' });
});

// Ruta de prueba para verificar la conexión a PostgreSQL
app.get('/test-db', async (req, res) => {
    try {
        const resultado = await db.query('SELECT NOW()');
        res.json({
            exito: true,
            mensaje: '¡Conexión exitosa a PostgreSQL en la nube!',
            horario_servidor_db: resultado.rows[0].now
        });
    } catch (error) {
        console.error('Error al conectar a la BD:', error);
        res.status(500).json({
            exito: false,
            error: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});