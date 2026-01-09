export class LoginUseCase {
    /**
     * @param {import('../domain/AuthRepository').AuthRepository} authRepository
     */
    constructor(authRepository) {
        this.authRepository = authRepository;
    }

    /**
     * @param {string} email
     * @param {string} password
     * @returns {Promise<import('../domain/User').User>}
     */
    async execute(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        return this.authRepository.login(email, password);
    }
}
