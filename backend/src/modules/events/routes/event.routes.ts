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
router.get("/list", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getListEvents(req, res));
router.get("/event/:id", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.getEventById(req, res));
router.post("/event", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.createEvent(req, res));
router.delete("/event/:id", authMiddleware, authorize([Role.MASTER, Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.STAFF]), (req, res) => eventController.deleteEvent(req, res));

export default router;
