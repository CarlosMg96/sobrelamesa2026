import { EventRepository, EventQueryParams } from "./event.repository";
import { Event } from "../interfaces/event";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";

const FRONTEND_URL = process.env.FRONTEND_URL;

export class EventsMySQLRepository implements EventRepository {
    async getSolvers(): Promise<{ id: number; name: string }[]> {
        try {
            const sql = `
                SELECT DISTINCT users.id, users.name 
                FROM users 
                WHERE users.name IS NOT NULL AND users.name != ''
                ORDER BY users.name ASC
            `;
            const [rows] = await db.query<RowDataPacket[]>(sql);
            return rows.map(r => ({ id: Number(r.id), name: r.name }));
        } catch (error) {
            console.error('Error in getSolvers:', error);
            return [];
        }
    }

    async getListEvents(params: EventQueryParams): Promise<{ data: Event[], pagination: any, countEventsByAuthorizing?: number } | null> {
        const pageNumber = Math.max(1, Number(params.pageNumber) || 1);
        const pageLength = Math.max(1, Number(params.pageLength) || 10);
        const offset = (pageNumber - 1) * pageLength;

        const whereClauses: string[] = ['1=1'];
        const queryParams: any[] = [];
        const countQueryParams: any[] = [];

        // Search (client name, email, phone, empresa, folio)
        if (params.search && params.search.trim() !== '') {
            const cleanSearch = params.search.trim().replace(/^CO-0*/i, '');
            const searchClause = `(
                cliente.full_name LIKE ? OR 
                cliente.email LIKE ? OR 
                cliente.num_tel LIKE ? OR 
                empresas.empresa LIKE ? OR 
                evento.id = ? OR 
                CAST(evento.id AS CHAR) LIKE ?
            )`;
            whereClauses.push(searchClause);
            const likeTerm = `%${params.search.trim()}%`;
            queryParams.push(likeTerm, likeTerm, likeTerm, likeTerm, cleanSearch, `%${cleanSearch}%`);
            countQueryParams.push(likeTerm, likeTerm, likeTerm, likeTerm, cleanSearch, `%${cleanSearch}%`);
        }

        // Filter solver
        if (params.filterSolver && params.filterSolver !== '-1' && params.filterSolver !== '') {
            whereClauses.push(`evento.agente_id = ?`);
            queryParams.push(Number(params.filterSolver));
            countQueryParams.push(Number(params.filterSolver));
        }

        // Filter status
        if (params.filterStatus !== undefined && params.filterStatus !== null && params.filterStatus !== '-1' && params.filterStatus !== '') {
            whereClauses.push(`evento.estatus = ?`);
            queryParams.push(Number(params.filterStatus));
            countQueryParams.push(Number(params.filterStatus));
        }

        // Filter inventory
        if (params.filterInventory && params.filterInventory !== '-1' && params.filterInventory !== '') {
            if (params.filterInventory === 'Available') {
                whereClauses.push(`NOT EXISTS (SELECT 1 FROM producto_autorizado WHERE producto_autorizado.evento_id = evento.id)`);
            } else if (params.filterInventory === 'SoldOut') {
                whereClauses.push(`EXISTS (SELECT 1 FROM producto_autorizado WHERE producto_autorizado.evento_id = evento.id)`);
            }
        }

        // Filter Date
        if (params.filterDate && params.filterDate.trim() !== '') {
            const parts = params.filterDate.split('|');
            if (parts.length === 2 && parts[0] && parts[1]) {
                whereClauses.push(`evento.fecha_entrega >= ? AND evento.fecha_recoleccion <= ?`);
                queryParams.push(parts[0].trim(), parts[1].trim());
                countQueryParams.push(parts[0].trim(), parts[1].trim());
            } else {
                whereClauses.push(`(evento.fecha_evento = ? OR evento.fecha_cotizacion LIKE ?)`);
                queryParams.push(params.filterDate.trim(), `%${params.filterDate.trim()}%`);
                countQueryParams.push(params.filterDate.trim(), `%${params.filterDate.trim()}%`);
            }
        }

        // Filter Payment
        if (params.filterPayment && params.filterPayment !== '-1' && params.filterPayment !== '') {
            if (params.filterPayment === 'paid') {
                whereClauses.push(`evento.status_pago = 1`);
            } else if (params.filterPayment === 'pending') {
                whereClauses.push(`(evento.status_pago = 0 OR evento.status_pago IS NULL)`);
            }
        }

        // Filter Payment Type
        if (params.filterPaymentType && params.filterPaymentType !== '-1' && params.filterPaymentType !== '') {
            const typeMap: Record<string, number> = {
                sample: 1,
                promotion: 2,
                transfer: 3,
                exchange: 4,
                cash: 5,
                credit: 6,
                paid_in_full: 7
            };
            if (typeMap[params.filterPaymentType]) {
                whereClauses.push(`evento.tipo_pago = ?`);
                queryParams.push(typeMap[params.filterPaymentType]);
                countQueryParams.push(typeMap[params.filterPaymentType]);
            }
        }

        // Logistics Status
        if (params.logisticsStatus && params.logisticsStatus !== '-1' && params.logisticsStatus !== '') {
            const lStatus = Number(params.logisticsStatus);
            if (lStatus === 1) { // Nota de pérdida
                whereClauses.push(`evento.status_recibido = 1`);
            } else if (lStatus === 2) { // Finalizado
                whereClauses.push(`evento.status_recibido = 2`);
            } else if (lStatus === 3) { // Pendiente
                whereClauses.push(`evento.status_entrega = 1 AND (evento.status_recibido NOT IN (1, 2) OR evento.status_recibido IS NULL) AND evento.estatus IN (2, 3)`);
            } else if (lStatus === 4) { // No confirmado
                whereClauses.push(`(evento.estatus NOT IN (2, 3, 6))`);
            } else if (lStatus === 20) {
                whereClauses.push(`evento.status_entrega = 20`);
            } else if (lStatus === 21) {
                whereClauses.push(`evento.status_entrega = 21`);
            }
        }

        // Por autorizar toggle
        if (params.byAuthorizing) {
            whereClauses.push(`evento.estatus = 1`);
        }

        // Order By
        let orderClause = 'ORDER BY evento.id DESC';
        if (params.orderBy === 0 || params.orderBy === '0') {
            orderClause = 'ORDER BY STR_TO_DATE(evento.fecha_evento, "%Y-%m-%d") ASC, evento.id DESC';
        }

        const whereSql = whereClauses.join(' AND ');

        const sql = `
            SELECT evento.*, 
                   cliente.full_name AS cliente,
                   cliente.num_tel,
                   cliente.email,
                   empresas.empresa,
                   users.name AS agente,
                   tipo_evento.evento AS tipo_evento_nombre,
                   GROUP_CONCAT(DISTINCT categorias_producto_por_evento.categoria_id) AS categorias,
                   (SELECT COUNT(*) FROM producto_autorizado 
                    WHERE producto_autorizado.evento_id = evento.id) > 0 AS status_sobrevendido
            FROM evento
            LEFT JOIN persona_fisica AS cliente ON cliente.id = evento.cliente_id
            LEFT JOIN empresas ON empresas.id = cliente.empresa_id
            LEFT JOIN users ON users.id = evento.agente_id
            LEFT JOIN tipo_evento ON tipo_evento.id = evento.tipo_evento
            LEFT JOIN categorias_producto_por_evento ON categorias_producto_por_evento.evento_id = evento.id
            WHERE ${whereSql}
            GROUP BY evento.id
            ${orderClause}
            LIMIT ? OFFSET ?
        `;

        try {
            queryParams.push(pageLength, offset);
            const [rows] = await db.query<RowDataPacket[]>(sql, queryParams);

            // Mapear las filas al tipo `Event`
            const events: Event[] = (rows || []).map(row => ({
                id: row.id.toString(),
                fecha_cotizacion: row.fecha_cotizacion,
                cliente_id: row.cliente_id?.toString() || '',
                agente_id: row.agente_id?.toString() || '',
                estatus: Number(row.estatus) || 0,
                tipo_venta: Number(row.tipo_venta) || 0,
                tipo_evento: Number(row.tipo_evento) || 0,
                no_personas: Number(row.no_personas) || 0,
                deposito: Number(row.deposito) || 0,
                status_deposito: Number(row.status_deposito) || 0,
                status_pago: Number(row.status_pago) || 0,
                status_recibido: Number(row.status_recibido) || 0,
                status_firmas: row.status_firmas || '',
                firma: row.firma || '',
                fecha_evento: row.fecha_evento,
                hora_evento: row.hora_evento,
                fecha_entrega: row.fecha_entrega,
                hora_entrega: row.hora_entrega,
                fecha_recoleccion: row.fecha_recoleccion,
                hora_recoleccion: row.hora_recoleccion,
                tipo_pago: Number(row.tipo_pago) || 0,
                domicilio_entrega: row.domicilio_entrega,
                domicilio_recoleccion: row.domicilio_recoleccion,
                status_entrega: row.status_entrega,
                lavado_desinfeccion: row.lavado_desinfeccion,
                descuento: Number(row.descuento) || 0,
                correct_datos: row.correct_datos === 1,
                accept_politicas: row.accept_politicas === 1,
                url_seguimiento: row.url_seguimiento,
                descuento_lavado: Number(row.descuento_lavado) || 0,
                firma_logistica: row.firma_logistica,
                created_at: row.created_at,
                updated_at: row.updated_at,
                cliente: row.cliente,
                num_tel: row.num_tel,
                email: row.email,
                empresa: row.empresa,
                agente: row.agente,
                tipo_evento_nombre: row.tipo_evento_nombre,
                categorias: row.categorias,
                status_sobrevendido: row.status_sobrevendido ? 1 : 0
            }));

            // Obtener el total de registros para la paginación
            const totalSql = `
                SELECT COUNT(DISTINCT evento.id) AS total 
                FROM evento
                LEFT JOIN persona_fisica AS cliente ON cliente.id = evento.cliente_id
                LEFT JOIN empresas ON empresas.id = cliente.empresa_id
                LEFT JOIN users ON users.id = evento.agente_id
                WHERE ${whereSql}
            `;
            const [totalRows] = await db.query<RowDataPacket[]>(totalSql, countQueryParams);
            const total = totalRows[0]?.total || 0;

            // Conteo por autorizar
            const countAuthSql = `SELECT COUNT(*) AS count FROM evento WHERE estatus = 1`;
            const [authRows] = await db.query<RowDataPacket[]>(countAuthSql);
            const countEventsByAuthorizing = authRows[0]?.count || 0;

            return {
                data: events,
                countEventsByAuthorizing,
                pagination: {
                    total,
                    current_page: pageNumber,
                    per_page: pageLength,
                    total_pages: Math.ceil(total / pageLength) || 1,
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

    async deleteEvent(event_id: number): Promise<Event | null> {
        const sql = `DELETE FROM eventos WHERE id = ?`;
        try {
            const [rows] = await db.query(sql, [event_id]);
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
