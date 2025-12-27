
import request from 'supertest';
import express from 'express';

const mockLogin = jest.fn();

jest.mock('../../../src/modules/auth/controllers/auth.controller', () => ({
    authController: {
        login: mockLogin,
    },
}));

jest.mock('../../../src/middlewares/auth', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 1, role: 'admin' };
        next();
    },
}));

import authRoutes from '../../../src/modules/auth/routes/auth.routes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogin.mockImplementation((req, res) => res.status(200).json({ token: 'mock-token' }));
    });

    it('POST /api/auth/login should call authController.login', async () => {
        await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password' })
            .expect(200)
            .expect((res) => {
                expect(res.body).toEqual({ token: 'mock-token' });
            });

        expect(mockLogin).toHaveBeenCalled();
    });

    it('GET /api/auth/profile should return user profile from middleware', async () => {
        await request(app)
            .get('/api/auth/profile')
            .expect(200)
            .expect((res) => {
                expect(res.body.message).toBe("Ruta protegida");
                expect(res.body.user).toEqual({ id: 1, role: 'admin' });
            });
    });
});
