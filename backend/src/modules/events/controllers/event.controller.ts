import { Request, Response } from "express";
import { EventService } from "../services/event.service";
import { sendResponse } from "../../../core/response";
import { Event } from "../interfaces/event";
import { buildEventReportHtml, renderHtmlToPdfBuffer, PdfReportMode } from "../utils/eventPdfGenerator";
import { generateNativeEventPdfBuffer } from "../utils/nativePdfRenderer";

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

    async createQuickClient(req: Request, res: Response) {
        try {
            const { full_name, num_tel, email, direccion, empresa_id, tipo_cliente, rfc, agente_id } = req.body || {};
            if (!full_name || !String(full_name).trim()) {
                return sendResponse(res, 400, "El nombre completo del cliente es obligatorio");
            }
            const client = await this.service.createQuickClient({
                full_name: String(full_name).trim(),
                num_tel: num_tel ? String(num_tel).trim() : '',
                email: email ? String(email).trim() : '',
                direccion: direccion ? String(direccion).trim() : '',
                empresa_id: empresa_id ? Number(empresa_id) : 1,
                tipo_cliente: tipo_cliente ? Number(tipo_cliente) : 1,
                rfc: rfc ? String(rfc).trim().toUpperCase() : '',
                agente_id: agente_id ? Number(agente_id) : null
            });
            return sendResponse(res, 200, "Cliente registrado correctamente", client);
        } catch (error) {
            console.error("Error in createQuickClient:", error);
            return sendResponse(res, 500, "Error al registrar el cliente", error);
        }
    }

    async createQuickCompany(req: Request, res: Response) {
        try {
            const {
                empresa,
                clave,
                agente_id,
                rfc,
                numero_empresa,
                direccion_empresa,
                descuento_empresa,
                forma_pago_autorizada,
                tipo_empresa,
                notas
            } = req.body || {};

            if (!empresa || !String(empresa).trim()) {
                return sendResponse(res, 400, "El nombre de la empresa es obligatorio");
            }

            const company = await this.service.createQuickCompany({
                empresa: String(empresa).trim(),
                clave: clave ? String(clave).trim() : '',
                agente_id: agente_id ? Number(agente_id) : null,
                rfc: rfc ? String(rfc).trim().toUpperCase() : '',
                numero_empresa: numero_empresa ? String(numero_empresa).trim() : '',
                direccion_empresa: direccion_empresa ? String(direccion_empresa).trim() : '',
                descuento_empresa: descuento_empresa !== undefined ? Number(descuento_empresa) || 0 : 0,
                forma_pago_autorizada: forma_pago_autorizada ? Number(forma_pago_autorizada) : 1,
                tipo_empresa: tipo_empresa ? Number(tipo_empresa) : 1,
                notas: notas ? String(notas).trim() : ''
            });
            return sendResponse(res, 200, "Empresa registrada correctamente", company);
        } catch (error) {
            console.error("Error in createQuickCompany:", error);
            return sendResponse(res, 500, "Error al registrar la empresa", error);
        }
    }

    async createQuickPlace(req: Request, res: Response) {
        try {
            const { nombre, direccion } = req.body || {};
            if (!nombre || !String(nombre).trim() || !direccion || !String(direccion).trim()) {
                return sendResponse(res, 400, "El nombre y la dirección del lugar son obligatorios");
            }
            const place = await this.service.createQuickPlace({
                nombre: String(nombre).trim(),
                direccion: String(direccion).trim()
            });
            return sendResponse(res, 200, "Domicilio registrado correctamente", place);
        } catch (error) {
            console.error("Error in createQuickPlace:", error);
            return sendResponse(res, 500, "Error al registrar el domicilio", error);
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
            const evento_id = req.body?.evento_id ?? req.body?.eventoId;
            const rawComentario = req.body?.comentario ?? req.body?.comment;
            const comentario = typeof rawComentario === 'string' ? rawComentario.trim() : '';
            const user = (req as any).user;

            if (!evento_id || !comentario) {
                return sendResponse(res, 400, "El ID del evento y el comentario son obligatorios");
            }

            const userName = req.body?.user_name || user?.name || user?.username || '';

            const result = await this.service.addComment(
                Number(evento_id),
                comentario,
                user?.id || 0,
                userName
            );
            return sendResponse(res, 200, "Comentario guardado correctamente", result);
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

    async generateEventPdf(req: Request, res: Response, mode: PdfReportMode = 'con-iva') {
        try {
            const id = Number(req.params.id || req.body?.evento_id_reporte);
            if (!id) {
                return res.status(400).send("ID de evento requerido");
            }

            const detail = await this.service.getEventDetail(id);
            if (!detail || !detail.event) {
                return res.status(404).send("Cotización no encontrada");
            }

            const { html, filename } = buildEventReportHtml(detail, mode);

            if (req.query.format !== 'html') {
                let pdfBuffer = await renderHtmlToPdfBuffer(html);
                if (!pdfBuffer) {
                    pdfBuffer = await generateNativeEventPdfBuffer(detail, mode);
                }
                if (pdfBuffer) {
                    res.setHeader("Content-Type", "application/pdf");
                    res.setHeader("Content-Disposition", `inline; filename="${filename}.pdf"`);
                    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                    return res.status(200).send(pdfBuffer);
                }
            }

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.status(200).send(html);
        } catch (error) {
            console.error("Error in generateEventPdf:", error);
            return res.status(500).send("Error al generar el PDF del evento");
        }
    }

}