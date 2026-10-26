import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Administrador';

  const KPIS = [
    {
      label: 'Cotizaciones Activas',
      value: '24',
      trend: '+12% este mes',
      trendIcon: 'bi-graph-up-arrow',
      icon: 'bi-receipt',
      color: '#0d6efd',
      bg: 'rgba(13, 110, 253, 0.12)',
    },
    {
      label: 'Artículos en Inventario',
      value: '1,420',
      trend: '98% disponible',
      trendIcon: 'bi-check-circle',
      icon: 'bi-box-seam',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
    {
      label: 'Eventos en Almacén',
      value: '7',
      trend: '3 entregas hoy',
      trendIcon: 'bi-truck',
      icon: 'bi-truck',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Clientes Activos',
      value: '186',
      trend: '+5 nuevos',
      trendIcon: 'bi-person-plus',
      icon: 'bi-people',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  const QUICK_ACTIONS = [
    {
      to: '/events',
      title: 'Cotizaciones y Eventos',
      desc: 'Crea y administra presupuestos, mobiliario, vajilla y mantelería para clientes.',
      icon: 'bi-receipt',
      color: '#0d6efd',
      bg: 'rgba(13, 110, 253, 0.12)',
    },
    {
      to: '/calendar',
      title: 'Agenda de Entregas',
      desc: 'Visualiza el calendario con las fechas de montaje, logística y recolección.',
      icon: 'bi-calendar-event',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
    {
      to: '/products',
      title: 'Catálogo de Inventario',
      desc: 'Controla el stock disponible, artículos por categoría y tarifas de renta.',
      icon: 'bi-box-seam',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      to: '/events/warehouse',
      title: 'Salidas de Almacén',
      desc: 'Revisión y validación de artículos que salen a eventos en curso.',
      icon: 'bi-truck',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  return (
    <div className="slm-dashboard-container">
      {/* HERO BANNER */}
      <section className="slm-dashboard-hero">
        <div>
          <span className="slm-hero-badge">
            <i className="bi bi-shield-check"></i> Sistema de Gestión Activo • v2.1.61
          </span>
          <h1 className="slm-hero-title">¡Bienvenid@ de nuevo, {displayName}!</h1>
          <p className="slm-hero-subtitle">
            Panel general de administración para <strong>Sobre La Mesa</strong>. Monitorea cotizaciones,
            disponibilidad de inventario y flujo de eventos en tiempo real.
          </p>
        </div>

        <div className="slm-dashboard-brand-badge">
          <img src="/logos/logo_04.png" alt="Sobre La Mesa" />
        </div>
      </section>

      {/* KPI METRICS */}
      <section className="slm-kpi-grid">
        {KPIS.map((kpi, idx) => (
          <div key={idx} className="slm-kpi-card">
            <div
              className="slm-kpi-icon"
              style={{ backgroundColor: kpi.bg, color: kpi.color }}
            >
              <i className={`bi ${kpi.icon}`}></i>
            </div>
            <div className="slm-kpi-info">
              <span className="slm-kpi-label">{kpi.label}</span>
              <span className="slm-kpi-value">{kpi.value}</span>
              <span className="slm-kpi-trend">
                <i className={`bi ${kpi.trendIcon}`}></i> {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <div className="slm-section-header">
          <h3 className="slm-section-title">
            <i className="bi bi-grid-fill"></i> Módulos y Acciones Rápidas
          </h3>
        </div>

        <div className="slm-quick-actions-grid">
          {QUICK_ACTIONS.map((action, idx) => (
            <Link key={idx} to={action.to} className="slm-quick-action-card">
              <div className="slm-quick-action-top">
                <div
                  className="slm-quick-action-icon"
                  style={{ backgroundColor: action.bg, color: action.color }}
                >
                  <i className={`bi ${action.icon}`}></i>
                </div>
                <i className="bi bi-arrow-right slm-quick-action-arrow"></i>
              </div>
              <div>
                <h4>{action.title}</h4>
                <p>{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SYSTEM BANNER */}
      <footer className="slm-system-banner">
        <div>
          <span>Sobre La Mesa &copy; 2026. Desarrollado con </span>
          <a href="https://bigtech.com.mx/" target="_blank" rel="noreferrer">
            BigTech
          </a>{' '}
          &amp;{' '}
          <a href="https://github.com/CarlosMg96" target="_blank" rel="noreferrer">
            CarlosMg96
          </a>
          . Todos los derechos reservados.
        </div>
        <div>
          <span className="badge bg-secondary-subtle text-secondary px-2.5 py-1">
            Build 2026.1 • v2.1.61
          </span>
        </div>
      </footer>
    </div>
  );
}