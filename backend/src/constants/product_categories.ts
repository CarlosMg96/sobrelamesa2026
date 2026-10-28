export enum ProductCategoryId {
    TableStyling = 1,
    Decoracion = 2,
    Mobleria = 3,
    Textiles = 4,
    Servicios = 41
}

export const CATEGORY_SORT_PRIORITY: Readonly<Record<number, number>> = {
    [ProductCategoryId.TableStyling]: 1,
    [ProductCategoryId.Textiles]: 2,
    [ProductCategoryId.Mobleria]: 3,
    [ProductCategoryId.Decoracion]: 4,
    [ProductCategoryId.Servicios]: 99
};

export const CATEGORY_SECTION_LABELS: Readonly<Record<number, string>> = {
    [ProductCategoryId.TableStyling]: 'TABLE STYLING',
    [ProductCategoryId.Decoracion]: 'DECORACIÓN',
    [ProductCategoryId.Mobleria]: 'MOBLERÍA',
    [ProductCategoryId.Textiles]: 'TEXTILES',
    [ProductCategoryId.Servicios]: 'SERVICIOS'
};

