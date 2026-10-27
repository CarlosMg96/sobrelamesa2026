import { Event, EventDetailResponse, CatalogsResponse, SaveQuoteDTO } from "../interfaces/event";

export interface EventQueryParams {
    pageNumber?: number;
    pageLength?: number;
    search?: string;
    filterSolver?: string | number;
    filterStatus?: string | number;
    filterInventory?: string;
    filterDate?: string;
    filterPayment?: string;
    filterPaymentType?: string;
    logisticsStatus?: string | number;
    orderBy?: string | number;
    byAuthorizing?: boolean;
}

export interface EventRepository {
    getListEvents(params: EventQueryParams): Promise<{ data: Event[], pagination: any, countEventsByAuthorizing?: number } | null>;
    getCalendarEvents(startDate: string, endDate: string, filterByDate?: string): Promise<Event[]>;
    addComment(eventoId: number, comment: string, userId: number, userName: string): Promise<any>;
    getEvent(event_id: Number): Promise<Event | null>;
    getEventDetail(event_id: number): Promise<EventDetailResponse | null>;
    getCatalogs(): Promise<CatalogsResponse>;
    saveOrUpdateQuote(dto: SaveQuoteDTO, userId?: number, userName?: string): Promise<{ id: number; message: string; url_seguimiento?: string }>;
    authorizeStockProduct(password: string): Promise<{ authorized: boolean; message: string }>;
    getSolvers(): Promise<{ id: number; name: string }[]>;
    createEvent(data: Array<Event>): Promise<Event | null>;
    updateEvent(data: Array<Event>): Promise<Event | null>;
    deleteEvent(event_id: Number): Promise<Event | null>;
}