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
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    try {
        return token
    } catch (err) {
        console.error('Token inválido', err)
        return null
    }
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

function getUser() {
    const USERDATA = localStorage.getItem('userData')
    if (!USERDATA) return null
    try {
        return JSON.parse(USERDATA)
    } catch (err) {
        console.error('Usuario inválido', err)
        return null
    }
}

export function getUserRole() {
    const user = getUser()
    if (!user) return null
    return user?.role
}

export function getUserId() {
    const user = getUser()
    if (!user) return null
    return user?.id
}

export function getUserEmail() {
    const user = getUser()
    if (!user) return null
    return user?.email
}

export function setUser(user) {
    localStorage.setItem('userData', JSON.stringify(user))
}






