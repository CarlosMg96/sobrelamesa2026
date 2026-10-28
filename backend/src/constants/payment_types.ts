export enum PaymentType {
    Muestra = 1,
    Promocion = 2,
    Transferencia = 3,
    Intercambio = 4,
    Efectivo = 5,
    ConCredito = 6,
    DeContado = 7
}

export enum PaymentTypeFilterKey {
    Sample = 'sample',
    Promotion = 'promotion',
    Transfer = 'transfer',
    Exchange = 'exchange',
    Cash = 'cash',
    Credit = 'credit',
    PaidInFull = 'paid_in_full'
}

export const PAYMENT_TYPE_FILTER_MAP: Readonly<Record<string, PaymentType>> = {
    [PaymentTypeFilterKey.Sample]: PaymentType.Muestra,
    [PaymentTypeFilterKey.Promotion]: PaymentType.Promocion,
    [PaymentTypeFilterKey.Transfer]: PaymentType.Transferencia,
    [PaymentTypeFilterKey.Exchange]: PaymentType.Intercambio,
    [PaymentTypeFilterKey.Cash]: PaymentType.Efectivo,
    [PaymentTypeFilterKey.Credit]: PaymentType.ConCredito,
    [PaymentTypeFilterKey.PaidInFull]: PaymentType.DeContado
};

export interface PaymentTypeCatalogItem {
    id: PaymentType;
    name: string;
}

export const PAYMENT_TYPES_CATALOG: readonly PaymentTypeCatalogItem[] = [
    { id: PaymentType.Muestra, name: 'Muestra' },
    { id: PaymentType.Promocion, name: 'Promoción' },
    { id: PaymentType.Transferencia, name: 'Transferencia' },
    { id: PaymentType.Intercambio, name: 'Intercambio' },
    { id: PaymentType.Efectivo, name: 'Efectivo' },
    { id: PaymentType.ConCredito, name: 'Con Crédito' },
    { id: PaymentType.DeContado, name: 'De Contado' }
];

