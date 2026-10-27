import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCalendarEventsService, addCommentService } from '../services/events.service';
import '../../../styles/modern_admin.css';

// Helper date utilities
const formatToYMD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatFullDateSpanish = (dateObj) => {
  try {
    const d = new Date(dateObj);
    const dayName = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(d);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(d);
    const year = d.getFullYear();
    return `${capitalize(dayName)}, ${day} ${capitalize(month)} ${year}`;
  } catch {
    return String(dateObj);
  }
};

const formatShortDateSpanish = (dateObj) => {
  try {
    const d = new Date(dateObj);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d);
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateObj);
  }
};

const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  // Semana empieza en Domingo (0)
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
};

const getEndOfWeek = (d) => {
  const start = getStartOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
};

const getStartOfMonth = (d) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (d) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export default function CalendarPage() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('Semana'); // 'Mes', 'Semana', 'Día'
  const [dateFieldFilter, setDateFieldFilter] = useState('event_date'); // 'event_date', 'start_date', 'end_date'
  const [activeFilters, setActiveFilters] = useState([100]); // 100 = Todos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal comment state
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentEventId, setCommentEventId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Compute date range based on viewType
  const { startDate, endDate, dateRangeDisplay } = useMemo(() => {
    let start, end, display;
    if (viewType === 'Mes') {
      start = getStartOfMonth(currentDate);
      end = getEndOfMonth(currentDate);
      const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(currentDate);
      display = `${capitalize(monthName)} ${currentDate.getFullYear()}`;
    } else if (viewType === 'Día') {
      start = new Date(currentDate);
      end = new Date(currentDate);
      display = formatFullDateSpanish(currentDate);
    } else {
      // Semana
      start = getStartOfWeek(currentDate);
      end = getEndOfWeek(currentDate);
      display = `${formatShortDateSpanish(start)} - ${formatShortDateSpanish(end)}`;
    }
    return {
      startDate: formatToYMD(start),
      endDate: formatToYMD(end),
      dateRangeDisplay: display
    };
  }, [currentDate, viewType]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCalendarEventsService({
        startDate,
        endDate,
        filterByDate: dateFieldFilter
      });
      if (res && res.data) {
        setEvents(res.data);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dateFieldFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewType === 'Mes') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewType === 'Día') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewType === 'Mes') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewType === 'Día') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter click toggle
  const toggleStatusFilter = (statusId) => {
    if (statusId === 100) {
      setActiveFilters([100]);
      return;
    }
    let updated;
    if (activeFilters.includes(100)) {
      updated = [statusId];
    } else if (activeFilters.includes(statusId)) {
      updated = activeFilters.filter((id) => id !== statusId);
      if (updated.length === 0) updated = [100];
    } else {
      updated = [...activeFilters, statusId];
    }
    setActiveFilters(updated);
  };

  const clearFilters = () => {
    setActiveFilters([100]);
  };

  // Search handler
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  // Status check matches
  const checkMatchesStatus = (ev, statusFilter) => {
    const status = parseInt(ev.estatus ?? ev.status, 10);
    const deliveryStatus = parseInt(ev.status_entrega, 10);
    const receivedStatus = parseInt(ev.status_recibido, 10);

    if (statusFilter === 100) return true;
    if (statusFilter >= 11 && statusFilter <= 14) {
      switch (statusFilter) {
        case 11: // En tránsito
          return status === 3 || status === 2;
        case 12: // Entregado
          return deliveryStatus === 2 || deliveryStatus === 3;
        case 13: // En almacén / Recolectado
          return deliveryStatus === 4 || deliveryStatus === 3;
        case 14: // Finalizado
          return receivedStatus === 1 || receivedStatus === 2 || status === 6;
        default:
          return false;
      }
    }
    return status === statusFilter;
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Status Filter
      if (!activeFilters.includes(100)) {
        const matches = activeFilters.some((f) => checkMatchesStatus(ev, f));
        if (!matches) return false;
      }

      // 2. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const folioStr = String(ev.id || '').padStart(7, '0');
        const client = String(ev.cliente || '').toLowerCase();
        const empresa = String(ev.empresa || '').toLowerCase();
        const agent = String(ev.agente || '').toLowerCase();
        if (
          !folioStr.includes(query) &&
          !client.includes(query) &&
          !empresa.includes(query) &&
          !agent.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [events, activeFilters, searchQuery]);

  // Group events by target date (based on dateFieldFilter and filtrado_por)
  const groupedEvents = useMemo(() => {
    // Generate dates in range
    const groups = {};
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    let cur = new Date(start);
    while (cur <= end) {
      const ymd = formatToYMD(cur);
      groups[ymd] = [];
      cur.setDate(cur.getDate() + 1);
    }

    filteredEvents.forEach((ev) => {
      let targetDate = ev.fecha_evento;
      if (dateFieldFilter === 'start_date' || ev.filtrado_por === 'fecha_entrega') {
        targetDate = ev.fecha_entrega;
      } else if (dateFieldFilter === 'end_date' || ev.filtrado_por === 'fecha_recoleccion') {
        targetDate = ev.fecha_recoleccion;
      }

      if (targetDate && groups[targetDate]) {
        groups[targetDate].push(ev);
      }
    });

    return groups;
  }, [filteredEvents, startDate, endDate, dateFieldFilter]);

  // Render Logistics Status Badge
  const renderLogisticsBadge = (ev) => {
    const received = parseInt(ev.status_recibido, 10);
    const delivery = parseInt(ev.status_entrega, 10);

    if (received === 1) {
      return <span className="badge badge-custom badge-completado">Con nota de pérdida</span>;
    }
    if (received === 2) {
      return <span className="badge badge-custom badge-completado">Llegó completo</span>;
    }
    if (delivery === 2) {
      return <span className="badge badge-custom badge-autorizado">Tránsito</span>;
    }
    if (delivery === 3) {
      return <span className="badge badge-custom badge-completado">Entregado</span>;
    }
    if (delivery === 4) {
      return <span className="badge badge-custom badge-completado">Recolectado</span>;
    }
    if (delivery === 20) {
      return <span className="badge badge-custom badge-abonos">Preparación</span>;
    }
    if (delivery === 21) {
      return <span className="badge badge-custom badge-firmado">Listo entrega</span>;
    }
    return <span className="badge badge-custom badge-cotizado">En espera</span>;
  };

  // Render Event Status Badge
  const renderEventStatusBadge = (status) => {
    const st = parseInt(status, 10);
    switch (st) {
      case 1:
        return <span className="badge badge-custom badge-cotizado">Cotizado</span>;
      case 2:
        return <span className="badge badge-custom badge-autorizado">Autorizado</span>;
      case 3:
        return <span className="badge badge-custom badge-confirmado">Confirmado</span>;
      case 4:
        return <span className="badge badge-custom badge-abonos">Abonos</span>;
      case 5:
        return <span className="badge badge-custom badge-firmado">Firmado</span>;
      case 6:
        return <span className="badge badge-custom badge-completado">Finalizado</span>;
      default:
        return <span className="badge badge-custom badge-cancelado">Cancelado</span>;
    }
  };

  // Render Schedule Badge
  const renderScheduleBadge = (ev) => {
    const isEntrega = ev.filtrado_por === 'fecha_entrega';
    const scheduleType = isEntrega
      ? ev.tipo_horario_entrega || 'ESPECIFICO'
      : ev.tipo_horario_recoleccion || 'ESPECIFICO';
    const rawStart = isEntrega ? ev.hora_entrega : ev.hora_recoleccion;
    const rawEnd = isEntrega ? ev.hora_entrega_fin : ev.hora_recoleccion_fin;

    if (scheduleType === 'ABIERTO') {
      return <span className="badge bg-secondary">Abierto (10am-5pm)</span>;
    }
    if (scheduleType === 'RANGO') {
      const startStr = rawStart ? rawStart.substring(0, 5) : '08:00';
      const endStr = rawEnd ? rawEnd.substring(0, 5) : '20:00';
      return (
        <div className="d-flex align-items-center justify-content-center">
          <span className="badge bg-warning text-dark me-1">Rango</span>
          <span>{`${startStr} a ${endStr}`}</span>
        </div>
      );
    }
    // ESPECIFICO
    let timeStr = rawStart ? rawStart.substring(0, 5) : '08:00';
    if (rawStart === '20:00:45' || rawStart === '08:00:45') {
      timeStr = 'Abierto';
    }
    return (
      <div className="d-flex align-items-center justify-content-center">
        <span className="badge bg-info text-dark me-1">Específico</span>
        <span>{timeStr}</span>
      </div>
    );
  };

  // Render Logistics Pill (Entrega vs Recolección)
  const renderLogisticsPill = (ev) => {
    const isEntrega = ev.filtrado_por === 'fecha_entrega';
    const targetDate = isEntrega ? ev.fecha_entrega : ev.fecha_recoleccion;
    const dateStr = formatFullDateSpanish(targetDate || ev.fecha_evento);

    if (isEntrega) {
      return (
        <span className="badge rounded-pill bg-success py-1 px-3">
          Entrega: {dateStr.toLowerCase()}
        </span>
      );
    }
    return (
      <span className="badge rounded-pill bg-primary py-1 px-3">
        Recolección: {dateStr.toLowerCase()}
      </span>
    );
  };

  // Render Category Icons
  const renderCategoryIcons = (categories) => {
    let list = [];
    if (Array.isArray(categories)) {
      list = categories;
    } else if (typeof categories === 'string') {
      list = categories.split(',');
    }
    return (
      <div className="d-flex gap-2 align-items-center justify-content-center">
        {list.map((cat, i) => {
          const c = String(cat).trim();
          if (c === '1') {
            return (
              <span key={i} title="Table Styling" className="cat-badge-icon">
                <i className="fa-solid fa-champagne-glasses"></i>
              </span>
            );
          }
          if (c === '2') {
            return (
              <span key={i} title="Decoración" className="cat-badge-icon">
                <i className="fa-solid fa-palette"></i>
              </span>
            );
          }
          if (c === '3') {
            return (
              <span key={i} title="Mobleria" className="cat-badge-icon">
                <i className="fa-solid fa-couch"></i>
              </span>
            );
          }
          if (c === '4') {
            return (
              <span key={i} title="Textiles" className="cat-badge-icon">
                <i className="fa-solid fa-rug"></i>
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Save comment handler
  const handleSaveComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !commentEventId) return;
    try {
      setIsSavingComment(true);
      await addCommentService({
        evento_id: commentEventId,
        comentario: commentText.trim()
      });
      setCommentModalOpen(false);
      setCommentText('');
      setCommentEventId(null);
      fetchEvents();
    } catch (err) {
      console.error('Error saving comment:', err);
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="text-muted small fw-medium mb-1">
            <i className="bi bi-list me-1"></i> Panel de Control
          </div>
          <h2 className="fw-bold mb-1">Agenda</h2>
          <p className="text-muted mb-0">Visualización de eventos (Eventos Confirmados)</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        {/* Status of Events Title & Buttons */}
        <div className="mb-4">
          <h6 className="fw-bold mb-3">Status de Eventos</h6>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              onClick={() => toggleStatusFilter(1)}
              className={`btn rounded-pill px-3 ${
                activeFilters.includes(1)
                  ? 'btn-light border fw-bold'
                  : 'btn-outline-secondary'
              }`}
            >
              {activeFilters.includes(1) && <i className="fas fa-check me-1"></i>}
              Cotizando
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(3)}
              className={`btn rounded-pill px-3 ${
                activeFilters.includes(3)
                  ? 'btn-primary'
                  : 'btn-outline-primary'
              }`}
            >
              {activeFilters.includes(3) && <i className="fas fa-check me-1"></i>}
              Confirmado
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(2)}
              className={`btn btn-authorized rounded-pill px-3 ${
                activeFilters.includes(2) ? '' : 'inactive'
              }`}
            >
              {activeFilters.includes(2) && <i className="fas fa-check me-1"></i>}
              Autorizados
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(0)}
              className={`btn rounded-pill px-3 ${
                activeFilters.includes(0)
                  ? 'btn-danger'
                  : 'btn-outline-danger'
              }`}
            >
              {activeFilters.includes(0) && <i className="fas fa-check me-1"></i>}
              Cancelado
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(100)}
              className={`btn rounded-pill px-3 ${
                activeFilters.includes(100) ? 'btn-dark' : 'btn-outline-dark'
              }`}
            >
              Todos
            </button>

            {!activeFilters.includes(100) && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-outline-dark rounded-pill px-3"
              >
                <i className="fas fa-times me-1"></i> Limpiar
              </button>
            )}

            <div className="separator"></div>

            <button
              type="button"
              onClick={() => toggleStatusFilter(11)}
              className={`btn btn-blue-dark rounded-pill px-3 ${
                activeFilters.includes(11) ? '' : 'inactive'
              }`}
            >
              {activeFilters.includes(11) && <i className="fas fa-check me-1"></i>}
              En Transito
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(12)}
              className={`btn btn-blue-dark rounded-pill px-3 ${
                activeFilters.includes(12) ? '' : 'inactive'
              }`}
            >
              {activeFilters.includes(12) && <i className="fas fa-check me-1"></i>}
              Entregado
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(13)}
              className={`btn btn-blue-dark rounded-pill px-3 ${
                activeFilters.includes(13) ? '' : 'inactive'
              }`}
            >
              {activeFilters.includes(13) && <i className="fas fa-check me-1"></i>}
              En almacen
            </button>

            <button
              type="button"
              onClick={() => toggleStatusFilter(14)}
              className={`btn btn-blue-dark rounded-pill px-3 ${
                activeFilters.includes(14) ? '' : 'inactive'
              }`}
            >
              {activeFilters.includes(14) && <i className="fas fa-check me-1"></i>}
              Finalizado
            </button>
          </div>
        </div>

        {/* Date Field Filter Dropdown */}
        <div className="row g-3 align-items-center mb-4">
          <div className="col-12 col-md-3">
            <select
              value={dateFieldFilter}
              onChange={(e) => setDateFieldFilter(e.target.value)}
              className="form-select slm-pill-select"
            >
              <option value="event_date">Fecha del Evento</option>
              <option value="start_date">Fecha de Inicio</option>
              <option value="end_date">Fecha de Fin</option>
            </select>
          </div>
        </div>

        <hr className="my-4" />

        {/* Action Buttons & Search */}
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-6 d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-success rounded-pill px-4"
              onClick={() => alert('Exportando Excel Completo...')}
            >
              <i className="fas fa-file-excel me-2"></i> Excel Completo
            </button>
            <button
              type="button"
              className="btn btn-outline-success rounded-pill px-4"
              onClick={() => alert('Exportando Excel Vista...')}
            >
              <i className="fas fa-file-excel me-2"></i> Excel Vista
            </button>
            <button
              type="button"
              className="btn btn-outline-success rounded-pill px-4"
              onClick={() => alert('Exportando Excel Vista $...')}
            >
              <i className="fas fa-file-excel me-2"></i> Excel Vista $
            </button>
          </div>

          <div className="col-12 col-md-6">
            <form onSubmit={handleSearchSubmit} className="input-group search-group">
              <span className="input-group-text ps-3">
                <i className="fas fa-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por ID de evento o Table Solver..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary px-4">
                Buscar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Vista Detallada Card */}
      <div className="card card-dashboard">
        <div className="card-header bg-transparent border-0 pt-4 pb-0">
          <h4 className="card-title fw-bold">Vista Detallada</h4>
        </div>
        <div className="card-body">
          {/* Calendar Controls */}
          <div className="row align-items-center g-3 mb-4">
            {/* Prev / Today / Next */}
            <div className="col-12 col-md-4 d-flex gap-2 justify-content-center justify-content-md-start">
              <button
                type="button"
                onClick={handlePrev}
                className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="btn btn-primary px-4 rounded-pill"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>

            {/* Date Range Badge Pill */}
            <div className="col-12 col-md-4 d-flex justify-content-center text-center">
              <div className="date-picker-wrapper w-100 justify-content-center" style={{ maxWidth: '340px' }}>
                <span className="fw-bold mb-0 text-primary me-2 fs-6">
                  {dateRangeDisplay}
                </span>
                <i className="fas fa-calendar-alt text-primary"></i>
              </div>
            </div>

            {/* Month / Week / Day Toggle */}
            <div className="col-12 col-md-4 d-flex justify-content-center justify-content-md-end">
              <div className="btn-group" role="group">
                <button
                  type="button"
                  onClick={() => setViewType('Mes')}
                  className={`btn ${
                    viewType === 'Mes'
                      ? 'btn-primary'
                      : 'btn-outline-primary'
                  }`}
                  style={{ minWidth: '80px' }}
                >
                  Mes
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('Semana')}
                  className={`btn ${
                    viewType === 'Semana'
                      ? 'btn-primary'
                      : 'btn-outline-primary'
                  }`}
                  style={{ minWidth: '80px' }}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('Día')}
                  className={`btn ${
                    viewType === 'Día'
                      ? 'btn-primary'
                      : 'btn-outline-primary'
                  }`}
                  style={{ minWidth: '80px' }}
                >
                  Día
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-responsive">
            <table className="table table-calendar">
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Cliente</th>
                  <th style={{ minWidth: '90px', textAlign: 'center' }}>Folio</th>
                  <th style={{ minWidth: '130px' }}>Agente</th>
                  <th style={{ minWidth: '110px', textAlign: 'center' }}>Estatus</th>
                  <th style={{ minWidth: '130px', textAlign: 'center' }}>Est. Logística</th>
                  <th style={{ minWidth: '220px' }}>Ubicación de Entrega / Recolección</th>
                  <th style={{ minWidth: '160px', textAlign: 'center' }}>Horario</th>
                  <th style={{ minWidth: '220px', textAlign: 'center' }}>Logística</th>
                  <th style={{ minWidth: '100px' }}>Notas</th>
                  <th style={{ minWidth: '110px', textAlign: 'center' }}>Contenido</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-muted">
                      <div className="spinner-border text-primary me-2" role="status"></div>
                      Cargando eventos...
                    </td>
                  </tr>
                ) : Object.keys(groupedEvents).length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4 text-muted">
                      No hay eventos en este periodo
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedEvents).map(([dateStr, dayEvents]) => {
                    const formattedDateHeader = formatFullDateSpanish(dateStr);
                    return (
                      <React.Fragment key={dateStr}>
                        {/* Group Header */}
                        <tr className="date-group-header">
                          <td colSpan={10}>
                            {formattedDateHeader}
                          </td>
                        </tr>

                        {/* Day Events */}
                        {dayEvents.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-muted ps-4 py-2 small">
                              Sin eventos
                            </td>
                          </tr>
                        ) : (
                          dayEvents.map((ev, idx) => {
                            const folio = String(ev.id || '').padStart(7, '0');
                            const isEntrega = ev.filtrado_por === 'fecha_entrega';
                            const address = isEntrega
                              ? ev.domicilio_entrega
                              : ev.domicilio_recoleccion || ev.domicilio_entrega;
                            const isBodega =
                              address &&
                              address.toLowerCase().includes('bodega de sobre la mesa');

                            const clientDisplay = ev.empresa
                              ? `${ev.cliente || 'undefined'} / ${ev.empresa.toUpperCase()}`
                              : ev.cliente || 'undefined';

                            return (
                              <tr key={`${ev.id}-${ev.filtrado_por || idx}`}>
                                {/* Cliente */}
                                <td className="fw-medium">{clientDisplay}</td>

                                {/* Folio */}
                                <td className="text-center">
                                  <strong>{folio}</strong>
                                </td>

                                {/* Agente */}
                                <td>{ev.agente || '-'}</td>

                                {/* Estatus */}
                                <td className="text-center">
                                  {renderEventStatusBadge(ev.estatus)}
                                </td>

                                {/* Est. Logística */}
                                <td className="text-center">
                                  {renderLogisticsBadge(ev)}
                                </td>

                                {/* Ubicación */}
                                <td style={{ maxWidth: '240px', fontSize: '0.85rem' }}>
                                  {isBodega ? (
                                    <span className="text-primary fw-medium">{address}</span>
                                  ) : (
                                    address || '-'
                                  )}
                                </td>

                                {/* Horario */}
                                <td className="text-center">
                                  {renderScheduleBadge(ev)}
                                </td>

                                {/* Logística */}
                                <td className="text-center">
                                  {renderLogisticsPill(ev)}
                                </td>

                                {/* Notas */}
                                <td style={{ maxWidth: '140px', fontSize: '0.82rem' }}>
                                  {ev.ultimo_comentario || ''}
                                </td>

                                {/* Contenido & Acción */}
                                <td className="text-center">
                                  <div className="d-flex align-items-center justify-content-center gap-2">
                                    {renderCategoryIcons(ev.categorias)}
                                    <button
                                      type="button"
                                      className="comment-bubble-btn"
                                      title="Agregar Comentario Interno"
                                      onClick={() => {
                                        setCommentEventId(ev.id);
                                        setCommentText('');
                                        setCommentModalOpen(true);
                                      }}
                                    >
                                      <i className="bi bi-chat-dots-fill"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for internal comment */}
      {commentModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Nuevo Comentario Interno</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setCommentModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveComment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">
                      Comentario (máx. 255 caracteres)
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      maxLength={255}
                      required
                      placeholder="Escribe tu comentario aquí..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    ></textarea>
                    <div className="form-text text-end">
                      {commentText.length} / 255
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4"
                    onClick={() => setCommentModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success rounded-pill px-4"
                    disabled={isSavingComment || !commentText.trim()}
                  >
                    {isSavingComment ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
