import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { NotificationsProvider } from './modules/notifications/context/NotificationsContext';
import { AuthProvider } from './modules/auth/hooks/useAuth';
import { BrowserRouter } from 'react-router-dom';
import { AppEventsProvider } from './app/providers/AppEventsProvider';
import CssBaseline from '@mui/material/CssBaseline';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CssBaseline />
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <AppEventsProvider>
            <App />
          </AppEventsProvider>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
