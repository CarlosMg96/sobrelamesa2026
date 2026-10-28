export enum StatusEvent {
    Cancelado = 0,
    Cotizado = 1,
    Pagado = 2,
    Confirmado = 3,
    PagadoEnAbonos = 4,
    Firmado = 5,
    Finalizado = 6
}

export const ACTIVE_RESERVED_EVENT_STATUSES: readonly StatusEvent[] = [
    StatusEvent.Pagado,
    StatusEvent.Confirmado
];

export const CONFIRMED_EVENT_STATUSES: readonly StatusEvent[] = [
    StatusEvent.Pagado,
    StatusEvent.Confirmado,
    StatusEvent.Finalizado
];

export enum StatusPago {
    Pendiente = 0,
    Pagado = 1
}

export enum StatusDeposito {
    Pendiente = 0,
    Pagado = 1
}

export enum StatusEntrega {
    Pendiente = 1,
    EnRuta = 20,
    Entregado = 21
}

export enum StatusRecibido {
    Pendiente = 0,
    NotaPerdida = 1,
    Finalizado = 2
}

export enum LogisticsFilterStatus {
    NotaPerdida = 1,
    Finalizado = 2,
    Pendiente = 3,
    NoConfirmado = 4,
    EnRuta = 20,
    Entregado = 21
}

export enum InventoryFilter {
    Available = 'Available',
    SoldOut = 'SoldOut'
}

export enum PaymentFilter {
    Paid = 'paid',
    Pending = 'pending'
}

export enum CalendarDateFilter {
    EventDate = 'event_date',
    StartDate = 'start_date',
    FechaEntrega = 'fecha_entrega',
    EndDate = 'end_date',
    FechaRecoleccion = 'fecha_recoleccion'
}

export enum EventOrderBy {
    FechaEventoAsc = 0,
    IdDesc = 1
}

export const FILTER_ALL_VALUE = '-1';
