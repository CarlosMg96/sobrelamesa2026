import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginService, logoutService, meService } from '../services/auth.service'
import { emit, AppEvents } from '../../../app/events/appEvents'
import { useNavigate } from 'react-router-dom'
import {
    setAccessToken,
    setRefreshToken,
    setUser,
    getUser,
    getAccessToken,
    clearAuthData
} from '../../../shared/utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUserState] = useState(() => {
        const token = getAccessToken()
        if (!token) return null
        return getUser() || {}
    })
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const token = getAccessToken()
        if (token) {
            const storedUser = getUser()
            setUserState(storedUser || {})
        } else {
            clearAuthData()
            setUserState(null)
        }
        setLoading(false)
    }, [])

    const login = async (credentials) => {
        const data = await loginService(credentials)
        if (data.status === 200) {
            setAccessToken(data.data.accessToken)
            setRefreshToken(data.data.refreshToken)
            const meData = await meService()
            setUserState(meData.data)
            setUser(meData.data)
            emit(AppEvents.LOGIN_SUCCESS)
            navigate('/dashboard')
        } else {
            console.error(data.message)
            emit(AppEvents.LOGIN_ERROR)
        }
    }

    const logout = useCallback(async () => {
        try {
            await logoutService()
        } catch (e) {
            console.warn('Error during logout:', e)
        } finally {
            clearAuthData()
            setUserState(null)
            emit(AppEvents.LOGOUT)
            navigate('/login', { replace: true })
        }
    }, [navigate])

    return (
        <AuthContext.Provider value={{ user, login, loading, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
