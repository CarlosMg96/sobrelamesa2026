import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../modules/auth/hooks/useAuth';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ onToggleSidebar, isMini, title = 'Panel de Control' }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown si se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrador';

  return (
    <header className="slm-navbar">
      {/* LEFT: Toggle Button + Title */}
      <div className="slm-navbar-left">
        <button
          type="button"
          className="slm-navbar-toggle-btn"
          onClick={onToggleSidebar}
          title={isMini ? 'Expandir barra lateral' : 'Alternar barra lateral'}
        >
          <i className="bi bi-list fs-4"></i>
        </button>

        <h1 className="slm-navbar-title fs-5 mb-0" style={{ fontWeight: 600 }}>Panel de Control</h1>
      </div>

      {/* RIGHT: Notifications & User Avatar */}
      <div className="slm-navbar-right">
        {/* Theme Switch Claro / Oscuro */}
        <ThemeToggle />

        {/* Notificaciones con badge '0' */}
        <button
          type="button"
          className="slm-navbar-toggle-btn position-relative"
          title="Notificaciones"
          style={{ width: 38, height: 38 }}
        >
          <i className="bi bi-bell fs-5"></i>
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              backgroundColor: '#dc3545',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            0
          </span>
        </button>

        {/* User Dropdown */}
        <div className="position-relative" ref={dropdownRef}>
          <div
            className="d-flex align-items-center gap-2"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              padding: '4px 8px',
              borderRadius: '20px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div className="slm-navbar-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              <i className="bi bi-person-fill"></i>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--slm-text-title)' }}>
              {displayName}
            </span>
            <i className="bi bi-chevron-down text-muted" style={{ fontSize: '0.75rem' }}></i>
          </div>

          {dropdownOpen && (
            <div className="slm-navbar-dropdown">
              <div className="slm-navbar-dropdown-header">
                <div className="slm-navbar-dropdown-name">{displayName}</div>
                <div className="slm-navbar-dropdown-email">
                  {user?.email || 'admin@sobrelamesa.com'}
                </div>
              </div>

              <button
                type="button"
                className="slm-navbar-dropdown-logout"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

Navbar.propTypes = {
  onToggleSidebar: PropTypes.func.isRequired,
  isMini: PropTypes.bool.isRequired,
  title: PropTypes.string,
};

export default Navbar;
