// app/router/AppRouter.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import LoginPage from '../../modules/auth/pages/LoginPage';
import Dashboard from '../../modules/dashboard/pages/dashboard';
import Page404 from '../../modules/errors/pages/404';
import PublicLayout from '../../layouts/PublicLayout';
import PrivateLayout from '../../layouts/PrivateLayout';
import ListEvents from '../../modules/events/pages/listEvents';
import Quote from '../../modules/events/pages/quote';
import ListProducts from '../../modules/products/pages/listProducts';

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route element={<PublicRoute><PublicLayout /></PublicRoute>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/events/quote" element={<Quote />} />
        <Route path="*" element={<Page404 />} />
      </Route>

      {/* Rutas privadas */}
      <Route element={<PrivateRoute><PrivateLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<ListEvents />} />
        <Route path="/products" element={<ListProducts />} />
      </Route>
    </Routes>
  );
}
