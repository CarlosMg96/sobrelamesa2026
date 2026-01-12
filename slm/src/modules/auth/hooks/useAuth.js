import { createContext, useContext, useState } from 'react'
import { loginService } from '../services/auth.service'
import { emit, AppEvents } from '../../../app/events/appEvents'
import { useNavigate } from 'react-router-dom';
import { setAccessToken, setRefreshToken, getUser } from '../../../shared/utils/auth'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const navigate = useNavigate();

    const login = async (credentials) => {
        const data = await loginService(credentials)
        if (data.status === 200) {
            setAccessToken(data.data.accessToken)
            setRefreshToken(data.data.refreshToken)
            getUser()
            setUser(data.data.user)
            emit(AppEvents.LOGIN_SUCCESS)
            navigate('/dashboard')
        } else {
            console.error(data.message)
            emit(AppEvents.LOGIN_ERROR)
        }
    }

    return (
        <AuthContext.Provider value={{ user, login }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
