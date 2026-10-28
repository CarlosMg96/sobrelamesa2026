import { EventRepository, EventQueryParams } from "./event.repository";
import { Event, EventDetailResponse, CatalogsResponse, SaveQuoteDTO, QuoteProductItem, QuoteContentItem, CreateQuickClientDTO, CreateQuickCompanyDTO, CreateQuickPlaceDTO } from "../interfaces/event";
import { EventMapper } from "../mappers/event.mapper";
import { db } from "../../../config/database";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import {
    ACTIVE_RESERVED_EVENT_STATUSES,
    AuthorizationFlag,
    CalendarDateFilter,
    CONFIRMED_EVENT_STATUSES,
    DEFAULT_EVENT_VALUES,
    EventOrderBy,
    FILTER_ALL_VALUE,
    InventoryFilter,
    LogisticsFilterStatus,
    PaymentFilter,
    PaymentType,
    PAYMENT_TYPES_CATALOG,
    PAYMENT_TYPE_FILTER_MAP,
    QuoteActionType,
    QuoteAddedInPhase,
    QuoteRowStatus,
    RecordStatus,
    SaleType,
    ScheduleType,
    StatusDeposito,
    StatusEntrega,
    StatusEvent,
    StatusPago,
    StatusRecibido
} from "../../../constants";

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
        if (params.filterSolver && params.filterSolver !== FILTER_ALL_VALUE && params.filterSolver !== '') {
            whereClauses.push(`evento.agente_id = ?`);
            queryParams.push(Number(params.filterSolver));
            countQueryParams.push(Number(params.filterSolver));
        }

        // Filter status
        if (params.filterStatus !== undefined && params.filterStatus !== null && params.filterStatus !== FILTER_ALL_VALUE && params.filterStatus !== '') {
            whereClauses.push(`evento.estatus = ?`);
            queryParams.push(Number(params.filterStatus));
            countQueryParams.push(Number(params.filterStatus));
        }

        // Filter inventory
        if (params.filterInventory && params.filterInventory !== FILTER_ALL_VALUE && params.filterInventory !== '') {
            if (params.filterInventory === InventoryFilter.Available) {
                whereClauses.push(`NOT EXISTS (SELECT 1 FROM producto_autorizado WHERE producto_autorizado.evento_id = evento.id)`);
            } else if (params.filterInventory === InventoryFilter.SoldOut) {
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
        if (params.filterPayment && params.filterPayment !== FILTER_ALL_VALUE && params.filterPayment !== '') {
            if (params.filterPayment === PaymentFilter.Paid) {
                whereClauses.push(`evento.status_pago = ?`);
                queryParams.push(StatusPago.Pagado);
                countQueryParams.push(StatusPago.Pagado);
            } else if (params.filterPayment === PaymentFilter.Pending) {
                whereClauses.push(`(evento.status_pago = ? OR evento.status_pago IS NULL)`);
                queryParams.push(StatusPago.Pendiente);
                countQueryParams.push(StatusPago.Pendiente);
            }
        }

        // Filter Payment Type
        if (params.filterPaymentType && params.filterPaymentType !== FILTER_ALL_VALUE && params.filterPaymentType !== '') {
            const mappedPaymentType = PAYMENT_TYPE_FILTER_MAP[params.filterPaymentType];
            if (mappedPaymentType) {
                whereClauses.push(`evento.tipo_pago = ?`);
                queryParams.push(mappedPaymentType);
                countQueryParams.push(mappedPaymentType);
            }
        }

        // Logistics Status
        if (params.logisticsStatus && params.logisticsStatus !== FILTER_ALL_VALUE && params.logisticsStatus !== '') {
            const lStatus = Number(params.logisticsStatus) as LogisticsFilterStatus;
            if (lStatus === LogisticsFilterStatus.NotaPerdida) {
                whereClauses.push(`evento.status_recibido = ?`);
                queryParams.push(StatusRecibido.NotaPerdida);
                countQueryParams.push(StatusRecibido.NotaPerdida);
            } else if (lStatus === LogisticsFilterStatus.Finalizado) {
                whereClauses.push(`evento.status_recibido = ?`);
                queryParams.push(StatusRecibido.Finalizado);
                countQueryParams.push(StatusRecibido.Finalizado);
            } else if (lStatus === LogisticsFilterStatus.Pendiente) {
                whereClauses.push(
                    `evento.status_entrega = ${StatusEntrega.Pendiente} AND (evento.status_recibido NOT IN (${StatusRecibido.NotaPerdida}, ${StatusRecibido.Finalizado}) OR evento.status_recibido IS NULL) AND evento.estatus IN (${ACTIVE_RESERVED_EVENT_STATUSES.join(', ')})`
                );
            } else if (lStatus === LogisticsFilterStatus.NoConfirmado) {
                whereClauses.push(`(evento.estatus NOT IN (${CONFIRMED_EVENT_STATUSES.join(', ')}))`);
            } else if (lStatus === LogisticsFilterStatus.EnRuta) {
                whereClauses.push(`evento.status_entrega = ?`);
                queryParams.push(StatusEntrega.EnRuta);
                countQueryParams.push(StatusEntrega.EnRuta);
            } else if (lStatus === LogisticsFilterStatus.Entregado) {
                whereClauses.push(`evento.status_entrega = ?`);
                queryParams.push(StatusEntrega.Entregado);
                countQueryParams.push(StatusEntrega.Entregado);
            }
        }

        // Por autorizar toggle
        if (params.byAuthorizing) {
            whereClauses.push(`evento.estatus = ?`);
            queryParams.push(StatusEvent.Cotizado);
            countQueryParams.push(StatusEvent.Cotizado);
        }

        // Order By
        let orderClause = 'ORDER BY evento.id DESC';
        if (Number(params.orderBy) === EventOrderBy.FechaEventoAsc && params.orderBy !== undefined && params.orderBy !== '') {
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

            const events: Event[] = (rows || []).map(row => EventMapper.toDomain(row));

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
            const countAuthSql = `SELECT COUNT(*) AS count FROM evento WHERE estatus = ?`;
            const [authRows] = await db.query<RowDataPacket[]>(countAuthSql, [StatusEvent.Cotizado]);
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
            eventData.fecha_cotizacion,
            eventData.cliente_id,
            eventData.agente_id,
            eventData.estatus ?? StatusEvent.Cotizado,
            eventData.tipo_venta ?? SaleType.Renta,
            eventData.tipo_evento,
            eventData.no_personas,
            eventData.deposito ?? DEFAULT_EVENT_VALUES.DEPOSIT_ENABLED,
            eventData.fecha_evento,
            eventData.hora_evento,
            eventData.fecha_entrega,
            eventData.hora_entrega,
            eventData.fecha_recoleccion,
            eventData.hora_recoleccion,
            eventData.tipo_pago ?? PaymentType.Muestra,
            eventData.domicilio_entrega,
            eventData.domicilio_recoleccion,
            String(StatusEntrega.Pendiente),
            eventData.descuento ?? DEFAULT_EVENT_VALUES.DISCOUNT,
            '',
            StatusRecibido.NotaPerdida,
            new Date(),
            new Date()
        ];

        try {
            const [result]: any = await db.query(sql, values);

            const newId = result.insertId;
            if (!newId) return null;

            const eventIdEncrypted = bcrypt.hashSync(newId.toString(), 10);
            const urlCotizacion = `${FRONTEND_URL}cotizacion/${encodeURIComponent(eventIdEncrypted)}`;

            const sqlUpdate = `UPDATE evento SET url_seguimiento = ? WHERE id = ?`;
            await db.query(sqlUpdate, [urlCotizacion, newId]);

            const resultEvent: Event = {
                id: newId.toString(),
                ...eventData,
                url_seguimiento: urlCotizacion,
                firma_logistica: ""
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
                return null;
            }
            return EventMapper.toDomain(row as unknown as RowDataPacket);
        } catch (error) {
            console.error('Error in updateEvent', error);
            return null;
        }
    }

    async deleteEvent(event_id: number): Promise<Event | null> {
        const sql = `DELETE FROM eventos WHERE id = ?`;
        try {
            const [rows] = await db.query(sql, [event_id]);
            const row = Array.isArray(rows) && rows.length ? rows : null;
            if (!row) {
                return null;
            }
            return EventMapper.toDomain(row as unknown as RowDataPacket);
        } catch (error) {
            console.error('Error in deleteEvent', error);
            return null;
        }
    }

    async getCalendarEvents(startDate: string, endDate: string, filterByDate: string = CalendarDateFilter.EventDate): Promise<Event[]> {
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

            if (filterByDate === CalendarDateFilter.StartDate || filterByDate === CalendarDateFilter.FechaEntrega) {
                const sql = `
                    ${baseSelect}
                    WHERE evento.fecha_entrega BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_entrega ASC, evento.hora_entrega ASC
                `;
                const [rows] = await db.query<RowDataPacket[]>(sql, [startDate, endDate]);
                rows.forEach(r => {
                    results.push({ ...EventMapper.toDomain(r), filtrado_por: CalendarDateFilter.FechaEntrega });
                });
            } else if (filterByDate === CalendarDateFilter.EndDate || filterByDate === CalendarDateFilter.FechaRecoleccion) {
                const sql = `
                    ${baseSelect}
                    WHERE evento.fecha_recoleccion BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_recoleccion ASC, evento.hora_recoleccion ASC
                `;
                const [rows] = await db.query<RowDataPacket[]>(sql, [startDate, endDate]);
                rows.forEach(r => {
                    results.push({ ...EventMapper.toDomain(r), filtrado_por: CalendarDateFilter.FechaRecoleccion });
                });
            } else {
                const sqlDeliveries = `
                    ${baseSelect}
                    WHERE evento.fecha_entrega BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_entrega ASC, evento.hora_entrega ASC
                `;
                const [delRows] = await db.query<RowDataPacket[]>(sqlDeliveries, [startDate, endDate]);
                delRows.forEach(r => {
                    results.push({ ...EventMapper.toDomain(r), filtrado_por: CalendarDateFilter.FechaEntrega });
                });

                const sqlCollections = `
                    ${baseSelect}
                    WHERE evento.fecha_recoleccion BETWEEN ? AND ?
                    GROUP BY evento.id
                    ORDER BY evento.fecha_recoleccion ASC, evento.hora_recoleccion ASC
                `;
                const [colRows] = await db.query<RowDataPacket[]>(sqlCollections, [startDate, endDate]);
                colRows.forEach(r => {
                    results.push({ ...EventMapper.toDomain(r), filtrado_por: CalendarDateFilter.FechaRecoleccion });
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
            let resolvedUserName = (userName || '').trim();
            if ((!resolvedUserName || resolvedUserName === 'Usuario') && userId > 0) {
                const [userRows] = await db.query<RowDataPacket[]>(
                    `SELECT name FROM users WHERE id = ? LIMIT 1`,
                    [userId]
                );
                if (userRows && userRows.length > 0 && userRows[0].name) {
                    resolvedUserName = String(userRows[0].name).trim();
                }
            }
            if (!resolvedUserName) {
                resolvedUserName = 'Usuario';
            }

            const sql = `INSERT INTO comentarios_internos (evento_id, comentario, user_id, user_name) VALUES (?, ?, ?, ?)`;
            const [res]: any = await db.query(sql, [eventoId, comment, userId || 0, resolvedUserName]);
            return {
                id: res?.insertId,
                evento_id: eventoId,
                comentario: comment,
                user_id: userId || 0,
                user_name: resolvedUserName,
                created_at: new Date()
            };
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

            return EventMapper.toDomain(rows[0]);
        } catch (error) {
            console.error('Error in getEvent', error);
            return null;
        }
    }

    private catalogsCache: { data: CatalogsResponse; expiresAt: number } | null = null;

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
                       tipo_evento.evento AS tipo_evento_nombre,
                       le.direccion AS lugar_entrega_direccion,
                       lr.direccion AS lugar_recoleccion_direccion
                FROM evento
                LEFT JOIN persona_fisica AS cliente ON cliente.id = evento.cliente_id
                LEFT JOIN empresas ON empresas.id = cliente.empresa_id
                LEFT JOIN users ON users.id = evento.agente_id
                LEFT JOIN tipo_evento ON tipo_evento.id = evento.tipo_evento
                LEFT JOIN lugar AS le ON le.nombre = evento.domicilio_entrega AND le.status = 1
                LEFT JOIN lugar AS lr ON lr.nombre = evento.domicilio_recoleccion AND lr.status = 1
                WHERE evento.id = ?
                LIMIT 1
            `;

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
                       p.medidas,
                       COALESCE(p.precio_reposicion, 0) AS precio_reposicion,
                       p.imagen,
                       p.stock,
                       p.precio_renta,
                       p.categoria_producto_id,
                       p.subcategoria_id,
                       cp.categoria
                FROM detalle_evento de
                JOIN producto p ON p.id = de.producto_id
                LEFT JOIN categoria_producto cp ON cp.id = p.categoria_producto_id
                LEFT JOIN producto_autorizado pa ON pa.detalle_id = de.id
                WHERE de.evento_id = ?
                ORDER BY de.row_position ASC, de.id ASC
            `;

            const contentsSql = `
                SELECT id, evento_id, content_seccion, type, row_position
                FROM detalle_evento_content
                WHERE evento_id = ?
                ORDER BY row_position ASC, id ASC
            `;

            const commentsSql = `
                SELECT id, comentario, user_name, created_at
                FROM comentarios_internos
                WHERE evento_id = ?
                ORDER BY created_at DESC
            `;

            const [
                [eventRows],
                [productRows],
                [contentRows],
                [commentRows]
            ] = await Promise.all([
                db.query<RowDataPacket[]>(eventSql, [event_id]),
                db.query<RowDataPacket[]>(productsSql, [event_id]),
                db.query<RowDataPacket[]>(contentsSql, [event_id]),
                db.query<RowDataPacket[]>(commentsSql, [event_id])
            ]);

            if (!eventRows.length) return null;

            const event = eventRows[0] as Event;
            const products: QuoteProductItem[] = productRows.map(r => EventMapper.toQuoteProductItem(r));
            const contents: QuoteContentItem[] = contentRows.map(r => EventMapper.toQuoteContentItem(r));

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
            if (this.catalogsCache && Date.now() < this.catalogsCache.expiresAt) {
                return this.catalogsCache.data;
            }

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
                WHERE pf.status = ?
                ORDER BY pf.full_name ASC
            `;

            const agentsSql = `
                SELECT id, name, email 
                FROM users 
                WHERE status = ? 
                ORDER BY name ASC
            `;

            const typesSql = `
                SELECT id, evento 
                FROM tipo_evento 
                WHERE status = ? AND evento IS NOT NULL AND evento != '' 
                ORDER BY evento ASC
            `;

            const placesSql = `
                SELECT id, nombre, direccion 
                FROM lugar 
                WHERE status = ? 
                ORDER BY nombre ASC
            `;

            const companiesSql = `
                SELECT id, empresa, clave_empresa, rfc, descuento_empresa, forma_pago_autorizada, tipo_empresa
                FROM empresas 
                WHERE status = ? 
                ORDER BY empresa ASC
            `;

            const clientTypesSql = `
                SELECT * FROM tipo_cliente WHERE status = ? ORDER BY id ASC
            `;

            const [
                [clients],
                [agents],
                [eventTypes],
                [places],
                [companies],
                [rawClientTypes]
            ] = await Promise.all([
                db.query<RowDataPacket[]>(clientsSql, [RecordStatus.Active]),
                db.query<RowDataPacket[]>(agentsSql, [RecordStatus.Active]),
                db.query<RowDataPacket[]>(typesSql, [RecordStatus.Active]),
                db.query<RowDataPacket[]>(placesSql, [RecordStatus.Active]),
                db.query<RowDataPacket[]>(`SELECT * FROM empresas WHERE status = ? ORDER BY empresa ASC`, [RecordStatus.Active]).catch(() => [[] as RowDataPacket[]]),
                db.query<RowDataPacket[]>(clientTypesSql, [RecordStatus.Active]).catch(() => [[] as RowDataPacket[]])
            ]);

            const defaultClientTypes = [
                { id: 1, nombre: 'Particular / Directo' },
                { id: 2, nombre: 'Wedding / Event Planner' },
                { id: 3, nombre: 'Banquetera / Catering' },
                { id: 4, nombre: 'Hotel / Venue / Jardín' },
                { id: 5, nombre: 'Agencia / Corporativo' }
            ];

            const clientTypes = Array.isArray(rawClientTypes) && rawClientTypes.length > 0
                ? rawClientTypes.map((ct: any) => ({
                    id: ct.id,
                    nombre: ct.tipo || ct.nombre || ct.tipo_cliente || ct.name || `Tipo ${ct.id}`
                }))
                : defaultClientTypes;

            const result: CatalogsResponse = {
                clients,
                agents,
                eventTypes,
                places,
                companies,
                clientTypes,
                paymentTypes: PAYMENT_TYPES_CATALOG
            };

            this.catalogsCache = {
                data: result,
                expiresAt: Date.now() + 60_000
            };

            return result;
        } catch (error) {
            console.error('Error in getCatalogs:', error);
            return {
                clients: [],
                agents: [],
                eventTypes: [],
                places: [],
                companies: [],
                clientTypes: [],
                paymentTypes: []
            };
        }
    }

    async createQuickClient(dto: CreateQuickClientDTO): Promise<any> {
        const fullName = String(dto.full_name || '').trim();
        const numTel = String(dto.num_tel || '').trim();
        const email = String(dto.email || '').trim();
        const direccion = String(dto.direccion || '').trim();
        const rfc = String(dto.rfc || '').trim().toUpperCase();
        const empresaId = dto.empresa_id ? Number(dto.empresa_id) : 1;
        const tipoCliente = dto.tipo_cliente ? Number(dto.tipo_cliente) : 1;
        const agenteId = dto.agente_id ? Number(dto.agente_id) : DEFAULT_EVENT_VALUES.DEFAULT_AGENT_ID;

        const [colsRows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM persona_fisica`);
        const colSet = new Set(colsRows.map(r => String(r.Field)));

        const insertCols: string[] = [];
        const insertPlaceholders: string[] = [];
        const insertVals: any[] = [];

        const pushCol = (col: string, val: any, rawExpr?: string) => {
            if (!colSet.has(col)) return;
            insertCols.push(col);
            if (rawExpr) {
                insertPlaceholders.push(rawExpr);
            } else {
                insertPlaceholders.push('?');
                insertVals.push(val);
            }
        };

        pushCol('full_name', fullName);
        pushCol('nombres', fullName);
        pushCol('num_tel', numTel);
        pushCol('telefono', numTel);
        pushCol('email', email);
        pushCol('rfc', rfc);
        pushCol('direccion', direccion);
        pushCol('empresa_id', empresaId);
        pushCol('tipo_cliente', tipoCliente);
        pushCol('tipo_cliente_id', tipoCliente);
        pushCol('agente_id', agenteId);
        pushCol('user_id', agenteId);
        pushCol('status', RecordStatus.Active);
        pushCol('created_at', null, 'NOW()');
        pushCol('updated_at', null, 'NOW()');

        const sql = `INSERT INTO persona_fisica (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
        const [insertRes]: any = await db.query(sql, insertVals);
        const newId = insertRes.insertId;

        this.catalogsCache = null;

        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT pf.id, pf.full_name, pf.email, pf.num_tel, pf.direccion, pf.empresa_id, e.empresa, e.descuento_empresa
             FROM persona_fisica pf
             LEFT JOIN empresas e ON e.id = pf.empresa_id
             WHERE pf.id = ? LIMIT 1`,
            [newId]
        );

        return rows[0] || {
            id: newId,
            full_name: fullName,
            num_tel: numTel,
            email,
            rfc,
            direccion,
            empresa_id: empresaId
        };
    }

    async createQuickCompany(dto: CreateQuickCompanyDTO): Promise<any> {
        const empresa = String(dto.empresa || '').trim();
        const clave = String(dto.clave || '').trim().toUpperCase();
        const rfc = String(dto.rfc || '').trim().toUpperCase();
        const numeroEmpresa = String(dto.numero_empresa || '').trim();
        const direccionEmpresa = String(dto.direccion_empresa || '').trim();
        const descuentoEmpresa = Number(dto.descuento_empresa) || 0;
        const formaPago = dto.forma_pago_autorizada ? Number(dto.forma_pago_autorizada) : PaymentType.Muestra;
        const tipoEmpresa = dto.tipo_empresa ? Number(dto.tipo_empresa) : 1;
        const agenteId = dto.agente_id ? Number(dto.agente_id) : DEFAULT_EVENT_VALUES.DEFAULT_AGENT_ID;
        const notas = String(dto.notas || '').trim();

        const [colsRows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM empresas`);
        const colSet = new Set(colsRows.map(r => String(r.Field)));

        const insertCols: string[] = [];
        const insertPlaceholders: string[] = [];
        const insertVals: any[] = [];

        const pushCol = (col: string, val: any, rawExpr?: string) => {
            if (!colSet.has(col)) return;
            insertCols.push(col);
            if (rawExpr) {
                insertPlaceholders.push(rawExpr);
            } else {
                insertPlaceholders.push('?');
                insertVals.push(val);
            }
        };

        pushCol('empresa', empresa);
        pushCol('clave_empresa', clave);
        pushCol('clave', clave);
        pushCol('agente_id', agenteId);
        pushCol('user_id', agenteId);
        pushCol('rfc', rfc);
        pushCol('numero_tel', numeroEmpresa);
        pushCol('num_tel', numeroEmpresa);
        pushCol('numero_empresa', numeroEmpresa);
        pushCol('telefono', numeroEmpresa);
        pushCol('direccion_empresa', direccionEmpresa);
        pushCol('direccion', direccionEmpresa);
        pushCol('descuento_empresa', descuentoEmpresa);
        pushCol('descuento', descuentoEmpresa);
        pushCol('forma_pago_autorizada', formaPago);
        pushCol('tipo_pago', formaPago);
        pushCol('tipo_empresa', tipoEmpresa);
        pushCol('tipo_cliente', tipoEmpresa);
        pushCol('notas', notas);
        pushCol('observaciones', notas);
        pushCol('status', RecordStatus.Active);
        pushCol('created_at', null, 'NOW()');
        pushCol('updated_at', null, 'NOW()');

        const sql = `INSERT INTO empresas (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
        const [insertRes]: any = await db.query(sql, insertVals);
        const newId = insertRes.insertId;

        this.catalogsCache = null;

        return {
            id: newId,
            empresa,
            clave_empresa: clave,
            rfc,
            numero_empresa: numeroEmpresa,
            direccion_empresa: direccionEmpresa,
            descuento_empresa: descuentoEmpresa,
            forma_pago_autorizada: formaPago,
            tipo_empresa: tipoEmpresa,
            agente_id: agenteId,
            notas
        };
    }

    async createQuickPlace(dto: CreateQuickPlaceDTO): Promise<any> {
        const nombre = String(dto.nombre || '').trim();
        const direccion = String(dto.direccion || '').trim();

        const [colsRows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM lugar`);
        const colSet = new Set(colsRows.map(r => String(r.Field)));

        const insertCols: string[] = [];
        const insertPlaceholders: string[] = [];
        const insertVals: any[] = [];

        const pushCol = (col: string, val: any, rawExpr?: string) => {
            if (!colSet.has(col)) return;
            insertCols.push(col);
            if (rawExpr) {
                insertPlaceholders.push(rawExpr);
            } else {
                insertPlaceholders.push('?');
                insertVals.push(val);
            }
        };

        pushCol('nombre', nombre);
        pushCol('direccion', direccion);
        pushCol('status', RecordStatus.Active);
        pushCol('created_at', null, 'NOW()');
        pushCol('updated_at', null, 'NOW()');

        const sql = `INSERT INTO lugar (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
        const [insertRes]: any = await db.query(sql, insertVals);
        const newId = insertRes.insertId;

        this.catalogsCache = null;

        return {
            id: newId,
            nombre,
            direccion
        };
    }

    async authorizeStockProduct(password: string): Promise<{ authorized: boolean; message: string }> {
        try {
            if (!password || !password.trim()) {
                return { authorized: false, message: 'Contraseña requerida' };
            }
            const sql = `SELECT id FROM users WHERE pwds = ? AND status = ? LIMIT 1`;
            const [rows] = await db.query<RowDataPacket[]>(sql, [password.trim(), RecordStatus.Active]);
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
            let action = QuoteActionType.Update;

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
                    dto.hora_evento || DEFAULT_EVENT_VALUES.TIME,
                    dto.fecha_entrega || DEFAULT_EVENT_VALUES.EMPTY_DATE,
                    dto.hora_entrega || DEFAULT_EVENT_VALUES.TIME,
                    dto.tipo_horario_entrega || ScheduleType.Especifico,
                    dto.hora_entrega_fin || null,
                    dto.fecha_recoleccion || DEFAULT_EVENT_VALUES.EMPTY_DATE,
                    dto.hora_recoleccion || DEFAULT_EVENT_VALUES.TIME,
                    dto.tipo_horario_recoleccion || ScheduleType.Especifico,
                    dto.hora_recoleccion_fin || null,
                    dto.tipo_pago || PaymentType.Muestra,
                    dto.descuento || DEFAULT_EVENT_VALUES.DISCOUNT,
                    dto.deposito !== undefined ? dto.deposito : DEFAULT_EVENT_VALUES.DEPOSIT_ENABLED,
                    dto.status_deposito !== undefined ? dto.status_deposito : StatusDeposito.Pendiente,
                    String(dto.lavado_desinfeccion || '0'),
                    dto.descuento_lavado || DEFAULT_EVENT_VALUES.DISCOUNT,
                    dto.tipo_venta || SaleType.Renta,
                    dto.estatus !== undefined ? dto.estatus : null,
                    eventId
                ]);
            } else {
                action = QuoteActionType.Create;
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, NOW(), NOW())
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
                    dto.hora_evento || DEFAULT_EVENT_VALUES.TIME,
                    dto.fecha_entrega || DEFAULT_EVENT_VALUES.EMPTY_DATE,
                    dto.hora_entrega || DEFAULT_EVENT_VALUES.TIME,
                    dto.tipo_horario_entrega || ScheduleType.Especifico,
                    dto.hora_entrega_fin || null,
                    dto.fecha_recoleccion || DEFAULT_EVENT_VALUES.EMPTY_DATE,
                    dto.hora_recoleccion || DEFAULT_EVENT_VALUES.TIME,
                    dto.tipo_horario_recoleccion || ScheduleType.Especifico,
                    dto.hora_recoleccion_fin || null,
                    dto.tipo_pago || PaymentType.Muestra,
                    dto.descuento || DEFAULT_EVENT_VALUES.DISCOUNT,
                    dto.deposito !== undefined ? dto.deposito : DEFAULT_EVENT_VALUES.DEPOSIT_ENABLED,
                    dto.status_deposito !== undefined ? dto.status_deposito : StatusDeposito.Pendiente,
                    String(dto.lavado_desinfeccion || '0'),
                    dto.descuento_lavado || DEFAULT_EVENT_VALUES.DISCOUNT,
                    dto.tipo_venta || SaleType.Renta,
                    dto.estatus !== undefined ? dto.estatus : StatusEvent.Cotizado,
                    StatusEntrega.Pendiente,
                    StatusRecibido.NotaPerdida
                ]);

                eventId = insertRes.insertId;

                const shortHash = Buffer.from(String(eventId)).toString('base64');
                const urlSeguimiento = `${DEFAULT_EVENT_VALUES.TRACKING_BASE_URL}${shortHash}`;
                await poolConn.query(`UPDATE evento SET url_seguimiento = ? WHERE id = ?`, [urlSeguimiento, eventId]);
            }

            // Reconciliación de Detalle de Productos (detalle_evento)
            if (dto.products) {
                const activeProductDetailIds = dto.products
                    .filter(p => p.row_status !== QuoteRowStatus.Deleted && p.row_status !== QuoteRowStatus.Cancelled && p.id && Number(p.id) > 0)
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
                    if (prod.row_status === QuoteRowStatus.Deleted || prod.row_status === QuoteRowStatus.Cancelled) {
                        if (prod.id) {
                            await poolConn.query(`DELETE FROM producto_autorizado WHERE detalle_id = ?`, [prod.id]);
                            await poolConn.query(`DELETE FROM detalle_evento WHERE id = ?`, [prod.id]);
                        }
                        continue;
                    }

                    const isAuthorized =
                        prod.status_authorized === AuthorizationFlag.Authorized || prod.status_authorized === true
                            ? AuthorizationFlag.Authorized
                            : AuthorizationFlag.Unauthorized;
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
                                prod.descuento || DEFAULT_EVENT_VALUES.DISCOUNT,
                                prod.dias || DEFAULT_EVENT_VALUES.RENTAL_DAYS,
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
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                            [
                                eventId,
                                prod.producto_id,
                                prod.cantidad,
                                prod.precio_producto,
                                prod.descuento || DEFAULT_EVENT_VALUES.DISCOUNT,
                                prod.dias || DEFAULT_EVENT_VALUES.RENTAL_DAYS,
                                rowPos,
                                DEFAULT_EVENT_VALUES.INITIAL_RECEIVED_QTY,
                                userName || DEFAULT_EVENT_VALUES.SYSTEM_USER_NAME,
                                QuoteAddedInPhase.Cotizacion,
                                isAuthorized
                            ]
                        );
                        detailId = detInsertRes.insertId;
                    }

                    // Sincronizar con tabla producto_autorizado
                    if (isAuthorized === AuthorizationFlag.Authorized && detailId > 0) {
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
                                [
                                    eventId,
                                    prod.producto_id,
                                    detailId,
                                    userId || dto.agente_id || DEFAULT_EVENT_VALUES.DEFAULT_AGENT_ID,
                                    rowPos,
                                    prod.cantidad
                                ]
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
                    .filter(c => c.row_status !== QuoteRowStatus.Deleted && c.id && Number(c.id) > 0)
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
                    if (cont.row_status === QuoteRowStatus.Deleted) {
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

            // Guardar comentarios locales pendientes si se enviaron al crear/actualizar la cotización
            const pendingComments: string[] = [];
            if (Array.isArray(dto.comments)) {
                dto.comments.forEach(c => {
                    if (typeof c === 'string' && c.trim()) {
                        pendingComments.push(c.trim());
                    }
                });
            }
            if (typeof dto.internal_comment === 'string' && dto.internal_comment.trim()) {
                pendingComments.push(dto.internal_comment.trim());
            }

            if (pendingComments.length > 0) {
                let resolvedUserName = (userName || '').trim();
                if ((!resolvedUserName || resolvedUserName === 'Usuario') && userId && userId > 0) {
                    const [userRows] = await poolConn.query<RowDataPacket[]>(
                        `SELECT name FROM users WHERE id = ? LIMIT 1`,
                        [userId]
                    );
                    if (userRows && userRows.length > 0 && userRows[0].name) {
                        resolvedUserName = String(userRows[0].name).trim();
                    }
                }
                if (!resolvedUserName) {
                    resolvedUserName = 'Usuario';
                }

                for (const text of pendingComments) {
                    await poolConn.query(
                        `INSERT INTO comentarios_internos (evento_id, comentario, user_id, user_name) VALUES (?, ?, ?, ?)`,
                        [eventId, text, userId || 0, resolvedUserName]
                    );
                }
            }

            await poolConn.commit();

            const [evtRows] = await poolConn.query<RowDataPacket[]>(`SELECT url_seguimiento FROM evento WHERE id = ?`, [eventId]);
            const url_seguimiento = evtRows[0]?.url_seguimiento || '';

            return {
                id: eventId,
                message: action === QuoteActionType.Create ? "Cotización creada con éxito" : "Cotización actualizada con éxito",
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
