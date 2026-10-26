import axios from 'axios'
import axiosClientApi from '../../../app/api/httpClient'
import { getRefreshToken, setAccessToken, setRefreshToken, clearAuthData } from '../../../shared/utils/auth'

const rawUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3000/api'
const API_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/api`

export const refreshTokenService = async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null
    try {
        // Petición directa a axios sin pasar por los interceptores para evitar bucles
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
        const resData = response.data
        const payload = resData?.data || resData

        if (payload?.accessToken) {
            setAccessToken(payload.accessToken)
            if (payload.refreshToken) {
                setRefreshToken(payload.refreshToken)
            }
            return payload.accessToken
        }
        return null
    } catch (e) {
        console.warn('No se pudo renovar la sesión:', e?.response?.data?.message || e.message)
        return null
    }
}

export const loginService = async (credentials) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials)
        return response.data
    } catch (error) {
        if (error.response?.data) {
            return error.response.data
        }
        console.error('Error en loginService:', error)
        throw error
    }
}

export const logoutService = async () => {
    try {
        await axiosClientApi.doPost('/auth/logout')
    } catch (error) {
        console.warn('Advertencia en /auth/logout del backend:', error)
    } finally {
        clearAuthData()
    }
    return Promise.resolve()
}

export const meService = async () => {
    try {
        const { data } = await axiosClientApi.doGet('/auth/me')
        return data
    } catch (error) {
        console.error('Error en meService:', error)
        throw error
    }
}
