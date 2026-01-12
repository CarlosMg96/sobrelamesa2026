// app/router/AppRouter.jsx
import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '../../modules/auth/pages/LoginPage'
import { Dashboard } from '../../modules/dashboard/pages/dashboard'
import { PrivateRoute } from './PrivateRoute'
import { PublicRoute } from './PublicRoute'

export function AppRouter() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />

            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }
            />
        </Routes>
    )
}
