import { emit, AppEvents } from '../events/appEvents'
import { getAccessToken } from '../../shared/utils/auth'
import { refreshTokenService } from '../../modules/auth/services/auth.service'

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

            const { status, data, config } = error.response;

            // Evitar bucle infinito de refresh
            if (status === 401 && data?.message === 'Token invalid or expired' && !config._retry) {
                config._retry = true;
                try {
                    const newAccessToken = await refreshTokenService();
                    if (newAccessToken) {
                        config.headers.Authorization = `Bearer ${newAccessToken}`;
                        return client(config);
                    } else {
                        emit(AppEvents.UNAUTHORIZED);
                        return Promise.reject(error);
                    }
                } catch (e) {
                    emit(AppEvents.UNAUTHORIZED);
                    return Promise.reject(error);
                }
            }

            switch (status) {
                case 401:
                    if (data?.message === 'No token provided') {
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
