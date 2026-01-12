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
            notify('Sin conexión al servidor ⚠️')
        })

        const offApiError = on(AppEvents.API_ERROR, (data) => {
            if (data?.message) {
                notify(data.message)
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
