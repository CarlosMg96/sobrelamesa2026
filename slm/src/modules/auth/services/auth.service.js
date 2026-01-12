// features/auth/services/auth.service.js
import axiosClientApi from '../../../app/api/httpClient'

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
