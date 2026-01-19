import { AppRouter } from './app/router/AppRouter'
import { AuthProvider } from './modules/auth/hooks/useAuth'
import { NotificationsProvider } from './modules/notifications/context/NotificationsContext'
import CssBaseline from '@mui/material/CssBaseline'

function App() {
  return (
    <>
      <CssBaseline />
      <AuthProvider>
        <NotificationsProvider>
          <AppRouter />
        </NotificationsProvider>
      </AuthProvider>
    </>
  )
}

export default App