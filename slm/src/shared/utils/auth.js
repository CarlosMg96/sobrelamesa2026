import { jwtDecode } from 'jwt-decode'

export function getTokenDecrypted() {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    try {
        return jwtDecode(token)
    } catch (err) {
        console.error('Token inválido', err)
        return null
    }
}

export function removeAccessToken() {
    localStorage.removeItem('accessToken')
}

export function setAccessToken(token) {
    localStorage.setItem('accessToken', token)
}

export function getAccessToken() {
    return localStorage.getItem('accessToken')
}

export function setRefreshToken(token) {
    localStorage.setItem('refreshToken', token)
}

export function removeRefreshToken() {
    localStorage.removeItem('refreshToken')
}

export function getRefreshToken() {
    return localStorage.getItem('refreshToken')
}

export function getUser() {

}



