import {
    AuthorizationFlag,
    PaymentType,
    PaymentTypeCatalogItem,
    QuoteRowStatus,
    QuoteRowType,
    SaleType,
    ScheduleType,
    StatusDeposito,
    StatusEvent,
    StatusPago,
    StatusRecibido
} from '../../../constants';

export interface Event {
    id?: string;
    fecha_cotizacion: string;
    cliente_id: string;
    agente_id: string;
    estatus: StatusEvent | number;
    tipo_venta: SaleType | number;
    tipo_evento: number;
    no_personas: number;
    deposito: number;
    fecha_evento: string;
    hora_evento: string;
    fecha_entrega: string;
    hora_entrega: string;
    fecha_recoleccion: string;
    hora_recoleccion: string;
    tipo_pago: PaymentType | number;
    domicilio_entrega?: string;
    domicilio_recoleccion?: string;
    status_entrega?: string | number;
    lavado_desinfeccion?: string;
    descuento?: number;
    correct_datos?: boolean;
    accept_politicas?: boolean;
    url_seguimiento?: string;
    descuento_lavado?: number;
    firma?: string;
    firma_logistica?: string;
    status_firmas?: string;
    status_recibido?: StatusRecibido | number;
    status_pago?: StatusPago | number;
    status_deposito?: StatusDeposito | number;
    created_at?: string;
    updated_at?: string;
    tipo_horario_entrega?: ScheduleType | string;
    tipo_horario_recoleccion?: ScheduleType | string;
    hora_entrega_fin?: string;
    hora_recoleccion_fin?: string;
    // Joined / Computed fields
    cliente?: string;
    num_tel?: string;
    email?: string;
    empresa?: string;
    agente?: string;
    tipo_evento_nombre?: string;
    categorias?: string;
    ultimo_comentario?: string;
    filtrado_por?: string;
    status_sobrevendido?: AuthorizationFlag | number;
}

export interface QuoteProductItem {
    id?: number;
    producto_id: number;
    cantidad: number;
    precio_producto: number;
    descuento?: number;
    dias?: number;
    row_position?: number;
    row_status?: QuoteRowStatus | 'exists' | 'new' | 'deleted' | 'cancelled';
    // Joined product info
    clave?: string;
    producto?: string;
    medidas?: string;
    precio_reposicion?: number;
    imagen?: string;
    categoria?: string;
    categoria_producto_id?: number;
    subcategoria_id?: number;
    stock?: number;
    disponible?: number;
    sobrevendido?: boolean;
    status_authorized?: AuthorizationFlag | number | boolean;
    quantity_authorized?: number;
    subtotal?: number;
}

export interface QuoteContentItem {
    id?: number;
    evento_id?: number;
    content_seccion: string;
    type: QuoteRowType | number; // 2: nota, 3: sección
    row_position?: number;
    row_status?: QuoteRowStatus | 'exists' | 'new' | 'deleted';
}

export interface SaveQuoteDTO {
    id?: number;
    fecha_cotizacion: string;
    cliente_id: number | string;
    agente_id: number | string;
    tipo_evento: number;
    no_personas: number;
    domicilio_entrega?: string;
    domicilio_recoleccion?: string;
    fecha_evento: string;
    hora_evento?: string;
    fecha_entrega?: string;
    hora_entrega?: string;
    tipo_horario_entrega?: ScheduleType | 'ABIERTO' | 'RANGO' | 'ESPECIFICO';
    hora_entrega_fin?: string;
    fecha_recoleccion?: string;
    hora_recoleccion?: string;
    tipo_horario_recoleccion?: ScheduleType | 'ABIERTO' | 'RANGO' | 'ESPECIFICO';
    hora_recoleccion_fin?: string;
    tipo_pago: PaymentType | number;
    descuento?: number;
    deposito?: number;
    status_deposito?: StatusDeposito | number;
    montaje?: number;
    lavado_desinfeccion?: string | number;
    descuento_lavado?: number;
    tipo_venta?: SaleType | number;
    estatus?: StatusEvent | number;
    products?: QuoteProductItem[];
    contents?: QuoteContentItem[];
    internal_comment?: string;
    comments?: string[];
}

export interface EventDetailResponse {
    event: Event;
    products: QuoteProductItem[];
    contents: QuoteContentItem[];
    comments: any[];
}

export interface CatalogsResponse {
    clients: any[];
    agents: any[];
    eventTypes: any[];
    places: any[];
    companies?: any[];
    clientTypes?: any[];
    paymentTypes: readonly PaymentTypeCatalogItem[] | { id: number; name: string }[];
}

export interface CreateQuickClientDTO {
    full_name: string;
    empresa_id?: number | null;
    num_tel?: string;
    email?: string;
    tipo_cliente?: number | string | null;
    rfc?: string;
    direccion?: string;
    agente_id?: number | null;
}

export interface CreateQuickCompanyDTO {
    empresa: string;
    clave?: string;
    agente_id?: number | null;
    rfc?: string;
    numero_empresa?: string;
    direccion_empresa?: string;
    descuento_empresa?: number;
    forma_pago_autorizada?: number | string;
    tipo_empresa?: number | string | null;
    notas?: string;
}

export interface CreateQuickPlaceDTO {
    nombre: string;
    direccion: string;
}
