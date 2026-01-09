import { LoginUseCase } from './LoginUseCase';
import { User } from '../domain/User';

// Mock AuthRepository
const mockAuthRepository = {
    login: jest.fn()
};

describe('LoginUseCase', () => {
    let loginUseCase;

    beforeEach(() => {
        loginUseCase = new LoginUseCase(mockAuthRepository);
        mockAuthRepository.login.mockReset();
    });

    it('should throw error if email or password is missing', async () => {
        await expect(loginUseCase.execute('', 'password')).rejects.toThrow('Email and password are required');
        await expect(loginUseCase.execute('email', '')).rejects.toThrow('Email and password are required');
    });

    it('should call authRepository.login with correct credentials', async () => {
        const expectedUser = new User({ id: '1', email: 'test@test.com', name: 'Test' });
        mockAuthRepository.login.mockResolvedValue(expectedUser);

        const result = await loginUseCase.execute('test@test.com', 'secret');

        expect(mockAuthRepository.login).toHaveBeenCalledWith('test@test.com', 'secret');
        expect(result).toEqual(expectedUser);
    });

    it('should propagate errors from repository', async () => {
        mockAuthRepository.login.mockRejectedValue(new Error('Invalid credentials'));

        await expect(loginUseCase.execute('wrong@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
});
