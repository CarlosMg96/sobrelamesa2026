/**
 * @interface
 */
export class AuthRepository {
    /**
     * @param {string} email
     * @param {string} password
     * @returns {Promise<User>}
     * @throws {Error}
     */
    async login(email, password) {
        throw new Error('Method not implemented');
    }
}
