import { Request, Response } from "express";
import { sendResponse } from "../../../core/response";
import { Product } from "../interfaces/products";
import { ProductService } from "../services/product.service";

export class ProductController {
    constructor(private readonly service: ProductService) { }

    async getListProducts(req: Request, res: Response) {
        let { pageNumber, pageLength } = req.query;
        if (!pageNumber || !pageLength) {
            pageNumber = "1";
            pageLength = "10";
        }
        const result = await this.service.getListProducts(Number(pageNumber), Number(pageLength));
        return sendResponse(res, 200, "Products list", result);
    }

    async getProductById(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const result = await this.service.getProductById(Number(id));
        return sendResponse(res, 200, "Product", result);
    }

    async createProduct(req: Request, res: Response) {
        const { clave, producto, stock, medidas, categoria_producto_id, subcategoria_id, precio_renta, reparacion, imagen, precio_reposicion, dias_mantenimiento, costo, deposito_garantia, costo_sin_iva } = req.body;
        if (
            stock == null ||
            categoria_producto_id == null ||
            subcategoria_id == null ||
            precio_renta == null ||
            reparacion == null ||
            precio_reposicion == null ||
            dias_mantenimiento == null ||
            costo == null ||
            deposito_garantia == null ||
            costo_sin_iva == null
        ) {
            return sendResponse(res, 400, "Missing required fields");
        }

        if (stock < 0 ||
            categoria_producto_id < 0 ||
            subcategoria_id < 0 ||
            precio_renta < 0 ||
            reparacion < 0 ||
            precio_reposicion < 0 ||
            dias_mantenimiento < 0 ||
            costo < 0 ||
            deposito_garantia < 0 ||
            costo_sin_iva < 0
        ) {
            return sendResponse(res, 400, "Invalid values");
        }


        try {
            const productToCreate: Product = {
                clave,
                producto,
                stock,
                medidas,
                categoria_producto_id,
                subcategoria_id,
                precio_renta,
                reparacion,
                imagen,
                precio_reposicion,
                dias_mantenimiento,
                costo,
                deposito_garantia,
                costo_sin_iva,
                id: 0,
                created_at: "",
                updated_at: ""
            };

            const result = await this.service.createProduct([productToCreate]);
            if (!result) {
                return sendResponse(res, 400, "Error in createProduct");
            }
            return sendResponse(res, 200, "Product created", result);
        } catch (error) {
            console.error('Error in createProduct', error)
            return sendResponse(res, 400, "Error in createProduct", error);
        }
    }

    async updateProduct(req: Request, res: Response) {
        const { data } = req.body;
        if (!data) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const result = await this.service.updateProduct(data);
        return sendResponse(res, 200, "Product updated", result);
    }

    async deleteProduct(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const result = await this.service.deleteProduct(Number(id));
        return sendResponse(res, 200, "Product deleted", result);
    }

}
