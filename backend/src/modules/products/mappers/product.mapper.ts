import { RowDataPacket } from 'mysql2';
import { Product } from '../interfaces/products';

export class ProductMapper {
    static toDomain(row: RowDataPacket): Product {
        return {
            id: Number(row.id),
            clave: row.clave,
            producto: row.producto,
            stock: Number(row.stock) || 0,
            medidas: row.medidas,
            categoria_producto_id: Number(row.categoria_producto_id) || 0,
            subcategoria_id: Number(row.subcategoria_id) || 0,
            precio_renta: Number(row.precio_renta) || 0,
            reparacion: Number(row.reparacion) || 0,
            imagen: row.imagen,
            precio_reposicion: Number(row.precio_reposicion) || 0,
            dias_mantenimiento: Number(row.dias_mantenimiento) || 0,
            costo: Number(row.costo) || 0,
            deposito_garantia: Number(row.deposito_garantia) || 0,
            costo_sin_iva: Number(row.costo_sin_iva) || 0,
            status: row.status !== undefined ? Number(row.status) : undefined,
            categoria: row.categoria,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

