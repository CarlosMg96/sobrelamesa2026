import React, { useState } from 'react';

export default function FinancialSummaryCard({
    formState,
    items,
    urlSeguimiento
}) {
    const [copiedQuoteLink, setCopiedQuoteLink] = useState(false);
    const [copiedLogisticsLink, setCopiedLogisticsLink] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);
    const [pdfViewMode, setPdfViewMode] = useState('con-iva'); // 'con-iva' | 'sin-iva' | 'logistica'

    const activeProducts = items.filter(it => (it.type === 'product' || !it.type) && it.row_status !== 'deleted');

    // Costo cotización (suma de subtotales de productos)
    let totalRental = 0;
    activeProducts.forEach(prod => {
        totalRental += Number(prod.subtotal) || 0;
    });

    // Descuento general del evento
    const generalDiscountPercent = Number(formState.descuento) || 0;
    const generalDiscountAmount = totalRental * (generalDiscountPercent / 100);
    const costQuotationNet = Math.max(0, totalRental - generalDiscountAmount);

    // Costo de lavado
    const washAmount = Number(formState.lavado_desinfeccion) || 0;
    const washDiscountPercent = Number(formState.descuento_lavado) || 0;
    const washNet = washAmount * (1 - washDiscountPercent / 100);

    // Total de venta
    const grandTotal = costQuotationNet + washNet;

    // Enlaces de cotización y logística
    const quoteUrl = urlSeguimiento || (formState.id ? `https://sobre-la-mesa.com/cotizacion/${btoa(String(formState.id))}` : 'https://sobre-la-mesa.com');
    const logisticsUrl = formState.id ? `https://sobre-la-mesa.com/orden_logistica/${btoa(String(formState.id))}` : 'https://sobre-la-mesa.com';

    // Mensaje de WhatsApp
    const clientName = formState.cliente_nombre || 'Estimado cliente';
    const folioStr = formState.id ? `#${String(formState.id).padStart(6, '0')}` : '#Nueva';
    const whatsappMessage = `Buen día ${clientName}, anexamos la cotización con ${folioStr} mediante la URL: ${quoteUrl} en conjunto de las políticas https://sobre-la-mesa.com/web_politicas para su revisión y aprobación. Saludos`;

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        if (type === 'quote') {
            setCopiedQuoteLink(true);
            setTimeout(() => setCopiedQuoteLink(false), 2000);
        } else if (type === 'logistics') {
            setCopiedLogisticsLink(true);
            setTimeout(() => setCopiedLogisticsLink(false), 2000);
        } else if (type === 'message') {
            setCopiedMessage(true);
            setTimeout(() => setCopiedMessage(false), 2000);
        }
    };

    const handleSendWhatsapp = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-body p-4">
                {/* Título de la sección */}
                <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-dark">
                    <i className="bi bi-file-earmark-bar-graph-fill text-primary"></i>
                    3. Resumen de Cotización
                </h5>

                <div className="row g-4">
                    {/* Columna Izquierda: Tarjetas de Costos, Exportación y Enlaces */}
                    <div className="col-lg-6">
                        {/* Fila: Costo de Lavado | Costo Cotización */}
                        <div className="row g-3 mb-3">
                            <div className="col-6">
                                <div className="p-3 rounded-4 bg-light text-center border" style={{ minHeight: '90px' }}>
                                    <div className="small fw-semibold text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                                        COSTO DE LAVADO
                                    </div>
                                    <div className="fs-4 fw-bold text-dark">
                                        ${washNet.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="p-3 rounded-4 bg-light text-center border" style={{ minHeight: '90px' }}>
                                    <div className="small fw-semibold text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                                        COSTO COTIZACIÓN
                                    </div>
                                    <div className="fs-4 fw-bold text-dark">
                                        ${costQuotationNet.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Banner: Total de Venta */}
                        <div
                            className="p-3 rounded-4 text-center mb-4 border"
                            style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}
                        >
                            <div className="small fw-bold text-uppercase mb-1" style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                                TOTAL DE VENTA
                            </div>
                            <div className="fs-3 fw-bolder" style={{ color: '#0284c7' }}>
                                ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Opciones de Exportación */}
                        <div className="mb-4">
                            <div className="small fw-bold text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem' }}>
                                OPCIONES DE EXPORTACIÓN
                            </div>

                            <div className="d-flex flex-column gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start bg-white"
                                    style={{ borderColor: '#bfdbfe', color: '#2563eb' }}
                                    onClick={() => {
                                        setPdfViewMode('con-iva');
                                        if (formState.id) window.open(`/api/events/pdf/${formState.id}`, '_blank');
                                    }}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf"></i> Generar PDF con IVA
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start bg-white"
                                    style={{ borderColor: '#bfdbfe', color: '#2563eb' }}
                                    onClick={() => {
                                        setPdfViewMode('sin-iva');
                                        if (formState.id) window.open(`/api/events/pdf/sin-iva/${formState.id}`, '_blank');
                                    }}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf"></i> Generar PDF sin IVA
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start bg-white"
                                    style={{ borderColor: '#bfdbfe', color: '#2563eb' }}
                                    onClick={() => {
                                        setPdfViewMode('logistica');
                                        if (formState.id) window.open(`/api/events/pdf/logistica/${formState.id}`, '_blank');
                                    }}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf"></i> Generar PDF Orden de Logística
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-primary rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start bg-white"
                                    style={{ borderColor: '#bfdbfe', color: '#2563eb' }}
                                    onClick={handleSendWhatsapp}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-whatsapp text-success"></i> Enviar cotización por Whatsapp
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>
                            </div>
                        </div>

                        {/* Mensaje de Whatsapp */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="small fw-bold text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>
                                    MENSAJE DE WHATSAPP
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 text-decoration-none text-primary small d-flex align-items-center gap-1"
                                    onClick={() => handleCopy(whatsappMessage, 'message')}
                                >
                                    <i className={`bi ${copiedMessage ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                                    <span>{copiedMessage ? 'Copiado!' : 'Copiar mensaje'}</span>
                                </button>
                            </div>
                            <textarea
                                className="form-control rounded-3"
                                rows="3"
                                readOnly
                                style={{ fontSize: '0.85rem', backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                                value={whatsappMessage}
                            />
                        </div>

                        {/* Link de la Cotización */}
                        <div className="mb-3">
                            <div className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                                LINK DE LA COTIZACIÓN
                            </div>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control font-monospace"
                                    style={{ fontSize: '0.85rem', borderRadius: '8px 0 0 8px', borderColor: '#e2e8f0' }}
                                    readOnly
                                    value={quoteUrl}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    style={{ borderRadius: '0 8px 8px 0', borderColor: '#e2e8f0' }}
                                    onClick={() => handleCopy(quoteUrl, 'quote')}
                                    title="Copiar enlace"
                                >
                                    <i className={`bi ${copiedQuoteLink ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Link de la Orden de Logística */}
                        <div>
                            <div className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                                LINK DE LA ORDEN DE LOGÍSTICA
                            </div>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control font-monospace"
                                    style={{ fontSize: '0.85rem', borderRadius: '8px 0 0 8px', borderColor: '#e2e8f0' }}
                                    readOnly
                                    value={logisticsUrl}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    style={{ borderRadius: '0 8px 8px 0', borderColor: '#e2e8f0' }}
                                    onClick={() => handleCopy(logisticsUrl, 'logistics')}
                                    title="Copiar enlace"
                                >
                                    <i className={`bi ${copiedLogisticsLink ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Vista Previa del PDF */}
                    <div className="col-lg-6">
                        <div className="border rounded-4 p-3 bg-white h-100 d-flex flex-column" style={{ minHeight: '520px' }}>
                            {/* Header del visor */}
                            <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="spinner-grow spinner-grow-sm text-primary" style={{ width: '8px', height: '8px' }}></span>
                                    <span className="small fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
                                        VISTA PREVIA DEL PDF
                                    </span>
                                </div>
                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 small">
                                    PDF {pdfViewMode === 'sin-iva' ? 'Sin IVA' : pdfViewMode === 'logistica' ? 'Logística' : 'con IVA'}
                                </span>
                            </div>

                            {/* Contenedor del documento PDF - Vista en vivo */}
                            <div className="flex-grow-1 border rounded-3 bg-light overflow-auto position-relative" style={{ minHeight: '480px', maxHeight: '620px' }}>
                                <div className="p-4 bg-white h-100 shadow-sm" style={{ fontSize: '0.825rem' }}>
                                    {/* Membrete Documento */}
                                    <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                                        <div>
                                            <h3 className="fw-bolder mb-0 text-dark tracking-wide" style={{ letterSpacing: '1px' }}>
                                                SOBRE<br />LA MESA
                                            </h3>
                                            <small className="text-muted d-block mt-1">
                                                Fecha Cotización: {formState.fecha_cotizacion || new Date().toISOString().split('T')[0]}
                                            </small>
                                        </div>

                                        <div className="text-end">
                                            <h5 className="fw-bold mb-1 text-primary">
                                                Cotización {folioStr}
                                            </h5>
                                            <div className="small text-dark fw-semibold">
                                                {clientName}
                                            </div>
                                            <div className="small text-muted">
                                                Fecha Evento: <strong>{formState.fecha_evento || 'Por definir'}</strong>
                                            </div>
                                            {formState.fecha_entrega && (
                                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                                    Entrega: {formState.fecha_entrega} ({formState.hora_entrega || '12:00'})
                                                </div>
                                            )}
                                            {formState.fecha_recoleccion && (
                                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                                    Recolección: {formState.fecha_recoleccion} ({formState.hora_recoleccion || '12:00'})
                                                </div>
                                            )}
                                            {formState.domicilio_entrega && (
                                                <div className="small text-muted mt-1" style={{ fontSize: '0.75rem', maxWidth: '240px' }}>
                                                    Lugar: {formState.domicilio_entrega}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Partidas en la hoja */}
                                    <div className="table-responsive mb-3">
                                        <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: '0.75rem' }}>
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="text-center" style={{ width: '35px' }}>#</th>
                                                    <th style={{ width: '50px' }}>Foto</th>
                                                    <th>Descripción</th>
                                                    <th className="text-center" style={{ width: '60px' }}>Cant.</th>
                                                    <th className="text-end" style={{ width: '80px' }}>Precio</th>
                                                    <th className="text-center" style={{ width: '50px' }}>Días</th>
                                                    <th className="text-end" style={{ width: '90px' }}>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeProducts.map((p, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-center text-muted">{idx + 1}</td>
                                                        <td>
                                                            {p.imagen ? (
                                                                <img
                                                                    src={`https://sobre-la-mesa.com/images/productos/${p.imagen}`}
                                                                    alt=""
                                                                    className="rounded border"
                                                                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = 'https://placehold.co/32x32?text=SLM';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="text-muted small">-</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="fw-semibold text-uppercase">{p.producto}</div>
                                                            {p.clave && <small className="text-muted font-monospace">{p.clave}</small>}
                                                        </td>
                                                        <td className="text-center fw-bold">{p.cantidad}</td>
                                                        <td className="text-end">${Number(p.precio_producto).toFixed(2)}</td>
                                                        <td className="text-center">{p.dias || 1}</td>
                                                        <td className="text-end fw-bold text-primary">${Number(p.subtotal).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                {activeProducts.length === 0 && (
                                                    <tr>
                                                        <td colSpan="7" className="text-center py-4 text-muted">
                                                            Agrega productos desde el catálogo (F2) para visualizar la cotización membretada.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totales en la hoja */}
                                    <div className="d-flex justify-content-end">
                                        <div style={{ width: '240px' }} className="border rounded-2 p-2 bg-light">
                                            <div className="d-flex justify-content-between py-1">
                                                <span className="text-muted">Subtotal Renta:</span>
                                                <span className="fw-semibold">${totalRental.toFixed(2)}</span>
                                            </div>
                                            {generalDiscountPercent > 0 && (
                                                <div className="d-flex justify-content-between py-1 text-danger">
                                                    <span>Desc. ({generalDiscountPercent}%):</span>
                                                    <span>-${generalDiscountAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {washNet > 0 && (
                                                <div className="d-flex justify-content-between py-1">
                                                    <span className="text-muted">Lavado:</span>
                                                    <span className="fw-semibold">${washNet.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="d-flex justify-content-between py-1 border-top fw-bold text-primary fs-6">
                                                <span>Total:</span>
                                                <span>${grandTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
