import { EventRepository } from "../respository/event.repository";
import { Event } from "../interfaces/event";

export class EventService {
    constructor(private readonly repo: EventRepository) { }

    async getListEvents(pageNumber: number, pageLength: number): Promise<{ data: Event[], pagination: any } | null> {
        const result = await this.repo.getListEvents(pageNumber, pageLength);

        if (result === null) {
            return null;
        }

        return result;
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
}
