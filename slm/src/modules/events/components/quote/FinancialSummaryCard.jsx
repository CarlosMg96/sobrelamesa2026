import React, { useState, useEffect } from 'react';
import { showToast } from '../../../../shared/utils/alerts';
import {
    resolveEventPdfData,
    getEventPdfUrl
} from '../../utils/quotePdfTemplate';

const PDF_LABELS = {
    'con-iva': 'PDF con IVA',
    'sin-iva': 'PDF sin IVA',
    'remision': 'PDF Remisión',
    'logistica': 'PDF Orden Logística'
};

export default function FinancialSummaryCard({
    formState,
    items,
    catalogs = {},
    urlSeguimiento
}) {
    const [copiedQuoteLink, setCopiedQuoteLink] = useState(false);
    const [copiedLogisticsLink, setCopiedLogisticsLink] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);

    // Estado del visor de PDF (idéntico al flujo de summary_form.blade.php en legacy)
    const [pdfViewMode, setPdfViewMode] = useState('con-iva'); // 'con-iva' | 'sin-iva' | 'remision' | 'logistica'
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfIframeUrl, setPdfIframeUrl] = useState('');

    // Cargar automáticamente el PDF con IVA cuando se abre una cotización guardada
    useEffect(() => {
        if (formState.id && Number(formState.id) > 0) {
            setPdfLoading(true);
            setPdfViewMode('con-iva');
            setPdfIframeUrl(getEventPdfUrl(formState.id, 'con-iva', Date.now()));
        } else {
            setPdfIframeUrl('');
            setPdfLoading(false);
        }
    }, [formState.id]);

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

    // Datos resueltos para mensaje de WhatsApp
    const pdfData = resolveEventPdfData({ formState, items, catalogs });

    // Enlaces de cotización y logística
    const quoteUrl = urlSeguimiento || (formState.id ? `https://sobre-la-mesa.com/cotizacion/${btoa(String(formState.id))}` : 'https://sobre-la-mesa.com');
    const logisticsUrl = urlSeguimiento
        ? urlSeguimiento.replace('/cotizacion/', '/orden_logistica/')
        : (formState.id ? `https://sobre-la-mesa.com/orden_logistica/${btoa(String(formState.id))}` : 'https://sobre-la-mesa.com');

    // Mensaje de WhatsApp
    const clientName = pdfData.fullName || formState.cliente_nombre || 'Estimado cliente';
    const folioStr = formState.id ? `#${String(formState.id).padStart(6, '0')}` : '#Nueva';
    const whatsappMessage = `Buen día ${clientName}, anexamos la cotización con ${folioStr} mediante la URL: ${quoteUrl} en conjunto de las políticas https://sobre-la-mesa.com/web_politicas para su revisión y aprobación. Saludos`;

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        if (type === 'quote') {
            setCopiedQuoteLink(true);
            showToast('Enlace de cotización copiado', 'success');
            setTimeout(() => setCopiedQuoteLink(false), 2000);
        } else if (type === 'logistics') {
            setCopiedLogisticsLink(true);
            showToast('Enlace de orden logística copiado', 'success');
            setTimeout(() => setCopiedLogisticsLink(false), 2000);
        } else if (type === 'message') {
            setCopiedMessage(true);
            showToast('Mensaje de WhatsApp copiado', 'success');
            setTimeout(() => setCopiedMessage(false), 2000);
        }
    };

    const handleSendWhatsapp = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(url, '_blank');
    };

    // Cambia el PDF mostrado en la Vista Previa del PDF (columna derecha)
    const previewPDF = (mode) => {
        if (!formState.id || Number(formState.id) <= 0) {
            showToast('Por favor, guarda la cotización primero para generar el PDF.', 'warning');
            return;
        }
        setPdfViewMode(mode);
        setPdfLoading(true);
        setPdfIframeUrl(getEventPdfUrl(formState.id, mode, Date.now()));
    };

    const currentStatusLabel = PDF_LABELS[pdfViewMode] || 'PDF con IVA';

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
                    <div className="col-lg-5">
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
                        <div className="p-3 rounded-4 text-center mb-4 slm-total-sale-banner">
                            <div className="small fw-bold text-uppercase mb-1 slm-total-sale-label" style={{ fontSize: '0.75rem' }}>
                                TOTAL DE VENTA
                            </div>
                            <div className="fs-3 fw-bolder slm-total-sale-amount">
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
                                    className={`btn rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start slm-export-btn ${
                                        pdfViewMode === 'con-iva' && pdfIframeUrl ? 'is-active' : ''
                                    }`}
                                    onClick={() => previewPDF('con-iva')}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf text-danger"></i> Generar PDF con IVA
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>

                                <button
                                    type="button"
                                    className={`btn rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start slm-export-btn ${
                                        pdfViewMode === 'sin-iva' && pdfIframeUrl ? 'is-active' : ''
                                    }`}
                                    onClick={() => previewPDF('sin-iva')}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf text-warning"></i> Generar PDF sin IVA
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>

                                {Number(formState.estatus) > 1 && (
                                    <button
                                        type="button"
                                        className={`btn rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start slm-export-btn ${
                                            pdfViewMode === 'remision' && pdfIframeUrl ? 'is-active' : ''
                                        }`}
                                        onClick={() => previewPDF('remision')}
                                    >
                                        <span className="d-flex align-items-center gap-2">
                                            <i className="bi bi-file-earmark-text text-info"></i> Generar PDF Orden de Remisión
                                        </span>
                                        <i className="bi bi-chevron-right text-muted small"></i>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={`btn rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start slm-export-btn ${
                                        pdfViewMode === 'logistica' && pdfIframeUrl ? 'is-active' : ''
                                    }`}
                                    onClick={() => previewPDF('logistica')}
                                >
                                    <span className="d-flex align-items-center gap-2">
                                        <i className="bi bi-truck"></i> Generar PDF Orden de Logística
                                    </span>
                                    <i className="bi bi-chevron-right text-muted small"></i>
                                </button>

                                <button
                                    type="button"
                                    className="btn rounded-pill px-4 py-2 d-flex justify-content-between align-items-center text-start slm-export-btn"
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
                                className="form-control rounded-3 slm-readonly-box"
                                rows="3"
                                readOnly
                                style={{ fontSize: '0.85rem' }}
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
                                    className="form-control font-monospace slm-readonly-box"
                                    style={{ fontSize: '0.85rem', borderRadius: '8px 0 0 8px' }}
                                    readOnly
                                    value={quoteUrl}
                                />
                                <button
                                    type="button"
                                    className="btn slm-copy-addon-btn"
                                    style={{ borderRadius: '0 8px 8px 0' }}
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
                                    className="form-control font-monospace slm-readonly-box"
                                    style={{ fontSize: '0.85rem', borderRadius: '8px 0 0 8px' }}
                                    readOnly
                                    value={logisticsUrl}
                                />
                                <button
                                    type="button"
                                    className="btn slm-copy-addon-btn"
                                    style={{ borderRadius: '0 8px 8px 0' }}
                                    onClick={() => handleCopy(logisticsUrl, 'logistics')}
                                    title="Copiar enlace"
                                >
                                    <i className={`bi ${copiedLogisticsLink ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Vista Previa del PDF (idéntico a summary_form.blade.php) */}
                    <div className="col-lg-7">
                        <div className="rounded-4 p-3 h-100 d-flex flex-column slm-pdf-preview-card" style={{ minHeight: '620px' }}>
                            {/* Header del visor: únicamente título a la izquierda y badge de estado a la derecha */}
                            <div className="d-flex justify-content-between align-items-center pb-2 mb-2 slm-pdf-preview-header">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="spinner-grow spinner-grow-sm text-primary" style={{ width: '8px', height: '8px' }}></span>
                                    <span className="small fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
                                        VISTA PREVIA DEL PDF
                                    </span>
                                </div>
                                <span
                                    className={`badge rounded-pill px-3 py-1 small ${
                                        !pdfIframeUrl
                                            ? 'bg-secondary-subtle text-secondary border border-secondary-subtle'
                                            : pdfLoading
                                            ? 'bg-primary-subtle text-primary border border-primary-subtle'
                                            : 'bg-success-subtle text-success border border-success-subtle'
                                    }`}
                                >
                                    {!pdfIframeUrl
                                        ? 'Selecciona un PDF'
                                        : pdfLoading
                                        ? `Cargando ${currentStatusLabel}...`
                                        : currentStatusLabel}
                                </span>
                            </div>

                            {/* Cuerpo del visor del PDF */}
                            <div
                                className="flex-grow-1 rounded-3 overflow-hidden d-flex align-items-center justify-content-center position-relative slm-pdf-preview-body"
                                style={{ minHeight: '580px' }}
                            >
                                {!pdfIframeUrl && !pdfLoading && (
                                    <div id="no_pdf_placeholder" className="text-center p-5 text-muted">
                                        <i className="bi bi-file-earmark-pdf display-4 d-block mb-3 text-secondary opacity-50"></i>
                                        <p className="mb-0">
                                            Haz clic en uno de los botones de la izquierda para ver la vista previa del documento aquí
                                        </p>
                                    </div>
                                )}

                                {pdfLoading && (
                                    <div
                                        id="pdf_loading"
                                        className="text-center p-5 position-absolute rounded-4 shadow-sm slm-pdf-loading-card"
                                        style={{ zIndex: 10 }}
                                    >
                                        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                                            <span className="visually-hidden">Generando PDF...</span>
                                        </div>
                                        <p className="mt-3 text-dark fw-bold mb-0">Generando y cargando PDF...</p>
                                        <span className="text-muted small">Por favor, espera un momento</span>
                                    </div>
                                )}

                                {pdfIframeUrl && (
                                    <iframe
                                        name="pdf_preview"
                                        id="pdf_preview"
                                        title="Vista Previa del PDF"
                                        src={pdfIframeUrl}
                                        width="100%"
                                        height="600px"
                                        style={{
                                            border: 'none',
                                            display: pdfLoading ? 'none' : 'block',
                                            minHeight: '580px'
                                        }}
                                        onLoad={() => setPdfLoading(false)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
