import { AuthRepository } from '../domain/AuthRepository';
import { User } from '../domain/User';

export class FakeAuthRepository extends AuthRepository {
    async login(email, password) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock validation: accept any email that contains "@" and password "secret"
        if (email.includes('@') && password === 'secret') {
            return new User({
                id: '1',
                email: email,
                name: 'Test User'
            });
        }

        throw new Error('Invalid credentials');
    }
}
