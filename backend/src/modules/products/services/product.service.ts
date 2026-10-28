import { ProductRepository } from "../repository/product.repository";
import { Product } from "../interfaces/products";

export class ProductService {
    constructor(private readonly repo: ProductRepository) { }

    async getListProducts(pageNumber: number, pageLength: number, search?: string, categoryId?: number): Promise<{ data: Product[], pagination: any } | null> {
        const result = await this.repo.getListProducts(pageNumber, pageLength, search, categoryId);

        if (result === null) {
            return null;
        }

        return result;
    }

    async getCategories(): Promise<{ id: number; categoria: string }[]> {
        return await this.repo.getCategories();
    }

    async checkStockAvailability(productIds: number[], startDate: string, endDate: string, eventId?: number): Promise<Record<number, { stock: number; used: number; available: number }>> {
        return await this.repo.checkStockAvailability(productIds, startDate, endDate, eventId);
    }

    async createProduct(data: Array<Product>): Promise<Product | null> {
        const result = await this.repo.createProduct(data);
        if (result === null) {
            return null;
        }
        return result;
    }

    async updateProduct(data: Array<Product>): Promise<Product | null> {
        const result = await this.repo.updateProduct(data);
        if (result === null) {
            return null;
        }
        return result;
    }

    async deleteProduct(id: number): Promise<Product | null> {
        const result = await this.repo.deleteProduct(id);
        if (result === null) {
            return null;
        }
        return result;
    }

    async getProductById(id: number): Promise<Product | null> {
        const result = await this.repo.getProductById(id);
        if (result === null) {
            return null;
        }
        return result;
    }
}
