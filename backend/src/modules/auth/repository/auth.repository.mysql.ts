import { AuthRepository } from "./auth.repository";
import { AuthUser } from "../interfaces/auth-user";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";

export class AuthMySQLRepository implements AuthRepository {
    
    async findByEmail(email: string): Promise<AuthUser | null> {
        const sql = `
            SELECT id, email, password, tipo_usuario, status
            FROM users
            WHERE email = ?
            LIMIT 1
        `;
        try {
            const [rows] = await db.query(sql, [email]);
            const row = Array.isArray(rows) && rows.length ? rows[0] : null;
            if (!row) {
                // Usuario no encontrado
                return null;
            }
            // Mapear el resultado a AuthUser
            const result: AuthUser = {
                id: (row as any).id,
                email: (row as any).email,
                password: (row as any).password,
                tipo_usuario: (row as any).tipo_usuario,
                status: (row as any).status,
            };
            return result;
        } catch (error) {
            // Error en la consulta
            console.error('Error en findByEmail:', error);
            return null;
        }
    }
}
