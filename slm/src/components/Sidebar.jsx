import React from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../modules/auth/hooks/useAuth';

const MENU_SECTIONS = [
  {
    title: null, // Sección Principal
    items: [
      { to: '/dashboard', icon: 'bi-speedometer2', label: 'Inicio' },
      { to: '/calendar', icon: 'bi-calendar-event', label: 'Agenda' },
      { to: '/events', icon: 'bi-receipt', label: 'Cotizaciones' },
      { to: '/products', icon: 'bi-box-seam', label: 'Inventario' },
      { to: '/inventory-daily', icon: 'bi-calendar3-week', label: 'Inventario por día' },
      { to: '/events/warehouse', icon: 'bi-truck', label: 'Eventos en curso' },
      { to: '/users', icon: 'bi-people', label: 'Usuarios' },
    ],
  },
  {
    title: 'Otros',
    items: [
      { to: '/income', icon: 'bi-cash-coin', label: 'Ingresos' },
      { to: '/events/clients', icon: 'bi-person-lines-fill', label: 'Eventos por cliente' },
      { to: '/reports', icon: 'bi-bar-chart', label: 'Reportes' },
      { to: '/settings', icon: 'bi-gear', label: 'Config. General' },
    ],
  },
];

const Sidebar = ({ isMini, onToggleMini, onCloseMobile }) => {
  const { user, logout } = useAuth();

  const handleLinkClick = () => {
    // Si la pantalla es móvil, cerrar el drawer al navegar
    if (window.innerWidth < 1200 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrador';

  return (
    <aside className="slm-sidebar">
      {/* BRAND SECTION */}
      <div className="slm-sidebar-brand">
        <div className="brand-logo-icon">
          <i className="bi bi-layers-fill"></i>
        </div>
        <div className="d-flex flex-column">
          <div className="brand-title">Sobre La Mesa</div>
          <div className="brand-subtitle">Bienvenido, {displayName}</div>
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <ul className="slm-sidebar-menu">
        {MENU_SECTIONS.map((section, sIndex) => (
          <React.Fragment key={sIndex}>
            {section.title && (
              <li className="sidebar-section-title">
                <span>{section.title}</span>
              </li>
            )}
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link-custom ${isActive ? 'active' : ''}`
                  }
                  onClick={handleLinkClick}
                  title={isMini ? item.label : undefined}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="nav-text">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </React.Fragment>
        ))}
      </ul>

      {/* FOOTER */}
      <div className="slm-sidebar-footer">
        <button
          type="button"
          className="slm-sidebar-logout-btn"
          onClick={logout}
          title={isMini ? 'Cerrar Sesión' : undefined}
        >
          <i className="bi bi-box-arrow-right"></i>
          {!isMini && <span>Cerrar Sesión</span>}
        </button>

        {/* Toggle mini button visible only when not mobile */}
        <button
          type="button"
          onClick={onToggleMini}
          className="btn-rounded p-1 text-secondary bg-transparent border-0 d-none d-xl-flex align-items-center justify-content-center"
          title={isMini ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          style={{ cursor: 'pointer', minWidth: '32px' }}
        >
          <i className={`bi ${isMini ? 'bi-chevron-double-right' : 'bi-chevron-double-left'} fs-6`}></i>
        </button>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  isMini: PropTypes.bool.isRequired,
  onToggleMini: PropTypes.func.isRequired,
  onCloseMobile: PropTypes.func,
};

export default Sidebar;
