import { AuthRepository } from "./auth.repository";
import { AuthUser } from "../interfaces/auth-user";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";

export class AuthMySQLRepository implements AuthRepository {

    async findByEmail(email: string): Promise<AuthUser | null> {
        const sql = `
            SELECT id, email, password, tipo_usuario, status, hashed_refresh_token
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
                hashed_refresh_token: (row as any).hashed_refresh_token
            };
            return result;
        } catch (error) {
            // Error en la consulta
            console.error('Error en findByEmail:', error);
            return null;
        }
    }

    async findById(id: number): Promise<AuthUser | null> {
        const sql = `
            SELECT id, email, password, tipo_usuario, status, hashed_refresh_token
            FROM users
            WHERE id = ?
            LIMIT 1
        `;
        try {
            const [rows] = await db.query(sql, [id]);
            const row = Array.isArray(rows) && rows.length ? rows[0] : null;
            if (!row) {
                return null;
            }
            const result: AuthUser = {
                id: (row as any).id,
                email: (row as any).email,
                password: (row as any).password,
                tipo_usuario: (row as any).tipo_usuario,
                status: (row as any).status,
                hashed_refresh_token: (row as any).hashed_refresh_token
            };
            return result;
        } catch (error) {
            console.error('Error en findById:', error);
            return null;
        }
    }

    async updateRefreshToken(userId: number, hashedRefreshToken: string | null): Promise<void> {
        const sql = `UPDATE users SET hashed_refresh_token = ? WHERE id = ?`;
        try {
            await db.query(sql, [hashedRefreshToken, userId]);
        } catch (error) {
            console.error('Error en updateRefreshToken:', error);
            throw error;
        }
    }
}
