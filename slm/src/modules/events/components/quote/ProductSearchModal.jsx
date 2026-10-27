import React, { useState, useEffect, useCallback } from 'react';
import { getProductCategoriesService, getProductsListService, checkStockAvailabilityService } from '../../../products/services/products.service';

export default function ProductSearchModal({
    isOpen,
    onClose,
    onAddProduct,
    startDate,
    endDate,
    eventId
}) {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [availabilityMap, setAvailabilityMap] = useState({});
    const [quantities, setQuantities] = useState({});
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

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

    // Buscar productos
    const fetchProducts = useCallback(async (pageNum = 1, search = searchTerm, cat = selectedCategory) => {
        setLoading(true);
        try {
            const res = await getProductsListService({
                pageNumber: pageNum,
                pageLength: 10,
                search: search || undefined,
                categoryId: cat ? Number(cat) : undefined
            });

            if (res?.data?.data) {
                const prods = res.data.data;
                setProducts(prods);
                setPagination(res.data.pagination);
                setPage(pageNum);

                // Inicializar cantidades por defecto (1)
                const initialQty = {};
                prods.forEach(p => {
                    initialQty[p.id] = quantities[p.id] || 1;
                });
                setQuantities(prev => ({ ...prev, ...initialQty }));

                // Checar disponibilidad si hay fechas válidas
                if (startDate && endDate && prods.length > 0) {
                    try {
                        const productIds = prods.map(p => p.id);
                        const availRes = await checkStockAvailabilityService({
                            productIds,
                            startDate,
                            endDate,
                            eventId: eventId ? Number(eventId) : undefined
                        });
                        if (availRes?.data) {
                            setAvailabilityMap(prev => ({ ...prev, ...availRes.data }));
                        }
                    } catch (availErr) {
                        console.error('Error verificando disponibilidad en modal:', availErr);
                    }
                }
            }
        } catch (err) {
            console.error('Error buscando productos:', err);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, selectedCategory, startDate, endDate, eventId, quantities]);

    // Ejecutar búsqueda cuando se abre el modal o cambian filtros
    useEffect(() => {
        if (isOpen) {
            fetchProducts(1, searchTerm, selectedCategory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedCategory]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchProducts(1, searchTerm, selectedCategory);
    };

    const handleQuantityChange = (productId, val) => {
        const num = Math.max(1, Number(val) || 1);
        setQuantities(prev => ({ ...prev, [productId]: num }));
    };

    const handleAdd = (product) => {
        const qty = quantities[product.id] || 1;
        const availInfo = availabilityMap[product.id];
        onAddProduct({
            ...product,
            cantidad: qty,
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

                    {/* Filtros */}
                    <div className="p-3 border-bottom bg-body">
                        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
                            <div className="col-md-5">
                                <div className="input-group">
                                    <span className="input-group-text bg-transparent border-end-0">
                                        <i className="bi bi-search text-muted"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Buscar por clave o nombre de producto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="col-md-4">
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

                            <div className="col-md-3 d-flex gap-2">
                                <button type="submit" className="btn btn-primary rounded-pill flex-grow-1">
                                    <i className="bi bi-search me-1"></i> Buscar
                                </button>
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-pill"
                                        onClick={() => { setSearchTerm(''); fetchProducts(1, '', selectedCategory); }}
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Body: Lista de productos */}
                    <div className="modal-body p-3">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status"></div>
                                <p className="text-muted small mt-2">Buscando productos disponibles...</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-box-seam fs-1 d-block mb-2 text-secondary"></i>
                                <h6>No se encontraron productos</h6>
                                <p className="small">Intenta con otros términos o cambia la categoría.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
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
                                            <th className="text-center" style={{ width: '180px' }}>Agregar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => {
                                            const availInfo = availabilityMap[p.id];
                                            const availableStock = availInfo ? availInfo.available : p.stock;
                                            const isLowStock = availableStock <= 0;

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
                                                    <td>
                                                        <div className="d-flex align-items-center justify-content-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="form-control form-control-sm text-center"
                                                                style={{ width: '65px' }}
                                                                value={quantities[p.id] || 1}
                                                                onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary rounded-pill px-3"
                                                                onClick={() => handleAdd(p)}
                                                                title="Agregar partida"
                                                            >
                                                                <i className="bi bi-plus-lg"></i>
                                                            </button>
                                                        </div>
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
                                        onClick={() => fetchProducts(page - 1)}
                                    >
                                        <i className="bi bi-chevron-left"></i> Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        disabled={page >= pagination.total_pages}
                                        onClick={() => fetchProducts(page + 1)}
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
