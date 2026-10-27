import React, { useState } from 'react';
import { showToast, showConfirm } from '../../../../shared/utils/alerts';
import { authorizeStockProductService } from '../../services/events.service';

export default function ProductsTableCard({
    items,
    setItems,
    onOpenProductModal,
    availabilityMap = {},
    quoteType = 'COTIZACIÓN',
    setQuoteType,
    comments = [],
    onAddComment
}) {
    const [showAddCommentModal, setShowAddCommentModal] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Estado para modal de autorizar producto sobrevendido
    const [oversellModal, setOversellModal] = useState({
        isOpen: false,
        itemIndex: null,
        productName: '',
        requestedQty: 0,
        availableStock: 0
    });
    const [authPassword, setAuthPassword] = useState('');
    const [authorizingOversell, setAuthorizingOversell] = useState(false);

    // Agregar Sección intermedia
    const handleAddSection = () => {
        const nextPos = items.length;
        setItems(prev => [
            ...prev,
            {
                type: 'section',
                content_seccion: 'Nueva Sección',
                row_position: nextPos,
                row_status: 'new'
            }
        ]);
        showToast('Sección agregada', 'info');
    };

    // Agregar Nota intermedia
    const handleAddNote = () => {
        const nextPos = items.length;
        setItems(prev => [
            ...prev,
            {
                type: 'note',
                content_seccion: 'Nota para este bloque de productos...',
                row_position: nextPos,
                row_status: 'new'
            }
        ]);
        showToast('Nota agregada', 'info');
    };

    // Actualizar campo de un producto
    const handleProductChange = (index, field, value) => {
        setItems(prev => {
            const copy = [...prev];
            const item = { ...copy[index] };
            item[field] = value;

            const qty = Number(field === 'cantidad' ? value : item.cantidad) || 0;
            const price = Number(field === 'precio_producto' ? value : item.precio_producto) || 0;
            const days = Number(field === 'dias' ? value : item.dias) || 1;
            const disc = Number(field === 'descuento' ? value : item.descuento) || 0;

            if (field === 'cantidad') {
                const prodId = item.producto_id || item.id;
                const availInfo = availabilityMap[prodId];
                const availStock = availInfo ? availInfo.available : (item.available !== undefined ? item.available : item.stock);
                if (qty <= Number(availStock || 0)) {
                    item.status_authorized = 0;
                    item.quantity_authorized = 0;
                } else if (Number(item.quantity_authorized) !== qty) {
                    item.status_authorized = 0;
                }
            }

            item.subtotal = (qty * price * days) * (1 - disc / 100);
            if (item.row_status !== 'new') {
                item.row_status = 'modified';
            }

            copy[index] = item;
            return copy;
        });
    };

    // Abrir modal para sobrevender / autorizar producto sobrevendido (clickCheckStock en php7/slm)
    const handleClickCheckStock = (index, item, availableStock) => {
        const qty = Number(item.cantidad) || 0;
        const avail = Number(availableStock) || 0;
        const isAuth = Number(item.status_authorized) === 1 && Number(item.quantity_authorized ?? qty) === qty;

        if (qty > avail && !isAuth) {
            setOversellModal({
                isOpen: true,
                itemIndex: index,
                productName: item.producto || '',
                requestedQty: qty,
                availableStock: avail
            });
            setAuthPassword('');
        }
    };

    // Cancelar autorización de sobreventa: regresa la cantidad al stock disponible (handleCancelAuthorization en php7/slm)
    const handleCancelAuthorization = () => {
        const { itemIndex, availableStock } = oversellModal;
        if (itemIndex !== null && items[itemIndex]) {
            const safeStock = Math.max(0, Number(availableStock) || 0);
            setItems(prev => {
                const copy = [...prev];
                const item = { ...copy[itemIndex] };
                const price = Number(item.precio_producto) || 0;
                const days = Number(item.dias) || 1;
                const disc = Number(item.descuento) || 0;

                item.cantidad = safeStock;
                item.status_authorized = 0;
                item.quantity_authorized = 0;
                item.subtotal = (safeStock * price * days) * (1 - disc / 100);
                if (item.row_status !== 'new') {
                    item.row_status = 'modified';
                }
                copy[itemIndex] = item;
                return copy;
            });
        }
        setOversellModal({ isOpen: false, itemIndex: null, productName: '', requestedQty: 0, availableStock: 0 });
        setAuthPassword('');
    };

    // Confirmar contraseña para sobrevender producto (submitProductAuthorization en php7/slm)
    const handleSubmitProductAuthorization = async (e) => {
        if (e) e.preventDefault();
        if (!authPassword.trim()) {
            showToast('Por favor ingrese la contraseña de autorización', 'error');
            return;
        }

        setAuthorizingOversell(true);
        try {
            const res = await authorizeStockProductService(authPassword.trim());
            if (res?.data?.authorized) {
                const { itemIndex } = oversellModal;
                if (itemIndex !== null) {
                    setItems(prev => {
                        const copy = [...prev];
                        const item = { ...copy[itemIndex] };
                        const qty = Number(item.cantidad) || 0;
                        item.status_authorized = 1;
                        item.quantity_authorized = qty;
                        if (item.row_status !== 'new') {
                            item.row_status = 'modified';
                        }
                        copy[itemIndex] = item;
                        return copy;
                    });
                }
                showToast('Producto autorizado correctamente', 'success');
                setOversellModal({ isOpen: false, itemIndex: null, productName: '', requestedQty: 0, availableStock: 0 });
                setAuthPassword('');
            } else {
                showToast(res?.message || 'Contraseña de autorización incorrecta', 'error');
            }
        } catch (err) {
            console.error('Error al autorizar sobreventa:', err);
            showToast(err?.response?.data?.message || 'Contraseña de autorización incorrecta', 'error');
        } finally {
            setAuthorizingOversell(false);
        }
    };

    // Actualizar texto de sección o nota
    const handleContentChange = (index, text) => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                content_seccion: text,
                row_status: copy[index].row_status === 'new' ? 'new' : 'modified'
            };
            return copy;
        });
    };

    // Eliminar partida con confirmación SweetAlert2
    const handleDeleteItem = async (index) => {
        const target = items[index];
        const label = target.type === 'section' ? 'la sección' : target.type === 'note' ? 'la nota' : `"${target.producto || 'este producto'}"`;

        const res = await showConfirm({
            title: '¿Eliminar partida?',
            text: `¿Deseas remover ${label} de la cotización?`,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            icon: 'warning'
        });

        if (!res.isConfirmed) return;

        setItems(prev => {
            const copy = [...prev];
            const item = copy[index];
            if (item.id) {
                copy[index] = { ...item, row_status: 'deleted' };
                return copy;
            } else {
                return copy.filter((_, i) => i !== index);
            }
        });

        showToast('Partida eliminada', 'info');
    };

    // Ordenar por categoría
    const handleSortByCategory = () => {
        setItems(prev => {
            const prods = prev.filter(it => it.type === 'product' || !it.type);
            const others = prev.filter(it => it.type === 'section' || it.type === 'note');

            prods.sort((a, b) => {
                const catA = (a.categoria || '').toLowerCase();
                const catB = (b.categoria || '').toLowerCase();
                if (catA < catB) return -1;
                if (catA > catB) return 1;
                return (a.producto || '').localeCompare(b.producto || '');
            });

            return [...prods, ...others].map((it, idx) => ({ ...it, row_position: idx }));
        });
        showToast('Partidas ordenadas por categoría', 'info');
    };

    const handleSaveNewComment = () => {
        if (!commentText.trim()) return;
        if (onAddComment) {
            onAddComment(commentText.trim());
        }
        setCommentText('');
        setShowAddCommentModal(false);
    };

    const visibleItems = items.filter(it => it.row_status !== 'deleted');

    return (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-body p-4">
                {/* Título de la sección */}
                <h5 className="fw-bold mb-3 text-dark">
                    2. Selección de Productos
                </h5>

                {/* Toolbar Superior idéntico al screenshot */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div className="d-flex flex-wrap align-items-center gap-3 flex-grow-1">
                        {/* Botón Buscar Productos (F2) */}
                        <button
                            type="button"
                            className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex align-items-center gap-2 fw-medium shadow-sm bg-white"
                            style={{ minWidth: '220px', borderColor: '#3b82f6', color: '#2563eb' }}
                            onClick={onOpenProductModal}
                        >
                            <i className="bi bi-search"></i>
                            <span>Productos (F2)</span>
                        </button>

                        {/* Dropdown Tipo de Cotización */}
                        <div style={{ minWidth: '240px' }}>
                            <select
                                className="form-select rounded-pill px-3 py-2 border text-uppercase fw-semibold"
                                style={{ borderColor: '#cbd5e1', fontSize: '0.875rem' }}
                                value={quoteType || 'COTIZACIÓN'}
                                onChange={(e) => setQuoteType && setQuoteType(e.target.value)}
                            >
                                <option value="COTIZACIÓN">COTIZACIÓN</option>
                                <option value="NOTA DE PÉRDIDA">NOTA DE PÉRDIDA</option>
                                <option value="MUESTRA">MUESTRA</option>
                            </select>
                        </div>
                    </div>

                    {/* Botones de acción derecha */}
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-success rounded-pill px-3 py-1 small fw-semibold d-flex align-items-center gap-1 shadow-sm"
                            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                            onClick={handleAddSection}
                        >
                            <i className="bi bi-plus"></i> Sección
                        </button>

                        <button
                            type="button"
                            className="btn btn-success rounded-pill px-3 py-1 small fw-semibold d-flex align-items-center gap-1 shadow-sm"
                            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                            onClick={handleAddNote}
                        >
                            <i className="bi bi-plus"></i> Nota
                        </button>

                        <button
                            type="button"
                            className="btn btn-dark rounded-pill px-3 py-1 small fw-semibold d-flex align-items-center gap-1 shadow-sm"
                            style={{ backgroundColor: '#1e293b' }}
                            onClick={handleSortByCategory}
                        >
                            <i className="bi bi-arrow-down-up"></i> Ordenar
                        </button>
                    </div>
                </div>

                {/* Tabla de Productos */}
                {visibleItems.length === 0 ? (
                    <div className="text-center py-5 border rounded-3 bg-light-subtle text-muted mb-4">
                        <i className="bi bi-box-seam fs-1 text-secondary d-block mb-2"></i>
                        <h6 className="fw-semibold">No hay productos agregados en esta cotización</h6>
                        <p className="small mb-3">Haz clic en "Productos (F2)" para abrir el catálogo y seleccionar partidas.</p>
                        <button
                            type="button"
                            className="btn btn-primary rounded-pill px-4"
                            onClick={onOpenProductModal}
                        >
                            <i className="bi bi-search me-1"></i> Abrir Catálogo (F2)
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive mb-4">
                        <table className="table align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                            <thead style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                                <tr>
                                    <th style={{ width: '40px' }} className="text-center"></th>
                                    <th style={{ width: '100px' }} className="text-center fw-semibold">EN ALMACÉN</th>
                                    <th style={{ width: '90px' }} className="text-center fw-semibold">DISP</th>
                                    <th style={{ width: '110px' }} className="text-center fw-semibold">CANTIDAD</th>
                                    <th className="fw-semibold">DESCRIPCIÓN</th>
                                    <th style={{ width: '130px' }} className="text-end fw-semibold">PRECIO UNIT.</th>
                                    <th style={{ width: '80px' }} className="text-center fw-semibold">DÍAS</th>
                                    <th style={{ width: '80px' }} className="text-center fw-semibold">% DESC</th>
                                    <th style={{ width: '130px' }} className="text-end fw-semibold">TOTAL</th>
                                    <th style={{ width: '60px' }} className="text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    if (item.row_status === 'deleted') return null;

                                    // Fila de Sección
                                    if (item.type === 'section' || item.type === 3) {
                                        return (
                                            <tr key={`sec-${item.id || index}`} className="bg-primary-subtle border-primary">
                                                <td className="text-center text-muted cursor-grab">
                                                    <i className="bi bi-grip-vertical"></i>
                                                </td>
                                                <td colSpan="8" className="py-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm fw-bold border-0 bg-transparent text-primary"
                                                        style={{ fontSize: '0.95rem' }}
                                                        value={item.content_seccion || ''}
                                                        placeholder="Título de la Sección..."
                                                        onChange={(e) => handleContentChange(index, e.target.value)}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm border-0 rounded-circle"
                                                        onClick={() => handleDeleteItem(index)}
                                                        title="Eliminar Sección"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Fila de Nota
                                    if (item.type === 'note' || item.type === 2) {
                                        return (
                                            <tr key={`note-${item.id || index}`} className="bg-warning-subtle border-warning">
                                                <td className="text-center text-muted cursor-grab">
                                                    <i className="bi bi-grip-vertical"></i>
                                                </td>
                                                <td colSpan="8" className="py-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm border-0 bg-transparent text-dark"
                                                        value={item.content_seccion || ''}
                                                        placeholder="Nota..."
                                                        onChange={(e) => handleContentChange(index, e.target.value)}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm border-0 rounded-circle"
                                                        onClick={() => handleDeleteItem(index)}
                                                        title="Eliminar Nota"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Fila de Producto
                                    const prodId = item.producto_id || item.id;
                                    const availInfo = availabilityMap[prodId];
                                    const availableStock = availInfo ? availInfo.available : (item.available !== undefined ? item.available : item.stock);
                                    const currentQty = Number(item.cantidad) || 0;
                                    const availQty = Number(availableStock) || 0;
                                    const isOversold = currentQty > availQty;
                                    const isAuthorizedForCurrentQty = Boolean(
                                        Number(item.status_authorized) === 1 &&
                                        Number(item.quantity_authorized ?? currentQty) === currentQty
                                    );
                                    const isUnauthorizedOversold = isOversold && !isAuthorizedForCurrentQty;

                                    return (
                                        <tr
                                            key={`prod-${prodId}-${index}`}
                                            className={index % 2 === 1 ? 'bg-light-subtle' : ''}
                                            style={{ backgroundColor: isUnauthorizedOversold ? '#fff1f2' : undefined }}
                                        >
                                            {/* Drag handle */}
                                            <td className="text-center text-muted" style={{ cursor: 'grab' }}>
                                                <i className="bi bi-grip-vertical text-secondary"></i>
                                            </td>

                                            {/* EN ALMACÉN */}
                                            <td className="text-center fw-bold text-dark">
                                                {item.stock || 0}
                                            </td>

                                            {/* DISP */}
                                            <td className="text-center">
                                                <span
                                                    className={`badge px-2 py-1 rounded-pill ${
                                                        isOversold ? 'bg-danger text-white' : 'bg-success-subtle text-success'
                                                    }`}
                                                >
                                                    {availableStock !== undefined ? availableStock : '-'}
                                                </span>
                                            </td>

                                            {/* CANTIDAD con botón check / X para sobrevender */}
                                            <td className="text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="form-control form-control-sm text-center fw-bold rounded-3"
                                                        style={{ width: '70px', borderColor: isUnauthorizedOversold ? '#ef4444' : '#cbd5e1' }}
                                                        value={item.cantidad ?? 1}
                                                        onChange={(e) => handleProductChange(index, 'cantidad', e.target.value)}
                                                    />
                                                    <button
                                                        id={`btn-check-quantity-${index}`}
                                                        type="button"
                                                        onClick={() => handleClickCheckStock(index, item, availableStock)}
                                                        className={`btn btn-sm ${
                                                            isUnauthorizedOversold ? 'btn-danger' : 'btn-light border'
                                                        } shadow-sm rounded-circle p-0 d-flex align-items-center justify-content-center`}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            cursor: isUnauthorizedOversold ? 'pointer' : 'default'
                                                        }}
                                                        title={
                                                            isUnauthorizedOversold
                                                                ? 'Producto sobrevendido: Haz clic para autorizar / sobrevender'
                                                                : isOversold && isAuthorizedForCurrentQty
                                                                    ? 'Sobreventa autorizada'
                                                                    : 'Stock disponible'
                                                        }
                                                    >
                                                        {isUnauthorizedOversold ? (
                                                            <i className="bi bi-x-lg text-white" style={{ fontSize: '0.75rem' }}></i>
                                                        ) : (
                                                            <i className={`bi bi-check-lg ${isOversold && isAuthorizedForCurrentQty ? 'text-success fw-bold' : 'text-muted'}`}></i>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* DESCRIPCIÓN */}
                                            <td>
                                                <div className="fw-bold text-uppercase text-dark">
                                                    {item.producto}
                                                </div>
                                                {item.clave && (
                                                    <span className="text-muted font-monospace small">
                                                        [{item.clave}]
                                                    </span>
                                                )}
                                            </td>

                                            {/* PRECIO UNIT. */}
                                            <td className="text-end fw-semibold text-success">
                                                ${Number(item.precio_producto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {/* DÍAS */}
                                            <td className="text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="form-control form-control-sm text-center rounded-3 mx-auto"
                                                    style={{ width: '55px', borderColor: '#cbd5e1' }}
                                                    value={item.dias || 1}
                                                    onChange={(e) => handleProductChange(index, 'dias', e.target.value)}
                                                />
                                            </td>

                                            {/* % DESC */}
                                            <td className="text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="form-control form-control-sm text-center rounded-3 mx-auto"
                                                    style={{ width: '55px', borderColor: '#cbd5e1' }}
                                                    value={item.descuento || 0}
                                                    onChange={(e) => handleProductChange(index, 'descuento', e.target.value)}
                                                />
                                            </td>

                                            {/* TOTAL */}
                                            <td className="text-end fw-bold text-primary">
                                                ${Number(item.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {/* Delete */}
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm p-1 rounded-circle border d-flex align-items-center justify-content-center mx-auto"
                                                    style={{ width: '32px', height: '32px', borderColor: '#ef4444', color: '#ef4444' }}
                                                    onClick={() => handleDeleteItem(index)}
                                                    title="Eliminar partida"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Subsección Comentarios idéntica al screenshot */}
                <div className="mt-4 pt-3 border-top">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0 text-dark">
                            Comentarios
                        </h6>
                        <button
                            type="button"
                            className="btn btn-success rounded-circle d-flex align-items-center justify-content-center p-0 shadow-sm"
                            style={{ width: '32px', height: '32px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                            onClick={() => setShowAddCommentModal(true)}
                            title="Agregar comentario"
                        >
                            <i className="bi bi-plus-lg fs-6 text-white"></i>
                        </button>
                    </div>

                    <div className="table-responsive border rounded-3 bg-white">
                        <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                                <tr>
                                    <th style={{ width: '50px' }} className="text-center">#</th>
                                    <th>COMENTARIO</th>
                                    <th style={{ width: '160px' }}>USUARIO</th>
                                    <th style={{ width: '140px' }}>FECHA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-3 text-muted">
                                            No hay comentarios en este evento.
                                        </td>
                                    </tr>
                                ) : (
                                    comments.map((c, i) => (
                                        <tr key={c.id || i}>
                                            <td className="text-center text-muted">{i + 1}</td>
                                            <td>{c.comentario}</td>
                                            <td className="fw-semibold text-primary">{c.user_name || 'Usuario'}</td>
                                            <td className="text-muted">
                                                {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="small text-muted mt-2 d-flex align-items-center gap-1">
                        <i className="bi bi-info-circle text-secondary"></i>
                        <span>Los comentarios son para uso local, no serán reflejados en la vista del cliente.</span>
                    </div>
                </div>
            </div>

            {/* Modal para agregar comentario */}
            {showAddCommentModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h6 className="modal-title fw-bold">Agregar Comentario Interno</h6>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAddCommentModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <textarea
                                    className="form-control rounded-3"
                                    rows="3"
                                    placeholder="Escribe un comentario o nota interna..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-footer border-top">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill btn-sm px-3"
                                    onClick={() => setShowAddCommentModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary rounded-pill btn-sm px-4"
                                    onClick={handleSaveNewComment}
                                    disabled={!commentText.trim()}
                                >
                                    Guardar Comentario
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para autorizar producto sobrevendido (tomado de php7/slm) */}
            {oversellModal.isOpen && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    role="dialog"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1065 }}
                >
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
                            <div className="modal-header bg-danger text-white border-0">
                                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    <span>Autorizar Producto Sobrevendido</span>
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    aria-label="Cerrar"
                                    onClick={handleCancelAuthorization}
                                ></button>
                            </div>
                            <form onSubmit={handleSubmitProductAuthorization}>
                                <div className="modal-body p-4">
                                    <p className="mb-3 text-dark">
                                        El producto <strong>{oversellModal.productName}</strong> requiere autorización ya que la cantidad solicitada (<strong>{oversellModal.requestedQty}</strong>) supera el stock disponible (<strong>{oversellModal.availableStock}</strong>).
                                    </p>
                                    <div className="form-group">
                                        <label htmlFor="auth_password" className="form-label fw-semibold small text-muted">
                                            Contraseña de Autorización
                                        </label>
                                        <input
                                            type="password"
                                            id="auth_password"
                                            className="form-control rounded-3"
                                            placeholder="Ingrese contraseña"
                                            value={authPassword}
                                            onChange={(e) => setAuthPassword(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-top bg-light-subtle">
                                    <button
                                        type="button"
                                        className="btn btn-secondary rounded-pill px-4"
                                        onClick={handleCancelAuthorization}
                                        disabled={authorizingOversell}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-danger rounded-pill px-4 fw-semibold"
                                        disabled={authorizingOversell}
                                    >
                                        {authorizingOversell ? 'Autorizando...' : 'Sobrevender / Autorizar'}
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
