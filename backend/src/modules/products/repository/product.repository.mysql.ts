import { ProductRepository } from "../repository/product.repository";
import { Product } from "../interfaces/products";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";

export class ProductRepositoryMySQL implements ProductRepository {
    async getListProducts(pageNumber: number, pageLength: number): Promise<{ data: Product[], pagination: any } | null> {
        const offset = (pageNumber - 1) * pageLength;
        const sql = `
        SELECT * FROM producto
        LIMIT ? OFFSET ?
    `;

        try {
            const [rows] = await db.query<RowDataPacket[]>(sql, [pageLength, offset]);

            if (!rows.length) {
                return null;
            }

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
                created_at: row.created_at,
                updated_at: row.updated_at
            }));

            const totalSql = `SELECT COUNT(*) AS total FROM producto`;
            const [totalRows] = await db.query<RowDataPacket[]>(totalSql);
            const total = totalRows[0].total;

            return {
                data: products,
                pagination: {
                    total,
                    current_page: pageNumber,
                    per_page: pageLength,
                    total_pages: Math.ceil(total / pageLength),
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
        const sql = `SELECT * FROM producto WHERE id = ?`;
        try {
            const [rows] = await db.query<RowDataPacket[]>(sql, [id]);
            if (!rows.length) return null;
            return rows[0] as unknown as Product;
        } catch (error) {
            console.error('Error en getProductById', error);
            return null;
        }
    }
}
