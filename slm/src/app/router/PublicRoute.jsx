// app/router/PublicRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/hooks/useAuth'

export function PublicRoute({ children }) {
    const { user } = useAuth()

    if (user) return <Navigate to="/dashboard" replace />

    return children
}
