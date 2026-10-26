import { ProductRepository } from "../repository/product.repository";
import { Product } from "../interfaces/products";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";

export class ProductRepositoryMySQL implements ProductRepository {
    async getListProducts(pageNumber: number, pageLength: number, search?: string, categoryId?: number): Promise<{ data: Product[], pagination: any } | null> {
        const offset = (pageNumber - 1) * pageLength;
        const whereClauses: string[] = ['p.status = 1'];
        const queryParams: any[] = [];

        if (search && search.trim()) {
            whereClauses.push('(p.producto LIKE ? OR p.clave LIKE ?)');
            const s = `%${search.trim()}%`;
            queryParams.push(s, s);
        }

        if (categoryId && Number(categoryId) > 0) {
            whereClauses.push('p.categoria_producto_id = ?');
            queryParams.push(Number(categoryId));
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT p.*, cp.categoria
            FROM producto p
            LEFT JOIN categoria_producto cp ON cp.id = p.categoria_producto_id
            WHERE ${whereSql}
            ORDER BY p.producto ASC
            LIMIT ? OFFSET ?
        `;

        try {
            const [rows] = await db.query<RowDataPacket[]>(sql, [...queryParams, pageLength, offset]);

            const products: Product[] = rows.map(row => ({
                id: row.id,
                clave: row.clave,
                producto: row.producto,
                stock: row.stock,
                medidas: row.medidas,
                categoria_producto_id: row.categoria_producto_id,
                subcategoria_id: row.subcategoria_id,
                precio_renta: row.precio_renta,
                reparacion: row.reparacion,
                imagen: row.imagen,
                precio_reposicion: row.precio_reposicion,
                dias_mantenimiento: row.dias_mantenimiento,
                costo: row.costo,
                deposito_garantia: row.deposito_garantia,
                costo_sin_iva: row.costo_sin_iva,
                status: row.status,
                categoria: row.categoria,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));

            const totalSql = `SELECT COUNT(*) AS total FROM producto p WHERE ${whereSql}`;
            const [totalRows] = await db.query<RowDataPacket[]>(totalSql, queryParams);
            const total = totalRows[0]?.total || 0;

            return {
                data: products,
                pagination: {
                    total,
                    current_page: pageNumber,
                    per_page: pageLength,
                    total_pages: Math.ceil(total / pageLength) || 1,
                }
            };
        } catch (error) {
            console.error('Error en getListProducts', error);
            return null;
        }
    }

    async createProduct(data: Array<Product>): Promise<Product | null> {
        const sql = `INSERT INTO producto (
        clave, producto, stock, medidas, categoria_producto_id, subcategoria_id,
        precio_renta, reparacion, imagen, precio_reposicion, dias_mantenimiento,
        costo, deposito_garantia, costo_sin_iva, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            data[0].clave, data[0].producto, data[0].stock, data[0].medidas, data[0].categoria_producto_id,
            data[0].subcategoria_id, data[0].precio_renta, data[0].reparacion, data[0].imagen,
            data[0].precio_reposicion, data[0].dias_mantenimiento, data[0].costo, data[0].deposito_garantia,
            data[0].costo_sin_iva, 1, new Date(), new Date()
        ];

        try {
            const [result]: any = await db.query(sql, values);
            const newId = result.insertId;
            if (!newId) return null;
            return {
                id: newId,
                ...data[0]
            };
        } catch (error) {
            console.error('Error en createProduct', error);
            return null;
        }
    }

    async updateProduct(data: Array<Product>): Promise<Product | null> {
        const sql = `UPDATE producto SET 
        clave = ?, 
        producto = ?, 
        stock = ?, 
        medidas = ?, 
        categoria_producto_id = ?, 
        subcategoria_id = ?, 
        precio_renta = ?, 
        reparacion = ?, 
        imagen = ?, 
        precio_reposicion = ?, 
        dias_mantenimiento = ?, 
        costo = ?, 
        deposito_garantia = ?, 
        costo_sin_iva = ?, 
        status = ?, 
        updated_at = ? 
    WHERE id = ?`;

        const values = [
            data[0].clave, data[0].producto, data[0].stock, data[0].medidas, data[0].categoria_producto_id,
            data[0].subcategoria_id, data[0].precio_renta, data[0].reparacion, data[0].imagen,
            data[0].precio_reposicion, data[0].dias_mantenimiento, data[0].costo, data[0].deposito_garantia,
            data[0].costo_sin_iva, data[0].status, new Date(), data[0].id
        ];

        try {
            const [result]: any = await db.query(sql, values);
            if (!result.affectedRows) return null;
            return {
                id: data[0].id,
                ...data[0]
            };
        } catch (error) {
            console.error('Error en updateProduct', error);
            return null;
        }
    }

    async deleteProduct(id: number): Promise<Product | null> {
        const sql = `DELETE FROM producto WHERE id = ?`;
        try {
            const [result]: any = await db.query(sql, [id]);
            if (!result.affectedRows) return null;
            return {
                id,
                ...result
            };
        } catch (error) {
            console.error('Error en deleteProduct', error);
            return null;
        }
    }

    async getProductById(id: number): Promise<Product | null> {
        const sql = `
            SELECT p.*, cp.categoria
            FROM producto p
            LEFT JOIN categoria_producto cp ON cp.id = p.categoria_producto_id
            WHERE p.id = ?
        `;
        try {
            const [rows] = await db.query<RowDataPacket[]>(sql, [id]);
            if (!rows.length) return null;
            return rows[0] as unknown as Product;
        } catch (error) {
            console.error('Error en getProductById', error);
            return null;
        }
    }

    async getCategories(): Promise<{ id: number; categoria: string }[]> {
        try {
            const sql = `
                SELECT id, categoria 
                FROM categoria_producto 
                WHERE status = 1 
                ORDER BY categoria ASC
            `;
            const [rows] = await db.query<RowDataPacket[]>(sql);
            return rows.map(r => ({ id: Number(r.id), categoria: r.categoria }));
        } catch (error) {
            console.error('Error en getCategories:', error);
            return [];
        }
    }

    async checkStockAvailability(productIds: number[], startDate: string, endDate: string, eventId?: number): Promise<Record<number, { stock: number; used: number; available: number }>> {
        if (!productIds || productIds.length === 0) {
            return {};
        }

        try {
            // 1. Obtener stock base de los productos solicitados
            const [productRows] = await db.query<RowDataPacket[]>(
                `SELECT id, stock FROM producto WHERE id IN (?)`,
                [productIds]
            );

            const result: Record<number, { stock: number; used: number; available: number }> = {};
            for (const p of productRows) {
                const stock = Number(p.stock) || 0;
                result[p.id] = { stock, used: 0, available: stock };
            }

            // 2. Calcular cantidad usada en eventos traslapados (estatus 2=Autorizado, 3=Confirmado)
            let usedSql = `
                SELECT de.producto_id, SUM(de.cantidad) AS used_quantity
                FROM detalle_evento de
                JOIN evento e ON e.id = de.evento_id
                WHERE de.producto_id IN (?)
                  AND e.estatus IN (2, 3)
                  AND e.fecha_entrega <= ?
                  AND e.fecha_recoleccion >= ?
            `;
            const params: any[] = [productIds, endDate, startDate];

            if (eventId && Number(eventId) > 0) {
                usedSql += ` AND e.id != ?`;
                params.push(Number(eventId));
            }

            usedSql += ` GROUP BY de.producto_id`;

            const [usedRows] = await db.query<RowDataPacket[]>(usedSql, params);

            for (const u of usedRows) {
                const pId = Number(u.producto_id);
                if (result[pId]) {
                    const used = Number(u.used_quantity) || 0;
                    result[pId].used = used;
                    result[pId].available = result[pId].stock - used;
                }
            }

            return result;
        } catch (error) {
            console.error('Error en checkStockAvailability:', error);
            return {};
        }
    }
}
