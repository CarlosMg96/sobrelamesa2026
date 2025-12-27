import { EventRepository } from "./event.repository";
import { Event } from "../interfaces/event";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";

const FRONTEND_URL = process.env.FRONTEND_URL;

export class EventsMySQLRepository implements EventRepository {
    async getListEvents(pageNumber: number, pageLength: number): Promise<{ data: Event[], pagination: any } | null> {
        const offset = (pageNumber - 1) * pageLength;  // Calculando el offset para la paginación
        const sql = `
            SELECT evento.*, 
                   cliente.full_name AS cliente,
                   cliente.num_tel,
                   cliente.email,
                   empresas.empresa,
                   users.name AS agente,
                   tipo_evento.evento AS tipo_evento,
                   (SELECT COUNT(*) FROM producto_autorizado 
                    WHERE producto_autorizado.evento_id = evento.id) > 0 AS status_sobrevendido
            FROM evento
            JOIN persona_fisica AS cliente ON cliente.id = evento.cliente_id
            JOIN empresas ON empresas.id = cliente.empresa_id
            JOIN users ON users.id = evento.agente_id
            JOIN tipo_evento ON tipo_evento.id = evento.tipo_evento
            ORDER BY evento.id DESC
            LIMIT ? OFFSET ?
        `;

        try {
            const [rows] = await db.query<RowDataPacket[]>(sql, [pageLength, offset]);

            // Si no hay resultados, retorna null
            if (!rows.length) {
                return null;
            }

            // Mapear las filas al tipo `Event`
            const events: Event[] = rows.map(row => ({
                id: row.id.toString(),
                fecha_cotizacion: row.fecha_cotizacion,
                cliente_id: row.cliente_id.toString(),
                agente_id: row.agente_id.toString(),
                estatus: row.estatus,
                tipo_venta: row.tipo_venta,
                tipo_evento: row.tipo_evento,
                no_personas: row.no_personas,
                deposito: row.deposito,
                fecha_evento: row.fecha_evento,
                hora_evento: row.hora_evento,
                fecha_entrega: row.fecha_entrega,
                hora_entrega: row.hora_entrega,
                fecha_recoleccion: row.fecha_recoleccion,
                hora_recoleccion: row.hora_recoleccion,
                tipo_pago: row.tipo_pago,
                domicilio_entrega: row.domicilio_entrega,
                domicilio_recoleccion: row.domicilio_recoleccion,
                status_entrega: row.status_entrega,
                lavado_desinfeccion: row.lavado_desinfeccion,
                descuento: row.descuento,
                correct_datos: row.correct_datos === 1, // Asumiendo que los valores booleanos son 1 o 0
                accept_politicas: row.accept_politicas === 1,
                url_seguimiento: row.url_seguimiento,
                descuento_lavado: row.descuento_lavado,
                firma_logistica: row.firma_logistica,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));

            if (!events) return null;

            // Obtener el total de registros para la paginación
            const totalSql = `SELECT COUNT(*) AS total FROM evento`;
            const [totalRows] = await db.query<RowDataPacket[]>(totalSql);
            const total = totalRows[0].total;

            return {
                data: events,
                pagination: {
                    total,
                    current_page: pageNumber,
                    per_page: pageLength,
                    total_pages: Math.ceil(total / pageLength),
                }
            };

        } catch (error) {
            console.error('Error en getListEvents', error);
            return null;
        }
    }

    async createEvent(data: Array<Event>): Promise<Event | null> {
        // 1. Extraemos el primer objeto del arreglo (según tu interfaz)
        const eventData = data[0];

        if (!eventData) {
            return null;
        }

        const sql = `INSERT INTO evento (
    fecha_cotizacion, cliente_id, agente_id, estatus, tipo_venta, 
    tipo_evento, no_personas, deposito, fecha_evento, hora_evento, 
    fecha_entrega, hora_entrega, fecha_recoleccion, hora_recoleccion, 
    tipo_pago, domicilio_entrega, domicilio_recoleccion, status_entrega, 
    descuento, url_seguimiento, status_recibido, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            eventData.fecha_cotizacion, eventData.cliente_id, eventData.agente_id, eventData.estatus,
            eventData.tipo_venta, eventData.tipo_evento, eventData.no_personas, eventData.deposito,
            eventData.fecha_evento, eventData.hora_evento, eventData.fecha_entrega, eventData.hora_entrega,
            eventData.fecha_recoleccion, eventData.hora_recoleccion, eventData.tipo_pago,
            eventData.domicilio_entrega, eventData.domicilio_recoleccion, "1",
            eventData.descuento,
            '', 1,
            new Date(), new Date()
        ];

        try {
            const [result]: any = await db.query(sql, values);

            // Verificamos el insertId (mysql2 devuelve esto en INSERT)
            const newId = result.insertId;
            if (!newId) return null;

            // 3. Generamos los datos calculados (URL con hash)
            const eventIdEncrypted = bcrypt.hashSync(newId.toString(), 10);
            const urlCotizacion = `${FRONTEND_URL}cotizacion/${encodeURIComponent(eventIdEncrypted)}`;

            // 3.5. ACTUALIZAR la base de datos con la URL generada
            const sqlUpdate = `UPDATE evento SET url_seguimiento = ? WHERE id = ?`;
            await db.query(sqlUpdate, [urlCotizacion, newId]);

            // 4. Retornamos el objeto completo mezclando los datos de entrada con los generados
            const resultEvent: Event = {
                id: newId.toString(),
                ...eventData,
                url_seguimiento: urlCotizacion,
                firma_logistica: "" // O lo que necesites por defecto
            };

            return resultEvent;

        } catch (error) {
            console.error('Error in createEvent:', error);
            return null;
        }
    }

    async updateEvent(data: Array<Event>): Promise<Event | null> {
        const sql = `UPDATE eventos SET fecha_cotizacion = ?, cliente_id = ?, agente_id = ?, estatus = ?, tipo_venta = ?, tipo_evento = ?, no_personas = ?, deposito = ?, fecha_evento = ?, hora_evento = ?, fecha_entrega = ?, hora_entrega = ?, fecha_recoleccion = ?, hora_recoleccion = ?, tipo_pago = ?, domicilio_entrega = ?, domicilio_recoleccion = ?, status_entrega = ?, lavado_desinfeccion = ?, descuento = ?, correct_datos = ?, accept_politicas = ?, url_seguimiento = ?, descuento_lavado = ?, firma_logistica = ? WHERE id = ?`;
        try {
            const [rows] = await db.query(sql, data);
            const row = Array.isArray(rows) && rows.length ? rows : null;
            if (!row) {
                return null
            }
            const result: Event = {
                id: (row as any).id,
                fecha_cotizacion: "",
                cliente_id: "",
                agente_id: "",
                estatus: 0,
                tipo_venta: 0,
                tipo_evento: 0,
                no_personas: 0,
                deposito: 0,
                fecha_evento: "",
                hora_evento: "",
                fecha_entrega: "",
                hora_entrega: "",
                fecha_recoleccion: "",
                hora_recoleccion: "",
                tipo_pago: 0,
                domicilio_entrega: "",
                domicilio_recoleccion: "",
                status_entrega: "",
                lavado_desinfeccion: "",
                descuento: 0,
                correct_datos: false,
                accept_politicas: false,
                url_seguimiento: "",
                descuento_lavado: 0,
                firma_logistica: "",
                created_at: "",
                updated_at: ""
            }

            return result;
        } catch (error) {
            console.error('Error in updateEvent', error)
        }
    }

    async deleteEvent(event_id: Number): Promise<Event | null> {
        const sql = `DELETE FROM eventos WHERE id = ?`;
        try {
            const [rows] = await db.query(sql, event_id);
            const row = Array.isArray(rows) && rows.length ? rows : null;
            if (!row) {
                return null
            }
            const result: Event = {
                id: (row as any).id,
                fecha_cotizacion: "",
                cliente_id: "",
                agente_id: "",
                estatus: 0,
                tipo_venta: 0,
                tipo_evento: 0,
                no_personas: 0,
                deposito: 0,
                fecha_evento: "",
                hora_evento: "",
                fecha_entrega: "",
                hora_entrega: "",
                fecha_recoleccion: "",
                hora_recoleccion: "",
                tipo_pago: 0,
                domicilio_entrega: "",
                domicilio_recoleccion: "",
                status_entrega: "",
                lavado_desinfeccion: "",
                descuento: 0,
                correct_datos: false,
                accept_politicas: false,
                url_seguimiento: "",
                descuento_lavado: 0,
                firma_logistica: "",
                created_at: "",
                updated_at: ""
            }

            return result;
        } catch (error) {
            console.error('Error in deleteEvent', error)
        }
    }

    async getEvent(event_id: Number): Promise<Event | null> {
        const sql = `SELECT * FROM evento WHERE id = ?`;

        try {
            const [rows] = await db.query<RowDataPacket[]>(sql, [event_id]);

            if (rows.length === 0) {
                console.log(`No se encontró el evento con id: ${event_id}`);
                return null;
            }

            const event = rows[0] as Event;
            return event;
        } catch (error) {
            console.error('Error in getEvent', error)
        }
    }

}
