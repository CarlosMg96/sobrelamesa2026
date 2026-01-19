import { AppRouter } from './app/router/AppRouter';
import { AuthProvider } from './modules/auth/hooks/useAuth';
import { NotificationsProvider } from './modules/notifications/context/NotificationsContext';
import { ThemeProvider } from './theme/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AppRouter />
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;