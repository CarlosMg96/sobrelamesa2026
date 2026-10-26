import React from 'react';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="slm-login-wrapper">
      <div className="slm-login-card">
        {/* PANEL IZQUIERDO: Branding Minimalista */}
        <div className="slm-login-hero">
          <img
            src="/logos/logo_04.png"
            alt="Sobre La Mesa"
            className="slm-login-hero-logo"
          />
          <span className="slm-login-hero-tagline">
            Gestión de Eventos & Inventario
          </span>
        </div>

        {/* PANEL DERECHO: Formulario Limpio */}
        <div className="slm-login-form-panel">
          <div className="slm-login-header">
            <h2>Iniciar Sesión</h2>
            <p>Ingresa a tu cuenta para continuar</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
