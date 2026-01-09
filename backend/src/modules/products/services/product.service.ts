import { ProductRepository } from "../repository/product.repository";
import { Product } from "../interfaces/products";

export class ProductService {
    constructor(private readonly repo: ProductRepository) { }

    async getListProducts(pageNumber: number, pageLength: number): Promise<{ data: Product[], pagination: any } | null> {
        const result = await this.repo.getListProducts(pageNumber, pageLength);

        if (result === null) {
            return null;
        }

        return result;
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
