import { Event } from "../interfaces/event";

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
    getSolvers(): Promise<{ id: number; name: string }[]>;
    createEvent(data: Array<Event>): Promise<Event | null>;
    updateEvent(data: Array<Event>): Promise<Event | null>;
    deleteEvent(event_id: Number): Promise<Event | null>;
}