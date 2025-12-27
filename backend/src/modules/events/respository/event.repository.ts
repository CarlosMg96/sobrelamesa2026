import { Event } from "../interfaces/event";

export interface EventRepository {
    getListEvents(pageNumber: number, pageLength: number): Promise<{ data: Event[], pagination: any } | null>;
    getEvent(event_id: Number): Promise<Event | null>;
    createEvent(data: Array<Event>): Promise<Event | null>;
    updateEvent(data: Array<Event>): Promise<Event | null>;
    deleteEvent(event_id: Number): Promise<Event | null>;
}