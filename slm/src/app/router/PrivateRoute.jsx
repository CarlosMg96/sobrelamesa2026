// app/router/PrivateRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/hooks/useAuth'

export function PrivateRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) return null
    if (!user) return <Navigate to="/login" replace />

    return children
}
