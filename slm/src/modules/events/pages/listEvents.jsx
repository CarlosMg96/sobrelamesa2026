import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getEventsListService, getSolversService } from '../services/events.service';
import { showToast, showConfirm } from '../../../shared/utils/alerts';
import { openEventPdfById } from '../utils/quotePdfTemplate';

// Formato de fecha en español idéntico al legacy: "domingo, 25 de octubre de 2026"
const formatDateES = (dateStr) => {
  if (!dateStr || dateStr === '0000-00-00') return '-';
  try {
    const parts = String(dateStr).split(' ')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
  } catch {
    return dateStr;
  }
};

export default function ListEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [solvers, setSolvers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [authorizingCount, setAuthorizingCount] = useState(0);

  // Filtros y parámetros
  const [pageNumber, setPageNumber] = useState(1);
  const [pageLength, setPageLength] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterSolver, setFilterSolver] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInventory, setFilterInventory] = useState('');
  const [filterLogistics, setFilterLogistics] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [orderBy, setOrderBy] = useState('1');
  const [byAuthorizing, setByAuthorizing] = useState(false);

  // Estado del dropdown de fila activa
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Modales
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-action-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar lista de Solvers
  useEffect(() => {
    const fetchSolvers = async () => {
      try {
        const res = await getSolversService();
        if (res && res.data) {
          setSolvers(res.data);
        }
      } catch (err) {
        console.error('Error cargando solvers:', err);
      }
    };
    fetchSolvers();
  }, []);

  // Cargar Eventos
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        pageNumber,
        pageLength,
        search: search.trim() || undefined,
        filterSolver: filterSolver || undefined,
        filterStatus: filterStatus !== '' ? filterStatus : undefined,
        filterInventory: filterInventory || undefined,
        logisticsStatus: filterLogistics || undefined,
        filterPayment: filterPayment || undefined,
        filterPaymentType: filterPaymentType || undefined,
        filterDate: filterDate || undefined,
        orderBy,
        byAuthorizing: byAuthorizing ? true : undefined,
      };

      const res = await getEventsListService(params);
      if (res && res.data) {
        setEvents(res.data.data || []);
        setTotalCount(res.data.pagination?.total || 0);
        if (res.data.countEventsByAuthorizing !== undefined) {
          setAuthorizingCount(res.data.countEventsByAuthorizing);
        }
      }
    } catch (err) {
      console.error('Error al cargar cotizaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [
    pageNumber,
    pageLength,
    search,
    filterSolver,
    filterStatus,
    filterInventory,
    filterLogistics,
    filterPayment,
    filterPaymentType,
    filterDate,
    orderBy,
    byAuthorizing,
  ]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPageNumber(1);
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPageNumber(1);
  };

  const totalPages = Math.ceil(totalCount / pageLength) || 1;
  const startItem = totalCount > 0 ? (pageNumber - 1) * pageLength + 1 : 0;
  const endItem = totalCount > 0 ? Math.min(pageNumber * pageLength, totalCount) : 0;

  // Render Status Badge
  const renderStatusBadge = (status) => {
    const s = parseInt(status, 10);
    switch (s) {
      case 0:
        return <span className="badge badge-custom badge-cancelado">Cancelado</span>;
      case 1:
        return <span className="badge badge-custom badge-cotizado">Cotizado</span>;
      case 2:
        return <span className="badge badge-custom badge-autorizado">Autorizado</span>;
      case 3:
        return <span className="badge badge-custom badge-confirmado">Confirmado</span>;
      case 5:
        return <span className="badge badge-custom badge-firmado">Firmado</span>;
      case 6:
        return <span className="badge badge-custom badge-completado">Finalizado</span>;
      default:
        return <span className="badge badge-custom badge-cotizado">Otro</span>;
    }
  };

  // Render Logistics Status Badge
  const renderLogisticsStatusBadge = (event) => {
    const logisticsStatus = parseInt(event.status_entrega, 10) || 0;
    const recoleccionStatus = parseInt(event.status_recibido, 10) || 0;
    const estatus = parseInt(event.estatus, 10);

    if (logisticsStatus === 1) {
      if (estatus === 2 || estatus === 3 || estatus === 6) {
        if (recoleccionStatus === 1) {
          return (
            <span className="badge badge-custom badge-warning">
              <i className="bi bi-file-earmark-text me-1"></i> Nota de pérdida
            </span>
          );
        }
        if (recoleccionStatus === 2) {
          return <span className="badge badge-custom badge-success">Finalizado</span>;
        }
        return <span className="badge badge-custom badge-outline-warning">Pendiente</span>;
      } else {
        if (recoleccionStatus === 1) {
          return (
            <span className="badge badge-custom badge-warning">
              <i className="bi bi-file-earmark-text me-1"></i> Nota de pérdida
            </span>
          );
        }
        if (recoleccionStatus === 2) {
          return <span className="badge badge-custom badge-success">Finalizado</span>;
        }
        return <span className="badge badge-custom badge-outline-danger">No confirmado</span>;
      }
    }

    if (logisticsStatus === 20) {
      return <span className="badge badge-custom badge-outline-info">En Preparación</span>;
    }
    if (logisticsStatus === 21) {
      return <span className="badge badge-custom badge-outline-success">Listo para Entrega</span>;
    }

    return <span className="badge badge-custom badge-outline-danger">No confirmado</span>;
  };

  // Render Payment Badge
  const renderPaymentBadge = (event) => {
    const paymentStatus = parseInt(event.status_pago, 10);
    const paymentType = parseInt(event.tipo_pago, 10);

    if (paymentStatus === 1) {
      return (
        <span
          className="badge badge-custom badge-paid cursor-pointer"
          onClick={() => setSelectedPaymentDetails(event)}
        >
          <i className="bi bi-check-circle me-1"></i> Pagado
        </span>
      );
    }
    if (paymentStatus === 3) {
      return (
        <span
          className="badge badge-custom badge-outline-primary cursor-pointer"
          onClick={() => setSelectedPaymentDetails(event)}
        >
          <i className="bi bi-check-circle me-1"></i> Anticipo
        </span>
      );
    }
    if (paymentType === 1) {
      return <span className="badge badge-custom badge-autorizado">Muestra</span>;
    }

    return (
      <span
        className="badge badge-custom badge-cancelado cursor-pointer"
        onClick={() => setSelectedPaymentDetails(event)}
      >
        <i className="bi bi-credit-card me-1"></i> Pendiente de pago
      </span>
    );
  };

  // Render Deposit Badge
  const renderDepositBadge = (event) => {
    const hasDeposit = parseInt(event.deposito, 10) === 1;
    if (!hasDeposit) {
      return (
        <span className="badge badge-custom badge-cotizado">
          <i className="bi bi-x-circle me-1"></i> Sin depósito
        </span>
      );
    }

    const depositStatus = parseInt(event.status_deposito, 10) || 0;
    if (depositStatus === 1) {
      return (
        <span
          className="badge badge-custom badge-paid cursor-pointer"
          onClick={() => setSelectedPaymentDetails(event)}
        >
          <i className="bi bi-check-circle me-1"></i> Pagado
        </span>
      );
    }
    if (depositStatus === 2) {
      return (
        <span
          className="badge badge-custom badge-outline-primary cursor-pointer"
          onClick={() => setSelectedPaymentDetails(event)}
        >
          <i className="bi bi-check-circle me-1"></i> Anticipo
        </span>
      );
    }
    if (depositStatus === 3) {
      return (
        <span
          className="badge badge-custom badge-paid cursor-pointer"
          onClick={() => setSelectedPaymentDetails(event)}
        >
          <i className="bi bi-check-circle me-1"></i> Devuelto
        </span>
      );
    }

    return (
      <span
        className="badge badge-custom badge-cancelado cursor-pointer"
        onClick={() => setSelectedPaymentDetails(event)}
      >
        <i className="bi bi-credit-card me-1"></i> Pendiente de pago
      </span>
    );
  };

  // Render Category Icons underneath Folio
  const renderCategoryIcons = (categoriesStr) => {
    if (!categoriesStr) {
      // Default icon display
      return (
        <div className="d-flex gap-1 align-items-center mt-1">
          <span className="cat-badge-icon" title="Vehículo / Logística">
            <i className="bi bi-truck"></i>
          </span>
          <span className="cat-badge-icon" title="Mobiliario">
            <i className="bi bi-box-seam"></i>
          </span>
        </div>
      );
    }

    const cats = String(categoriesStr).split(',');
    return (
      <div className="d-flex gap-1 align-items-center mt-1">
        {cats.map((c, idx) => {
          switch (c.trim()) {
            case '1':
              return (
                <span key={idx} className="cat-badge-icon" title="Table Styling">
                  <i className="bi bi-cup-straw"></i>
                </span>
              );
            case '2':
              return (
                <span key={idx} className="cat-badge-icon" title="Decoración">
                  <i className="bi bi-palette"></i>
                </span>
              );
            case '3':
              return (
                <span key={idx} className="cat-badge-icon" title="Mobiliario">
                  <i className="bi bi-lamp"></i>
                </span>
              );
            case '4':
              return (
                <span key={idx} className="cat-badge-icon" title="Textiles">
                  <i className="bi bi-grid-3x3"></i>
                </span>
              );
            default:
              return (
                <span key={idx} className="cat-badge-icon" title="General">
                  <i className="bi bi-tag"></i>
                </span>
              );
          }
        })}
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* FILTER SECTION (Exact replication of legacy design) */}
      <div className="filter-section">
        {/* ROW 1: Search Pill on Left + Actions on Right */}
        <div className="slm-filter-top-row">
          {/* Search Pill */}
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: 440, minWidth: 260 }}>
            <div className="slm-search-pill-container">
              <span className="slm-search-pill-icon">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="slm-search-pill-input"
                placeholder="Buscar por cliente, folio..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  className="slm-search-pill-clear-btn"
                  type="button"
                  title="Limpiar búsqueda"
                  onClick={handleClearSearch}
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
              <button className="slm-search-pill-btn" type="submit">
                Buscar
              </button>
            </div>
          </form>

          {/* Right Top Actions */}
          <div className="slm-filter-top-actions">
            {/* Botón Nueva Cotización */}
            <Link
              to="/events/new"
              className="btn btn-primary rounded-pill px-3 shadow-sm d-flex align-items-center gap-1"
            >
              <i className="bi bi-plus-lg"></i>
              <span>Nueva Cotización</span>
            </Link>

            {/* Botón Por Autorizar con Badge */}
            <button
              type="button"
              className={`slm-btn-authorize ${byAuthorizing ? 'active' : ''}`}
              onClick={() => {
                setByAuthorizing(!byAuthorizing);
                setPageNumber(1);
              }}
            >
              <i className="fas fa-shield-alt me-1"></i> Por Autorizar
              <span className="slm-btn-authorize-badge">
                {authorizingCount}
              </span>
            </button>

            {/* Selector Ordenar */}
            <div className="slm-order-by-container">
              <span className="slm-order-by-label">ORDENAR:</span>
              <select
                className="slm-pill-select"
                value={orderBy}
                onChange={(e) => {
                  setOrderBy(e.target.value);
                  setPageNumber(1);
                }}
              >
                <option value="1">Fecha creación</option>
                <option value="0">Evento más próximo</option>
              </select>
            </div>
          </div>
        </div>

        {/* ROW 2: Filter Pills (Filtros: Fecha | Solvers | Estatus | Inventario | Logística) */}
        <div className="slm-filter-row">
          <div className="slm-filter-label">
            <i className="fas fa-filter text-muted"></i> Filtros:
          </div>

          {/* Fecha */}
          <input
            type="text"
            className="slm-pill-input"
            placeholder="Cualquier fecha"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setPageNumber(1);
            }}
          />

          {/* Solvers */}
          <select
            className="slm-pill-select"
            value={filterSolver}
            onChange={(e) => {
              setFilterSolver(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Todos los solvers</option>
            {solvers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Estatus */}
          <select
            className="slm-pill-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Todos los estatus</option>
            <option value="1">Cotizado</option>
            <option value="2">Autorizado</option>
            <option value="3">Confirmado</option>
            <option value="0">Cancelado</option>
            <option value="5">Firmado</option>
            <option value="6">Finalizado</option>
          </select>

          {/* Inventario */}
          <select
            className="slm-pill-select"
            value={filterInventory}
            onChange={(e) => {
              setFilterInventory(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Todo el inventario</option>
            <option value="Available">Disponible</option>
            <option value="SoldOut">Sobrevendido</option>
          </select>

          {/* Logística */}
          <select
            className="slm-pill-select"
            value={filterLogistics}
            onChange={(e) => {
              setFilterLogistics(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Toda Logística</option>
            <option value="1">Nota de pérdida</option>
            <option value="2">Finalizado</option>
            <option value="3">Pendiente</option>
            <option value="4">No confirmado</option>
            <option value="5">Entregado</option>
            <option value="6">Tránsito</option>
            <option value="7">Recolectado</option>
            <option value="20">En Preparación</option>
            <option value="21">Listo para Entrega</option>
          </select>
        </div>

        {/* ROW 3: Financial Filters (FINANZAS: Todos los eventos | Tipo de Pago) */}
        <div className="slm-filter-row">
          <div className="slm-finance-label">FINANZAS:</div>

          <select
            className="slm-pill-select"
            value={filterPayment}
            onChange={(e) => {
              setFilterPayment(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Todos los eventos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
          </select>

          <select
            className="slm-pill-select"
            value={filterPaymentType}
            onChange={(e) => {
              setFilterPaymentType(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Tipo de Pago</option>
            <option value="sample">Muestra</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="credit">Crédito</option>
            <option value="exchange">Intercambio</option>
            <option value="promotion">Promoción</option>
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL HOMOGENIZADA */}
      <div className="slm-table-card">
        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '10%' }}>Folio</th>
                <th className="text-center" style={{ width: '10%' }}>Estatus de Ventas</th>
                <th className="text-center" style={{ width: '9%' }}>Inventario</th>
                <th className="text-start ps-3" style={{ width: '15%' }}>Cliente / Contacto</th>
                <th className="text-start ps-3" style={{ width: '12%' }}>Table Solver</th>
                <th className="text-center" style={{ width: '11%' }}>Pagos</th>
                <th className="text-center" style={{ width: '11%' }}>Depósito</th>
                <th className="text-start ps-3" style={{ width: '13%' }}>Logística</th>
                <th className="text-center" style={{ width: '10%' }}>Estado Logística</th>
                <th className="text-center" style={{ width: '9%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <div className="text-muted small mt-2">Cargando cotizaciones...</div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    No se encontraron cotizaciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const isDropdownOpen = openDropdownId === evt.id;

                  return (
                    <tr key={evt.id}>
                      {/* 1. FOLIO */}
                      <td className="text-center align-middle">
                        <div className="d-flex flex-column align-items-center">
                          <div className="d-flex align-items-center gap-1">
                            <span className="fw-bold">CO-00{evt.id}</span>
                            {(evt.status_firmas || evt.firma) && (
                              <span
                                className="cat-badge-icon"
                                title="Cotización Firmada"
                                style={{ width: 20, height: 20, fontSize: '0.65rem' }}
                              >
                                <i className="bi bi-pen"></i>
                              </span>
                            )}
                          </div>
                          {renderCategoryIcons(evt.categorias)}
                        </div>
                      </td>

                      {/* 2. ESTATUS DE VENTAS */}
                      <td className="text-center align-middle">
                        {renderStatusBadge(evt.estatus)}
                      </td>

                      {/* 3. INVENTARIO */}
                      <td className="text-center align-middle">
                        {Number(evt.status_sobrevendido) === 1 ? (
                          <span className="badge badge-custom badge-sobrevendido">Sobrevendido</span>
                        ) : (
                          <span className="badge badge-custom badge-disponible">Disponible</span>
                        )}
                      </td>

                      {/* 4. CLIENTE / CONTACTO */}
                      <td className="text-start ps-3 align-middle">
                        <div>
                          <div className="fw-bold text-dark">{evt.cliente || '-'}</div>
                          {evt.empresa && (
                            <div className="text-muted small text-uppercase">{evt.empresa}</div>
                          )}
                          {evt.num_tel ? (
                            <div className="text-muted small">
                              <i className="bi bi-telephone-fill me-1"></i>
                              {evt.num_tel}
                            </div>
                          ) : (
                            <div className="text-muted small">
                              <i className="bi bi-telephone-fill"></i>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. TABLE SOLVER */}
                      <td className="text-start ps-3 align-middle">
                        <span className="fw-medium">{evt.agente || 'Desconocido'}</span>
                      </td>

                      {/* 6. PAGOS */}
                      <td className="text-center align-middle">
                        {renderPaymentBadge(evt)}
                      </td>

                      {/* 7. DEPÓSITO */}
                      <td className="text-center align-middle">
                        {renderDepositBadge(evt)}
                      </td>

                      {/* 8. LOGÍSTICA */}
                      <td className="text-start ps-3 align-middle">
                        <div className="small">
                          <span className="text-muted d-block">Fecha del Evento:</span>
                          <span className="fw-medium text-capitalize">
                            {formatDateES(evt.fecha_evento)}
                          </span>
                        </div>
                      </td>

                    {/* 9. ESTADO LOGÍSTICA */}
                    <td className="text-center align-middle">
                      {renderLogisticsStatusBadge(evt)}
                    </td>

                    {/* 10. ACCIONES */}
                    <td className="text-center align-middle">
                      <div className="d-flex justify-content-center align-items-center gap-1 dropdown-action-container position-relative">
                        {/* Eye Button */}
                        <button
                          type="button"
                          className="action-btn"
                          title="Ver detalles"
                          onClick={() => setSelectedEventDetails(evt)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          className="action-btn"
                          title="Editar cotización"
                          onClick={() => navigate(`/events/edit/${evt.id}`)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        {/* Three Dots Dropdown Toggle */}
                        <div className="position-relative">
                          <button
                            type="button"
                            className="action-btn"
                            title="Más acciones"
                            onClick={() =>
                              setOpenDropdownId(isDropdownOpen ? null : evt.id)
                            }
                          >
                            <i className="bi bi-three-dots"></i>
                          </button>

                          {/* Action Dropdown Menu */}
                          {isDropdownOpen && (
                            <ul className="slm-table-dropdown shadow">
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    navigate(`/events/edit/${evt.id}`);
                                  }}
                                >
                                  <i className="bi bi-pencil text-muted"></i> Editar Cotización
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    openEventPdfById(evt.id, 'sin-iva');
                                  }}
                                >
                                  <i className="bi bi-download text-muted"></i> Generar PDF Sin IVA
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    openEventPdfById(evt.id, 'con-iva');
                                  }}
                                >
                                  <i className="bi bi-download text-muted"></i> Generar PDF
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    openEventPdfById(evt.id, 'logistica');
                                  }}
                                >
                                  <i className="bi bi-download text-muted"></i> Generar PDF Orden Logística
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    showToast(`Evento #${evt.id} autorizado exitosamente`, 'success');
                                  }}
                                >
                                  <i className="bi bi-check-circle text-muted"></i> Autorizar
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setSelectedPaymentDetails(evt);
                                  }}
                                >
                                  <i className="bi bi-credit-card text-muted"></i> Ver Detalles de Pago
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={async () => {
                                    setOpenDropdownId(null);
                                    const res = await showConfirm({
                                      title: '¿Confirmar cotización?',
                                      text: `¿Deseas confirmar la cotización #${evt.id}?`,
                                      confirmButtonText: 'Sí, confirmar'
                                    });
                                    if (res.isConfirmed) {
                                      showToast(`Cotización #${evt.id} confirmada`, 'success');
                                    }
                                  }}
                                >
                                  <i className="bi bi-check-circle text-muted"></i> Confirmar Cotización
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    showToast(`Generando nota de pérdida para evento #${evt.id}`, 'info');
                                  }}
                                >
                                  <i className="bi bi-file-earmark-text text-muted"></i> Nota de Pérdida
                                </button>
                              </li>
                              <li className="slm-table-dropdown-divider"></li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item text-primary"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    showToast(`Des-cancelando evento #${evt.id}`, 'info');
                                  }}
                                >
                                  <i className="bi bi-arrow-counterclockwise text-primary"></i> Des-cancelar
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item text-primary"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    showToast(`Duplicando evento #${evt.id}`, 'info');
                                  }}
                                >
                                  <i className="bi bi-copy text-primary"></i> Duplicar
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="slm-table-dropdown-item text-danger"
                                  onClick={async () => {
                                    setOpenDropdownId(null);
                                    const res = await showConfirm({
                                      title: '¿Cancelar evento?',
                                      text: `¿Estás seguro de cancelar el evento #${evt.id}?`,
                                      confirmButtonText: 'Sí, cancelar evento',
                                      icon: 'warning'
                                    });
                                    if (res.isConfirmed) {
                                      showToast(`Evento #${evt.id} cancelado`, 'info');
                                    }
                                  }}
                                >
                                  <i className="bi bi-x-circle text-danger"></i> Cancelar
                                </button>
                              </li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* PAGINATION CONTROLS (Identical to legacy) */}
      <div className="slm-pagination-row">
        <button
          className="slm-pagination-btn"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
        >
          Anterior
        </button>

        <span className="fw-bold text-muted small">
          Mostrando {startItem} a {endItem} de {totalCount} cotizaciones
        </span>

        <span className="fw-bold text-muted small">
          {pageNumber} / {totalPages}
        </span>

        <select
          className="slm-pill-select"
          style={{ width: 100 }}
          value={pageLength}
          onChange={(e) => {
            setPageLength(parseInt(e.target.value, 10));
            setPageNumber(1);
          }}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>

        <button
          className="slm-pagination-btn"
          disabled={pageNumber >= totalPages}
          onClick={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}
        >
          Siguiente
        </button>
      </div>

      {/* MODAL DETALLES DEL EVENTO */}
      {selectedEventDetails && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1100 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: '16px',
                backgroundColor: 'var(--slm-card-bg)',
                color: 'var(--slm-text-title)',
              }}
            >
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  Detalles de la Cotización CO-00{selectedEventDetails.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedEventDetails(null)}
                ></button>
              </div>
              <div className="modal-body pt-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Cliente:</p>
                    <p className="fw-bold">{selectedEventDetails.cliente || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Empresa:</p>
                    <p className="fw-bold">{selectedEventDetails.empresa || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Teléfono / Email:</p>
                    <p className="fw-bold">
                      {selectedEventDetails.num_tel || '-'} / {selectedEventDetails.email || '-'}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Table Solver:</p>
                    <p className="fw-bold">{selectedEventDetails.agente || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Fecha Evento:</p>
                    <p className="fw-bold">{formatDateES(selectedEventDetails.fecha_evento)}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Personas / Descuento:</p>
                    <p className="fw-bold">
                      {selectedEventDetails.no_personas || 0} personas | {selectedEventDetails.descuento || 0}% desc.
                    </p>
                  </div>
                  <div className="col-12">
                    <p className="mb-1 text-muted small">Domicilio de Entrega:</p>
                    <p className="fw-bold">{selectedEventDetails.domicilio_entrega || 'N/A'}</p>
                  </div>
                  <div className="col-12">
                    <p className="mb-1 text-muted small">Domicilio de Recolección:</p>
                    <p className="fw-bold">{selectedEventDetails.domicilio_recoleccion || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => setSelectedEventDetails(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES DE PAGO */}
      {selectedPaymentDetails && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1100 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: '16px',
                backgroundColor: 'var(--slm-card-bg)',
                color: 'var(--slm-text-title)',
              }}
            >
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  Detalles de Pago - CO-00{selectedPaymentDetails.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedPaymentDetails(null)}
                ></button>
              </div>
              <div className="modal-body pt-3">
                <div className="p-3 bg-light rounded-3 mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Estado del Pago:</span>
                    {renderPaymentBadge(selectedPaymentDetails)}
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Estado del Depósito:</span>
                    {renderDepositBadge(selectedPaymentDetails)}
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Tipo de Pago:</span>
                    <span className="fw-bold">
                      {selectedPaymentDetails.tipo_pago === 1
                        ? 'Muestra'
                        : selectedPaymentDetails.tipo_pago === 3
                        ? 'Transferencia'
                        : selectedPaymentDetails.tipo_pago === 5
                        ? 'Efectivo'
                        : selectedPaymentDetails.tipo_pago === 6
                        ? 'Crédito'
                        : 'Otro'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Depósito en Garantía:</span>
                    <span className="fw-bold">
                      ${Number(selectedPaymentDetails.deposito || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => setSelectedPaymentDetails(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
