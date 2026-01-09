import express from "express";
import { ProductController } from "../controllers/product.controller";
import { ProductService } from "../services/product.service";
import { ProductRepositoryMySQL } from "../repository/product.repository.mysql";
import { authMiddleware } from "../../../middlewares/auth";
import { authorize } from "../../../middlewares/authorize.middleware";
import { Role } from "../../../constants/roles";

const router = express.Router();

// Instanciar los servicios y controladores
const productsRepository = new ProductRepositoryMySQL();  // Instancia del repositorio
const productService = new ProductService(productsRepository);  // Instancia del servicio
const productController = new ProductController(productService);  // Instancia del controlador

// Rutas del controlador de productos
router.get("/list", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => productController.getListProducts(req, res));
router.get("/product/:id", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => productController.getProductById(req, res));
router.post("/product", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => productController.createProduct(req, res));
router.delete("/product/:id", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => productController.deleteProduct(req, res));

export default router;