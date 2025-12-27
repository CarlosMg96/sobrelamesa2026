import { Request, Response } from "express";
import { EventService } from "../services/event.service";
import { sendResponse } from "../../../core/response";
import { Event } from "../interfaces/event";

export class EventController {
    constructor(private readonly service: EventService) { }

    async getListEvents(req: Request, res: Response) {
        let { pageNumber, pageLength } = req.query;
        if (!pageNumber || !pageLength) {
            pageNumber = "1";
            pageLength = "100";
        }
        const result = await this.service.getListEvents(Number(pageNumber), Number(pageLength));
        return sendResponse(res, 200, "Events list", result);
    }

    async getEventById(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return sendResponse(res, 400, "Missing query parameters");
        }
        const result = await this.service.getEventById(Number(id));
        return sendResponse(res, 200, "Event", result);
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

}