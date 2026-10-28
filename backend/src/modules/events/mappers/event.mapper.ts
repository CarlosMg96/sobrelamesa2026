import { RowDataPacket } from 'mysql2';
import { Event, QuoteProductItem, QuoteContentItem } from '../interfaces/event';
import {
    AuthorizationFlag,
    DEFAULT_EVENT_VALUES,
    QuoteRowStatus,
    QuoteRowType,
    StatusEvent
} from '../../../constants';

export class EventMapper {
    static toDomain(row: RowDataPacket): Event {
        return {
            id: row.id?.toString() || '',
            fecha_cotizacion: row.fecha_cotizacion || '',
            cliente_id: row.cliente_id?.toString() || '',
            agente_id: row.agente_id?.toString() || '',
            estatus: Number(row.estatus) || StatusEvent.Cancelado,
            tipo_venta: Number(row.tipo_venta) || 0,
            tipo_evento: Number(row.tipo_evento) || 0,
            no_personas: Number(row.no_personas) || 0,
            deposito: Number(row.deposito) || 0,
            status_deposito: Number(row.status_deposito) || 0,
            status_pago: Number(row.status_pago) || 0,
            status_recibido: Number(row.status_recibido) || 0,
            status_firmas: row.status_firmas || '',
            firma: row.firma || '',
            fecha_evento: row.fecha_evento || '',
            hora_evento: row.hora_evento || '',
            fecha_entrega: row.fecha_entrega || '',
            hora_entrega: row.hora_entrega || '',
            fecha_recoleccion: row.fecha_recoleccion || '',
            hora_recoleccion: row.hora_recoleccion || '',
            tipo_pago: Number(row.tipo_pago) || 0,
            domicilio_entrega: row.domicilio_entrega || '',
            domicilio_recoleccion: row.domicilio_recoleccion || '',
            status_entrega: row.status_entrega,
            lavado_desinfeccion: row.lavado_desinfeccion || '0',
            descuento: Number(row.descuento) || 0,
            correct_datos: row.correct_datos === 1 || Boolean(row.correct_datos),
            accept_politicas: row.accept_politicas === 1 || Boolean(row.accept_politicas),
            url_seguimiento: row.url_seguimiento || '',
            descuento_lavado: Number(row.descuento_lavado) || 0,
            firma_logistica: row.firma_logistica || '',
            tipo_horario_entrega: row.tipo_horario_entrega,
            tipo_horario_recoleccion: row.tipo_horario_recoleccion,
            hora_entrega_fin: row.hora_entrega_fin,
            hora_recoleccion_fin: row.hora_recoleccion_fin,
            created_at: row.created_at,
            updated_at: row.updated_at,
            cliente: row.cliente,
            num_tel: row.num_tel,
            email: row.email,
            empresa: row.empresa,
            agente: row.agente,
            tipo_evento_nombre: row.tipo_evento_nombre,
            categorias: row.categorias,
            ultimo_comentario: row.ultimo_comentario,
            filtrado_por: row.filtrado_por,
            status_sobrevendido: row.status_sobrevendido ? AuthorizationFlag.Authorized : AuthorizationFlag.Unauthorized
        };
    }

    static toQuoteProductItem(row: RowDataPacket): QuoteProductItem {
        const cantidad = Number(row.cantidad) || 0;
        const precioProducto = Number(row.precio_producto) || 0;
        const descuento = Number(row.descuento) || DEFAULT_EVENT_VALUES.DISCOUNT;
        const dias = Number(row.dias) || DEFAULT_EVENT_VALUES.RENTAL_DAYS;
        const isAuthorized =
            Number(row.status_authorized) === AuthorizationFlag.Authorized ||
            Number(row.pa_id) > 0;
        const quantityAuthorized = isAuthorized
            ? Number(row.pa_cantidad || cantidad)
            : 0;

        return {
            id: Number(row.id),
            producto_id: Number(row.producto_id),
            cantidad,
            precio_producto: precioProducto,
            descuento,
            dias,
            row_position: Number(row.row_position) || 0,
            row_status: QuoteRowStatus.Exists,
            status_authorized: isAuthorized ? AuthorizationFlag.Authorized : AuthorizationFlag.Unauthorized,
            quantity_authorized: quantityAuthorized,
            clave: row.clave,
            producto: row.producto,
            medidas: row.medidas || '',
            precio_reposicion: Number(row.precio_reposicion) || 0,
            imagen: row.imagen,
            categoria: row.categoria,
            categoria_producto_id: Number(row.categoria_producto_id) || 0,
            subcategoria_id: Number(row.subcategoria_id) || 0,
            stock: Number(row.stock) || 0,
            subtotal: (cantidad * precioProducto * dias) * (1 - descuento / 100)
        };
    }

    static toQuoteContentItem(row: RowDataPacket): QuoteContentItem {
        return {
            id: Number(row.id),
            evento_id: Number(row.evento_id),
            content_seccion: row.content_seccion || '',
            type: Number(row.type) as QuoteRowType,
            row_position: Number(row.row_position) || 0,
            row_status: QuoteRowStatus.Exists
        };
    }
}

