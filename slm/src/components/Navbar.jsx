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
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

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

        <div>
          <h1 className="slm-navbar-title">{title}</h1>
          <p className="slm-navbar-subtitle">Sobre La Mesa | Sistema de Gestión</p>
        </div>
      </div>

      {/* RIGHT: Notifications & User Avatar */}
      <div className="slm-navbar-right">
        {/* Theme Switch Claro / Oscuro */}
        <ThemeToggle />

        {/* Notificaciones */}
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
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              backgroundColor: '#0d6efd',
              borderRadius: '50%',
            }}
          />
        </button>

        {/* User Dropdown */}
        <div className="position-relative" ref={dropdownRef}>
          <div
            className="slm-navbar-avatar"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title={displayName}
          >
            {initials}
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
