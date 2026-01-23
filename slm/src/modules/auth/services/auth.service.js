
import { setRef } from '@mui/material';
import axiosClientApi from '../../../app/api/httpClient'
import { getRefreshToken, setAccessToken, setRefreshToken } from '../../../shared/utils/auth'

export const refreshTokenService = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
        const { data } = await axiosClientApi.doPost('/auth/refresh', { refreshToken });
        if (data?.accessToken) {
            setAccessToken(data.accessToken);
            setRefreshToken(data.refreshToken);
            return data.accessToken;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export const loginService = async (credentials) => {
    try {
        const { data } = await axiosClientApi.doPost('/auth/login', credentials)
        return data
    } catch (error) {
        console.error('Error en loginService:', error)
        throw error
    }
}

export const logoutService = () => {
    localStorage.removeItem('token')
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
