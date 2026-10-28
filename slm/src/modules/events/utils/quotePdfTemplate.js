import { getEventDetailService, getCatalogsService } from '../services/events.service';

const SERVICE_FADED_PREFIXES = [
    'FLETE',
    'CATERING',
    'LAVADO',
    'MONTAJE',
    'GALOPINA',
    'GUARDIA',
    'HORA EXTRA',
    'HORARIO',
    'MANIOBRA',
    'MESERO',
    'MEZCLADOR',
    'PERSONAL DE SERVICIO',
    'REPARACIÓN',
    'REPARACION',
    'SCOUTING',
    'SERVICIO',
    'SET',
    'TORNAFIESTA',
    'TIEMPO EXTRA',
    'RANGO'
];

export function formatCurrencyMX(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export function formatSpanishLongDate(dateStr, timeStr = '') {
    if (!dateStr) return 'Por definir';
    const clean = String(dateStr).split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) return `${dateStr} ${timeStr}`.trim();

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) return `${dateStr} ${timeStr}`.trim();

    const formatted = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(dateObj);

    return `${formatted}${timeStr ? ` ${timeStr}` : ''}`;
}

export function isFadedServiceImage(categoria, productoName) {
    const catUpper = String(categoria || '').trim().toUpperCase();
    if (catUpper !== 'SERVICIOS') return false;
    const prodUpper = String(productoName || '').trim().toUpperCase();
    return SERVICE_FADED_PREFIXES.some(prefix => prodUpper.startsWith(prefix));
}

export function resolveEventPdfData({ formState = {}, items = [], catalogs = {} }) {
    const clients = catalogs?.clients || [];
    const agents = catalogs?.agents || [];
    const eventTypes = catalogs?.eventTypes || [];
    const places = catalogs?.places || [];

    const selectedClient = clients.find(c => String(c.id) === String(formState.cliente_id)) || null;
    const selectedAgent = agents.find(a => String(a.id) === String(formState.agente_id)) || null;
    const selectedEventType = eventTypes.find(t => String(t.id) === String(formState.tipo_evento)) || null;

    const fullName = selectedClient?.full_name || formState.cliente_nombre || formState.cliente || '';
    const empresa = selectedClient?.empresa || formState.empresa || '';
    const numTel = selectedClient?.num_tel || formState.num_tel || selectedClient?.num_tel_empresa || 'Sin teléfono';
    const email = selectedClient?.email || formState.email || '';
    const eventoName = selectedEventType?.evento || formState.tipo_evento_nombre || '';
    const agentName = selectedAgent?.name || formState.agente || '';

    const resolvePlaceAddress = (placeVal) => {
        if (!placeVal) return '';
        const found = places.find(p => String(p.nombre).trim() === String(placeVal).trim());
        if (found && found.direccion) {
            return `${found.nombre} ${found.direccion}`;
        }
        return placeVal;
    };

    const domicilioEntrega = resolvePlaceAddress(formState.domicilio_entrega || '');
    const domicilioRecoleccion = resolvePlaceAddress(formState.domicilio_recoleccion || '') || domicilioEntrega;

    const visibleItems = (items || []).filter(
        it => it.row_status !== 'deleted' && it.row_status !== 'cancelled'
    );

    let subtotal = 0;
    let subtotalSnDesc = 0;
    let costoServicios = 0;
    let isDescuento = 0;

    visibleItems.forEach(item => {
        const isSectionOrNote = item.type === 'section' || item.type === 'note' || item.type === 2 || item.type === 3;
        if (isSectionOrNote) return;

        const cantidad = Number(item.cantidad) || 0;
        const precioRenta = Number(item.precio_producto ?? item.precio_renta) || 0;
        const dias = Number(item.dias) || 1;
        const descuento = Number(item.descuento) || 0;

        if (descuento !== 0) {
            isDescuento++;
        }

        const catUpper = String(item.categoria || '').trim().toUpperCase();
        const isServicio = catUpper === 'SERVICIOS' || Number(item.categoria_producto_id) === 41;

        if (isServicio) {
            if (!descuento) {
                costoServicios += cantidad * precioRenta;
            } else {
                const porcentaje = descuento / 100;
                const resta = cantidad * precioRenta * porcentaje;
                costoServicios += (cantidad * precioRenta) - resta;
            }
        }

        const rawMulti = cantidad * precioRenta * dias;
        subtotalSnDesc += rawMulti;

        if (!descuento) {
            subtotal += rawMulti;
        } else {
            const porcentaje = descuento / 100;
            const resta = rawMulti * porcentaje;
            subtotal += rawMulti - resta;
        }
    });

    const precioSinIva = subtotal / 1.16;
    const iva = precioSinIva * 0.16;
    const descuentoEvento = Number(formState.descuento) || 0;
    const totalDescuento = descuentoEvento !== 0 ? subtotal * (descuentoEvento / 100) : 0;

    let deposito = subtotalSnDesc * 0.35;
    if (costoServicios !== 0) {
        const depoBase = subtotalSnDesc - costoServicios;
        deposito = depoBase * 0.35;
    }

    const total = descuentoEvento === 0
        ? subtotal + deposito
        : subtotal - totalDescuento + deposito;

    const noCotizacion = `00${formState.id || ''}`;

    return {
        id: formState.id || '',
        noCotizacion,
        fullName,
        empresa,
        numTel,
        email,
        eventoName,
        agentName,
        fechaCotizacion: formState.fecha_cotizacion || new Date().toISOString().split('T')[0],
        fechaEntregaFormatted: formatSpanishLongDate(formState.fecha_entrega || formState.fecha_evento, formState.hora_entrega),
        fechaEventoFormatted: formatSpanishLongDate(formState.fecha_evento, formState.hora_evento),
        fechaRecoleccionFormatted: formatSpanishLongDate(formState.fecha_recoleccion || formState.fecha_evento, formState.hora_recoleccion),
        fechaCotizacionFormatted: formatSpanishLongDate(formState.fecha_cotizacion, formState.hora_recoleccion),
        domicilioEntrega,
        domicilioRecoleccion,
        visibleItems,
        isDescuento,
        subtotal,
        subtotalSnDesc,
        costoServicios,
        precioSinIva,
        iva,
        descuentoEvento,
        totalDescuento,
        deposito,
        total,
        firma: formState.firma || '',
        firmaLogistica: formState.firma_logistica || formState.firma_remision || '',
        fechaEventoRaw: formState.fecha_evento || ''
    };
}

