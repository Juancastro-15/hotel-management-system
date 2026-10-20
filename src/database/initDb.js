const db = require('../config/db');

const resetAndCreateTables = async () => {
    try {
        console.log('⏳ Eliminando tablas antiguas y recreando base de datos en Neon...');

        // 1. Eliminar tablas si existen (en orden de dependencias de llaves foráneas)
        await db.query(`
            DROP TABLE IF EXISTS reservas CASCADE;
            DROP TABLE IF EXISTS clientes CASCADE;
            DROP TABLE IF EXISTS habitaciones CASCADE;
            DROP TABLE IF EXISTS usuarios CASCADE;
        `);
        console.log('🗑️ Tablas antiguas eliminadas.');

        // 2. Tabla de Usuarios
        await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'recepcionista',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✔ Tabla "usuarios" creada.');

        // 3. Tabla de Habitaciones
        await db.query(`
            CREATE TABLE IF NOT EXISTS habitaciones (
                id SERIAL PRIMARY KEY,
                numero VARCHAR(20) UNIQUE NOT NULL,
                tipo VARCHAR(50) NOT NULL,
                precio_noche DECIMAL(10, 2) NOT NULL,
                estado VARCHAR(30) DEFAULT 'disponible',
                descripcion TEXT
            );
        `);
        console.log('✔ Tabla "habitaciones" creada.');

        // 4. Tabla de Reservas
        await db.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id SERIAL PRIMARY KEY,
                usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
                habitacion_id INT REFERENCES habitaciones(id) ON DELETE CASCADE,
                fecha_entrada DATE NOT NULL,
                fecha_salida DATE NOT NULL,
                estado VARCHAR(30) DEFAULT 'pendiente',
                total DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✔ Tabla "reservas" creada.');

        // 5. Tabla de Clientes
        await db.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                telefono VARCHAR(30),
                documento VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✔ Tabla "clientes" creada.');

        console.log('🚀 ¡Base de datos reiniciada e inicializada con éxito!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al reiniciar las tablas:', error);
        process.exit(1);
    }
};

resetAndCreateTables();