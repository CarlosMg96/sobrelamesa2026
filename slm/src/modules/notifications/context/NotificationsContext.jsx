import { createContext, useContext, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { ToastContainer } from '../components/ToastContainer'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
    const { user } = useAuth()
    const [toasts, setToasts] = useState([])

    const notify = (message) => {
        if (!user) return

        const id = crypto.randomUUID()
        setToasts(prev => [...prev, { id, message }])

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }

    return (
        <NotificationsContext.Provider value={{ notify }}>
            {children}
            <ToastContainer toasts={toasts} />
        </NotificationsContext.Provider>
    )
}

export function useNotificationsContext() {
    return useContext(NotificationsContext)
}
