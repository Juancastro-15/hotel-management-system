const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para conexiones seguras a PostgreSQL en la nube
    }
});

pool.on('connect', () => {
    console.log('Base de datos PostgreSQL en la nube conectada con éxito.');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(), // <--- Agregado para solucionar el error de las transacciones
    pool
};