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

    async createUser(user: AuthUser): Promise<AuthUser> {
        const sql = `
            INSERT INTO users (email, password, tipo_usuario, status)
            VALUES (?, ?, ?, ?)
        `;
        try {
            const [result] = await db.query(sql, [
                user.email,
                user.password,
                user.tipo_usuario,
                user.status
            ]);
            return {
                id: (result as any).insertId,
                email: user.email,
                password: user.password,
                tipo_usuario: user.tipo_usuario,
                status: user.status,
                hashed_refresh_token: null
            };
        } catch (error) {
            console.error('Error en createUser:', error);
            throw error;
        }
    }

    async deleteUser(userId: number): Promise<void> {
        const sql = `DELETE FROM users WHERE id = ?`;
        try {
            await db.query(sql, [userId]);
        } catch (error) {
            console.error('Error en deleteUser:', error);
            throw error;
        }
    }

    async updateUser(user: AuthUser): Promise<AuthUser> {
        const sql = `
            UPDATE users
            SET email = ?, password = ?, tipo_usuario = ?, status = ?
            WHERE id = ?
        `;
        try {
            const [result] = await db.query(sql, [
                user.email,
                user.password,
                user.tipo_usuario,
                user.status,
                user.id
            ]);
            return {
                id: (result as any).insertId,
                email: user.email,
                password: user.password,
                tipo_usuario: user.tipo_usuario,
                status: user.status,
                hashed_refresh_token: null
            };
        } catch (error) {
            console.error('Error en updateUser:', error);
            throw error;
        }
    }

    async me(userId: number): Promise<AuthUser> {
        const sql = `
            SELECT id, email, tipo_usuario, status
            FROM users
            WHERE id = ?
            LIMIT 1
        `;
        try {
            const [rows] = await db.query(sql, [userId]);
            const row = Array.isArray(rows) && rows.length ? rows[0] : null;
            if (!row) {
                return null;
            }
            const result: AuthUser = {
                id: (row as any).id,
                email: (row as any).email,
                password: "",
                tipo_usuario: (row as any).tipo_usuario,
                status: (row as any).status,
                hashed_refresh_token: null
            };
            return result;
        } catch (error) {
            console.error('Error en me:', error);
            return null;
        }
    }
}
