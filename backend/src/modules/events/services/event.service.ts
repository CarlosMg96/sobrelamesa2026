import { EventRepository, EventQueryParams } from "../respository/event.repository";
import { Event, EventDetailResponse, CatalogsResponse, SaveQuoteDTO, CreateQuickClientDTO, CreateQuickCompanyDTO, CreateQuickPlaceDTO } from "../interfaces/event";

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

    async getEventDetail(id: number): Promise<EventDetailResponse | null> {
        return await this.repo.getEventDetail(id);
    }

    async getCatalogs(): Promise<CatalogsResponse> {
        return await this.repo.getCatalogs();
    }

    async createQuickClient(dto: CreateQuickClientDTO): Promise<any> {
        return await this.repo.createQuickClient(dto);
    }

    async createQuickCompany(dto: CreateQuickCompanyDTO): Promise<any> {
        return await this.repo.createQuickCompany(dto);
    }

    async createQuickPlace(dto: CreateQuickPlaceDTO): Promise<any> {
        return await this.repo.createQuickPlace(dto);
    }

    async saveOrUpdateQuote(dto: SaveQuoteDTO, userId?: number, userName?: string): Promise<{ id: number; message: string; url_seguimiento?: string }> {
        return await this.repo.saveOrUpdateQuote(dto, userId, userName);
    }

    async getCalendarEvents(startDate: string, endDate: string, filterByDate?: string): Promise<Event[]> {
        return await this.repo.getCalendarEvents(startDate, endDate, filterByDate);
    }

    async addComment(eventoId: number, comment: string, userId: number, userName: string): Promise<any> {
        return await this.repo.addComment(eventoId, comment, userId, userName);
    }

    async authorizeStockProduct(password: string): Promise<{ authorized: boolean; message: string }> {
        return await this.repo.authorizeStockProduct(password);
    }
}
