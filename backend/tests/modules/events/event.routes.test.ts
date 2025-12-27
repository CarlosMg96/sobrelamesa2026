
import request from 'supertest';
import express from 'express';

// We need to setup mocks BEFORE importing the routes because the routes instantiate the controller at top level.
// However, jest.mock is hoisted, so it should be fine.
// But we need to define the mock functions outside to reference them.

const mockGetListEvents = jest.fn();
const mockGetEventById = jest.fn();
const mockCreateEvent = jest.fn();
const mockDeleteEvent = jest.fn();

jest.mock('../../../src/modules/events/controllers/event.controller', () => {
    return {
        EventController: jest.fn().mockImplementation(() => ({
            getListEvents: mockGetListEvents,
            getEventById: mockGetEventById,
            createEvent: mockCreateEvent,
            deleteEvent: mockDeleteEvent,
        })),
    };
});

jest.mock('../../../src/modules/events/services/event.service');
jest.mock('../../../src/modules/events/respository/event.repository.mysql');
jest.mock('../../../src/middlewares/auth', () => ({
    authMiddleware: (req: any, res: any, next: any) => next()
}));
jest.mock('../../../src/middlewares/authorize.middleware', () => ({
    authorize: () => (req: any, res: any, next: any) => next()
}));

// Import routes AFTER mocks are set up (though jest.mock is hoisted, the factory uses variables defined above)
import eventRoutes from '../../../src/modules/events/routes/event.routes';

const app = express();
app.use(express.json());
app.use('/api', eventRoutes);

describe('Event Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default implementations that return responses to prevent timeouts
        mockGetListEvents.mockImplementation((req, res) => res.status(200).json([]));
        mockGetEventById.mockImplementation((req, res) => res.status(200).json({}));
        mockCreateEvent.mockImplementation((req, res) => res.status(201).json({}));
        mockDeleteEvent.mockImplementation((req, res) => res.status(200).send());
    });

    it('GET /api/events should call getListEvents', async () => {
        await request(app)
            .get('/api/events')
            .expect(200);

        expect(mockGetListEvents).toHaveBeenCalled();
    });

    it('GET /api/events/:id should call getEventById', async () => {
        await request(app)
            .get('/api/events/123')
            .expect(200);

        expect(mockGetEventById).toHaveBeenCalled();
    });

    it('POST /api/events should call createEvent', async () => {
        await request(app)
            .post('/api/events')
            .send({ name: 'New Event' })
            .expect(201);

        expect(mockCreateEvent).toHaveBeenCalled();
    });

    it('DELETE /api/events/:id should call deleteEvent', async () => {
        await request(app)
            .delete('/api/events/123')
            .expect(200);

        expect(mockDeleteEvent).toHaveBeenCalled();
    });
});
