import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { EventDetailResponse } from '../interfaces/event';
import { ProductCategoryId, CATEGORY_SECTION_LABELS } from '../../../constants/product_categories';
import { QuoteRowType } from '../../../constants/quote_items';

const execFileAsync = promisify(execFile);

export type PdfReportMode = 'con-iva' | 'sin-iva' | 'logistica' | 'remision';

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

const CHROME_CANDIDATE_PATHS = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
].filter(Boolean) as string[];

const LOCAL_IMAGE_ROOTS = [
    path.resolve(__dirname, '../../../../../slm/public'),
    '/Users/carlosrodriguez/development/projects/php7/slm/slm',
    '/Users/carlosrodriguez/development/projects/php7/slm/sobrelamesa/public'
];

let cachedLogoDataUri: string | null = null;

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.svg') return 'image/svg+xml';
    return 'image/png';
}

function fileToDataUri(filePath: string): string | null {
    try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const buf = fs.readFileSync(filePath);
            const mime = getMimeType(filePath);
            return `data:${mime};base64,${buf.toString('base64')}`;
        }
    } catch {
        // Ignore read errors and fall back to remote URL
    }
    return null;
}

function getLogoSrc(): string {
    if (cachedLogoDataUri) return cachedLogoDataUri;

    const candidateLogoPaths = [
        path.resolve(__dirname, '../../../assets/icono_logo_04.png'),
        path.resolve(__dirname, '../../../../../slm/public/logos/icono_logo_04.png'),
        '/Users/carlosrodriguez/development/projects/php7/slm/slm/images/icons/icono_logo_04.png',
        '/Users/carlosrodriguez/development/projects/php7/slm/sobrelamesa/public/images/icons/icono_logo_04.png'
    ];

    for (const p of candidateLogoPaths) {
        const uri = fileToDataUri(p);
        if (uri) {
            cachedLogoDataUri = uri;
            return uri;
        }
    }

    return 'https://sobre-la-mesa.com/images/icons/icono_logo_04.png';
}

function resolveProductImageSrc(imagen?: string): string {
    const defaultRemote = 'https://sobre-la-mesa.com/images/productos/default_vacio-min.png';
    if (!imagen) {
        for (const root of LOCAL_IMAGE_ROOTS) {
            const localDefault = path.join(root, 'images/productos/default_vacio-min.png');
            const uri = fileToDataUri(localDefault);
            if (uri) return uri;
        }
        return defaultRemote;
    }

    for (const root of LOCAL_IMAGE_ROOTS) {
        const localProd = path.join(root, 'images/productos', imagen);
        const uri = fileToDataUri(localProd);
        if (uri) return uri;
    }

    return `https://sobre-la-mesa.com/images/productos/${encodeURIComponent(imagen)}`;
}

