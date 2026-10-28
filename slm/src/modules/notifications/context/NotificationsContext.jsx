import { createContext, useContext, useCallback } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { showToast, isAlertVisible } from '../../../shared/utils/alerts'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
    const { user } = useAuth()

    const notify = useCallback((message, icon = 'warning') => {
        if (!user || !message) return
        // Evitar duplicar o sobrescribir alertas/toasts de SweetAlert2 ya disparados por el componente
        if (isAlertVisible()) return
        showToast(message, icon)
    }, [user])

    return (
        <NotificationsContext.Provider value={{ notify }}>
            {children}
        </NotificationsContext.Provider>
    )
}

export function useNotificationsContext() {
    return useContext(NotificationsContext)
}