export function buildLegacyPdfHtml(pdfData, mode = 'con-iva') {
    const logoUrl = `${window.location.origin}/logos/icono_logo_04.png`;
    const defaultProductImg = 'https://sobre-la-mesa.com/images/productos/default_vacio-min.png';

    const escapeHtml = (str) =>
        String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

    const safeFullName = escapeHtml(pdfData.fullName || pdfData.empresa);
    const safeEmpresa = escapeHtml(pdfData.empresa || pdfData.fullName);
    const safeTel = escapeHtml(pdfData.numTel || 'Sin teléfono');
    const safeEmail = escapeHtml(pdfData.email || '');
    const safeEvento = escapeHtml(pdfData.eventoName || '');
    const safeAgent = escapeHtml(pdfData.agentName || '');
    const safeDomEntrega = escapeHtml(pdfData.domicilioEntrega || '');
    const safeDomReco = escapeHtml(pdfData.domicilioRecoleccion || pdfData.domicilioEntrega || '');
    const safeNoCot = escapeHtml(pdfData.noCotizacion);

    const replaceNameForFile = (pdfData.fullName || '_').replace(/\s+/g, '_');
    const filenameTitle = mode === 'remision'
        ? `Remision-${pdfData.id}-${replaceNameForFile}-${pdfData.fechaEventoRaw}`
        : `Cotizacion-${pdfData.id}-${replaceNameForFile}-${pdfData.fechaEventoRaw}`;

    const headerTableHtml = `
        <div class="row">
            <div class="col-12" style="text-align: right">
                <h3 class="font-weight-normal" style="font-weight: normal; margin: 0 0 8px 0; font-size: 20px;">Cotización #${safeNoCot}</h3>
            </div>
        </div>
        <div>
            <table class="table table-sm" width="100%">
                <tbody>
                    <tr>
                        <td style="width: 110px; height: 100px; text-align: center; background-color: #fff !important; border-left: 1px solid #fff !important; border-top: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-right: 1px solid #fff !important;">
                            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                                <img src="${logoUrl}" alt="logo" style="width: 195px; max-width: 100%; object-fit: contain;" onerror="this.src='https://sobre-la-mesa.com/images/icons/icono_logo_04.png'">
                            </div>
                        </td>
                        <td style="border-bottom: 1px solid #fff !important; background-color: #fff !important; border-left: 1px solid #000 !important; width: 10px; height: 100px; border-right: 1px solid #fff !important; border-top: 1px solid #fff !important;">
                            <div></div>
                        </td>
                        <td style="border-left: 1px solid #fff !important; border-right: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-top: 1px solid #fff !important; background-color: #fff !important; width: 140px; height: 100px; vertical-align: middle;">
                            <div style="font-size: 10px; margin: 6px 8px; font-weight: normal;">
                                <b>${safeFullName}</b><br>
                                ${safeEmpresa}<br>
                                <b>Telefono:</b> ${safeTel}<br>
                                <b>Email:</b> ${safeEmail}<br>
                                <h4 style="font-size: 14px; margin: 6px 0 0 0; font-weight: bold;">${safeEvento}</h4>
                            </div>
                        </td>
                        <td style="background-color: #fff !important; width: 160px; height: 100px; border-right: 1px solid #fff !important; border-top: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-left: 1px solid #ddd !important; vertical-align: middle;">
                            <div style="font-size: 10px; width: 100%; text-align: center; font-weight: normal;">
                                <div style="margin-bottom: 8px">
                                    <p style="margin: 0;">Fecha que SLM <strong>Entrega: </strong> ${escapeHtml(pdfData.fechaEntregaFormatted)}</p>
                                </div>
                                <div style="margin-bottom: 8px">
                                    <p style="margin: 0;">Fecha de Evento: ${escapeHtml(pdfData.fechaEventoFormatted)}</p>
                                </div>
                                <div style="margin-bottom: 4px">
                                    <p style="margin: 0;">Fecha que SLM <strong>Recolección: </strong> ${escapeHtml(pdfData.fechaRecoleccionFormatted)}</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #fff !important; width: 110px; height: 80px; border-bottom: 1px solid #000 !important; border-left: 1px solid #ddd !important; border-right: 1px solid #ddd !important; border-top: 1px solid #ddd !important; font-weight: bold;">
                            <div style="font-size: 11px;">
                                Fecha de Cotización: ${escapeHtml(pdfData.fechaCotizacion)}
                                <p style="margin: 8px 0 0 0;">TABLE SOLVER: ${safeAgent}</p>
                            </div>
                        </td>
                        <td style="background-color: #fff !important; width: 10px; height: 80px; border-top: 1px solid #000 !important; border-right: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-left: 1px solid #fff !important;">
                            <div></div>
                        </td>
                        <td style="background-color: #fff !important; border-right: 1px solid #fff !important; border-left: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-top: 1px solid #000 !important; width: 140px; height: 80px;">
                            <div></div>
                        </td>
                        <td style="border-left: 1px solid #fff !important; background-color: #fff !important; border-right: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-top: 1px solid #000 !important; width: 160px; height: 80px; vertical-align: top;">
                            <div style="font-size: 10px; font-weight: normal;">
                                <address style="font-style: italic; margin: 0;">
                                    <b>Lugar de Entrega: </b> ${safeDomEntrega}<br>
                                    <b>Lugar de Recolección: </b> ${safeDomReco}<br>
                                </address>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    if (mode === 'logistica') {
        const firmaHtml = pdfData.firma && pdfData.firma !== 'default.png'
            ? `<img src="https://sobre-la-mesa.com/images/firmas/${escapeHtml(pdfData.firma)}" style="margin-top: 4px;" alt="" width="200" height="200">`
            : '';

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(filenameTitle)}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; margin: 20px; color: #000; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        th:first-child, td:first-child { background-color: #f8f9fa; font-weight: bold; }
        tr:nth-child(odd) { background-color: #f9f9f9; }
        .no-print-bar {
            position: sticky; top: 0; z-index: 999; background: #1e293b; color: #fff;
            padding: 10px 20px; margin: -20px -20px 20px -20px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .no-print-btn {
            background: #2563eb; color: #fff; border: none; border-radius: 6px;
            padding: 8px 16px; font-weight: bold; cursor: pointer; font-size: 13px;
        }
        @media print {
            .no-print-bar { display: none !important; }
            body { margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span><strong>Orden de Logística #${safeNoCot}</strong> — ${safeFullName}</span>
        <button class="no-print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
    <div class="content-wrapper">
        <div class="invoice p-3 mb-3">
            ${headerTableHtml}
            <br><br>
            <div class="row">
                <div class="col-12">
                    <font size="4"><strong>Comentarios:</strong></font>
                    <br><br><br><br><br><br>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <font size="4">Confirmo que tanto las fechas como las direcciones de entrega y recolección son correctas</font>
                </div>
            </div>
            <br><br>
            <div class="row">
                <div class="col-12">
                    <font size="4"><strong>________________________________</strong></font>
                </div>
            </div>
            <div class="row">
                <div class="col-12">Nombre y Firma</div>
            </div>
            <div class="row">
                <div class="col-12">${firmaHtml}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    if (mode === 'remision') {
        let count = 0;
        const rowsHtml = pdfData.visibleItems.map(item => {
            if (item.type === 'note' || item.type === 2) {
                return `<tr><td colspan="5" align="center" style="font-size: 10px; font-weight: bold; background-color: #D3D3D3; text-align: center;">${escapeHtml(item.content_seccion)}</td></tr>`;
            }
            if (item.type === 'section' || item.type === 3) {
                return `<tr><td colspan="5" align="center" style="font-size: 12px; font-weight: bold; text-transform: uppercase; font-style: italic; background-color: #D3D3D3; text-align: center;">${escapeHtml(item.content_seccion)}</td></tr>`;
            }
            count++;
            const prodImg = item.imagen
                ? `https://sobre-la-mesa.com/images/productos/${encodeURIComponent(item.imagen)}`
                : defaultProductImg;
            const repoPrice = Number(item.precio_reposicion) || 0;
            const repoText = repoPrice !== 0 ? `$${formatCurrencyMX(repoPrice)}` : '$0';
            const medidasText = item.medidas ? escapeHtml(item.medidas) : 'No disponible';

            return `
                <tr>
                    <td style="font-size: 10px;">${count}</td>
                    <td style="font-size: 10px;">
                        <img src="${prodImg}" style="margin-top: 4px; object-fit: contain;" alt="" width="80" height="80" onerror="this.src='${defaultProductImg}'">
                        <br>Reposición c/u:<br>${repoText}
                    </td>
                    <td style="font-size: 10px;">
                        ${escapeHtml(item.producto)}
                        <br><br>
                        <font size="2"><strong>Medidas: </strong></font><br>${medidasText}
                    </td>
                    <td style="font-size: 10px;">${Number(item.cantidad) || 0}</td>
                    <td style="font-size: 10px;"></td>
                </tr>
            `;
        }).join('');

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(filenameTitle)}</title>
    <style>
        body, table, * { font-family: Arial, Helvetica, sans-serif; }
        table { width: 100%; border-collapse: collapse; border-spacing: 0px; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .no-print-bar {
            position: sticky; top: 0; z-index: 999; background: #1e293b; color: #fff;
            padding: 10px 20px; margin: -10px -10px 20px -10px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .no-print-btn {
            background: #2563eb; color: #fff; border: none; border-radius: 6px;
            padding: 8px 16px; font-weight: bold; cursor: pointer; font-size: 13px;
        }
        @media print { .no-print-bar { display: none !important; } }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span><strong>Orden de Remisión #${safeNoCot}</strong> — ${safeFullName}</span>
        <button class="no-print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
    <table width="100%">
        <tbody>
            <tr>
                <td style="width: 120px;"><img src="${logoUrl}" alt="logo" style="width: 190px; display: block;" onerror="this.src='https://sobre-la-mesa.com/images/icons/icono_logo_04.png'"></td>
                <td style="width: 120px; font-size: 10px;">
                    Sobre la Mesa
                    <address>
                        <strong>BNM191003N42</strong><br>
                        Zempoala #388<br>Col. Narvarte Oriente<br>Ciudad de México (MX)<br>CP. 03023
                    </address>
                </td>
                <td style="width: 160px; font-size: 10px;">
                    <b>No. de Cotización </b><h4 style="margin: 4px 0; font-size: 18px;">#${safeNoCot}</h4>
                    <b>Fecha de Entrega:</b><br>${escapeHtml(pdfData.fechaEntregaFormatted)}<br>
                    <b>Fecha de Evento:</b><br>${escapeHtml(pdfData.fechaEventoFormatted)}<br>
                    <b>Fecha de Recolección:</b><br>${escapeHtml(pdfData.fechaRecoleccionFormatted)}<br>
                </td>
            </tr>
            <tr>
                <td style="font-size: 10px;">
                    <b>FECHA DE COTIZACIÓN:</b><br>${escapeHtml(pdfData.fechaCotizacionFormatted)}<br>
                    <b>TABLE SOLVER:</b><br>${safeAgent}<br>
                </td>
                <td colspan="2" style="font-size: 10px;">
                    <strong>${safeFullName}</strong><br>${safeEmpresa}
                    <address>
                        <b>Domicilio de Entrega </b> ${safeDomEntrega}<br>
                        <b>Domicilio de Recoleccion </b> ${safeDomReco}<br>
                        <b>Telefono:</b> ${safeTel}<br>
                        <b>Email:</b> ${safeEmail}<br>
                        <b>Tipo de Evento:</b> ${safeEvento}<br>
                    </address>
                </td>
            </tr>
        </tbody>
    </table>
    <table width="100%">
        <thead>
            <tr>
                <th style="font-size: 10px; background-color: #D3D3D3;">Número</th>
                <th style="font-size: 10px; background-color: #D3D3D3;">Imagen</th>
                <th style="font-size: 10px; background-color: #D3D3D3;">Descripción</th>
                <th style="font-size: 10px; background-color: #D3D3D3;">Cantidad</th>
                <th style="font-size: 10px; background-color: #D3D3D3;">Recibido</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>
    <br><br>
    <div>
        <p style="font-size: 12px;"><strong>Cajas: _______________</strong></p>
        <p style="font-size: 12px;"><strong>Cambros: ____________</strong></p>
        <br><br>
        <p style="font-size: 14px;"><strong>Nombre y Firma #${safeNoCot}</strong></p>
    </div>
</body>
</html>`;
    }

    // Cotización (con-iva / sin-iva)
    const showDiscountCol = pdfData.isDescuento > 0;
    const totalCols = showDiscountCol ? 8 : 7;
    let prodCounter = 0;

    const productRowsHtml = pdfData.visibleItems.map(item => {
        if (item.type === 'note' || item.type === 2) {
            return `
                <tr>
                    <td colspan="${totalCols}" class="la_nota" align="center" style="font-size: 10px; font-weight: bold; border: 1px solid #000; background-color: #fff !important; text-align: center;">
                        ${escapeHtml(item.content_seccion)}
                    </td>
                </tr>
            `;
        }
        if (item.type === 'section' || item.type === 3) {
            return `
                <tr>
                    <td colspan="${totalCols}" class="la_seccion" align="center" style="font-size: 12px; font-weight: bold; text-transform: uppercase; font-style: italic; background-color: #D3D3D3 !important; text-align: center;">
                        ${escapeHtml(item.content_seccion)}
                    </td>
                </tr>
            `;
        }

        prodCounter++;
        const cantidad = Number(item.cantidad) || 0;
        const precioRenta = Number(item.precio_producto ?? item.precio_renta) || 0;
        const dias = Number(item.dias) || 1;
        const descuento = Number(item.descuento) || 0;
        const precioRepo = Number(item.precio_reposicion) || 0;
        const faded = isFadedServiceImage(item.categoria, item.producto);
        const prodImg = item.imagen
            ? `https://sobre-la-mesa.com/images/productos/${encodeURIComponent(item.imagen)}`
            : defaultProductImg;

        let precioCellHtml = `$${formatCurrencyMX(precioRenta)}`;
        if (descuento > 0) {
            const newUnitPrice = precioRenta * (100 - descuento) * 0.01;
            precioCellHtml = `<del>$${formatCurrencyMX(precioRenta)}</del><br>$${formatCurrencyMX(newUnitPrice)}`;
        }

        const rawLine = cantidad * precioRenta * dias;
        const lineSubtotal = descuento > 0 ? rawLine * (1 - descuento / 100) : rawLine;
        const repoHtml = precioRepo !== 0 ? `<br>Reposición c/u:<br> $${formatCurrencyMX(precioRepo)}` : '';
        const medidasText = item.medidas ? escapeHtml(item.medidas) : 'No disponible';

        return `
            <tr>
                <td style="font-size: 10px;">${prodCounter}</td>
                <td style="font-size: 10px;">
                    <img src="${prodImg}" style="margin-top: 4px; object-fit: contain;${faded ? ' opacity: 0.2;' : ''}" width="80" height="80" alt="" onerror="this.src='${defaultProductImg}'">
                    ${repoHtml}
                </td>
                <td style="font-size: 10px;">
                    ${escapeHtml(item.producto)} <br><br><br>
                    <font size="2"><strong>Medidas: </strong></font><br>
                    ${medidasText}
                </td>
                <td style="font-size: 10px;">${cantidad}</td>
                <td style="font-size: 10px;">${precioCellHtml}</td>
                <td style="font-size: 10px;">${dias}</td>
                ${showDiscountCol ? `<td style="font-size: 10px;">${descuento}%</td>` : ''}
                <td style="font-size: 10px;">$${formatCurrencyMX(lineSubtotal)}</td>
            </tr>
        `;
    }).join('');

    const totalsRowsHtml = mode === 'sin-iva'
        ? `
            <tr>
                <th style="width:50%">Total sin IVA:</th>
                <td style="text-align: right;">$${formatCurrencyMX(pdfData.subtotal - pdfData.iva)}</td>
            </tr>
            <tr>
                <th>Iva desglosado</th>
                <td style="text-align: right;">$${formatCurrencyMX(pdfData.iva)}</td>
            </tr>
            <tr>
                <th>Total con IVA:</th>
                <td style="text-align: right;">$${formatCurrencyMX(pdfData.subtotal)}</td>
            </tr>
        `
        : `
            <tr>
                <th style="width:50%">Total con IVA:</th>
                <td style="text-align: right;">$${formatCurrencyMX(pdfData.subtotal)}</td>
            </tr>
            <tr>
                <th>Iva desglosado</th>
                <td style="text-align: right;">$${formatCurrencyMX(pdfData.iva)}</td>
            </tr>
        `;

    const discountRowHtml = pdfData.descuentoEvento !== 0
        ? `
            <tr>
                <th>Descuento:</th>
                <td style="text-align: right;">-$${formatCurrencyMX(pdfData.totalDescuento)}</td>
            </tr>
        `
        : '';

    const firmaHtml = pdfData.firma && pdfData.firma !== 'default.png'
        ? `<img src="https://sobre-la-mesa.com/images/firmas/${escapeHtml(pdfData.firma)}" alt="" class="image-container">`
        : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(filenameTitle)}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .la_nota {
            color: rgb(63, 63, 63);
            background-color: #fff !important;
            padding-left: 0.6em !important;
            font-size: 1.15em;
        }
        .la_seccion {
            color: black;
            padding-left: 0.6em !important;
            font-size: 1.30em;
            text-transform: uppercase;
            font-style: italic;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        th:first-child, td:first-child {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        tr:nth-child(odd) {
            background-color: #f9f9f9;
        }
        .container-signature {
            position: relative;
            width: 100%;
            text-align: center;
            margin-top: 20px;
        }
        .signature-wrapper {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
        }
        .image-container {
            max-width: 150px;
            height: auto;
            margin-top: -10%;
        }
        .row {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        .col-12, .col-xs-12 {
            flex: 0 0 100%;
            max-width: 100%;
            width: 100%;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        label, .policy-block {
            font-size: 9px;
            line-height: 1.5;
        }
        .heading { font-weight: bold; }
        .break { margin: 14px 0; }
        .no-print-bar {
            position: sticky;
            top: 0;
            z-index: 999;
            background: #1e293b;
            color: #fff;
            padding: 10px 20px;
            margin: -20px -20px 20px -20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .no-print-btn {
            background: #2563eb;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-weight: bold;
            cursor: pointer;
            font-size: 13px;
        }
        @media print {
            .no-print-bar { display: none !important; }
            body { margin: 10mm; }
        }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span><strong>Cotización #${safeNoCot} (${mode === 'sin-iva' ? 'Sin IVA' : 'Con IVA'})</strong> — ${safeFullName}</span>
        <button class="no-print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
    <div class="content-wrapper">
        <section class="content">
            <div class="container-fluid">
                <div class="invoice p-3 mb-3">
                    ${headerTableHtml}
                    <br>
                    <div class="row">
                        <div class="col-xs-12">
                            <table class="table table-bordered table-sm" width="100%" id="list_products">
                                <thead>
                                    <tr>
                                        <th style="font-size: 10px; background-color: #D3D3D3">Número</th>
                                        <th style="font-size: 10px; background-color: #D3D3D3">Imagen</th>
                                        <th style="font-size: 10px; background-color: #D3D3D3">Descripción</th>
                                        <th style="font-size: 10px; background-color: #D3D3D3">Cantidad</th>
                                        <th style="font-size: 10px; background-color: #D3D3D3">Precio</th>
                                        <th style="font-size: 10px; background-color: #D3D3D3">Días</th>
                                        ${showDiscountCol ? '<th style="font-size: 10px; background-color: #D3D3D3">Descuento</th>' : ''}
                                        <th style="font-size: 10px; background-color: #D3D3D3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productRowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12" style="text-align: right">
                            <div class="table-responsive" style="font-size: 10px;">
                                <table class="table">
                                    <tbody>
                                        ${totalsRowsHtml}
                                        ${discountRowHtml}
                                        <tr>
                                            <th>Depósito en garantía:</th>
                                            <td style="text-align: right;">$${formatCurrencyMX(pdfData.deposito)}</td>
                                        </tr>
                                        <tr>
                                            <th>Total</th>
                                            <td style="text-align: right;">$${formatCurrencyMX(pdfData.total)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <br>
                <div class="row text-center">
                    <div class="col-12">
                        <span class="heading">Políticas Sobre la Mesa</span>
                    </div>
                </div>

                <div class="row text-left policy-block">
                    <div class="col-12">
                        <label class="heading">CONFIRMACIÓN</label><br>
                        *Cuando el cliente autorice la cotización deberá aceptarla y firmarla desde el link enviado por su Table Solver, de lo contrario se considerará como no aceptada y no podrá salir el equipo de bodega.<br>
                        *Para reservar el equipo se requiere pagar un 50% de anticipo y liquidar la totalidad por lo menos 5 días antes del evento; de lo contrario, no se podrá entregar el equipo.<br>
                        *Sin anticipo no se puede asegurar la disponibilidad del equipo y/o mobiliario.<br>
                        *No existen reembolsos ni devoluciones. En cancelaciones o casos en los que no se realice el evento y ya esté pagado un anticipo o haya sido liquidado en su totalidad, el monto se tomará como saldo a favor con vigencia de un año (desde la fecha del evento) para eventos próximos.<br>
                        *Cualquier cancelación debe realizarse 72 horas antes del evento; de lo contrario, el importe liquidado no se tomará a cuenta como saldo a favor.<br>
                        *Los cambios en la cotización deben hacerse dos días antes del evento; de lo contrario, será imposible modificar la cotización.
                    </div>
                </div>

                <div class="break"></div>

                <div class="row text-left policy-block">
                    <div class="col-12">
                        <label class="heading">FORMAS DE PAGO:</label><br>
                        Efectivo o transferencia.<br>
                        Los datos para facturar son los siguientes:<br>
                        Bienvenido a Nuestra Mesa SAS de CV<br>
                        RFC: BNM191003N42<br>
                        Banco: BBVA<br>
                        Número de cuenta: 0114119266<br>
                        CLABE INTERBANCARIA: 012180001141192661<br>
                        *Por favor, envía el comprobante de pago con tu número de cotización al correo: <a href="mailto:contabilidad@sobrelamesa.mx">contabilidad@sobrelamesa.mx</a> y al correo de tu Table Solver para que este confirme de recibido; de lo contrario, se tomará como evento no liquidado.<br>
                        *En caso de pago con cheque es indispensable hacerlo 5 días hábiles antes del evento; de lo contrario, se tomará como evento no liquidado.
                    </div>
                </div>

                <div class="break"></div>

                <div class="row text-left policy-block">
                    <div class="col-12">
                        <label>
                            Para realizar tu factura, por favor envía los siguientes datos:<br>
                            Nombre RFC<br>
                            Dirección con colonia<br>
                            Código postal<br>
                            Correo<br>
                            Gastos generales o por definir<br>
                            N° DE REFERENCIA BANCARIA PARA REALIZAR SU PAGO:
                        </label>
                    </div>
                </div>

                <div class="break"></div>

                <div class="row text-left policy-block">
                    <div class="col-12">
                        <label class="heading">NOTAS IMPORTANTES:</label><br>
                        *Nuestros choferes y Table Solvers no están autorizados para recibir dinero. Los pagos en efectivo deben realizarse en nuestra oficina con el área de contabilidad ubicadas en Zempoala 388 Col. Narvarte, de Lunes a Viernes de 10:00-14:00 y de 15:00-18:00.<br>
                        *El depósito en garantía se reembolsa a más tardar una semana después de la devolución del equipo (es importante contar con los datos bancarios para la devolución), una vez que el responsable de bodega haya revisado y confirmado el buen estado del mismo.<br>
                        *Debido a la medición manual, puede llegar a haber una ligera diferencia entre el tamaño del artículo anterior y el real.<br>
                        *Debido a la visualización y los efectos de iluminación, la configuración del monitor, etc., puede llegar a haber una pequeña diferencia de color aceptable; por favor, téngalo en cuenta.
                    </div>
                </div>

                <div class="break"></div>

                <div class="row text-left policy-block">
                    <div class="col-12">
                        <label class="heading">ENTREGA Y RECOLECCIÓN</label><br>
                        *El cliente es el único responsable de la renta del equipo; en caso de que al momento de entregar este no se encuentre presente, puede asignar a una persona encargada para recibirlo sin perder la responsabilidad del mismo.<br>
                        *Al momento de entrega del equipo, el cliente o un encargado designado por el mismo deberá encontrarse en el lugar del evento para recibir el equipo, contarlo, revisarlo y firmar la orden de trabajo, escribiendo abajo de la firma la siguiente frase: "Recibo equipo limpio, completo y en buen estado"; de lo contrario, no se podrá dejar el equipo.<br>
                        *El personal no está autorizado a mover, limpiar o cargar cosas ajenas al equipo de Sobre la Mesa; si el cliente requiere algún movimiento será bajo su responsabilidad.<br>
                        *Montajes y desmontajes en días festivos causan un incremento del 20% en el costo de flete.<br>
                        *Horarios de entrega y recolección deberán coordinarse directamente con su Table Solver, nunca con los choferes.<br>
                        *Es responsabilidad del cliente revisar que el equipo se encuentre completo, limpio y en buen estado al recibirlo; en caso de existir alguna discrepancia debe notificarlo a su Table Solver. Después de la entrega, NO NOS HACEMOS RESPONSABLES por faltantes o roturas y el equipo deberá ser cubierto en su costo de reposición marcado en esta cotización.<br>
                        *El horario de entrega y recolección de equipo en nuestra bodega es de Lunes a Viernes de 10:00 a 14:00 y de 15:00 a 17:30 hrs., y el horario sabatino es de 10:00 a 13:00 hrs.<br>
                        *Se considera como HORARIO EXTRAORDINARIO: Antes de las 9:00 am o después de las 18:00 hrs. O si se requiere un rango específico, la entrega o recolección del equipo tendrá un costo adicional. Para poder recoger el equipo en bodega es necesario enviar comprobante de domicilio no mayor a tres meses y su identificación oficial a su Table Solver; de lo contrario, no se podrá rentar el equipo.<br>
                        *En caso de requerir la entrega del equipo un día antes del evento, será en horario abierto.<br>
                        *En caso de que el cliente no reciba o devuelva el equipo en horarios pactados, se deberá pagar flete y renta adicional.<br>
                        *Por higiene, se deberá devolver el equipo limpio para desinfección; en caso de no devolver el equipo limpio, se deberá pagar lavado.<br>
                        *El cliente se hace responsable al 100% de los daños causados al equipo alquilado, así como pérdidas causadas al equipo de Sobre la Mesa.<br>
                        *En caso de manchar o dañar la mantelería con cera, quemaduras, papel china, etc., esta se tomará como pérdida y deberá pagarse al precio mencionado en la cotización como Reposición.<br>
                        *En cuanto a la renta de mobiliario, es responsabilidad del cliente resguardar el equipo en caso de lluvia.<br>
                        *En caso de que el lugar de entrega no tenga accesos amplios, haya más de 20 metros del lugar de descarga al lugar de entrega, no cuente con elevador o se tengan que subir o bajar pisos por escaleras, se tomará como maniobra y tendrá un costo adicional.<br>
                        *Nuestro personal no está autorizado para esperar más de 15 minutos para proceder a la entrega o recolección del equipo; la fracción u hora adicional de espera tendrá un costo adicional de $250 pesos.<br>
                        *Serán causantes de penalización los montajes y desmontajes que no se realicen en los términos acordados con el cliente o en los que no se dé acceso para la entrega o recolección del mobiliario en horario y día pactado.
                    </div>
                </div>

                <div class="break"></div>

                <div class="row text-left policy-block">
                    <div class="col-12">
                        <label class="heading">Plazo de pago:</label><br>
                        50% al inicio y 5 días antes del evento.
                    </div>
                </div>

                <div class="container-signature">
                    <div>
                        <font size="4"><strong>${safeEmpresa} ${safeFullName}</strong></font>
                    </div>
                    <div class="signature-wrapper">
                        ${firmaHtml}
                    </div>
                    <div>
                        <font size="4"><strong>Acepto la cotización #${safeNoCot}</strong></font>
                    </div>
                </div>
            </div>
        </section>
    </div>
</body>
</html>`;
}

const rawServerUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3000/api';
const API_BASE_URL = rawServerUrl.endsWith('/api')
    ? rawServerUrl
    : `${rawServerUrl.replace(/\/+$/, '')}/api`;

export function getEventPdfUrl(eventId, mode = 'con-iva', cacheBust = '') {
    if (!eventId || Number(eventId) <= 0) return '';
    const suffix = cacheBust ? `?t=${encodeURIComponent(cacheBust)}` : '';
    if (mode === 'sin-iva' || mode === 'without_iva') {
        return `${API_BASE_URL}/events/pdf/sin-iva/${eventId}${suffix}`;
    }
    if (mode === 'logistica' || mode === 'logistics') {
        return `${API_BASE_URL}/events/pdf/logistica/${eventId}${suffix}`;
    }
    if (mode === 'remision' || mode === 'remission') {
        return `${API_BASE_URL}/events/pdf/remision/${eventId}${suffix}`;
    }
    return `${API_BASE_URL}/events/pdf/${eventId}${suffix}`;
}

export function openQuotePdfWindow({ formState, mode = 'con-iva' }) {
    if (!formState?.id) return;
    const url = getEventPdfUrl(formState.id, mode, Date.now());
    if (url) {
        window.open(url, '_blank');
    }
}

export function openEventPdfById(eventId, mode = 'con-iva') {
    const url = getEventPdfUrl(eventId, mode, Date.now());
    if (url) {
        window.open(url, '_blank');
    }
}