function resolveSignatureSrc(firma?: string, folder: 'firmas' | 'firmas_logistica' = 'firmas'): string {
    if (!firma || firma === 'default.png') return '';
    for (const root of LOCAL_IMAGE_ROOTS) {
        const localSig = path.join(root, 'images', folder, firma);
        const uri = fileToDataUri(localSig);
        if (uri) return uri;
    }
    return `https://sobre-la-mesa.com/images/${folder}/${encodeURIComponent(firma)}`;
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMoney(value: number): string {
    const num = Number(value) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatSpanishDate(dateStr?: string, timeStr?: string): string {
    if (!dateStr || dateStr === '0000-00-00') return 'Por definir';
    const clean = String(dateStr).split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) {
        return `${dateStr} ${timeStr || ''}`.trim();
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) {
        return `${dateStr} ${timeStr || ''}`.trim();
    }

    const formatted = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(dateObj);

    const cleanTime = timeStr ? String(timeStr).substring(0, 8) : '';
    return `${formatted}${cleanTime ? ` ${cleanTime}` : ''}`;
}

function isFadedServiceProduct(categoria?: string, productoName?: string, categoriaId?: number): boolean {
    const catUpper = String(categoria || '').trim().toUpperCase();
    const isService = catUpper === CATEGORY_SECTION_LABELS[ProductCategoryId.Servicios] || Number(categoriaId) === ProductCategoryId.Servicios;
    if (!isService) return false;
    const prodUpper = String(productoName || '').trim().toUpperCase();
    return SERVICE_FADED_PREFIXES.some(prefix => prodUpper.startsWith(prefix));
}

export function buildEventReportHtml(
    detail: EventDetailResponse,
    mode: PdfReportMode = 'con-iva',
    placesMap?: Map<string, string>
): { html: string; filename: string } {
    const ev: any = detail.event || {};
    const products = detail.products || [];
    const contents = detail.contents || [];

    const noCotizacion = `00${ev.id || ''}`;
    const fullName = ev.cliente || ev.full_name || '';
    const empresa = ev.empresa || '';
    const numTel = ev.num_tel || ev.num_tel_empresa || 'Sin teléfono';
    const email = ev.email || '';
    const eventoName = ev.tipo_evento_nombre || ev.evento || '';
    const agentName = ev.agente || ev.name || '';
    const fechaCotizacionClean = ev.fecha_cotizacion
        ? String(ev.fecha_cotizacion).split('T')[0].split(' ')[0]
        : new Date().toISOString().split('T')[0];
    const fechaEventoClean = ev.fecha_evento
        ? String(ev.fecha_evento).split('T')[0].split(' ')[0]
        : '';

    let domEntrega = String(ev.domicilio_entrega || '').trim();
    const lugarEntregaDir = String(ev.lugar_entrega_direccion || '').trim();
    if (
        domEntrega &&
        lugarEntregaDir &&
        !domEntrega.toLowerCase().includes(lugarEntregaDir.toLowerCase())
    ) {
        domEntrega = `${domEntrega} ${lugarEntregaDir}`;
    } else if (placesMap && domEntrega && placesMap.has(domEntrega)) {
        const mappedDir = String(placesMap.get(domEntrega) || '').trim();
        if (mappedDir && !domEntrega.toLowerCase().includes(mappedDir.toLowerCase())) {
            domEntrega = `${domEntrega} ${mappedDir}`;
        }
    }

    let domRecoleccion = String(ev.domicilio_recoleccion || '').trim();
    const lugarRecoDir = String(ev.lugar_recoleccion_direccion || '').trim();
    if (
        domRecoleccion &&
        lugarRecoDir &&
        !domRecoleccion.toLowerCase().includes(lugarRecoDir.toLowerCase())
    ) {
        domRecoleccion = `${domRecoleccion} ${lugarRecoDir}`;
    } else if (placesMap && domRecoleccion && placesMap.has(domRecoleccion)) {
        const mappedDir = String(placesMap.get(domRecoleccion) || '').trim();
        if (mappedDir && !domRecoleccion.toLowerCase().includes(mappedDir.toLowerCase())) {
            domRecoleccion = `${domRecoleccion} ${mappedDir}`;
        }
    }
    if (!domRecoleccion) {
        domRecoleccion = domEntrega;
    }

    const fechaEntregaDesc = formatSpanishDate(ev.fecha_entrega || ev.fecha_evento, ev.hora_entrega);
    const fechaEventoDesc = formatSpanishDate(ev.fecha_evento, ev.hora_evento);
    const fechaRecoDesc = formatSpanishDate(ev.fecha_recoleccion || ev.fecha_evento, ev.hora_recoleccion);
    const fechaCotDesc = formatSpanishDate(ev.fecha_cotizacion, ev.hora_recoleccion);

    const unifiedItems: Array<any> = [
        ...products.map(p => ({ ...p, _kind: 'product', row_position: Number(p.row_position) || 0 })),
        ...contents.map(c => ({ ...c, _kind: 'content', row_position: Number(c.row_position) || 0 }))
    ].sort((a, b) => a.row_position - b.row_position);

    const logoSrc = getLogoSrc();
    const defaultImgSrc = resolveProductImageSrc(undefined);

    const replaceName = (fullName || '_').replace(/\s+/g, '_');
    const filename = mode === 'remision'
        ? `Remision-${ev.id}-${replaceName}-${fechaEventoClean}`
        : `Cotizacion-${ev.id}-${replaceName}-${fechaEventoClean}`;

    const safeNoCot = escapeHtml(noCotizacion);
    const safeFullName = escapeHtml(fullName || empresa);
    const safeEmpresa = escapeHtml(empresa || fullName);
    const safeTel = escapeHtml(numTel);
    const safeEmail = escapeHtml(email);
    const safeEvento = escapeHtml(eventoName);
    const safeAgent = escapeHtml(agentName);
    const safeDomEntrega = escapeHtml(domEntrega);
    const safeDomReco = escapeHtml(domRecoleccion || domEntrega);

    // Header table idéntico a cotizacion.blade.php, cotizacion_sin_iva.blade.php y logistica_pdf.blade.php
    const headerTableHtml = `
        <div class="row">
            <div class="col-12" style="text-align: right">
                <h3 class="font-weight-normal" style="font-weight: normal; margin: 0 0 6px 0;">Cotización #${safeNoCot}</h3>
            </div>
        </div>
        <div>
            <table class="table table-sm" width="100%">
                <tbody>
                    <tr>
                        <td style="width: 100px; max-width: 110px; min-width: 100px; height: 100px; max-height: 100px; min-height: 100px; text-align: center; background-color: #fff !important; border-left: 1px solid #fff !important; border-top: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-right: 1px solid #fff !important;">
                            <div style="display: flex; justify-content: center; align-items: center; height: 100px;">
                                <img src="${logoSrc}" alt="logo" style="width: 215px; height: auto; margin-top:-42px; margin-left: -16px; margin-right: -46px; margin-bottom: -16px; display: block;">
                            </div>
                        </td>
                        <td style="border-bottom: 1px solid #fff !important; background-color: #fff !important; border-left: 1px solid #000 !important; width: 10px; max-width: 10px; min-width: 10px; height: 100px; max-height: 100px; min-height: 100px; border-right: 1px solid #fff !important; border-top: 1px solid #fff !important;">
                            <div></div>
                        </td>
                        <td style="border-left: 1px solid #fff !important; border-right: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-top: 1px solid #fff !important; background-color: #fff !important; width: 100px; max-width: 150px; min-width: 140px; height: 100px; max-height: 100px; min-height: 100px;">
                            <div style="font-size: 10px; margin-left: 8px; margin-right: 12px; margin-top: 16px; margin-bottom: 16px; font-weight: normal;">
                                <b>${safeFullName}</b><br>
                                ${safeEmpresa}<br>
                                <b>Telefono:</b> ${safeTel}<br>
                                <b>Email:</b> ${safeEmail}<br>
                                <h4 style="margin: 6px 0 0 0;">${safeEvento}</h4>
                            </div>
                        </td>
                        <td style="background-color: #fff !important; width: 150px; max-width: 160px; min-width: 150px; height: 100px; max-height: 100px; min-height: 100px; border-right: 1px solid #fff !important; border-top: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-left: 1px solid #ddd !important;">
                            <div style="font-size: 10px; width: 150px; max-width: 160px; min-width: 150px; text-align: center; font-weight: normal;">
                                <div style="margin-bottom: 10px">
                                    <p style="margin: 0;">Fecha que SLM <strong>Entrega: </strong> ${escapeHtml(fechaEntregaDesc)}</p>
                                </div>
                                <div style="margin-bottom: 10px">
                                    <p style="margin: 0;">Fecha de Evento: ${escapeHtml(fechaEventoDesc)}</p>
                                </div>
                                <div style="margin-bottom: 5px">
                                    <p style="margin: 0;">Fecha que SLM <strong>Recolección: </strong> ${escapeHtml(fechaRecoDesc)}</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #fff !important; width: 100px; max-width: 110px; min-width: 100px; height: 80px; max-height: 80px; min-height: 80px; border-bottom: 1px solid #000 !important; border-left: 1px solid #ddd !important; border-right: 1px solid #ddd !important; border-top: 1px solid #ddd !important;">
                            <div style="font-size: 11px;">
                                Fecha de Cotización: ${escapeHtml(fechaCotizacionClean)}
                                <p style="margin: 8px 0 0 0;">TABLE SOLVER: ${safeAgent}</p>
                            </div>
                        </td>
                        <td style="background-color: #fff !important; width: 10px; max-width: 10px; min-width: 10px; height: 80px; max-height: 80px; min-height: 80px; border-top: 1px solid #000 !important; border-right: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-left: 1px solid #fff !important;">
                            <div></div>
                        </td>
                        <td style="background-color: #fff !important; border-right: 1px solid #fff !important; border-left: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-top: 1px solid #000 !important; width: 100px; max-width: 150px; min-width: 140px; height: 80px; max-height: 80px; min-height: 80px;">
                            <div></div>
                        </td>
                        <td style="border-left: 1px solid #fff !important; background-color: #fff !important; border-right: 1px solid #fff !important; border-bottom: 1px solid #fff !important; border-top: 1px solid #000 !important; width: 100px; max-width: 160px; min-width: 150px; height: 80px; max-height: 80px; min-height: 80px;">
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

    // 1. MODO LOGÍSTICA (logistica_pdf.blade.php)
    if (mode === 'logistica') {
        const firmaSrc = resolveSignatureSrc(ev.firma, 'firmas');
        const firmaHtml = firmaSrc
            ? `<img src="${firmaSrc}" style="margin-top: 4px" alt="" width="200" height="200">`
            : '';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(filename)}</title>
    <style>
        @page { margin: 12mm; }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
        th { background-color: #f2f2f2; }
        th:first-child, td:first-child {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        tr:nth-child(odd) { background-color: #f9f9f9; }
        .row { display: flex; flex-wrap: wrap; margin-bottom: 15px; }
        .col-12 { flex: 0 0 100%; max-width: 100%; width: 100%; }
        .no-print-bar {
            position: sticky; top: 0; z-index: 999; background: #1e293b; color: #fff;
            padding: 8px 16px; margin: -20px -20px 16px -20px;
            display: flex; justify-content: space-between; align-items: center; font-size: 12px;
        }
        .no-print-btn {
            background: #2563eb; color: #fff; border: none; border-radius: 6px;
            padding: 6px 14px; font-weight: bold; cursor: pointer; font-size: 12px;
        }
        @media print { .no-print-bar { display: none !important; } }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span><strong>Orden de Logística #${safeNoCot}</strong> — ${safeFullName}</span>
        <button class="no-print-btn" onclick="window.print()">Imprimir / Descargar PDF</button>
    </div>
    <div class="content-wrapper">
        <section class="content">
            <div class="container-fluid">
                <div class="invoice p-3 mb-3">
                    ${headerTableHtml}
                    <br><br>
                    <div>
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
            </div>
        </section>
    </div>
</body>
</html>`;
        return { html, filename };
    }

    // 2. MODO REMISIÓN (remision.blade.php)
    if (mode === 'remision') {
        let count = 0;
        const rowsHtml = unifiedItems.map(item => {
            if (item._kind === 'content') {
                if (Number(item.type) === QuoteRowType.Note) {
                    return `<tr><td colspan="5" align="center" style="font-size: 10px; font-weight: bold; background-color: #D3D3D3; text-align: center;">${escapeHtml(item.content_seccion)}</td></tr>`;
                }
                return `<tr><td colspan="5" align="center" style="font-size: 12px; font-weight: bold; text-transform: uppercase; font-style: italic; background-color: #D3D3D3; text-align: center;">${escapeHtml(item.content_seccion)}</td></tr>`;
            }

            count++;
            const prodImgSrc = resolveProductImageSrc(item.imagen) || defaultImgSrc;
            const repoPrice = Number(item.precio_reposicion) || 0;
            const repoText = repoPrice !== 0 ? `$${formatMoney(repoPrice)}` : `$${repoPrice}`;
            const medidasText = item.medidas ? escapeHtml(item.medidas) : 'No disponible';

            return `
                <tr>
                    <td style="font-size: 10px;">${count}</td>
                    <td style="font-size: 10px;">
                        <img src="${prodImgSrc}" style="margin-top: 4px" alt="" width="100" height="100" onerror="this.onerror=null;this.src='${defaultImgSrc}';">
                        <br>Reposición c/u:<br>${repoText}
                    </td>
                    <td style="font-size: 10px;">
                        ${escapeHtml(item.producto)}
                        <br><br>
                        <font size="2"><strong>Medidas: </strong></font><br>
                        ${medidasText}
                    </td>
                    <td style="font-size: 10px;">${Number(item.cantidad) || 0}</td>
                    <td style="font-size: 10px;"></td>
                </tr>
            `;
        }).join('');

        const firmaRemisionSrc = resolveSignatureSrc(ev.firma_remision || ev.firma_logistica, 'firmas_logistica');
        const firmaRemisionHtml = firmaRemisionSrc
            ? `<img src="${firmaRemisionSrc}" alt="" class="image-container">`
            : '';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(filename)}</title>
    <style>
        @page { margin: 12mm; }
        .line-container { position: relative; margin-bottom: 15px; }
        .image-container { max-width: 250px; height: auto; margin-top: -10%; }
        body, table, * { font-family: Arial, Helvetica, sans-serif; }
        body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        table { border-spacing: 0px; width: 100%; }
        td, th { border: 1px solid #f5f5f5; padding: 1em; text-align: left; }
        img { margin: 0.5em; }
        h4 { font-size: 2.5em; margin: 0.2em 0; font-weight: normal; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .no-print-bar {
            position: sticky; top: 0; z-index: 999; background: #1e293b; color: #fff;
            padding: 8px 16px; margin: -8px -8px 16px -8px;
            display: flex; justify-content: space-between; align-items: center; font-size: 12px;
        }
        .no-print-btn {
            background: #2563eb; color: #fff; border: none; border-radius: 6px;
            padding: 6px 14px; font-weight: bold; cursor: pointer; font-size: 12px;
        }
        @media print { .no-print-bar { display: none !important; } }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span><strong>Orden de Remisión #${safeNoCot}</strong> — ${safeFullName}</span>
        <button class="no-print-btn" onclick="window.print()">Imprimir / Descargar PDF</button>
    </div>
    <div class="content-wrapper">
        <section class="content">
            <div class="container-fluid">
                <div class="invoice p-3 mb-3">
                    <div>
                        <table class="table table-sm" width="100%">
                            <tbody>
                                <tr>
                                    <td style="width: 100px;">
                                        <img src="${logoSrc}" alt="logo" style="width: 250px; margin-top:-42px; margin-left: -16px; margin-right: -64px; margin-bottom: -16px; display: block;">
                                    </td>
                                    <td style="width: 100px;">
                                        <div style="font-size: 10px;">
                                            Sobre la Mesa
                                            <address>
                                                <strong>BNM191003N42</strong><br>
                                                Zempoala #388 <br>
                                                Col. Narvarte Oriente<br>
                                                Ciudad de México (MX)<br>
                                                CP. 03023
                                            </address>
                                        </div>
                                    </td>
                                    <td style="width: 100px;">
                                        <div style="font-size: 10px;">
                                            <b>No. de Cotización </b><h4 class="font-weight-normal">#${safeNoCot}</h4>
                                            <b>Fecha de Entrega:</b><br>${escapeHtml(fechaEntregaDesc)}<br>
                                            <b>Fecha de Evento: </b><br>${escapeHtml(fechaEventoDesc)}<br>
                                            <b>Fecha de Recolección:</b><br>${escapeHtml(fechaRecoDesc)}<br>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="width: 100px;">
                                        <div style="font-size: 10px;">
                                            <b>FECHA DE COTIZACIÓN: </b><br>${escapeHtml(fechaCotDesc)}<br>
                                            <b>TABLE SOLVER: </b><br>${safeAgent}<br>
                                        </div>
                                    </td>
                                    <td style="width: 100px; max-width: 200px; min-width: 50px;" colspan="2">
                                        <div style="font-size: 10px;">
                                            <strong>${safeFullName}</strong><br>
                                            ${safeEmpresa}
                                            <address>
                                                <b>Domicilio de Entrega </b> ${safeDomEntrega}<br>
                                                <b>Domicilio de Recoleccion </b> ${safeDomReco}<br>
                                                <b>Telefono:</b> ${safeTel}<br>
                                                <b>Email:</b> ${safeEmail}<br>
                                                <b>Tipo de Evento:</b> ${safeEvento}<br>
                                            </address>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="row">
                        <div class="col-xs-12">
                            <table class="table table-bordered table-sm" width="100%">
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
                        </div>
                    </div>
                </div>
                <div>
                    <br><br>
                    <div class="row">
                        <div class="col-12 text-left">
                            <div class="line-container">
                                <font size="2"><strong> Cajas: _______________</strong></font>
                            </div>
                            <div class="line-container">
                                <font size="2"><strong> Cambros: ____________</strong></font>
                            </div>
                        </div>
                    </div>
                    <br><br>
                    <div class="row">
                        <div class="col-12 text-right">
                            <font size="4"><strong> Nombre y Firma #${safeNoCot}</strong></font>
                            <br><br>
                            ${firmaRemisionHtml}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</body>
</html>`;
        return { html, filename };
    }

    // 3. MODO COTIZACIÓN CON IVA / SIN IVA (cotizacion.blade.php y cotizacion_sin_iva.blade.php)
    const isDescuento = products.some(p => Number(p.descuento) !== 0);
    const totalCols = isDescuento ? 8 : 7;

    let subtotal = 0;
    let subtotalSnDesc = 0;
    let costoServicios = 0;
    let prodCounter = 0;

    const productRowsHtml = unifiedItems.map(item => {
        if (item._kind === 'content') {
            if (Number(item.type) === QuoteRowType.Note) {
                return `
                    <tr>
                        <td colspan="${totalCols}" class="la_nota" align="center" style="font-size: 10px; font-weight: bold; border: 1px solid #000; text-align: center;">
                            ${escapeHtml(item.content_seccion)}
                        </td>
                    </tr>
                `;
            }
            return `
                <tr>
                    <td colspan="${totalCols}" class="la_seccion" align="center" style="font-size: 12px; font-weight: bold; text-transform: uppercase; font-style: italic; background-color: #D3D3D3; text-align: center;">
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

        const catUpper = String(item.categoria || '').trim().toUpperCase();
        const isService = catUpper === CATEGORY_SECTION_LABELS[ProductCategoryId.Servicios] || Number(item.categoria_producto_id) === ProductCategoryId.Servicios;
        if (isService) {
            if (!descuento) {
                costoServicios += cantidad * precioRenta;
            } else {
                const porcentaje = descuento / 100;
                const resta = (cantidad * precioRenta) * porcentaje;
                costoServicios += (cantidad * precioRenta) - resta;
            }
        }

        const multi = (cantidad * precioRenta) * dias;
        subtotalSnDesc += multi;

        let precioCellHtml = `$${formatMoney(precioRenta)}`;
        let lineSubtotal = multi;

        if (!descuento) {
            subtotal += multi;
        } else {
            const newPrice = (precioRenta * (100 - descuento)) * 0.01;
            precioCellHtml = `<del>$${formatMoney(precioRenta)}</del><br>$${formatMoney(newPrice)}`;
            const porcentaje = descuento / 100;
            const resta = multi * porcentaje;
            lineSubtotal = multi - resta;
            subtotal += lineSubtotal;
        }

        const faded = isFadedServiceProduct(item.categoria, item.producto, item.categoria_producto_id);
        const prodImgSrc = resolveProductImageSrc(item.imagen) || defaultImgSrc;
        const repoHtml = precioRepo !== 0 ? `<br>Reposición c/u:<br> $${formatMoney(precioRepo)}` : '';
        const medidasText = item.medidas ? escapeHtml(item.medidas) : 'No disponible';

        return `
            <tr>
                <td style="font-size: 10px;">${prodCounter}</td>
                <td style="font-size: 10px;">
                    <img src="${prodImgSrc}" style="margin-top: 4px;${faded ? ' opacity: 0.2;' : ''}" width="100" height="100" alt="" onerror="this.onerror=null;this.src='${defaultImgSrc}';">
                    ${repoHtml}
                </td>
                <td style="font-size: 10px;">
                    ${escapeHtml(item.producto)} <br><br><br>
                    <font size="2"><strong>Medidas: </strong></font> <br>
                    ${medidasText}
                </td>
                <td style="font-size: 10px;">${cantidad}</td>
                <td style="font-size: 10px;">${precioCellHtml}</td>
                <td style="font-size: 10px;">${dias}</td>
                ${isDescuento ? `<td style="font-size: 10px;">${descuento}%</td>` : ''}
                <td style="font-size: 10px;">$${formatMoney(lineSubtotal)}</td>
            </tr>
        `;
    }).join('');

    const precioSinIva = subtotal / 1.16;
    const iva = precioSinIva * 0.16;
    const descuentoEvento = Number(ev.descuento) || 0;
    const totalDescuento = descuentoEvento !== 0 ? subtotal * (descuentoEvento / 100) : 0;

    let deposito = subtotalSnDesc * 0.35;
    if (costoServicios !== 0) {
        const depo = subtotalSnDesc - costoServicios;
        deposito = depo * 0.35;
    }

    const total = descuentoEvento === 0
        ? subtotal + deposito
        : (subtotal - totalDescuento) + deposito;

    const totalsHeaderRows = mode === 'sin-iva'
        ? `
            <tr>
                <th style="width:50%">Total sin IVA:</th>
                <td id="subTotal" style="text-align: right">$${formatMoney(subtotal - iva)}</td>
            </tr>
            <tr>
                <th>Iva desglosado</th>
                <td id="iva" style="text-align: right">$${formatMoney(iva)}</td>
            </tr>
            <tr>
                <th>Total con IVA:</th>
                <td id="totalConIva" style="text-align: right">$${formatMoney(subtotal)}</td>
            </tr>
        `
        : `
            <tr>
                <th style="width:50%">Total con IVA:</th>
                <td id="subTotal" style="text-align: right">$${formatMoney(subtotal)}</td>
            </tr>
            <tr>
                <th>Iva desglosado</th>
                <td id="iva" style="text-align: right">$${formatMoney(iva)}</td>
            </tr>
        `;

    const discountRowHtml = descuentoEvento !== 0
        ? `
            <tr>
                <th>Descuento:</th>
                <td id="descuento" style="text-align: right">-$${formatMoney(totalDescuento)}</td>
            </tr>
        `
        : '';

    const firmaSrc = resolveSignatureSrc(ev.firma, 'firmas');
    const firmaHtml = firmaSrc
        ? `<img src="${firmaSrc}" alt="" class="image-container">`
        : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(filename)}</title>
    <style>
        @page { margin: 12mm; }
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
        label { font-size: 9px; }
        .heading { font-weight: bold; }
        .break { margin: 14px 0; }
        .no-print-bar {
            position: sticky; top: 0; z-index: 999; background: #1e293b; color: #fff;
            padding: 8px 16px; margin: -20px -20px 16px -20px;
            display: flex; justify-content: space-between; align-items: center; font-size: 12px;
        }
        .no-print-btn {
            background: #2563eb; color: #fff; border: none; border-radius: 6px;
            padding: 6px 14px; font-weight: bold; cursor: pointer; font-size: 12px;
        }
        @media print { .no-print-bar { display: none !important; } }
    </style>
