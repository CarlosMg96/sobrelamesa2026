import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { db } from "../src/config/database";

async function updatePasswords() {
    console.log("=========================================");
    console.log("  Actualizador de contraseñas (bcrypt)  ");
    console.log("=========================================\n");

    const targetEmail = process.argv[2]; // Opcional: email específico como argumento

    try {
        let query = "SELECT id, email, pwd, password FROM users WHERE pwd IS NOT NULL AND pwd != ''";
        const params: any[] = [];

        if (targetEmail) {
            query += " AND email = ?";
            params.push(targetEmail);
            console.log(`Filtrando únicamente para el usuario: ${targetEmail}\n`);
        }

        const [rows] = await db.query(query, params);
        const users = Array.isArray(rows) ? (rows as any[]) : [];

        if (users.length === 0) {
            console.log("No se encontraron usuarios para actualizar.");
            process.exit(0);
        }

        console.log(`Se encontraron ${users.length} usuario(s) para actualizar.\n`);

        let updatedCount = 0;

        for (const user of users) {
            const plainPassword = String(user.pwd).trim();

            if (!plainPassword) {
                console.log(`⚠️  [ID: ${user.id}] ${user.email}: pwd vacío, omitiendo.`);
                continue;
            }

            // Generar nuevo hash bcrypt
            const saltRounds = 10;
            const newHash = await bcrypt.hash(plainPassword, saltRounds);

            // Actualizar columna 'password'
            await db.query("UPDATE users SET password = ? WHERE id = ?", [newHash, user.id]);

            console.log(`✅ [ID: ${user.id}] ${user.email} -> password actualizado.`);
            updatedCount++;
        }

        console.log(`\n=========================================`);
        console.log(` Proceso completado exitosamente: ${updatedCount} actualizados.`);
        console.log(`=========================================\n`);
    } catch (error) {
        console.error("❌ Error actualizando contraseñas:", error);
    } finally {
        process.exit(0);
    }
}

updatePasswords();
