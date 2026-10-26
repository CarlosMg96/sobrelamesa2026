import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mysql, { Connection } from 'mysql2/promise';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface ExecutedMigration {
    id: number;
    name: string;
    batch: number;
    executed_at: string;
}

async function getConnection(): Promise<Connection> {
    const isDockerHost = process.env.DB_HOST === 'mysql';
    const port = isDockerHost ? 3306 : (Number(process.env.DB_PORT) || 3306);

    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: port,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sobrelamesa',
        multipleStatements: true,
    });
}

async function ensureMigrationsTable(conn: Connection): Promise<void> {
    const sql = `
        CREATE TABLE IF NOT EXISTS _migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            batch INT NOT NULL DEFAULT 1,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await conn.query(sql);
}

async function getExecutedMigrations(conn: Connection): Promise<ExecutedMigration[]> {
    const [rows] = await conn.query('SELECT id, name, batch, executed_at FROM _migrations ORDER BY id ASC');
    return (rows as ExecutedMigration[]) || [];
}

function getMigrationFiles(): string[] {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js'))
        .sort();
}

async function runPendingMigrations(): Promise<void> {
    console.log('=========================================');
    console.log('       Sistema de Migraciones SLM        ');
    console.log('=========================================\n');

    const conn = await getConnection();

    try {
        await ensureMigrationsTable(conn);
        const executed = await getExecutedMigrations(conn);
        const executedNames = new Set(executed.map((m) => m.name));
        const allFiles = getMigrationFiles();

        const pendingFiles = allFiles.filter((file) => !executedNames.has(file));

        if (pendingFiles.length === 0) {
            console.log('✨ La base de datos ya está al día. No hay migraciones pendientes.\n');
            return;
        }

        const currentBatch = (executed.reduce((max, m) => Math.max(max, m.batch || 1), 0)) + 1;
        console.log(`Se encontraron ${pendingFiles.length} migración(es) pendiente(s) (Lote #${currentBatch}):\n`);

        for (const file of pendingFiles) {
            const filePath = path.join(MIGRATIONS_DIR, file);
            console.log(`▶ Ejecutando: ${file}...`);

            if (file.endsWith('.sql')) {
                const sqlContent = fs.readFileSync(filePath, 'utf-8');
                if (sqlContent.trim().length > 0) {
                    await conn.query(sqlContent);
                }
            } else if (file.endsWith('.ts') || file.endsWith('.js')) {
                const migrationModule = await import(filePath);
                if (typeof migrationModule.up === 'function') {
                    await migrationModule.up(conn);
                } else {
                    throw new Error(`El archivo ${file} no exporta una función 'up'`);
                }
            }

            await conn.query(
                'INSERT INTO _migrations (name, batch) VALUES (?, ?)',
                [file, currentBatch]
            );

            console.log(`  ✓ Aplicada con éxito\n`);
        }

        console.log(`🎉 Se aplicaron satisfactoriamente ${pendingFiles.length} migración(es).\n`);
    } catch (error) {
        console.error('\n❌ Error ejecutando migraciones:', error);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

async function showStatus(): Promise<void> {
    console.log('=========================================');
    console.log('       Estado de las Migraciones         ');
    console.log('=========================================\n');

    const conn = await getConnection();

    try {
        await ensureMigrationsTable(conn);
        const executed = await getExecutedMigrations(conn);
        const executedMap = new Map(executed.map((m) => [m.name, m]));
        const allFiles = getMigrationFiles();

        if (allFiles.length === 0) {
            console.log('No se encontraron archivos de migración en:', MIGRATIONS_DIR);
            return;
        }

        console.log('| Estado    | Lote | Archivo                                | Fecha de Ejecución     |');
        console.log('|-----------|------|----------------------------------------|------------------------|');

        for (const file of allFiles) {
            const exec = executedMap.get(file);
            const status = exec ? '✓ Aplicada' : '⏳ Pendiente';
            const batchStr = exec ? String(exec.batch).padStart(4, ' ') : '   -';
            const fileStr = file.padEnd(38, ' ');
            const dateStr = exec ? String(exec.executed_at).substring(0, 22) : '                     -';

            console.log(`| ${status} | ${batchStr} | ${fileStr} | ${dateStr} |`);
        }

        console.log('\n');
    } catch (error) {
        console.error('❌ Error al consultar el estado de migraciones:', error);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

function createMigrationFile(nameArg?: string): void {
    if (!nameArg) {
        console.error('❌ Debes proporcionar un nombre para la migración.');
        console.log('Uso: pnpm run migrate:create <nombre_de_la_migracion>');
        process.exit(1);
    }

    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const sanitized = nameArg
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const existing = getMigrationFiles();
    const nextNumber = existing.length + 1;
    const prefix = String(nextNumber).padStart(4, '0');
    const filename = `${prefix}_${sanitized}.sql`;
    const targetPath = path.join(MIGRATIONS_DIR, filename);

    const template = `-- Migración: ${filename}
-- Creado: ${new Date().toISOString()}

-- Escribe aquí tus sentencias SQL (DDL / DML):
-- Ejemplo:
-- CREATE TABLE mi_tabla (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     nombre VARCHAR(100) NOT NULL
-- );
`;

    fs.writeFileSync(targetPath, template, 'utf-8');
    console.log(`✓ Archivo de migración creado:\n  ${targetPath}\n`);
}

async function main() {
    const action = process.argv[2] || 'up';

    switch (action) {
        case 'up':
            await runPendingMigrations();
            break;
        case 'status':
            await showStatus();
            break;
        case 'create':
            createMigrationFile(process.argv[3]);
            break;
        default:
            console.log(`Acción no reconocida: ${action}`);
            console.log('Opciones disponibles: up, status, create <nombre>');
            process.exit(1);
    }
}

if (require.main === module) {
    main();
}
