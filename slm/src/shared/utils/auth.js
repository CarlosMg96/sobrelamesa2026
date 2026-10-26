import { jwtDecode } from 'jwt-decode'

export function getTokenDecrypted() {
    const token = getAccessToken()
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
    localStorage.removeItem('token')
}

export function setAccessToken(token) {
    if (!token || token === 'null' || token === 'undefined') {
        removeAccessToken()
    } else {
        localStorage.setItem('accessToken', token)
    }
}

export function getAccessToken() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
    if (!token || token === 'null' || token === 'undefined') return null
    try {
        return token
    } catch (err) {
        console.error('Token inválido', err)
        return null
    }
}

export function setRefreshToken(token) {
    if (!token || token === 'null' || token === 'undefined') {
        removeRefreshToken()
    } else {
        localStorage.setItem('refreshToken', token)
    }
}

export function removeRefreshToken() {
    localStorage.removeItem('refreshToken')
}

export function getRefreshToken() {
    const token = localStorage.getItem('refreshToken')
    if (!token || token === 'null' || token === 'undefined') return null
    return token
}

export function getUser() {
    const USERDATA = localStorage.getItem('userData')
    if (!USERDATA || USERDATA === 'null' || USERDATA === 'undefined') return null
    try {
        return JSON.parse(USERDATA)
    } catch (err) {
        console.error('Usuario inválido', err)
        return null
    }
}

export function removeUser() {
    localStorage.removeItem('userData')
}

export function setUser(user) {
    if (!user || user === 'null' || user === 'undefined') {
        removeUser()
    } else {
        localStorage.setItem('userData', JSON.stringify(user))
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

/**
 * Elimina todas las cookies visibles en el documento
 * cubriendo el path raíz (/), subrutas y dominios asociados.
 */
export function clearAllCookies() {
    if (typeof document === 'undefined') return

    const cookies = document.cookie.split(';')
    const hostname = window.location.hostname
    const domainParts = hostname.split('.')

    cookies.forEach((cookie) => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
        if (!name) return

        // 1. Borrar para path actual y raíz
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=`

        // 2. Borrar para el hostname específico
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${hostname}`

        // 3. Borrar para dominios superiores si aplica (ej: localhost o dominio.com)
        if (domainParts.length > 1) {
            const rootDomain = domainParts.slice(-2).join('.')
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${rootDomain}`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${rootDomain}`
        }
    })
}

/**
 * Limpia todo rastro de sesión: access token, refresh token,
 * datos de usuario, sessionStorage y todas las cookies del navegador.
 */
export function clearAuthData() {
    removeAccessToken()
    removeRefreshToken()
    removeUser()
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear()
    }
    clearAllCookies()
}
