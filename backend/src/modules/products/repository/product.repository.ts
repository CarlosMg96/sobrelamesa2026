import { Product } from "../interfaces/products";

export interface ProductRepository {
    getListProducts(pageNumber: number, pageLength: number, search?: string, categoryId?: number): Promise<{ data: Product[], pagination: any } | null>;
    createProduct(data: Array<Product>): Promise<Product | null>;
    updateProduct(data: Array<Product>): Promise<Product | null>;
    deleteProduct(id: number): Promise<Product | null>;
    getProductById(id: number): Promise<Product | null>;
    getCategories(): Promise<{ id: number; categoria: string }[]>;
    checkStockAvailability(productIds: number[], startDate: string, endDate: string, eventId?: number): Promise<Record<number, { stock: number; used: number; available: number }>>;
}


