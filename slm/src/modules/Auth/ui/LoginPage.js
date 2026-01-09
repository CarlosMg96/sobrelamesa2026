import React, { useState } from 'react';
import LoginForm from './LoginForm';
import { LoginUseCase } from '../application/LoginUseCase';
import { FakeAuthRepository } from '../infrastructure/FakeAuthRepository';

// Composition Root for this feature (could be moved to a separate Factory)
const authRepository = new FakeAuthRepository();
const loginUseCase = new LoginUseCase(authRepository);

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    const handleLogin = async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const user = await loginUseCase.execute(email, password);
            setUser(user);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (user) {
        return (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <h2>Welcome, {user.name}!</h2>
                <button onClick={() => setUser(null)} style={{ padding: '0.5rem 1rem' }}>Logout</button>
            </div>
        );
    }

    return (
        <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
        />
    );
}
