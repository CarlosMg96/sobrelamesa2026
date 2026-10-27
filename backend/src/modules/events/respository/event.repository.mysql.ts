import { EventRepository, EventQueryParams } from "./event.repository";
import { Event, EventDetailResponse, CatalogsResponse, SaveQuoteDTO, QuoteProductItem, QuoteContentItem } from "../interfaces/event";
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

    async getCalendarEvents(startDate: string, endDate: string, filterByDate: string = 'event_date'): Promise<Event[]> {
        try {
            const baseSelect = `
                SELECT evento.*, 
                       cliente.full_name AS cliente,
                       cliente.num_tel,
                       cliente.email,
                       empresas.empresa,
                       users.name AS agente,
                       tipo_evento.evento AS tipo_evento_nombre,
                       GROUP_CONCAT(DISTINCT categorias_producto_por_evento.categoria_id) AS categorias,
                       (SELECT COUNT(*) FROM producto_autorizado 
                        WHERE producto_autorizado.evento_id = evento.id) > 0 AS status_sobrevendido,
                       (SELECT c.comentario FROM comentarios_internos c 
                        WHERE c.evento_id = evento.id ORDER BY c.id DESC LIMIT 1) AS ultimo_comentario
                FROM evento
                LEFT JOIN persona_fisica AS cliente ON cliente.id = evento.cliente_id
                LEFT JOIN empresas ON empresas.id = cliente.empresa_id
                LEFT JOIN users ON users.id = evento.agente_id
                LEFT JOIN tipo_evento ON tipo_evento.id = evento.tipo_evento
                LEFT JOIN categorias_producto_por_evento ON categorias_producto_por_evento.evento_id = evento.id
            `;

            const results: Event[] = [];

            if (filterByDate === 'start_date' || filterByDate === 'fecha_entrega') {
                const sql = `
                    ${baseSelect}
                    WHERE evento.fecha_entrega BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_entrega ASC, evento.hora_entrega ASC
                `;
                const [rows] = await db.query<RowDataPacket[]>(sql, [startDate, endDate]);
                rows.forEach(r => {
                    results.push({ ...(r as any), filtrado_por: 'fecha_entrega' });
                });
            } else if (filterByDate === 'end_date' || filterByDate === 'fecha_recoleccion') {
                const sql = `
                    ${baseSelect}
                    WHERE evento.fecha_recoleccion BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_recoleccion ASC, evento.hora_recoleccion ASC
                `;
                const [rows] = await db.query<RowDataPacket[]>(sql, [startDate, endDate]);
                rows.forEach(r => {
                    results.push({ ...(r as any), filtrado_por: 'fecha_recoleccion' });
                });
            } else {
                // Default: Both deliveries and collections in the date window
                const sqlDeliveries = `
                    ${baseSelect}
                    WHERE evento.fecha_entrega BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_entrega ASC, evento.hora_entrega ASC
                `;
                const [delRows] = await db.query<RowDataPacket[]>(sqlDeliveries, [startDate, endDate]);
                delRows.forEach(r => {
                    results.push({ ...(r as any), filtrado_por: 'fecha_entrega' });
                });

                const sqlCollections = `
                    ${baseSelect}
                    WHERE evento.fecha_recoleccion BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_recoleccion ASC, evento.hora_recoleccion ASC
                `;
                const [colRows] = await db.query<RowDataPacket[]>(sqlCollections, [startDate, endDate]);
                colRows.forEach(r => {
                    results.push({ ...(r as any), filtrado_por: 'fecha_recoleccion' });
                });
            }

            return results;
        } catch (error) {
            console.error('Error in getCalendarEvents', error);
            return [];
        }
    }

    async addComment(eventoId: number, comment: string, userId: number, userName: string): Promise<any> {
        try {
            const sql = `INSERT INTO comentarios_internos (evento_id, comentario, user_id, user_name) VALUES (?, ?, ?, ?)`;
            const [res] = await db.query(sql, [eventoId, comment, userId || 0, userName || 'Usuario']);
            return res;
        } catch (error) {
            console.error('Error in addComment', error);
            throw error;
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
            console.error('Error in getEvent', error);
            return null;
        }
    }

    async getEventDetail(event_id: number): Promise<EventDetailResponse | null> {
        try {
            const eventSql = `
                SELECT evento.*, 
                       cliente.full_name AS cliente,
                       cliente.num_tel,
                       cliente.email,
                       cliente.direccion AS cliente_direccion,
                       empresas.empresa,
                       empresas.descuento_empresa,
                       users.name AS agente,
                       tipo_evento.evento AS tipo_evento_nombre
                FROM evento
                LEFT JOIN persona_fisica AS cliente ON cliente.id = evento.cliente_id
                LEFT JOIN empresas ON empresas.id = cliente.empresa_id
                LEFT JOIN users ON users.id = evento.agente_id
                LEFT JOIN tipo_evento ON tipo_evento.id = evento.tipo_evento
                WHERE evento.id = ?
            `;
            const [eventRows] = await db.query<RowDataPacket[]>(eventSql, [event_id]);
            if (!eventRows.length) return null;

            const event = eventRows[0] as Event;

            const productsSql = `
                SELECT de.id,
                       de.producto_id,
                       de.cantidad,
                       de.precio_producto,
                       COALESCE(de.descuento, 0) AS descuento,
                       COALESCE(de.dias, 1) AS dias,
                       COALESCE(de.row_position, 0) AS row_position,
                       COALESCE(de.authorized, 0) AS status_authorized,
                       pa.id AS pa_id,
                       pa.cantidad AS pa_cantidad,
                       p.clave,
                       p.producto,
                       p.imagen,
                       p.stock,
                       p.precio_renta,
                       cp.categoria
                FROM detalle_evento de
                JOIN producto p ON p.id = de.producto_id
                LEFT JOIN categoria_producto cp ON cp.id = p.categoria_producto_id
                LEFT JOIN producto_autorizado pa ON pa.detalle_id = de.id
                WHERE de.evento_id = ?
                ORDER BY de.row_position ASC, de.id ASC
            `;
            const [productRows] = await db.query<RowDataPacket[]>(productsSql, [event_id]);
            const products: QuoteProductItem[] = productRows.map(r => {
                const isAuth = Number(r.status_authorized) === 1 || Number(r.pa_id) > 0;
                const qtyAuth = isAuth ? Number(r.pa_cantidad || r.cantidad) : 0;
                return {
                    id: Number(r.id),
                    producto_id: Number(r.producto_id),
                    cantidad: Number(r.cantidad),
                    precio_producto: Number(r.precio_producto),
                    descuento: Number(r.descuento) || 0,
                    dias: Number(r.dias) || 1,
                    row_position: Number(r.row_position) || 0,
                    row_status: 'exists',
                    status_authorized: isAuth ? 1 : 0,
                    quantity_authorized: qtyAuth,
                    clave: r.clave,
                    producto: r.producto,
                    imagen: r.imagen,
                    categoria: r.categoria,
                    stock: Number(r.stock) || 0,
                    subtotal: (Number(r.cantidad) * Number(r.precio_producto) * (Number(r.dias) || 1)) * (1 - (Number(r.descuento) || 0) / 100)
                };
            });

            const contentsSql = `
                SELECT id, evento_id, content_seccion, type, row_position
                FROM detalle_evento_content
                WHERE evento_id = ?
                ORDER BY row_position ASC, id ASC
            `;
            const [contentRows] = await db.query<RowDataPacket[]>(contentsSql, [event_id]);
            const contents: QuoteContentItem[] = contentRows.map(r => ({
                id: Number(r.id),
                evento_id: Number(r.evento_id),
                content_seccion: r.content_seccion,
                type: Number(r.type),
                row_position: Number(r.row_position) || 0,
                row_status: 'exists'
            }));

            const commentsSql = `
                SELECT id, comentario, user_name, created_at
                FROM comentarios_internos
                WHERE evento_id = ?
                ORDER BY created_at DESC
            `;
            const [commentRows] = await db.query<RowDataPacket[]>(commentsSql, [event_id]);

            return {
                event,
                products,
                contents,
                comments: commentRows
            };
        } catch (error) {
            console.error('Error in getEventDetail:', error);
            return null;
        }
    }

    async getCatalogs(): Promise<CatalogsResponse> {
        try {
            const clientsSql = `
                SELECT pf.id, 
                       pf.full_name, 
                       pf.email, 
                       pf.num_tel, 
                       pf.direccion, 
                       pf.empresa_id,
                       e.empresa, 
                       e.descuento_empresa
                FROM persona_fisica pf
                LEFT JOIN empresas e ON e.id = pf.empresa_id
                WHERE pf.status = 1
                ORDER BY pf.full_name ASC
            `;
            const [clients] = await db.query<RowDataPacket[]>(clientsSql);

            const agentsSql = `
                SELECT id, name, email 
                FROM users 
                WHERE status = 1 
                ORDER BY name ASC
            `;
            const [agents] = await db.query<RowDataPacket[]>(agentsSql);

            const typesSql = `
                SELECT id, evento 
                FROM tipo_evento 
                WHERE status = 1 AND evento IS NOT NULL AND evento != '' 
                ORDER BY evento ASC
            `;
            const [eventTypes] = await db.query<RowDataPacket[]>(typesSql);

            const placesSql = `
                SELECT id, nombre, direccion 
                FROM lugar 
                WHERE status = 1 
                ORDER BY nombre ASC
            `;
            const [places] = await db.query<RowDataPacket[]>(placesSql);

            const paymentTypes = [
                { id: 1, name: 'Muestra' },
                { id: 2, name: 'Promoción' },
                { id: 3, name: 'Transferencia' },
                { id: 4, name: 'Intercambio' },
                { id: 5, name: 'Efectivo' },
                { id: 6, name: 'Con Crédito' },
                { id: 7, name: 'De Contado' }
            ];

            return {
                clients,
                agents,
                eventTypes,
                places,
                paymentTypes
            };
        } catch (error) {
            console.error('Error in getCatalogs:', error);
            return {
                clients: [],
                agents: [],
                eventTypes: [],
                places: [],
                paymentTypes: []
            };
        }
    }

    async authorizeStockProduct(password: string): Promise<{ authorized: boolean; message: string }> {
        try {
            if (!password || !password.trim()) {
                return { authorized: false, message: 'Contraseña requerida' };
            }
            const sql = `SELECT id FROM users WHERE pwds = ? AND status = 1 LIMIT 1`;
            const [rows] = await db.query<RowDataPacket[]>(sql, [password.trim()]);
            if (rows && rows.length > 0) {
                return { authorized: true, message: 'Producto autorizado correctamente' };
            }
            return { authorized: false, message: 'Contraseña de autorización incorrecta' };
        } catch (error) {
            console.error('Error in authorizeStockProduct:', error);
            return { authorized: false, message: 'Ocurrió un error al validar la contraseña' };
        }
    }

    async saveOrUpdateQuote(dto: SaveQuoteDTO, userId?: number, userName?: string): Promise<{ id: number; message: string; url_seguimiento?: string }> {
        const poolConn = await db.getConnection();
        await poolConn.beginTransaction();

        try {
            let eventId = Number(dto.id);
            let action = "Edición";

            if (eventId && eventId > 0) {
                const updateSql = `
                    UPDATE evento SET
                        fecha_cotizacion = ?,
                        cliente_id = ?,
                        agente_id = ?,
                        tipo_evento = ?,
                        no_personas = ?,
                        domicilio_entrega = ?,
                        domicilio_recoleccion = ?,
                        fecha_evento = ?,
                        hora_evento = ?,
                        fecha_entrega = ?,
                        hora_entrega = ?,
                        tipo_horario_entrega = ?,
                        hora_entrega_fin = ?,
                        fecha_recoleccion = ?,
                        hora_recoleccion = ?,
                        tipo_horario_recoleccion = ?,
                        hora_recoleccion_fin = ?,
                        tipo_pago = ?,
                        descuento = ?,
                        deposito = ?,
                        status_deposito = ?,
                        lavado_desinfeccion = ?,
                        descuento_lavado = ?,
                        tipo_venta = ?,
                        estatus = COALESCE(?, estatus),
                        updated_at = NOW()
                    WHERE id = ?
                `;
                await poolConn.query(updateSql, [
                    dto.fecha_cotizacion,
                    dto.cliente_id,
                    dto.agente_id,
                    dto.tipo_evento,
                    dto.no_personas || 0,
                    dto.domicilio_entrega || '',
                    dto.domicilio_recoleccion || '',
                    dto.fecha_evento,
                    dto.hora_evento || '12:00:00',
                    dto.fecha_entrega || '0000-00-00',
                    dto.hora_entrega || '12:00:00',
                    dto.tipo_horario_entrega || 'ESPECIFICO',
                    dto.hora_entrega_fin || null,
                    dto.fecha_recoleccion || '0000-00-00',
                    dto.hora_recoleccion || '12:00:00',
                    dto.tipo_horario_recoleccion || 'ESPECIFICO',
                    dto.hora_recoleccion_fin || null,
                    dto.tipo_pago || 1,
                    dto.descuento || 0,
                    dto.deposito !== undefined ? dto.deposito : 1,
                    dto.status_deposito !== undefined ? dto.status_deposito : 0,
                    String(dto.lavado_desinfeccion || '0'),
                    dto.descuento_lavado || 0,
                    dto.tipo_venta || 1,
                    dto.estatus !== undefined ? dto.estatus : null,
                    eventId
                ]);
            } else {
                action = "Creación";
                const insertSql = `
                    INSERT INTO evento (
                        fecha_cotizacion, cliente_id, agente_id, tipo_evento,
                        no_personas, domicilio_entrega, domicilio_recoleccion,
                        fecha_evento, hora_evento, fecha_entrega, hora_entrega,
                        tipo_horario_entrega, hora_entrega_fin, fecha_recoleccion,
                        hora_recoleccion, tipo_horario_recoleccion, hora_recoleccion_fin,
                        tipo_pago, descuento, deposito, status_deposito, lavado_desinfeccion, descuento_lavado,
                        tipo_venta, estatus, url_seguimiento, status_entrega, status_recibido,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, 1, NOW(), NOW())
                `;
                const [insertRes]: any = await poolConn.query(insertSql, [
                    dto.fecha_cotizacion,
                    dto.cliente_id,
                    dto.agente_id,
                    dto.tipo_evento,
                    dto.no_personas || 0,
                    dto.domicilio_entrega || '',
                    dto.domicilio_recoleccion || '',
                    dto.fecha_evento,
                    dto.hora_evento || '12:00:00',
                    dto.fecha_entrega || '0000-00-00',
                    dto.hora_entrega || '12:00:00',
                    dto.tipo_horario_entrega || 'ESPECIFICO',
                    dto.hora_entrega_fin || null,
                    dto.fecha_recoleccion || '0000-00-00',
                    dto.hora_recoleccion || '12:00:00',
                    dto.tipo_horario_recoleccion || 'ESPECIFICO',
                    dto.hora_recoleccion_fin || null,
                    dto.tipo_pago || 1,
                    dto.descuento || 0,
                    dto.deposito !== undefined ? dto.deposito : 1,
                    dto.status_deposito !== undefined ? dto.status_deposito : 0,
                    String(dto.lavado_desinfeccion || '0'),
                    dto.descuento_lavado || 0,
                    dto.tipo_venta || 1,
                    dto.estatus !== undefined ? dto.estatus : 1
                ]);

                eventId = insertRes.insertId;

                const shortHash = Buffer.from(String(eventId)).toString('base64');
                const urlSeguimiento = `https://sobre-la-mesa.com/cotizacion/${shortHash}`;
                await poolConn.query(`UPDATE evento SET url_seguimiento = ? WHERE id = ?`, [urlSeguimiento, eventId]);
            }

            // Reconciliación de Detalle de Productos (detalle_evento)
            if (dto.products) {
                const activeProductDetailIds = dto.products
                    .filter(p => p.row_status !== 'deleted' && p.row_status !== 'cancelled' && p.id && Number(p.id) > 0)
                    .map(p => Number(p.id));

                if (activeProductDetailIds.length > 0) {
                    await poolConn.query(
                        `DELETE FROM producto_autorizado WHERE evento_id = ? AND detalle_id NOT IN (?)`,
                        [eventId, activeProductDetailIds]
                    );
                    await poolConn.query(
                        `DELETE FROM detalle_evento WHERE evento_id = ? AND id NOT IN (?)`,
                        [eventId, activeProductDetailIds]
                    );
                } else if (dto.products.length === 0) {
                    await poolConn.query(`DELETE FROM producto_autorizado WHERE evento_id = ?`, [eventId]);
                    await poolConn.query(`DELETE FROM detalle_evento WHERE evento_id = ?`, [eventId]);
                }

                for (let i = 0; i < dto.products.length; i++) {
                    const prod = dto.products[i];
                    if (prod.row_status === 'deleted' || prod.row_status === 'cancelled') {
                        if (prod.id) {
                            await poolConn.query(`DELETE FROM producto_autorizado WHERE detalle_id = ?`, [prod.id]);
                            await poolConn.query(`DELETE FROM detalle_evento WHERE id = ?`, [prod.id]);
                        }
                        continue;
                    }

                    const isAuthorized = prod.status_authorized === 1 || prod.status_authorized === true ? 1 : 0;
                    const rowPos = prod.row_position !== undefined ? prod.row_position : i;
                    let detailId = Number(prod.id) || 0;

                    if (detailId > 0) {
                        await poolConn.query(
                            `UPDATE detalle_evento SET 
                                producto_id = ?, 
                                cantidad = ?, 
                                precio_producto = ?, 
                                descuento = ?, 
                                dias = ?, 
                                row_position = ?,
                                authorized = ?,
                                updated_at = NOW()
                             WHERE id = ? AND evento_id = ?`,
                            [
                                prod.producto_id,
                                prod.cantidad,
                                prod.precio_producto,
                                prod.descuento || 0,
                                prod.dias || 1,
                                rowPos,
                                isAuthorized,
                                detailId,
                                eventId
                            ]
                        );
                    } else {
                        const [detInsertRes]: any = await poolConn.query(
                            `INSERT INTO detalle_evento (
                                evento_id, producto_id, cantidad, precio_producto,
                                descuento, dias, row_position, cantidad_recibida,
                                agregado_por, agregado_en, authorized, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'c', ?, NOW(), NOW())`,
                            [
                                eventId,
                                prod.producto_id,
                                prod.cantidad,
                                prod.precio_producto,
                                prod.descuento || 0,
                                prod.dias || 1,
                                rowPos,
                                userName || 'Sistema',
                                isAuthorized
                            ]
                        );
                        detailId = detInsertRes.insertId;
                    }

                    // Sincronizar con tabla producto_autorizado (igual que en php7/slm)
                    if (isAuthorized === 1 && detailId > 0) {
                        const [existingAuth] = await poolConn.query<RowDataPacket[]>(
                            `SELECT id FROM producto_autorizado WHERE evento_id = ? AND detalle_id = ? LIMIT 1`,
                            [eventId, detailId]
                        );
                        if (existingAuth && existingAuth.length > 0) {
                            await poolConn.query(
                                `UPDATE producto_autorizado SET 
                                    producto_id = ?, 
                                    cantidad = ?, 
                                    row_position = ?, 
                                    updated_at = NOW() 
                                 WHERE id = ?`,
                                [prod.producto_id, prod.cantidad, rowPos, existingAuth[0].id]
                            );
                        } else {
                            await poolConn.query(
                                `INSERT INTO producto_autorizado (
                                    evento_id, producto_id, detalle_id, agente_id, row_position, cantidad, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                                [eventId, prod.producto_id, detailId, userId || dto.agente_id || 1, rowPos, prod.cantidad]
                            );
                        }
                    } else if (detailId > 0) {
                        await poolConn.query(
                            `DELETE FROM producto_autorizado WHERE evento_id = ? AND detalle_id = ?`,
                            [eventId, detailId]
                        );
                    }
                }
            }

            // Reconciliación de Secciones y Notas (detalle_evento_content)
            if (dto.contents) {
                const activeContentIds = dto.contents
                    .filter(c => c.row_status !== 'deleted' && c.id && Number(c.id) > 0)
                    .map(c => Number(c.id));

                if (activeContentIds.length > 0) {
                    await poolConn.query(
                        `DELETE FROM detalle_evento_content WHERE evento_id = ? AND id NOT IN (?)`,
                        [eventId, activeContentIds]
                    );
                } else if (dto.contents.length === 0) {
                    await poolConn.query(`DELETE FROM detalle_evento_content WHERE evento_id = ?`, [eventId]);
                }

                for (let i = 0; i < dto.contents.length; i++) {
                    const cont = dto.contents[i];
                    if (cont.row_status === 'deleted') {
                        if (cont.id) {
                            await poolConn.query(`DELETE FROM detalle_evento_content WHERE id = ?`, [cont.id]);
                        }
                        continue;
                    }

                    if (cont.id && Number(cont.id) > 0) {
                        await poolConn.query(
                            `UPDATE detalle_evento_content SET 
                                content_seccion = ?, 
                                type = ?, 
                                row_position = ?,
                                updated_at = NOW()
                             WHERE id = ? AND evento_id = ?`,
                            [
                                cont.content_seccion,
                                cont.type,
                                cont.row_position !== undefined ? cont.row_position : i,
                                cont.id,
                                eventId
                            ]
                        );
                    } else {
                        await poolConn.query(
                            `INSERT INTO detalle_evento_content (
                                evento_id, content_seccion, type, row_position, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
                            [
                                eventId,
                                cont.content_seccion,
                                cont.type,
                                cont.row_position !== undefined ? cont.row_position : i
                            ]
                        );
                    }
                }
            }

            await poolConn.commit();

            const [evtRows] = await poolConn.query<RowDataPacket[]>(`SELECT url_seguimiento FROM evento WHERE id = ?`, [eventId]);
            const url_seguimiento = evtRows[0]?.url_seguimiento || '';

            return {
                id: eventId,
                message: action === "Creación" ? "Cotización creada con éxito" : "Cotización actualizada con éxito",
                url_seguimiento
            };

        } catch (error) {
            await poolConn.rollback();
            console.error('Error in saveOrUpdateQuote:', error);
            throw error;
        } finally {
            poolConn.release();
        }
    }
}
