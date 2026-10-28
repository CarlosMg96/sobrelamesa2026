import { emit, AppEvents } from '../events/appEvents'
import { getAccessToken, clearAuthData } from '../../shared/utils/auth'
import { refreshTokenService } from '../../modules/auth/services/auth.service'

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

export function setupInterceptors(client) {
    client.interceptors.request.use(
        async config => {
            const token = getAccessToken()

            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }

            return config
        },
        error => Promise.reject(error)
    )

    client.interceptors.response.use(
        response => response,
        async error => {
            if (!error.response) {
                emit(AppEvents.OFFLINE)
                return Promise.reject(error)
            }

            const { status, data, config } = error.response
            const originalRequest = config

            // No interceptar peticiones de autenticación para evitar bucles
            const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')

            if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
                if (isRefreshing) {
                    // Si ya hay una renovación en curso, encolar esta petición
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject })
                    })
                        .then(token => {
                            originalRequest.headers.Authorization = `Bearer ${token}`
                            return client(originalRequest)
                        })
                        .catch(err => Promise.reject(err))
                }

                originalRequest._retry = true
                isRefreshing = true

                return new Promise((resolve, reject) => {
                    refreshTokenService()
                        .then(newToken => {
                            if (!newToken) {
                                processQueue(new Error('No se pudo renovar la sesión'), null)
                                clearAuthData()
                                emit(AppEvents.UNAUTHORIZED)
                                reject(error)
                                return
                            }

                            originalRequest.headers.Authorization = `Bearer ${newToken}`
                            processQueue(null, newToken)
                            resolve(client(originalRequest))
                        })
                        .catch(err => {
                            processQueue(err, null)
                            clearAuthData()
                            emit(AppEvents.UNAUTHORIZED)
                            reject(err)
                        })
                        .finally(() => {
                            isRefreshing = false
                        })
                })
            }

            switch (status) {
                case 401:
                    if (!isAuthEndpoint) {
                        emit(AppEvents.UNAUTHORIZED)
                    }
                    break

                case 403:
                    if (data?.message === 'User disabled') {
                        emit(AppEvents.UNAUTHORIZED)
                    }
                    break

                case 500:
                    if (
                        data?.message === 'Token invalid' ||
                        data?.message === 'Token expired' ||
                        data?.message === 'Failed to authenticate token'
                    ) {
                        emit(AppEvents.UNAUTHORIZED)
                    }
                    break

                default:
                    emit(AppEvents.API_ERROR, data)
                    break
            }

            return Promise.reject(error)
        }
    )
}
