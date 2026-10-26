import { EventRepository, EventQueryParams } from "../respository/event.repository";
import { Event } from "../interfaces/event";

export class EventService {
    constructor(private readonly repo: EventRepository) { }

    async getListEvents(params: EventQueryParams): Promise<{ data: Event[], pagination: any, countEventsByAuthorizing?: number } | null> {
        const result = await this.repo.getListEvents(params);

        if (result === null) {
            return null;
        }

        return result;
    }

    async getSolvers(): Promise<{ id: number; name: string }[]> {
        return await this.repo.getSolvers();
    }

    async createEvent(data: Array<Event>): Promise<Event | null> {
        const result = await this.repo.createEvent(data);
        if (result === null) {
            return null;
        }
        return result;
    }

    async updateEvent(data: Array<Event>): Promise<Event | null> {
        const result = await this.repo.updateEvent(data);
        if (result === null) {
            return null;
        }
        return result;
    }

    async deleteEvent(id: number): Promise<Event | null> {
        const result = await this.repo.deleteEvent(id);
        if (result === null) {
            return null;
        }
        return result;
    }

    async getEventById(id: number): Promise<Event | null> {
        const result = await this.repo.getEvent(id);
        if (result === null) {
            return null;
        }
        return result;
    }

    async getCalendarEvents(startDate: string, endDate: string, filterByDate?: string): Promise<Event[]> {
        return await this.repo.getCalendarEvents(startDate, endDate, filterByDate);
    }

    async addComment(eventoId: number, comment: string, userId: number, userName: string): Promise<any> {
        return await this.repo.addComment(eventoId, comment, userId, userName);
    }
}
