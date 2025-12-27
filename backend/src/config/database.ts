import dotenv from 'dotenv';
import mysql, { Pool } from 'mysql2/promise';
dotenv.config();

let pool: Pool;

export const createPool = () => {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'my_database',
            namedPlaceholders: true,
            supportBigNumbers: true,
            dateStrings: true,
            connectionLimit: 10,
        });
    }
    return pool;
};

export const db = createPool();
