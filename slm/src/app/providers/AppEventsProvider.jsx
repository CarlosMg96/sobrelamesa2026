import { useEffect } from 'react'
import { on, AppEvents } from '../events/appEvents'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useNotifications } from '../../modules/notifications/hooks/useNotifications'
import { useNavigate } from 'react-router-dom'

export function AppEventsProvider({ children }) {
    const { logout } = useAuth()
    const { notify } = useNotifications()
    const navigate = useNavigate()

    useEffect(() => {
        const offUnauthorized = on(AppEvents.UNAUTHORIZED, () => {
            logout()
            navigate('/login')
        })

        const offOffline = on(AppEvents.OFFLINE, () => {
            setTimeout(() => {
                notify('Sin conexión al servidor ⚠️', 'warning')
            }, 60)
        })

        const offApiError = on(AppEvents.API_ERROR, (data) => {
            if (data?.message) {
                setTimeout(() => {
                    notify(data.message, 'error')
                }, 60)
            }
        })

        return () => {
            offUnauthorized()
            offOffline()
            offApiError()
        }
    }, [logout, navigate, notify])


    return children
}
