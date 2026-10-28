import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getProductCategoriesService, getProductsListService, checkStockAvailabilityService } from '../../../products/services/products.service';

export default function ProductSearchModal({
    isOpen,
    onClose,
    onAddProduct,
    startDate,
    endDate,
    eventId,
    items = []
}) {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [availabilityMap, setAvailabilityMap] = useState({});
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const requestIdRef = useRef(0);

    // Mapa de productos ya agregados a la cotización activa
    const addedProductsMap = useMemo(() => {
        const map = {};
        (items || []).forEach(it => {
            if (it.row_status !== 'deleted' && (it.type === 'product' || !it.type)) {
                const pid = Number(it.producto_id || it.id);
                if (pid) {
                    map[pid] = (map[pid] || 0) + 1;
                }
            }
        });
        return map;
    }, [items]);

    // Cargar categorías al montar
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await getProductCategoriesService();
                if (res?.data) {
                    setCategories(res.data);
                }
            } catch (err) {
                console.error('Error cargando categorías:', err);
            }
        };
        loadCategories();
    }, []);

    // Escuchar atajo F2 y Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (!isOpen) {
                    // Abrir si no está abierto
                }
            } else if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Buscar productos (sin parpadeo: mantiene la tabla visible mientras actualiza resultados)
    const fetchProducts = useCallback(async (pageNum = 1, search = '', cat = '') => {
        const currentReqId = ++requestIdRef.current;
        setLoading(true);
        try {
            const res = await getProductsListService({
                pageNumber: pageNum,
                pageLength: 10,
                search: search.trim() || undefined,
                categoryId: cat ? Number(cat) : undefined
            });

            if (currentReqId !== requestIdRef.current) return;

            if (res?.data?.data) {
                const prods = res.data.data;
                setProducts(prods);
                setPagination(res.data.pagination);
                setPage(pageNum);
                setLoading(false);

                // Checar disponibilidad en segundo plano sin bloquear ni ocultar la tabla
                if (startDate && endDate && prods.length > 0) {
                    const productIds = prods.map(p => p.id);
                    checkStockAvailabilityService({
                        productIds,
                        startDate,
                        endDate,
                        eventId: eventId ? Number(eventId) : undefined
                    })
                        .then(availRes => {
                            if (currentReqId === requestIdRef.current && availRes?.data) {
                                setAvailabilityMap(prev => ({ ...prev, ...availRes.data }));
                            }
                        })
                        .catch(availErr => {
                            console.error('Error verificando disponibilidad en modal:', availErr);
                        });
                }
            } else {
                setLoading(false);
            }
        } catch (err) {
            if (currentReqId === requestIdRef.current) {
                console.error('Error buscando productos:', err);
                setLoading(false);
            }
        }
    }, [startDate, endDate, eventId]);

    // Filtrado automático conforme se escribe (debounce de 300ms) sin desmontar la tabla
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            fetchProducts(1, searchTerm, selectedCategory);
        }, searchTerm ? 300 : 0);

        return () => clearTimeout(timer);
    }, [isOpen, searchTerm, selectedCategory, fetchProducts]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchProducts(1, searchTerm, selectedCategory);
    };

    const handleAdd = (product) => {
        const availInfo = availabilityMap[product.id];
        onAddProduct({
            ...product,
            cantidad: 0,
            available: availInfo?.available !== undefined ? availInfo.available : product.stock
        });
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
        >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content shadow-lg border-0" style={{ borderRadius: '16px' }}>
                    {/* Header */}
                    <div className="modal-header border-bottom px-4 py-3 bg-light-subtle">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary text-white px-2 py-1 fs-6">F2</span>
                            <h5 className="modal-title fw-bold mb-0">Catálogo de Productos y Mobiliario</h5>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Cerrar"
                            onClick={onClose}
                        ></button>
                    </div>

                    {/* Filtros en tiempo real */}
                    <div className="p-3 border-bottom bg-body">
                        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
                            <div className={searchTerm || selectedCategory ? 'col-md-6' : 'col-md-7'}>
                                <div className="input-group">
                                    <span className="input-group-text bg-transparent border-end-0">
                                        {loading ? (
                                            <span
                                                className="spinner-border spinner-border-sm text-primary"
                                                role="status"
                                                style={{ width: '14px', height: '14px' }}
                                            ></span>
                                        ) : (
                                            <i className="bi bi-search text-muted"></i>
                                        )}
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Escribe para filtrar por clave o nombre de producto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary border-start-0"
                                            onClick={() => setSearchTerm('')}
                                            title="Borrar búsqueda"
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={searchTerm || selectedCategory ? 'col-md-4' : 'col-md-5'}>
                                <select
                                    className="form-select"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">-- Todas las Categorías --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.categoria}</option>
                                    ))}
                                </select>
                            </div>

                            {(searchTerm || selectedCategory) && (
                                <div className="col-md-2 d-flex">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-pill w-100"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedCategory('');
                                        }}
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Body: Lista de productos sin desmontar la tabla al escribir */}
                    <div className="modal-body p-3" style={{ minHeight: '480px' }}>
                        {loading && products.length === 0 ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status"></div>
                                <p className="text-muted small mt-2">Cargando catálogo de productos...</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-box-seam fs-1 d-block mb-2 text-secondary"></i>
                                <h6>No se encontraron productos</h6>
                                <p className="small">Intenta con otros términos o cambia la categoría.</p>
                            </div>
                        ) : (
                            <div
                                className="table-responsive"
                                style={{
                                    opacity: loading ? 0.65 : 1,
                                    transition: 'opacity 0.15s ease'
                                }}
                            >
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '60px' }}>Imagen</th>
                                            <th style={{ width: '120px' }}>Clave</th>
                                            <th>Producto / Descripción</th>
                                            <th style={{ width: '140px' }}>Categoría</th>
                                            <th className="text-center" style={{ width: '110px' }}>Stock Total</th>
                                            <th className="text-center" style={{ width: '120px' }}>Disponible</th>
                                            <th className="text-end" style={{ width: '120px' }}>Precio Renta</th>
                                            <th className="text-center" style={{ width: '140px' }}>Agregar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => {
                                            const availInfo = availabilityMap[p.id];
                                            const availableStock = availInfo ? availInfo.available : p.stock;
                                            const isLowStock = availableStock <= 0;
                                            const addedCount = addedProductsMap[Number(p.id)] || 0;
                                            const isAdded = addedCount > 0;

                                            return (
                                                <tr key={p.id}>
                                                    <td>
                                                        {p.imagen ? (
                                                            <img
                                                                src={`https://sobre-la-mesa.com/images/productos/${p.imagen}`}
                                                                alt={p.producto}
                                                                className="rounded border"
                                                                style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://placehold.co/45x45?text=SLM';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="rounded bg-light text-muted d-flex align-items-center justify-content-center border"
                                                                style={{ width: '45px', height: '45px' }}
                                                            >
                                                                <i className="bi bi-image"></i>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-light text-dark border font-monospace">
                                                            {p.clave || 'S/C'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-semibold text-truncate" style={{ maxWidth: '320px' }}>
                                                            {p.producto}
                                                        </div>
                                                        {p.medidas && p.medidas !== '0' && (
                                                            <small className="text-muted d-block">{p.medidas}</small>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-secondary-subtle text-secondary">
                                                            {p.categoria || 'Sin categoría'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center fw-semibold">
                                                        {p.stock}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`badge ${isLowStock ? 'bg-danger text-white' : 'bg-success-subtle text-success border border-success-subtle'}`}>
                                                            {availableStock}
                                                        </span>
                                                    </td>
                                                    <td className="text-end fw-bold text-primary">
                                                        ${Number(p.precio_renta).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm rounded-pill px-3 fw-semibold d-inline-flex align-items-center justify-content-center gap-1 ${
                                                                isAdded ? 'btn-success' : 'btn-primary'
                                                            }`}
                                                            style={{ minWidth: '108px' }}
                                                            onClick={() => handleAdd(p)}
                                                            title={isAdded ? 'Ya agregado a la cotización — clic para volver a agregar' : 'Agregar partida'}
                                                        >
                                                            <i className={`bi ${isAdded ? 'bi-check-lg' : 'bi-plus-lg'}`}></i>
                                                            <span>{isAdded ? 'Agregado' : 'Agregar'}</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Footer con Paginación */}
                    <div className="modal-footer border-top px-4 py-2 d-flex justify-content-between align-items-center bg-light-subtle">
                        <div className="text-muted small">
                            {pagination && (
                                <span>Página {pagination.current_page} de {pagination.total_pages} ({pagination.total} productos)</span>
                            )}
                        </div>
                        <div className="d-flex gap-2">
                            {pagination && pagination.total_pages > 1 && (
                                <div className="btn-group btn-group-sm">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        disabled={page <= 1}
                                        onClick={() => fetchProducts(page - 1, searchTerm, selectedCategory)}
                                    >
                                        <i className="bi bi-chevron-left"></i> Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        disabled={page >= pagination.total_pages}
                                        onClick={() => fetchProducts(page + 1, searchTerm, selectedCategory)}
                                    >
                                        Siguiente <i className="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                            <button type="button" className="btn btn-secondary btn-sm rounded-pill px-3" onClick={onClose}>
                                Cerrar (Esc)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