</head>
<body>
    <div class="no-print-bar">
        <span><strong>Cotización #${safeNoCot} (${mode === 'sin-iva' ? 'Sin IVA' : 'Con IVA'})</strong> — ${safeFullName}</span>
        <button class="no-print-btn" onclick="window.print()">Imprimir / Descargar PDF</button>
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
                                        ${isDescuento ? '<th style="font-size: 10px; background-color: #D3D3D3">Descuento</th>' : ''}
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
                                        ${totalsHeaderRows}
                                        ${discountRowHtml}
                                        <tr>
                                            <th>Depósito en garantía:</th>
                                            <td id="deposito" style="text-align: right">$${formatMoney(deposito)}</td>
                                        </tr>
                                        <tr>
                                            <th>Total</th>
                                            <td id="total" style="text-align: right">$${formatMoney(total)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <br>
                    <div class="row text-center">
                        <div class="col-12">
                            <span class="heading">Políticas Sobre la Mesa</span>
                        </div>
                    </div>
                    <div class="row text-left" style="font-size: 9px;">
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

                    <div class="row text-left" style="font-size: 9px;">
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

                    <div class="row text-left" style="font-size: 9px;">
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

                    <div class="row text-left" style="font-size: 9px;">
                        <div class="col-12">
                            <label class="heading">NOTAS IMPORTANTES:</label><br>
                            *Nuestros choferes y Table Solvers no están autorizados para recibir dinero. Los pagos en efectivo deben realizarse en nuestra oficina con el área de contabilidad ubicadas en Zempoala 388 Col. Narvarte, de Lunes a Viernes de 10:00-14:00 y de 15:00-18:00.<br>
                            *El depósito en garantía se reembolsa a más tardar una semana después de la devolución del equipo (es importante contar con los datos bancarios para la devolución), una vez que el responsable de bodega haya revisado y confirmado el buen estado del mismo.<br>
                            *Debido a la medición manual, puede llegar a haber una ligera diferencia entre el tamaño del artículo anterior y el real.<br>
                            *Debido a la visualización y los efectos de iluminación, la configuración del monitor, etc., puede llegar a haber una pequeña diferencia de color aceptable; por favor, téngalo en cuenta.
                        </div>
                    </div>

                    <div class="break"></div>

                    <div class="row text-left" style="font-size: 9px;">
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

                    <div class="row text-left" style="font-size: 9px;">
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
            </div>
        </section>
    </div>
</body>
</html>`;

    return { html, filename };
}

function findChromeBinary(): string | null {
    for (const candidate of CHROME_CANDIDATE_PATHS) {
        try {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        } catch {
            // continue
        }
    }
    return null;
}

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer | null> {
    const chromeBin = findChromeBinary();
    if (!chromeBin) {
        return null;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slm-pdf-'));
    const profileDir = path.join(tmpDir, 'profile');
    const htmlPath = path.join(tmpDir, 'document.html');
    const pdfPath = path.join(tmpDir, 'document.pdf');

    try {
        fs.mkdirSync(profileDir, { recursive: true });
        fs.writeFileSync(htmlPath, html, 'utf8');

        const baseArgs = [
            '--disable-gpu',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-default-browser-check',
            '--no-pdf-header-footer',
            `--user-data-dir=${profileDir}`,
            `--print-to-pdf=${pdfPath}`,
            `file://${htmlPath}`
        ];

        try {
            await execFileAsync(chromeBin, ['--headless=new', ...baseArgs], { timeout: 25000 });
        } catch {
            await execFileAsync(chromeBin, ['--headless', ...baseArgs], { timeout: 25000 });
        }

        if (fs.existsSync(pdfPath)) {
            return fs.readFileSync(pdfPath);
        }
        return null;
    } catch (error) {
        console.error('Error rendering HTML to PDF via Chrome:', error);
        return null;
    } finally {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // ignore cleanup errors
        }
    }
}
