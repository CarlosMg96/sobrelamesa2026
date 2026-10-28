import express from "express";
import { EventController } from "../controllers/event.controller";
import { EventService } from "../services/event.service";
import { EventsMySQLRepository } from "../respository/event.repository.mysql";  // o tu repositorio correspondiente
import { authMiddleware } from "../../../middlewares/auth";
import { authorize } from "../../../middlewares/authorize.middleware";
import { Role } from "../../../constants/roles";

const router = express.Router();

// Instanciar los servicios y controladores
const eventsRepository = new EventsMySQLRepository();  // Instancia del repositorio
const eventService = new EventService(eventsRepository);  // Instancia del servicio
const eventController = new EventController(eventService);  // Instancia del controlador

// Rutas del controlador de eventos
router.get("/v1/list", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getListEvents(req, res));
router.get("/v1/calendar", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getCalendarEvents(req, res));
router.post("/v1/comment", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.addComment(req, res));
router.get("/v1/solvers", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getSolvers(req, res));
router.get("/v1/catalogs", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getCatalogs(req, res));
router.post("/v1/client", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.createQuickClient(req, res));
router.post("/v1/company", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.createQuickCompany(req, res));
router.post("/v1/place", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.createQuickPlace(req, res));
router.get("/v1/event/:id", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getEventById(req, res));
router.post("/v1/save-quote", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.saveQuote(req, res));
router.post("/v1/authorize-stock-product", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.authorizeStockProduct(req, res));
router.post("/v1/event", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.createEvent(req, res));
router.delete("/v1/event/:id", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.deleteEvent(req, res));

// Rutas de generación y vista previa de PDF (diseño original legacy)
router.get("/pdf/sin-iva/:id", (req, res) => eventController.generateEventPdf(req, res, "sin-iva"));
router.get("/pdf/logistica/:id", (req, res) => eventController.generateEventPdf(req, res, "logistica"));
router.get("/pdf/remision/:id", (req, res) => eventController.generateEventPdf(req, res, "remision"));
router.get("/pdf/:id", (req, res) => eventController.generateEventPdf(req, res, "con-iva"));

router.get("/v1/pdf/sin-iva/:id", (req, res) => eventController.generateEventPdf(req, res, "sin-iva"));
router.get("/v1/pdf/logistica/:id", (req, res) => eventController.generateEventPdf(req, res, "logistica"));
router.get("/v1/pdf/remision/:id", (req, res) => eventController.generateEventPdf(req, res, "remision"));
router.get("/v1/pdf/:id", (req, res) => eventController.generateEventPdf(req, res, "con-iva"));

export default router;
