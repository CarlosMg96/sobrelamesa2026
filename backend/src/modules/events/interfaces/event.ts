export interface Event {
    id?: string;
    fecha_cotizacion: string;
    cliente_id: string;
    agente_id: string;
    estatus: number;
    tipo_venta: number;
    tipo_evento: number;
    no_personas: number;
    deposito: number;
    fecha_evento: string;
    hora_evento: string;
    fecha_entrega: string;
    hora_entrega: string;
    fecha_recoleccion: string;
    hora_recoleccion: string;
    tipo_pago: number;
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
    status_recibido?: number;
    status_pago?: number;
    status_deposito?: number;
    created_at?: string;
    updated_at?: string;
    tipo_horario_entrega?: string;
    tipo_horario_recoleccion?: string;
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
}

export interface QuoteProductItem {
    id?: number;
    producto_id: number;
    cantidad: number;
    precio_producto: number;
    descuento?: number;
    dias?: number;
    row_position?: number;
    row_status?: 'exists' | 'new' | 'deleted' | 'cancelled';
    // Joined product info
    clave?: string;
    producto?: string;
    imagen?: string;
    categoria?: string;
    stock?: number;
    disponible?: number;
    sobrevendido?: boolean;
    subtotal?: number;
}

export interface QuoteContentItem {
    id?: number;
    evento_id?: number;
    content_seccion: string;
    type: number; // 2: nota, 3: sección
    row_position?: number;
    row_status?: 'exists' | 'new' | 'deleted';
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
    tipo_horario_entrega?: 'ABIERTO' | 'RANGO' | 'ESPECIFICO';
    hora_entrega_fin?: string;
    fecha_recoleccion?: string;
    hora_recoleccion?: string;
    tipo_horario_recoleccion?: 'ABIERTO' | 'RANGO' | 'ESPECIFICO';
    hora_recoleccion_fin?: string;
    tipo_pago: number;
    descuento?: number;
    deposito?: number;
    status_deposito?: number;
    montaje?: number;
    lavado_desinfeccion?: string | number;
    descuento_lavado?: number;
    tipo_venta?: number;
    estatus?: number;
    products?: QuoteProductItem[];
    contents?: QuoteContentItem[];
    internal_comment?: string;
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
    paymentTypes: { id: number; name: string }[];
}