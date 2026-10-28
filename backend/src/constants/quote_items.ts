export enum QuoteRowType {
    Product = 1,
    Note = 2,
    Section = 3
}

export enum QuoteRowStatus {
    Exists = 'exists',
    New = 'new',
    Deleted = 'deleted',
    Cancelled = 'cancelled'
}

export enum QuoteAddedInPhase {
    Cotizacion = 'c',
    NotaPerdida = 'p'
}

export enum ScheduleType {
    Abierto = 'ABIERTO',
    Rango = 'RANGO',
    Especifico = 'ESPECIFICO'
}

export enum SaleType {
    Renta = 1,
    Venta = 2
}

export enum RecordStatus {
    Inactive = 0,
    Active = 1
}

export enum AuthorizationFlag {
    Unauthorized = 0,
    Authorized = 1
}

export enum QuoteActionType {
    Create = 'Creación',
    Update = 'Edición'
}

export const DEFAULT_EVENT_VALUES = {
    TIME: '12:00:00',
    EMPTY_DATE: '0000-00-00',
    RENTAL_DAYS: 1,
    DISCOUNT: 0,
    DEPOSIT_ENABLED: 1,
    INITIAL_RECEIVED_QTY: 0,
    DEFAULT_AGENT_ID: 1,
    SYSTEM_USER_NAME: 'Sistema',
    TRACKING_BASE_URL: 'https://sobre-la-mesa.com/cotizacion/'
} as const;

