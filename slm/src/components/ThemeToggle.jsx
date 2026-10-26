import React from 'react';
import { useTheme } from '../theme/ThemeContext';

const ThemeToggle = () => {
  const { mode, toggleColorMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      className="slm-theme-switch"
      onClick={toggleColorMode}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Toggle theme mode"
    >
      {/* Iconos de fondo en la pista */}
      <i className="bi bi-sun-fill slm-theme-switch-track-icon sun"></i>
      <i className="bi bi-moon-stars-fill slm-theme-switch-track-icon moon"></i>

      {/* Thumb / Perilla deslizante animada */}
      <div className="slm-theme-switch-thumb">
        <i className={`bi ${isDark ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`}></i>
      </div>
    </button>
  );
};

export default ThemeToggle;
