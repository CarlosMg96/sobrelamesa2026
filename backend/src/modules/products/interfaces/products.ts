export interface Product {
    id: number;
    clave?: string | null;
    producto?: string | null;
    stock: number;
    medidas?: string | null;
    categoria_producto_id: number;
    subcategoria_id: number;
    precio_renta: number;
    reparacion: number;
    imagen?: string | null;
    precio_reposicion: number;
    dias_mantenimiento: number;
    costo: number;
    deposito_garantia: number;
    costo_sin_iva: number;
    status?: number;
    created_at: string;
    updated_at: string;
}
