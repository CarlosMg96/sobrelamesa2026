import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getCatalogsService, getEventDetailService, saveQuoteService, addCommentService } from '../services/events.service';
import { checkStockAvailabilityService } from '../../products/services/products.service';
import { showToast, showAlert, showConfirm } from '../../../shared/utils/alerts';
import GeneralDataCard from '../components/quote/GeneralDataCard';
import ProductsTableCard from '../components/quote/ProductsTableCard';
import FinancialSummaryCard from '../components/quote/FinancialSummaryCard';
import ProductSearchModal from '../components/quote/ProductSearchModal';

export default function QuoteEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = Boolean(id && Number(id) > 0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [catalogs, setCatalogs] = useState({
        clients: [],
        agents: [],
        eventTypes: [],
        places: [],
        paymentTypes: []
    });

    const [formState, setFormState] = useState({
        id: 0,
        fecha_cotizacion: new Date().toISOString().split('T')[0],
        cliente_id: '',
        cliente_nombre: '',
        agente_id: (!isEdit && user?.id) ? user.id : '',
        tipo_evento: '',
        no_personas: '',
        fecha_evento: '',
        hora_evento: '14:00',
        fecha_entrega: '',
        hora_entrega: '12:00',
        tipo_horario_entrega: 'ESPECIFICO',
        hora_entrega_fin: '',
        domicilio_entrega: '',
        fecha_recoleccion: '',
        hora_recoleccion: '12:00',
        tipo_horario_recoleccion: 'ESPECIFICO',
        hora_recoleccion_fin: '',
        domicilio_recoleccion: '',
        tipo_pago: 3,
        descuento: 0,
        deposito: 1,
        status_deposito: 0,
        lavado_desinfeccion: 0,
        descuento_lavado: 0,
        tipo_venta: 1,
        estatus: 1,
        url_seguimiento: ''
    });

    const [items, setItems] = useState([]);
    const [availabilityMap, setAvailabilityMap] = useState({});
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isLossNote, setIsLossNote] = useState(false);

    // Comentarios
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    // Auto-seleccionar usuario logueado en cotizaciones nuevas
    useEffect(() => {
        if (!isEdit && user?.id) {
            setFormState(prev => {
                if (!prev.agente_id) {
                    return { ...prev, agente_id: user.id };
                }
                return prev;
            });
        }
    }, [user, isEdit]);

    // 1. Cargar Catálogos y Detalle del Evento en paralelo
    useEffect(() => {
        const fetchInitData = async () => {
            setLoading(true);

            // Cargar catálogos en paralelo sin bloquear el detalle de la cotización
            getCatalogsService()
                .then((catRes) => {
                    if (catRes?.data) {
                        setCatalogs(catRes.data);
                    }
                })
                .catch((err) => {
                    console.error('Error cargando catálogos:', err);
                });

            try {
                if (isEdit) {
                    const detailRes = await getEventDetailService(id);
                    if (detailRes?.data) {
                        const { event, products = [], contents = [], comments = [] } = detailRes.data;

                        const cleanDate = (d) => d ? String(d).split('T')[0].split(' ')[0] : '';
                        const cleanTime = (t, def = '12:00') => t ? String(t).substring(0, 5) : def;

                        setFormState({
                            id: event.id,
                            fecha_cotizacion: cleanDate(event.fecha_cotizacion) || new Date().toISOString().split('T')[0],
                            cliente_id: event.cliente_id || '',
                            cliente_nombre: event.cliente || '',
                            num_tel: event.num_tel || '',
                            email: event.email || '',
                            empresa: event.empresa || '',
                            agente_id: event.agente_id || '',
                            agente: event.agente || '',
                            tipo_evento: event.tipo_evento || '',
                            tipo_evento_nombre: event.tipo_evento_nombre || '',
                            no_personas: event.no_personas || '',
                            fecha_evento: cleanDate(event.fecha_evento),
                            hora_evento: cleanTime(event.hora_evento, '14:00'),
                            fecha_entrega: cleanDate(event.fecha_entrega),
                            hora_entrega: cleanTime(event.hora_entrega, '12:00'),
                            tipo_horario_entrega: event.tipo_horario_entrega || 'ESPECIFICO',
                            hora_entrega_fin: cleanTime(event.hora_entrega_fin, ''),
                            domicilio_entrega: event.domicilio_entrega || '',
                            fecha_recoleccion: cleanDate(event.fecha_recoleccion),
                            hora_recoleccion: cleanTime(event.hora_recoleccion, '12:00'),
                            tipo_horario_recoleccion: event.tipo_horario_recoleccion || 'ESPECIFICO',
                            hora_recoleccion_fin: cleanTime(event.hora_recoleccion_fin, ''),
                            domicilio_recoleccion: event.domicilio_recoleccion || '',
                            tipo_pago: event.tipo_pago || 3,
                            descuento: event.descuento || 0,
                            deposito: event.deposito !== undefined ? event.deposito : 1,
                            status_deposito: event.status_deposito || 0,
                            lavado_desinfeccion: event.lavado_desinfeccion || 0,
                            descuento_lavado: event.descuento_lavado || 0,
                            tipo_venta: event.tipo_venta || 1,
                            estatus: Number(event.estatus) || 1,
                            url_seguimiento: event.url_seguimiento || '',
                            firma: event.firma || '',
                            firma_logistica: event.firma_logistica || ''
                        });

                        // Unificar products y contents ordenados por row_position
                        const unifiedItems = [
                            ...products.map(p => ({
                                ...p,
                                _uid: `prod-${p.id || Math.random()}`,
                                type: 'product',
                                row_status: 'exists',
                                status_authorized: Number(p.status_authorized) === 1 ? 1 : 0,
                                quantity_authorized: Number(p.quantity_authorized || (Number(p.status_authorized) === 1 ? p.cantidad : 0))
                            })),
                            ...contents.map(c => ({
                                ...c,
                                _uid: `cont-${c.id || Math.random()}`,
                                type: c.type === 3 ? 'section' : 'note',
                                row_status: 'exists'
                            }))
                        ];
                        unifiedItems.sort((a, b) => (a.row_position || 0) - (b.row_position || 0));
                        setItems(unifiedItems);

                        setComments(comments || []);
                    }
                }
            } catch (err) {
                console.error('Error cargando cotización:', err);
                showToast('Error cargando datos de la cotización', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchInitData();
    }, [id, isEdit]);

    // 2. Comprobar disponibilidad de productos en tiempo real
    const checkStockAvailability = useCallback(async (currentItems, startDate, endDate) => {
        if (!startDate || !endDate) return;

        const productIds = currentItems
            .filter(it => (it.type === 'product' || !it.type) && it.row_status !== 'deleted')
            .map(it => it.producto_id || it.id);

        if (productIds.length === 0) return;

        try {
            const res = await checkStockAvailabilityService({
                productIds,
                startDate,
                endDate,
                eventId: isEdit ? Number(id) : undefined
            });
            if (res?.data) {
                setAvailabilityMap(res.data);
            }
        } catch (err) {
            console.error('Error verificando disponibilidad de stock:', err);
        }
    }, [isEdit, id]);

    // Checar disponibilidad cuando cambian fechas de entrega/recolección o items
    useEffect(() => {
        if (formState.fecha_entrega && formState.fecha_recoleccion) {
            checkStockAvailability(items, formState.fecha_entrega, formState.fecha_recoleccion);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length, formState.fecha_entrega, formState.fecha_recoleccion, checkStockAvailability]);

    // Agregar producto desde el modal F2
    const handleAddProductFromModal = (productToAdd) => {
        const nextPos = items.length;
        const qty = productToAdd.cantidad !== undefined ? Number(productToAdd.cantidad) : 0;
        const sub = (qty * Number(productToAdd.precio_renta) * 1);

        const newItem = {
            _uid: `new-prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            id: undefined,
            producto_id: productToAdd.id,
            cantidad: qty,
            precio_producto: Number(productToAdd.precio_renta) || 0,
            descuento: 0,
            dias: 1,
            row_position: nextPos,
            row_status: 'new',
            type: 'product',
            clave: productToAdd.clave,
            producto: productToAdd.producto,
            medidas: productToAdd.medidas || '',
            precio_reposicion: Number(productToAdd.precio_reposicion) || 0,
            imagen: productToAdd.imagen,
            categoria: productToAdd.categoria,
            categoria_producto_id: Number(productToAdd.categoria_producto_id) || 0,
            subcategoria_id: Number(productToAdd.subcategoria_id) || 0,
            stock: productToAdd.stock,
            available: productToAdd.available,
            status_authorized: 0,
            quantity_authorized: 0,
            subtotal: sub
        };

        setItems(prev => [...prev, newItem]);
        showToast(`Agregado: ${productToAdd.producto}`, 'success');
    };

    // Agregar comentario interno
    const handleAddComment = async (commentToAdd) => {
        const text = (commentToAdd || newComment || '').trim();
        if (!text) return;

        const targetEventId = Number(id || formState.id || 0);

        if (targetEventId > 0) {
            try {
                const res = await addCommentService({
                    evento_id: targetEventId,
                    comentario: text,
                    user_name: user?.name || user?.username || 'Usuario'
                });
                const savedComment = res?.data;
                setComments(prev => [
                    {
                        id: savedComment?.id || Date.now(),
                        comentario: text,
                        user_name: savedComment?.user_name || user?.name || 'Yo',
                        created_at: savedComment?.created_at || new Date()
                    },
                    ...prev
                ]);
                setNewComment('');
                showToast('Comentario guardado', 'success');
            } catch (err) {
                console.error('Error guardando comentario:', err);
                showToast('Error al guardar comentario', 'error');
            }
        } else {
            // En creación se enviará junto al save
            setComments(prev => [
                {
                    id: Date.now(),
                    comentario: text,
                    user_name: user?.name || 'Yo',
                    created_at: new Date(),
                    isLocal: true
                },
                ...prev
            ]);
            setNewComment('');
            showToast('Comentario registrado localmente', 'info');
        }
    };

    // Guardar Cotización (Crear o Actualizar)
    const handleSaveQuote = async (customStatus) => {
        if (!formState.cliente_id) {
            showAlert({
                title: 'Cliente requerido',
                text: 'Por favor selecciona un Cliente para la cotización.',
                icon: 'warning'
            });
            return;
        }

        if (!formState.fecha_evento) {
            showAlert({
                title: 'Fecha requerida',
                text: 'Por favor ingresa la Fecha del Evento.',
                icon: 'warning'
            });
            return;
        }

        setSaving(true);

        try {
            // Separar productos y contents con su posición asignada según el orden visual actual
            const productsPayload = [];
            const contentsPayload = [];
            let activePos = 0;

            items.forEach((item) => {
                const isDeleted = item.row_status === 'deleted' || item.row_status === 'cancelled';
                const pos = isDeleted ? (item.row_position ?? 0) : activePos++;

                if (item.type === 'section' || item.type === 3) {
                    contentsPayload.push({
                        id: item.id,
                        content_seccion: item.content_seccion,
                        type: 3,
                        row_position: pos,
                        row_status: item.row_status
                    });
                } else if (item.type === 'note' || item.type === 2) {
                    contentsPayload.push({
                        id: item.id,
                        content_seccion: item.content_seccion,
                        type: 2,
                        row_position: pos,
                        row_status: item.row_status
                    });
                } else {
                    const qty = Number(item.cantidad) || 0;
                    const isAuth = Number(item.status_authorized) === 1 && Number(item.quantity_authorized ?? qty) === qty ? 1 : 0;
                    productsPayload.push({
                        id: item.id,
                        producto_id: item.producto_id || item.id,
                        cantidad: qty,
                        precio_producto: Number(item.precio_producto) || 0,
                        descuento: Number(item.descuento) || 0,
                        dias: Number(item.dias) || 1,
                        row_position: pos,
                        row_status: item.row_status,
                        status_authorized: isAuth,
                        quantity_authorized: isAuth ? qty : 0
                    });
                }
            });

            const statusToSave = typeof customStatus === 'number' ? customStatus : (Number(formState.estatus) || 1);

            const payload = {
                id: Number(formState.id) || 0,
                fecha_cotizacion: formState.fecha_cotizacion,
                cliente_id: Number(formState.cliente_id),
                agente_id: Number(formState.agente_id) || 3,
                tipo_evento: Number(formState.tipo_evento) || 1,
                no_personas: Number(formState.no_personas) || 0,
                domicilio_entrega: formState.domicilio_entrega || '',
                domicilio_recoleccion: formState.domicilio_recoleccion || '',
                fecha_evento: formState.fecha_evento,
                hora_evento: formState.hora_evento || '14:00',
                fecha_entrega: formState.fecha_entrega || formState.fecha_evento,
                hora_entrega: formState.hora_entrega || '12:00',
                tipo_horario_entrega: formState.tipo_horario_entrega || 'ESPECIFICO',
                hora_entrega_fin: formState.hora_entrega_fin || null,
                fecha_recoleccion: formState.fecha_recoleccion || formState.fecha_evento,
                hora_recoleccion: formState.hora_recoleccion || '12:00',
                tipo_horario_recoleccion: formState.tipo_horario_recoleccion || 'ESPECIFICO',
                hora_recoleccion_fin: formState.hora_recoleccion_fin || null,
                tipo_pago: Number(formState.tipo_pago) || 3,
                descuento: Number(formState.descuento) || 0,
                deposito: formState.deposito !== undefined ? Number(formState.deposito) : 1,
                status_deposito: Number(formState.status_deposito) || 0,
                lavado_desinfeccion: formState.lavado_desinfeccion || 0,
                descuento_lavado: Number(formState.descuento_lavado) || 0,
                tipo_venta: Number(formState.tipo_venta) || 1,
                estatus: statusToSave,
                products: productsPayload,
                contents: contentsPayload,
                comments: comments.filter(c => c.isLocal).map(c => c.comentario),
                internal_comment: newComment.trim() || undefined
            };

            const result = await saveQuoteService(payload);

            if (result?.data) {
                const savedId = result.data.id;
                const trackingUrl = result.data.url_seguimiento;

                showToast(result.message || (isEdit ? 'Cotización actualizada con éxito' : 'Cotización creada con éxito'), 'success');

                setComments(prev => prev.map(c => ({ ...c, isLocal: false })));

                setFormState(prev => ({
                    ...prev,
                    id: savedId,
                    estatus: statusToSave,
                    url_seguimiento: trackingUrl || prev.url_seguimiento
                }));

                // Si era creación, redirigir a edición
                if (!isEdit && savedId) {
                    setTimeout(() => {
                        navigate(`/events/edit/${savedId}`, { replace: true });
                    }, 1200);
                }
            }
        } catch (err) {
            console.error('Error guardando cotización:', err);
            showToast('Ocurrió un error al guardar la cotización. Por favor verifica los datos.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmQuote = async () => {
        const res = await showConfirm({
            title: '¿Confirmar cotización?',
            text: `¿Deseas cambiar el estatus de la cotización #${formState.id || 'Nueva'} a Confirmado?`,
            confirmButtonText: 'Sí, confirmar',
            icon: 'question'
        });
        if (res.isConfirmed) {
            handleSaveQuote(3);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center">
                <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
                <h5 className="mt-3 text-muted">Cargando cotización...</h5>
            </div>
        );
    }

    // Total acumulado
    const activeProducts = items.filter(it => (it.type === 'product' || !it.type) && it.row_status !== 'deleted');
    let totalRental = 0;
    activeProducts.forEach(prod => {
        totalRental += Number(prod.subtotal) || 0;
    });
    const generalDiscountPercent = Number(formState.descuento) || 0;
    const costQuotationNet = Math.max(0, totalRental * (1 - generalDiscountPercent / 100));
    const washAmount = Number(formState.lavado_desinfeccion) || 0;
    const washDiscountPercent = Number(formState.descuento_lavado) || 0;
    const washNet = washAmount * (1 - washDiscountPercent / 100);
    const accumulatedTotal = costQuotationNet + washNet;

    return (
        <div className="container-fluid px-4 py-3" style={{ paddingBottom: '90px' }}>
            {/* Header exacto como screenshot */}
            <div className="mb-4">
                <div className="d-flex align-items-center gap-2">
                    <Link to="/events" className="text-decoration-none text-dark fs-4 fw-bold me-1" title="Volver a Cotizaciones">
                        <i className="bi bi-arrow-left"></i>
                    </Link>
                    <h3 className="mb-0 fw-bold text-dark">
                        {isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
                    </h3>
                    <span
                        className="badge rounded-pill px-3 py-1 fw-semibold text-muted bg-light border ms-2"
                        style={{ fontSize: '0.8rem' }}
                    >
                        {formState.estatus === 2 ? 'Autorizado' : formState.estatus === 3 ? 'Confirmado' : 'Cotizado'}
                    </span>
                </div>
                <div className="text-muted small ms-4 ps-2 mt-1">
                    Folio: #{isEdit ? String(formState.id).padStart(7, '0') : 'Nueva'}
                </div>
            </div>

            {/* Panel 1: Datos Generales y Logística */}
            <GeneralDataCard
                formState={formState}
                setFormState={setFormState}
                catalogs={catalogs}
                setCatalogs={setCatalogs}
                onDateChange={(field, val) => {
                    if (field === 'fecha_entrega') {
                        checkStockAvailability(items, val, formState.fecha_recoleccion);
                    } else if (field === 'fecha_recoleccion') {
                        checkStockAvailability(items, formState.fecha_entrega, val);
                    }
                }}
            />

            {/* Panel 2: Partidas y Mobiliario */}
            <ProductsTableCard
                items={items}
                setItems={setItems}
                onOpenProductModal={() => setIsProductModalOpen(true)}
                availabilityMap={availabilityMap}
                quoteType={isLossNote ? 'NOTA DE PÉRDIDA' : 'COTIZACIÓN'}
                setQuoteType={(val) => setIsLossNote(val === 'NOTA DE PÉRDIDA')}
                comments={comments}
                onAddComment={handleAddComment}
            />

            {/* Panel 3: Resumen Financiero y Acciones */}
            <FinancialSummaryCard
                formState={formState}
                items={items}
                catalogs={catalogs}
                urlSeguimiento={formState.url_seguimiento}
            />

            {/* Modal F2 de Productos */}
            <ProductSearchModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onAddProduct={handleAddProductFromModal}
                startDate={formState.fecha_entrega || formState.fecha_evento}
                endDate={formState.fecha_recoleccion || formState.fecha_evento}
                eventId={formState.id}
                items={items}
            />

            {/* Sticky Action Footer idéntico al screenshot */}
            <div
                className="position-fixed bottom-0 start-0 end-0 py-2 px-4 d-flex justify-content-between align-items-center slm-sticky-footer"
                style={{ zIndex: 1020, minHeight: '60px' }}
            >
                <div className="d-flex align-items-center gap-4">
                    <div className="d-flex align-items-center gap-2 fw-medium slm-sticky-footer-meta">
                        <i className="bi bi-card-checklist"></i>
                        <span>Items: <strong className="slm-sticky-footer-total">{activeProducts.length}</strong></span>
                    </div>

                    <div className="d-flex align-items-center gap-2 fw-medium slm-sticky-footer-meta">
                        <i className="bi bi-wallet2"></i>
                        <span>Total Acumulado: <strong className="fs-6 slm-sticky-footer-total">${accumulatedTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn rounded-pill px-4 fw-semibold d-flex align-items-center gap-1 slm-btn-confirm"
                        onClick={handleConfirmQuote}
                        disabled={saving}
                    >
                        <i className="bi bi-check-lg"></i> Confirmar
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary rounded-pill px-4 shadow fw-semibold d-flex align-items-center gap-2"
                        onClick={() => handleSaveQuote()}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-floppy"></i> Guardar Cotización
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
