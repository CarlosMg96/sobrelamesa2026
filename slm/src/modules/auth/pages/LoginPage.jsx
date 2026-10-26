import React from 'react';
import { LoginForm } from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="slm-login-wrapper">
      <div className="slm-login-card">
        {/* PANEL IZQUIERDO: Branding & Hero */}
        <div className="slm-login-hero">
          <div>
            <div className="slm-login-hero-pill">
              <i className="bi bi-shield-check text-primary"></i>
              <span>Plataforma Administrativa</span>
            </div>
            <h1
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.5px',
                marginTop: '0.75rem',
                marginBottom: '0.35rem',
              }}
            >
              Sobre La Mesa
            </h1>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#94a3b8',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Sistema integral de administración de eventos, inventario en tiempo real y cotizaciones.
            </p>
          </div>

          {/* Logo Central */}
          <div className="d-flex align-items-center justify-content-center my-4">
            <img
              src="/logos/logo_04.png"
              alt="Sobre La Mesa Logo"
              className="slm-login-hero-logo-box"
            />
          </div>

          {/* Badges de funcionalidades */}
          <div className="d-flex flex-wrap gap-2">
            <div className="slm-login-hero-pill" style={{ marginBottom: 0 }}>
              <i className="bi bi-calendar-event text-info"></i>
              <span>Agenda en Vivo</span>
            </div>
            <div className="slm-login-hero-pill" style={{ marginBottom: 0 }}>
              <i className="bi bi-box-seam text-warning"></i>
              <span>Control de Inventario</span>
            </div>
            <div className="slm-login-hero-pill" style={{ marginBottom: 0 }}>
              <i className="bi bi-receipt text-success"></i>
              <span>Cotizaciones Dinámicas</span>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Formulario de Login */}
        <div className="slm-login-form-panel">
          <div className="slm-login-header">
            <h2>Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para acceder a tu panel de trabajo.</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
