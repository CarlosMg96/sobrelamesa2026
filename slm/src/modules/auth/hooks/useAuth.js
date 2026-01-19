import { createContext, useContext, useState, useEffect } from 'react'
import { loginService, meService } from '../services/auth.service'
import { emit, AppEvents } from '../../../app/events/appEvents'
import { useNavigate } from 'react-router-dom';
import { setAccessToken, setRefreshToken, setUser, getAccessToken } from '../../../shared/utils/auth'
const AuthContext = createContext(null)


export function AuthProvider({ children }) {
    const [user, setUserState] = useState(() => getAccessToken() ? {} : null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Si hay usuario en localStorage, lo carga al estado
        const storedUser = getAccessToken() ? {} : null;
        if (storedUser) {
            setUserState(storedUser);
        }
        setLoading(false);
    }, []);

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

    return (
        <AuthContext.Provider value={{ user, login, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
