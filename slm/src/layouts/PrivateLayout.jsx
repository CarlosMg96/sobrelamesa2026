import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const ROUTE_TITLES = {
  '/dashboard': 'Inicio',
  '/calendar': 'Agenda',
  '/events': 'Cotizaciones y Eventos',
  '/products': 'Catálogo de Inventario',
  '/inventory-daily': 'Inventario por Día',
  '/events/warehouse': 'Eventos en Curso (Almacén)',
  '/users': 'Administración de Usuarios',
  '/income': 'Registro de Ingresos',
  '/events/clients': 'Eventos por Cliente',
  '/reports': 'Reportes y Analítica',
  '/settings': 'Configuración General',
};

const PrivateLayout = () => {
  const location = useLocation();

  // Persistir preferencia de sidebar mini en localStorage
  const [isMini, setIsMini] = useState(() => {
    return localStorage.getItem('sidebar-mini') === 'true';
  });

  // Estado para mobile drawer
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-mini', String(isMini));
  }, [isMini]);

  // Si cambia de ruta, cerrar el drawer mobile automáticamente
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleToggleMini = () => {
    setIsMini((prev) => !prev);
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1200) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsMini((prev) => !prev);
    }
  };

  const title = ROUTE_TITLES[location.pathname] || 'Sobre La Mesa';

  return (
    <div
      className={`slm-layout-wrapper ${isMini ? 'sidebar-mini' : ''} ${
        isMobileOpen ? 'sidebar-show' : ''
      }`}
    >
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="slm-sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Modern Gradient Sidebar */}
      <Sidebar
        isMini={isMini}
        onToggleMini={handleToggleMini}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Page Content Wrapper */}
      <div className="slm-page-wrapper">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          isMini={isMini}
          title={title}
        />

        <main className="slm-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PrivateLayout;