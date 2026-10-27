import { Request, Response } from "express";
import { EventService } from "../services/event.service";
import { sendResponse } from "../../../core/response";
import { Event } from "../interfaces/event";

export class EventController {
    constructor(private readonly service: EventService) { }

    async getListEvents(req: Request, res: Response) {
        const {
            pageNumber,
            pageLength,
            search,
            filterSolver,
            filterStatus,
            filterInventory,
            filterDate,
            filterPayment,
            filterPaymentType,
            logisticsStatus,
            orderBy,
            byAuthorizing
        } = req.query;

        const params = {
            pageNumber: Number(pageNumber) || 1,
            pageLength: Number(pageLength) || 10,
            search: typeof search === 'string' ? search : undefined,
            filterSolver: filterSolver ? String(filterSolver) : undefined,
            filterStatus: filterStatus !== undefined ? String(filterStatus) : undefined,
            filterInventory: typeof filterInventory === 'string' ? filterInventory : undefined,
            filterDate: typeof filterDate === 'string' ? filterDate : undefined,
            filterPayment: typeof filterPayment === 'string' ? filterPayment : undefined,
            filterPaymentType: typeof filterPaymentType === 'string' ? filterPaymentType : undefined,
            logisticsStatus: logisticsStatus ? String(logisticsStatus) : undefined,
            orderBy: orderBy !== undefined ? String(orderBy) : undefined,
            byAuthorizing: byAuthorizing === 'true' || byAuthorizing === '1'
        };

        const result = await this.service.getListEvents(params);
        return sendResponse(res, 200, "Events list", result);
    }

    async getSolvers(req: Request, res: Response) {
        const solvers = await this.service.getSolvers();
        return sendResponse(res, 200, "Solvers list", solvers);
    }

    async getEventById(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const full = req.query.full !== 'false';
        if (full) {
            const result = await this.service.getEventDetail(Number(id));
            if (!result) {
                return sendResponse(res, 404, "Event not found");
            }
            return sendResponse(res, 200, "Event detail", result);
        }
        const result = await this.service.getEventById(Number(id));
        return sendResponse(res, 200, "Event", result);
    }

    async getCatalogs(req: Request, res: Response) {
        try {
            const catalogs = await this.service.getCatalogs();
            return sendResponse(res, 200, "Catalogs retrieved successfully", catalogs);
        } catch (error) {
            console.error("Error in getCatalogs:", error);
            return sendResponse(res, 500, "Error retrieving catalogs", error);
        }
    }

    async saveQuote(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const dto = req.body;
            if (!dto.fecha_cotizacion || !dto.cliente_id || !dto.agente_id || !dto.fecha_evento) {
                return sendResponse(res, 400, "Campos obligatorios faltantes: fecha_cotizacion, cliente_id, agente_id, fecha_evento");
            }
            const result = await this.service.saveOrUpdateQuote(dto, user?.id, user?.name);
            return sendResponse(res, 200, result.message, result);
        } catch (error) {
            console.error("Error in saveQuote:", error);
            return sendResponse(res, 500, "Error saving quote", error);
        }
    }


    async createEvent(req: Request, res: Response) {
        const { fecha_cotizacion, cliente_id, agente_id, estatus, tipo_venta, tipo_evento, no_personas, deposito, fecha_evento, hora_evento, fecha_entrega, hora_entrega, fecha_recoleccion, hora_recoleccion, tipo_pago, domicilio_entrega, domicilio_recoleccion, descuento } = req.body;
        console.log(req.body);
        // if (!fecha_cotizacion || !cliente_id || !agente_id || !estatus || !tipo_venta || !tipo_evento || !no_personas || !deposito || !fecha_evento || !hora_evento || !fecha_entrega || !hora_entrega || !fecha_recoleccion || !hora_recoleccion || !tipo_pago || !domicilio_entrega || !domicilio_recoleccion || !descuento) {
        //     return sendResponse(res, 400, "Missing query parameters");
        // }

        try {
            const eventToCreate: Event = {
                fecha_cotizacion,
                cliente_id,
                agente_id,
                estatus,
                tipo_venta,
                tipo_evento,
                no_personas,
                deposito,
                fecha_evento,
                hora_evento,
                fecha_entrega,
                hora_entrega,
                fecha_recoleccion,
                hora_recoleccion,
                tipo_pago,
                domicilio_entrega,
                domicilio_recoleccion,
                descuento,
            };

            const result = await this.service.createEvent([eventToCreate]);
            if (!result) {
                return sendResponse(res, 400, "Error in createEvent");
            }
            return sendResponse(res, 200, "Event created", result);
        } catch (error) {
            console.error('Error in createEvent', error)
            return sendResponse(res, 400, "Error in createEvent", error);
        }
    }

    async updateEvent(req: Request, res: Response) {
        const { data } = req.body;
        if (!data) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const result = await this.service.updateEvent(data);
        return sendResponse(res, 200, "Event updated", result);
    }

    async deleteEvent(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const result = await this.service.deleteEvent(Number(id));
        return sendResponse(res, 200, "Event deleted", result);
    }

    async getCalendarEvents(req: Request, res: Response) {
        try {
            const startDate = (req.query.startDate || req.query.f_inicio || req.body?.f_inicio) as string;
            const endDate = (req.query.endDate || req.query.f_fin || req.body?.f_fin) as string;
            const filterByDate = (req.query.filterByDate || req.query.filter_by_start_or_end_date || req.body?.filter_by_start_or_end_date || 'event_date') as string;

            if (!startDate || !endDate) {
                return sendResponse(res, 400, "startDate and endDate are required");
            }

            const events = await this.service.getCalendarEvents(startDate, endDate, filterByDate);
            return sendResponse(res, 200, "Calendar events retrieved successfully", events);
        } catch (error) {
            console.error("Error in getCalendarEvents:", error);
            return sendResponse(res, 500, "Error fetching calendar events", error);
        }
    }

    async addComment(req: Request, res: Response) {
        try {
            const { evento_id, comentario } = req.body;
            const user = (req as any).user;
            if (!evento_id || !comentario) {
                return sendResponse(res, 400, "evento_id and comentario are required");
            }

            const result = await this.service.addComment(
                Number(evento_id),
                comentario,
                user?.id || 0,
                user?.name || user?.username || 'Usuario'
            );
            return sendResponse(res, 200, "Comment added successfully", result);
        } catch (error) {
            console.error("Error in addComment:", error);
            return sendResponse(res, 500, "Error adding comment", error);
        }
    }

    async authorizeStockProduct(req: Request, res: Response) {
        try {
            const { password } = req.body;
            if (!password) {
                return sendResponse(res, 400, "Contraseña requerida", { authorized: false });
            }
            const result = await this.service.authorizeStockProduct(String(password));
            return sendResponse(res, 200, result.message, result);
        } catch (error) {
            console.error("Error in authorizeStockProduct:", error);
            return sendResponse(res, 500, "Error validating authorization password", error);
        }
    }

}