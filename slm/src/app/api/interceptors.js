import { emit, AppEvents } from '../events/appEvents'
import { getAccessToken } from '../../shared/utils/auth'

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
        error => {
            if (!error.response) {
                emit(AppEvents.OFFLINE)
                return Promise.reject(error)
            }

            const { status, data } = error.response

            switch (status) {
                case 401:
                    emit(AppEvents.UNAUTHORIZED)
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
