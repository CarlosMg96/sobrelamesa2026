import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import axios from 'axios';
import { EventDetailResponse } from '../interfaces/event';
import { ProductCategoryId, CATEGORY_SECTION_LABELS } from '../../../constants/product_categories';
import { QuoteRowType } from '../../../constants/quote_items';
import { PdfReportMode } from './eventPdfGenerator';

interface PdfEmbeddedImage {
    width: number;
    height: number;
    data: Buffer;
    filter: 'DCTDecode' | 'FlateDecode';
    colorSpace: 'DeviceRGB' | 'DeviceGray';
}

type FontKey = 'F1' | 'F2' | 'F3' | 'F4'; // F1=Regular, F2=Bold, F3=Oblique, F4=BoldOblique

const PAGE_W = 595.28; // A4 width in pt
const PAGE_H = 841.89; // A4 height in pt
const MARGIN_L = 28.35; // 10mm
const MARGIN_R = 28.35; // 10mm
const MARGIN_T = 28.35; // 10mm
const MARGIN_B = 28.35; // 10mm
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // ~538.58 pt

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

const imageMemoryCache = new Map<string, PdfEmbeddedImage | null>();

function parseJpeg(buf: Buffer): PdfEmbeddedImage | null {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) {
            offset++;
            continue;
        }
        const marker = buf[offset + 1];
        if (marker === 0xff) {
            offset++;
            continue;
        }
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2;
            continue;
        }
        const segLen = buf.readUInt16BE(offset + 2);
        if (segLen < 2) break;
        if (
            marker >= 0xc0 &&
            marker <= 0xcf &&
            marker !== 0xc4 &&
            marker !== 0xc8 &&
            marker !== 0xcc
        ) {
            const height = buf.readUInt16BE(offset + 5);
            const width = buf.readUInt16BE(offset + 7);
            const components = buf[offset + 9];
            if (width > 0 && height > 0 && (components === 1 || components === 3)) {
                return {
                    width,
                    height,
                    data: buf,
                    filter: 'DCTDecode',
                    colorSpace: components === 1 ? 'DeviceGray' : 'DeviceRGB'
                };
            }
            break;
        }
        offset += 2 + segLen;
    }
    return null;
}

function parsePng(buf: Buffer): PdfEmbeddedImage | null {
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
    try {
        let offset = 8;
        let width = 0;
        let height = 0;
        let bitDepth = 8;
        let colorType = 0;
        let interlace = 0;
        let plte: Buffer | null = null;
        let trns: Buffer | null = null;
        const idatChunks: Buffer[] = [];

        while (offset + 8 <= buf.length) {
            const len = buf.readUInt32BE(offset);
            const type = buf.toString('ascii', offset + 4, offset + 8);
            const data = buf.subarray(offset + 8, offset + 8 + len);
            if (type === 'IHDR') {
                width = data.readUInt32BE(0);
                height = data.readUInt32BE(4);
                bitDepth = data[8];
                colorType = data[9];
                interlace = data[12];
            } else if (type === 'PLTE') {
                plte = data;
            } else if (type === 'tRNS') {
                trns = data;
            } else if (type === 'IDAT') {
                idatChunks.push(data);
            } else if (type === 'IEND') {
                break;
            }
            offset += 12 + len;
        }

        if (width <= 0 || height <= 0 || interlace !== 0 || idatChunks.length === 0) {
            return null;
        }

        const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
        const channels =
            colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
        const bpp = Math.max(1, Math.ceil((bitDepth * channels) / 8));
        const stride = Math.ceil((width * bitDepth * channels) / 8);
        const raw = Buffer.alloc(height * stride);

        for (let y = 0; y < height; y++) {
            const filter = inflated[y * (stride + 1)];
            const rowIn = y * (stride + 1) + 1;
            const rowOut = y * stride;
            for (let x = 0; x < stride; x++) {
                const byte = inflated[rowIn + x] || 0;
                const a = x >= bpp ? raw[rowOut + x - bpp] : 0;
                const b = y > 0 ? raw[(y - 1) * stride + x] : 0;
                const c = x >= bpp && y > 0 ? raw[(y - 1) * stride + x - bpp] : 0;
                let val = byte;
                if (filter === 1) val = (byte + a) & 0xff;
                else if (filter === 2) val = (byte + b) & 0xff;
                else if (filter === 3) val = (byte + ((a + b) >> 1)) & 0xff;
                else if (filter === 4) {
                    const p = a + b - c;
                    const pa = Math.abs(p - a);
                    const pb = Math.abs(p - b);
                    const pc = Math.abs(p - c);
                    const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
                    val = (byte + pr) & 0xff;
                }
                raw[rowOut + x] = val;
            }
        }

        const rgb = Buffer.alloc(width * height * 3);
        for (let y = 0; y < height; y++) {
            const idx = y * stride;
            for (let x = 0; x < width; x++) {
                let r = 255;
                let g = 255;
                let b = 255;
                let a = 255;

                if (colorType === 3 && plte) {
                    let pIdx = 0;
                    if (bitDepth === 8) pIdx = raw[idx + x];
                    else if (bitDepth === 4)
                        pIdx = (raw[idx + (x >> 1)] >> ((1 - (x & 1)) * 4)) & 0x0f;
                    else if (bitDepth === 2)
                        pIdx = (raw[idx + (x >> 2)] >> ((3 - (x & 3)) * 2)) & 0x03;
                    else if (bitDepth === 1)
                        pIdx = (raw[idx + (x >> 3)] >> (7 - (x & 7))) & 0x01;
                    r = plte[pIdx * 3] ?? 255;
                    g = plte[pIdx * 3 + 1] ?? 255;
                    b = plte[pIdx * 3 + 2] ?? 255;
                    if (trns && pIdx < trns.length) a = trns[pIdx];
                } else if (colorType === 6) {
                    const p = idx + x * 4;
                    r = raw[p];
                    g = raw[p + 1];
                    b = raw[p + 2];
                    a = raw[p + 3];
                } else if (colorType === 2) {
                    const p = idx + x * 3;
                    r = raw[p];
                    g = raw[p + 1];
                    b = raw[p + 2];
                } else if (colorType === 4) {
                    const p = idx + x * 2;
                    r = g = b = raw[p];
                    a = raw[p + 1];
                } else if (colorType === 0) {
                    r = g = b = raw[idx + x];
                }

                const alpha = a / 255;
                const outIdx = (y * width + x) * 3;
                rgb[outIdx] = Math.round(r * alpha + 255 * (1 - alpha));
                rgb[outIdx + 1] = Math.round(g * alpha + 255 * (1 - alpha));
                rgb[outIdx + 2] = Math.round(b * alpha + 255 * (1 - alpha));
            }
        }

        return {
            width,
            height,
            data: zlib.deflateSync(rgb),
            filter: 'FlateDecode',
            colorSpace: 'DeviceRGB'
        };
    } catch {
        return null;
    }
}

function parseImageBuffer(buf: Buffer): PdfEmbeddedImage | null {
    return parseJpeg(buf) || parsePng(buf);
}

async function loadImage(source: string): Promise<PdfEmbeddedImage | null> {
    if (!source) return null;
    if (imageMemoryCache.has(source)) {
        return imageMemoryCache.get(source) || null;
    }

    try {
        if (source.startsWith('http://') || source.startsWith('https://')) {
            const resp = await axios.get<ArrayBuffer>(source, {
                responseType: 'arraybuffer',
                timeout: 4500
            });
            const parsed = parseImageBuffer(Buffer.from(resp.data));
            imageMemoryCache.set(source, parsed);
            return parsed;
        } else if (fs.existsSync(source)) {
            const parsed = parseImageBuffer(fs.readFileSync(source));
            imageMemoryCache.set(source, parsed);
            return parsed;
        }
    } catch {
        // Ignore image fetch failure
    }
    imageMemoryCache.set(source, null);
    return null;
}

async function loadLogoImage(): Promise<PdfEmbeddedImage | null> {
    const candidates = [
        path.resolve(__dirname, '../../../assets/icono_logo_04.png'),
        path.resolve(__dirname, '../../../../../slm/public/logos/icono_logo_04.png'),
        'https://sobre-la-mesa.com/images/icons/icono_logo_04.png'
    ];
    for (const c of candidates) {
        const img = await loadImage(c);
        if (img) return img;
    }
    return null;
}

function toWinAnsiHex(text: string): string {
    const clean = String(text ?? '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\u2013|\u2014/g, '-')
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u201c|\u201d/g, '"')
        .replace(/\u2022/g, '*');
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i++) {
        const code = clean.charCodeAt(i);
        bytes.push(code <= 255 ? code : 0x3f);
    }
    return '<' + Buffer.from(bytes).toString('hex').toUpperCase() + '>';
}

function estimateCharWidth(ch: string, font: FontKey): number {
    const isBold = font === 'F2' || font === 'F4';
    const code = ch.charCodeAt(0);
    if (ch === ' ') return 0.278;
    if ('iIlj|!.,:;\''.includes(ch)) return isBold ? 0.278 : 0.222;
    if ('fJrt()-[]"'.includes(ch)) return isBold ? 0.333 : 0.278;
    if ('sckvz*?'.includes(ch)) return isBold ? 0.5 : 0.444;
    if ('abdeghnopquxy0123456789$#+-=_~'.includes(ch)) return isBold ? 0.556 : 0.556;
    if ('FTZ'.includes(ch)) return isBold ? 0.611 : 0.556;
    if ('ABCEKPSVXY&'.includes(ch)) return isBold ? 0.667 : 0.667;
    if ('CDGHNRU'.includes(ch)) return isBold ? 0.722 : 0.722;
    if ('OQ'.includes(ch)) return isBold ? 0.778 : 0.778;
    if ('mM%'.includes(ch)) return isBold ? 0.833 : 0.833;
    if ('wW@'.includes(ch)) return isBold ? 0.944 : 0.944;
    if (code >= 192 && code <= 223) return isBold ? 0.68 : 0.667; // Accented uppercase
    if (code >= 224 && code <= 255) return isBold ? 0.556 : 0.556; // Accented lowercase
    return isBold ? 0.556 : 0.52;
}

function deduplicateRepeatedAddress(raw: string): string {
    const trimmed = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!trimmed) return '';
    const words = trimmed.split(' ');
    if (words.length >= 4 && words.length % 2 === 0) {
        const half = words.length / 2;
        const firstHalf = words.slice(0, half).join(' ');
        const secondHalf = words.slice(half).join(' ');
        if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
            return firstHalf;
        }
    }
    return trimmed;
}

function measureTextWidth(text: string, fontSize: number, font: FontKey = 'F1'): number {
    let total = 0;
    const str = String(text ?? '');
    for (let i = 0; i < str.length; i++) {
        total += estimateCharWidth(str[i], font) * fontSize;
    }
    return total;
}

function wrapTextLines(text: string, maxWidth: number, fontSize: number, font: FontKey = 'F1'): string[] {
    const rawParagraphs = String(text ?? '').split('\n');
    const lines: string[] = [];

    for (const para of rawParagraphs) {
        const trimmed = para.trim();
        if (!trimmed) {
            lines.push('');
            continue;
        }
        const words = trimmed.split(/\s+/);
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (measureTextWidth(candidate, fontSize, font) <= maxWidth || !current) {
                current = candidate;
            } else {
                lines.push(current);
                current = word;
            }
        }
        if (current) lines.push(current);
    }

    return lines.length ? lines : [''];
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
    if (parts.length !== 3) return `${dateStr} ${timeStr || ''}`.trim();
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) return `${dateStr} ${timeStr || ''}`.trim();

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
    const isService =
        catUpper === CATEGORY_SECTION_LABELS[ProductCategoryId.Servicios] ||
        Number(categoriaId) === ProductCategoryId.Servicios;
    if (!isService) return false;
    const prodUpper = String(productoName || '').trim().toUpperCase();
    return SERVICE_FADED_PREFIXES.some(prefix => prodUpper.startsWith(prefix));
}

class PdfDocumentBuilder {
    private pages: string[][] = [[]];
    private images = new Map<string, { id: string; img: PdfEmbeddedImage }>();
    private imgCounter = 0;
    public y = MARGIN_T;

    get currentOps(): string[] {
        return this.pages[this.pages.length - 1];
    }

    addPage(): void {
        this.pages.push([]);
        this.y = MARGIN_T;
    }

    ensureSpace(heightNeeded: number): void {
        if (this.y + heightNeeded > PAGE_H - MARGIN_B) {
            this.addPage();
        }
    }

    private pdfY(topY: number): number {
        return Number((PAGE_H - topY).toFixed(2));
    }

    fillRect(x: number, topY: number, w: number, h: number, rgb: [number, number, number]): void {
        const [r, g, b] = rgb.map(v => Number((v / 255).toFixed(3)));
        const py = Number((PAGE_H - topY - h).toFixed(2));
        this.currentOps.push(
            `q ${r} ${g} ${b} rg ${x.toFixed(2)} ${py} ${w.toFixed(2)} ${h.toFixed(2)} re f Q`
        );
    }

    strokeRect(
        x: number,
        topY: number,
        w: number,
        h: number,
        rgb: [number, number, number] = [221, 221, 221],
        lineWidth = 0.75
    ): void {
        const [r, g, b] = rgb.map(v => Number((v / 255).toFixed(3)));
        const py = Number((PAGE_H - topY - h).toFixed(2));
        this.currentOps.push(
            `q ${lineWidth.toFixed(2)} w ${r} ${g} ${b} RG ${x.toFixed(2)} ${py} ${w.toFixed(2)} ${h.toFixed(2)} re S Q`
        );
    }

    drawLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        rgb: [number, number, number] = [0, 0, 0],
        lineWidth = 0.75
    ): void {
        const [r, g, b] = rgb.map(v => Number((v / 255).toFixed(3)));
        this.currentOps.push(
            `q ${lineWidth.toFixed(2)} w ${r} ${g} ${b} RG ${x1.toFixed(2)} ${this.pdfY(y1)} m ${x2.toFixed(2)} ${this.pdfY(y2)} l S Q`
        );
    }

    drawText(
        text: string,
        x: number,
        topBaselineY: number,
        fontSize = 8,
        font: FontKey = 'F1',
        rgb: [number, number, number] = [0, 0, 0],
        align: 'left' | 'center' | 'right' = 'left'
    ): void {
        if (!text) return;
        let drawX = x;
        if (align === 'center') {
            drawX = x - measureTextWidth(text, fontSize, font) / 2;
        } else if (align === 'right') {
            drawX = x - measureTextWidth(text, fontSize, font);
        }
        const [r, g, b] = rgb.map(v => Number((v / 255).toFixed(3)));
        this.currentOps.push(
            `BT /${font} ${fontSize.toFixed(2)} Tf ${r} ${g} ${b} rg ${drawX.toFixed(2)} ${this.pdfY(topBaselineY)} Td ${toWinAnsiHex(text)} Tj ET`
        );
    }

    registerImage(key: string, img: PdfEmbeddedImage): string {
        const existing = this.images.get(key);
        if (existing) return existing.id;
        this.imgCounter++;
        const id = `Im${this.imgCounter}`;
        this.images.set(key, { id, img });
        return id;
    }

    drawImage(
        key: string,
        img: PdfEmbeddedImage,
        boxX: number,
        boxTopY: number,
        boxW: number,
        boxH: number,
        faded = false
    ): void {
        const id = this.registerImage(key, img);
        const scale = Math.min(boxW / img.width, boxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = boxX + (boxW - drawW) / 2;
        const dyTop = boxTopY + (boxH - drawH) / 2;
        const pdfBottomY = PAGE_H - dyTop - drawH;
        const gsOp = faded ? '/GSFaded gs' : '/GSNormal gs';
        this.currentOps.push(
            `q ${gsOp} ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${dx.toFixed(2)} ${pdfBottomY.toFixed(2)} cm /${id} Do Q`
        );
    }

    toBuffer(): Buffer {
        const objects: Buffer[] = [];
        const addObj = (content: string | Buffer): number => {
            objects.push(typeof content === 'string' ? Buffer.from(content, 'binary') : content);
            return objects.length;
        };

        // 1-4: Built-in Helvetica font family with WinAnsiEncoding
        const f1Id = addObj(
            `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
        );
        const f2Id = addObj(
            `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
        );
        const f3Id = addObj(
            `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`
        );
        const f4Id = addObj(
            `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>`
        );

        // 5-6: ExtGState for normal and faded (0.2 opacity) images
        const gsNormalId = addObj(`<< /Type /ExtGState /ca 1 /CA 1 >>`);
        const gsFadedId = addObj(`<< /Type /ExtGState /ca 0.2 /CA 0.2 >>`);

        // Image XObjects
        const xObjectEntries: string[] = [];
        for (const [, { id, img }] of this.images.entries()) {
            const header = Buffer.from(
                `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /${img.colorSpace} /BitsPerComponent 8 /Filter /${img.filter} /Length ${img.data.length} >>\nstream\n`,
                'binary'
            );
            const footer = Buffer.from(`\nendstream`, 'binary');
            const imgObjId = addObj(Buffer.concat([header, img.data, footer]));
            xObjectEntries.push(`/${id} ${imgObjId} 0 R`);
        }

        const resourcesDict = `<< /Font << /F1 ${f1Id} 0 R /F2 ${f2Id} 0 R /F3 ${f3Id} 0 R /F4 ${f4Id} 0 R >> /ExtGState << /GSNormal ${gsNormalId} 0 R /GSFaded ${gsFadedId} 0 R >> /XObject << ${xObjectEntries.join(' ')} >> >>`;
        const resourcesId = addObj(resourcesDict);

        // Reserve Pages tree object
        const pagesTreeIndex = objects.length;
        addObj('');

        const pageObjIds: number[] = [];
        for (const pageOps of this.pages) {
            const streamData = Buffer.from(pageOps.join('\n'), 'binary');
            const compressed = zlib.deflateSync(streamData);
            const contentHeader = Buffer.from(
                `<< /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`,
                'binary'
            );
            const contentFooter = Buffer.from(`\nendstream`, 'binary');
            const contentId = addObj(Buffer.concat([contentHeader, compressed, contentFooter]));

            const pageId = addObj(
                `<< /Type /Page /Parent ${pagesTreeIndex + 1} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources ${resourcesId} 0 R /Contents ${contentId} 0 R >>`
            );
            pageObjIds.push(pageId);
        }

        objects[pagesTreeIndex] = Buffer.from(
            `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`,
            'binary'
        );

        const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesTreeIndex + 1} 0 R >>`);

        const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', 'binary')];
        const offsets: number[] = [];
        let currentOffset = chunks[0].length;

        for (let i = 0; i < objects.length; i++) {
            offsets.push(currentOffset);
            const objHeader = Buffer.from(`${i + 1} 0 obj\n`, 'binary');
            const objFooter = Buffer.from(`\nendobj\n`, 'binary');
            chunks.push(objHeader, objects[i], objFooter);
            currentOffset += objHeader.length + objects[i].length + objFooter.length;
        }

        const xrefOffset = currentOffset;
        const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
        for (const off of offsets) {
            xrefLines.push(`${String(off).padStart(10, '0')} 00000 n \n`);
        }
        xrefLines.push(
            `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
        );
        chunks.push(Buffer.from(xrefLines.join(''), 'binary'));

        return Buffer.concat(chunks);
    }
}

export async function generateNativeEventPdfBuffer(
    detail: EventDetailResponse,
    mode: PdfReportMode = 'con-iva'
): Promise<Buffer> {
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

    let domEntrega = deduplicateRepeatedAddress(ev.domicilio_entrega || '');
    const lugarEntregaDir = deduplicateRepeatedAddress(ev.lugar_entrega_direccion || '');
    if (
        domEntrega &&
        lugarEntregaDir &&
        !domEntrega.toLowerCase().includes(lugarEntregaDir.toLowerCase())
    ) {
        domEntrega = `${domEntrega} ${lugarEntregaDir}`;
    }

    let domRecoleccion = deduplicateRepeatedAddress(ev.domicilio_recoleccion || '');
    const lugarRecoDir = deduplicateRepeatedAddress(ev.lugar_recoleccion_direccion || '');
    if (
        domRecoleccion &&
        lugarRecoDir &&
        !domRecoleccion.toLowerCase().includes(lugarRecoDir.toLowerCase())
    ) {
        domRecoleccion = `${domRecoleccion} ${lugarRecoDir}`;
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

    // Preload logo + product images in parallel
    const defaultImgUrl = 'https://sobre-la-mesa.com/images/productos/default_vacio-min.png';
    const uniqueImageNames = Array.from(
        new Set(products.map(p => p.imagen).filter(Boolean) as string[])
    );

    const [logoImg, defaultProdImg, ...loadedProdImages] = await Promise.all([
        loadLogoImage(),
        loadImage(defaultImgUrl),
        ...uniqueImageNames.map(imgName =>
            loadImage(`https://sobre-la-mesa.com/images/productos/${encodeURIComponent(imgName)}`)
        )
    ]);

    const prodImgMap = new Map<string, PdfEmbeddedImage>();
    uniqueImageNames.forEach((name, idx) => {
        if (loadedProdImages[idx]) {
            prodImgMap.set(name, loadedProdImages[idx]!);
        }
    });

    const pdf = new PdfDocumentBuilder();

    // Helper: Draw Header for Cotización (con-iva, sin-iva, logistica)
    const drawCotizacionHeader = () => {
        // Title: Cotización #00XXXX
        pdf.drawText(
            `Cotización #${noCotizacion}`,
            MARGIN_L + CONTENT_W,
            pdf.y + 14,
            14,
            'F1',
            [0, 0, 0],
            'right'
        );
        pdf.y += 22;

        const c1W = 135;
        const c2W = 10;
        const c3W = 185;
        const c4W = CONTENT_W - c1W - c2W - c3W; // ~208.58 pt

        const x1 = MARGIN_L;
        const x2 = x1 + c1W;
        const x3 = x2 + c2W;
        const x4 = x3 + c3W;

        const dateBlocks = [
            `Fecha que SLM Entrega: ${fechaEntregaDesc}`,
            `Fecha de Evento: ${fechaEventoDesc}`,
            `Fecha que SLM Recolección: ${fechaRecoDesc}`
        ];
        const wrappedDateBlocks = dateBlocks.map(b => wrapTextLines(b, c4W - 12, 7.5, 'F1'));
        const totalDateLines = wrappedDateBlocks.reduce((acc, lines) => acc + lines.length, 0);

        const r1H = Math.max(84, totalDateLines * 9.5 + 22);
        const r1Top = pdf.y;

        // Row 1 Col 1: Logo
        if (logoImg) {
            pdf.drawImage('logo', logoImg, x1 + 6, r1Top + 4, c1W - 12, r1H - 8);
        } else {
            pdf.drawText('SOBRE LA MESA', x1 + c1W / 2, r1Top + 42, 13, 'F2', [0, 0, 0], 'center');
        }

        // Row 1 Col 2: Vertical black separator on left edge
        pdf.drawLine(x2, r1Top, x2, r1Top + r1H, [0, 0, 0], 0.9);

        // Row 1 Col 3: Client info
        let cy = r1Top + 16;
        const clientTitle = fullName || empresa;
        const companyLine = empresa || fullName;
        for (const line of wrapTextLines(clientTitle, c3W - 12, 8, 'F2').slice(0, 2)) {
            pdf.drawText(line, x3 + 6, cy, 8, 'F2');
            cy += 11;
        }
        for (const line of wrapTextLines(companyLine, c3W - 12, 8, 'F1').slice(0, 1)) {
            pdf.drawText(line, x3 + 6, cy, 8, 'F1');
            cy += 11;
        }
        pdf.drawText('Telefono: ', x3 + 6, cy, 8, 'F2');
        pdf.drawText(
            String(numTel),
            x3 + 6 + measureTextWidth('Telefono: ', 8, 'F2'),
            cy,
            8,
            'F1'
        );
        cy += 11;

        pdf.drawText('Email: ', x3 + 6, cy, 8, 'F2');
        const emailMaxW = c3W - 12 - measureTextWidth('Email: ', 8, 'F2');
        const emailLines = wrapTextLines(email, emailMaxW, 8, 'F1');
        pdf.drawText(emailLines[0] || '', x3 + 6 + measureTextWidth('Email: ', 8, 'F2'), cy, 8, 'F1');
        cy += 14;

        if (eventoName) {
            pdf.drawText(eventoName, x3 + 6, cy, 10, 'F2');
        }

        // Row 1 Col 4: Dates (left border #ddd, centered text)
        pdf.drawLine(x4, r1Top, x4, r1Top + r1H, [221, 221, 221], 0.75);
        let dy = r1Top + 14;
        for (const lines of wrappedDateBlocks) {
            for (const ln of lines) {
                pdf.drawText(ln, x4 + c4W / 2, dy, 7.5, 'F1', [0, 0, 0], 'center');
                dy += 9.5;
            }
            dy += 3.5;
        }

        // Row 2: Calculate height dynamically based on address wrapping
        const entregaLines = wrapTextLines(`Lugar de Entrega: ${domEntrega}`, c4W - 12, 7.5, 'F3');
        const recoLines = wrapTextLines(`Lugar de Recolección: ${domRecoleccion}`, c4W - 12, 7.5, 'F3');
        const r2H = Math.max(58, (entregaLines.length + recoLines.length) * 9.5 + 16);
        const r2Top = r1Top + r1H;

        // Row 2 Col 1: Fecha de Cotización & TABLE SOLVER
        pdf.fillRect(x1, r2Top, c1W, r2H, [248, 249, 250]);
        pdf.strokeRect(x1, r2Top, c1W, r2H, [221, 221, 221], 0.75);
        pdf.drawLine(x1, r2Top + r2H, x1 + c1W, r2Top + r2H, [0, 0, 0], 0.9);

        pdf.drawText(`Fecha de Cotización: ${fechaCotizacionClean}`, x1 + 6, r2Top + 16, 8, 'F2');
        const solverLines = wrapTextLines(`TABLE SOLVER: ${agentName}`, c1W - 12, 8, 'F2');
        let sy = r2Top + 32;
        for (const sl of solverLines) {
            pdf.drawText(sl, x1 + 6, sy, 8, 'F2');
            sy += 10;
        }

        // Row 2 Cols 2, 3, 4: Horizontal black separator line at top
        pdf.drawLine(x2, r2Top, MARGIN_L + CONTENT_W, r2Top, [0, 0, 0], 0.9);

        // Row 2 Col 4: Addresses
        let ay = r2Top + 13;
        for (let i = 0; i < entregaLines.length; i++) {
            pdf.drawText(entregaLines[i], x4 + 6, ay, 7.5, i === 0 ? 'F4' : 'F3');
            ay += 9.5;
        }
        ay += 2;
        for (let i = 0; i < recoLines.length; i++) {
            pdf.drawText(recoLines[i], x4 + 6, ay, 7.5, i === 0 ? 'F4' : 'F3');
            ay += 9.5;
        }

        pdf.y = r2Top + r2H + 16;
    };

    // MODE 1: LOGÍSTICA (logistica_pdf.blade.php)
    if (mode === 'logistica') {
        drawCotizacionHeader();
        pdf.y += 16;
        pdf.drawText('Comentarios:', MARGIN_L, pdf.y + 12, 11, 'F2');
        pdf.y += 85;
        pdf.drawText(
            'Confirmo que tanto las fechas como las direcciones de entrega y recolección son correctas',
            MARGIN_L,
            pdf.y + 12,
            10.5,
            'F1'
        );
        pdf.y += 45;
        pdf.drawText('________________________________', MARGIN_L, pdf.y + 12, 11, 'F2');
        pdf.y += 18;
        pdf.drawText('Nombre y Firma', MARGIN_L, pdf.y + 10, 9.5, 'F1');
        return pdf.toBuffer();
    }

    // MODE 2: REMISIÓN (remision.blade.php)
    if (mode === 'remision') {
        const col1W = 160;
        const col2W = 175;
        const col3W = CONTENT_W - col1W - col2W;
        const rx1 = MARGIN_L;
        const rx2 = rx1 + col1W;
        const rx3 = rx2 + col2W;
        const r1H = 95;
        const topY = pdf.y;

        pdf.strokeRect(rx1, topY, col1W, r1H, [235, 235, 235]);
        pdf.strokeRect(rx2, topY, col2W, r1H, [235, 235, 235]);
        pdf.strokeRect(rx3, topY, col3W, r1H, [235, 235, 235]);

        if (logoImg) {
            pdf.drawImage('logo', logoImg, rx1 + 10, topY + 8, col1W - 20, r1H - 16);
        }

        let cy = topY + 18;
        pdf.drawText('Sobre la Mesa', rx2 + 8, cy, 8.5, 'F1');
        cy += 12;
        pdf.drawText('BNM191003N42', rx2 + 8, cy, 8.5, 'F2');
        cy += 11;
        pdf.drawText('Zempoala #388', rx2 + 8, cy, 8, 'F3');
        cy += 10;
        pdf.drawText('Col. Narvarte Oriente', rx2 + 8, cy, 8, 'F3');
        cy += 10;
        pdf.drawText('Ciudad de México (MX)', rx2 + 8, cy, 8, 'F3');
        cy += 10;
        pdf.drawText('CP. 03023', rx2 + 8, cy, 8, 'F3');

        let ry = topY + 14;
        pdf.drawText('No. de Cotización', rx3 + 8, ry, 8, 'F2');
        ry += 16;
        pdf.drawText(`#${noCotizacion}`, rx3 + 8, ry, 14, 'F1');
        ry += 12;
        pdf.drawText('Fecha de Entrega:', rx3 + 8, ry, 7.5, 'F2');
        ry += 9;
        pdf.drawText(fechaEntregaDesc, rx3 + 8, ry, 7, 'F1');
        ry += 10;
        pdf.drawText('Fecha de Evento:', rx3 + 8, ry, 7.5, 'F2');
        ry += 9;
        pdf.drawText(fechaEventoDesc, rx3 + 8, ry, 7, 'F1');
        ry += 10;
        pdf.drawText('Fecha de Recolección:', rx3 + 8, ry, 7.5, 'F2');
        ry += 9;
        pdf.drawText(fechaRecoDesc, rx3 + 8, ry, 7, 'F1');

        const r2Top = topY + r1H;
        const r2H = 86;
        pdf.strokeRect(rx1, r2Top, col1W, r2H, [235, 235, 235]);
        pdf.strokeRect(rx2, r2Top, col2W + col3W, r2H, [235, 235, 235]);

        let ly = r2Top + 18;
        pdf.drawText('FECHA DE COTIZACIÓN:', rx1 + 8, ly, 8, 'F2');
        ly += 10;
        for (const ln of wrapTextLines(fechaCotDesc, col1W - 16, 7.5, 'F1')) {
            pdf.drawText(ln, rx1 + 8, ly, 7.5, 'F1');
            ly += 9.5;
        }
        ly += 6;
        pdf.drawText('TABLE SOLVER:', rx1 + 8, ly, 8, 'F2');
        ly += 10;
        pdf.drawText(agentName, rx1 + 8, ly, 8, 'F1');

        let r2y = r2Top + 14;
        pdf.drawText(fullName || empresa, rx2 + 8, r2y, 8.5, 'F2');
        r2y += 10;
        pdf.drawText(empresa || fullName, rx2 + 8, r2y, 8, 'F1');
        r2y += 11;
        for (const ln of wrapTextLines(`Domicilio de Entrega: ${domEntrega}`, col2W + col3W - 16, 7.5, 'F3').slice(0, 2)) {
            pdf.drawText(ln, rx2 + 8, r2y, 7.5, 'F3');
            r2y += 9;
        }
        for (const ln of wrapTextLines(`Domicilio de Recoleccion: ${domRecoleccion}`, col2W + col3W - 16, 7.5, 'F3').slice(0, 2)) {
            pdf.drawText(ln, rx2 + 8, r2y, 7.5, 'F3');
            r2y += 9;
        }
        pdf.drawText(`Telefono: ${numTel}   Email: ${email}`, rx2 + 8, r2y, 7.5, 'F1');
        r2y += 9;
        pdf.drawText(`Tipo de Evento: ${eventoName}`, rx2 + 8, r2y, 7.5, 'F2');

        pdf.y = r2Top + r2H + 14;

        // Remisión Table (5 columns)
        const remCols = [44, 88, 256, 70, CONTENT_W - 458];
        const remHeaders = ['Número', 'Imagen', 'Descripción', 'Cantidad', 'Recibido'];
        const drawRemHeader = () => {
            let cx = MARGIN_L;
            for (let i = 0; i < remCols.length; i++) {
                pdf.fillRect(cx, pdf.y, remCols[i], 20, [211, 211, 211]);
                pdf.strokeRect(cx, pdf.y, remCols[i], 20, [221, 221, 221]);
                pdf.drawText(remHeaders[i], cx + 6, pdf.y + 13, 8, 'F2');
                cx += remCols[i];
            }
            pdf.y += 20;
        };
        drawRemHeader();

        let count = 0;
        for (const item of unifiedItems) {
            if (item._kind === 'content') {
                const isNote = Number(item.type) === QuoteRowType.Note;
                const lines = wrapTextLines(item.content_seccion || '', CONTENT_W - 20, isNote ? 8.5 : 9.5, isNote ? 'F2' : 'F4');
                const rh = Math.max(20, lines.length * 12 + 8);
                pdf.ensureSpace(rh);
                pdf.fillRect(MARGIN_L, pdf.y, CONTENT_W, rh, [211, 211, 211]);
                pdf.strokeRect(MARGIN_L, pdf.y, CONTENT_W, rh, [221, 221, 221]);
                let ty = pdf.y + 13;
                for (const ln of lines) {
                    pdf.drawText(
                        isNote ? ln : ln.toUpperCase(),
                        MARGIN_L + CONTENT_W / 2,
                        ty,
                        isNote ? 8.5 : 9.5,
                        isNote ? 'F2' : 'F4',
                        [0, 0, 0],
                        'center'
                    );
                    ty += 12;
                }
                pdf.y += rh;
                continue;
            }

            count++;
            const prodLines = wrapTextLines(item.producto || '', remCols[2] - 12, 8, 'F1');
            const medLines = wrapTextLines(item.medidas || 'No disponible', remCols[2] - 12, 7.5, 'F1');
            const descH = (prodLines.length + medLines.length + 2) * 10 + 12;
            const rowH = Math.max(82, descH);

            if (pdf.y + rowH > PAGE_H - MARGIN_B) {
                pdf.addPage();
                drawRemHeader();
            }

            let cx = MARGIN_L;
            for (let i = 0; i < remCols.length; i++) {
                pdf.strokeRect(cx, pdf.y, remCols[i], rowH, [221, 221, 221]);
                cx += remCols[i];
            }

            pdf.drawText(String(count), MARGIN_L + 6, pdf.y + 14, 8, 'F2');

            const imgX = MARGIN_L + remCols[0];
            const pImg = (item.imagen && prodImgMap.get(item.imagen)) || defaultProdImg;
            if (pImg) {
                pdf.drawImage(item.imagen || 'default', pImg, imgX + 14, pdf.y + 4, 54, 54, false);
            }
            const repoPrice = Number(item.precio_reposicion) || 0;
            pdf.drawText('Reposición c/u:', imgX + 6, pdf.y + 66, 7, 'F1');
            pdf.drawText(
                repoPrice !== 0 ? `$${formatMoney(repoPrice)}` : '$0',
                imgX + 6,
                pdf.y + 75,
                7,
                'F1'
            );

            const descX = imgX + remCols[1];
            let dy = pdf.y + 14;
            for (const ln of prodLines) {
                pdf.drawText(ln, descX + 6, dy, 8, 'F1');
                dy += 10;
            }
            dy += 6;
            pdf.drawText('Medidas:', descX + 6, dy, 8, 'F2');
            dy += 10;
            for (const ln of medLines) {
                pdf.drawText(ln, descX + 6, dy, 7.5, 'F1');
                dy += 9.5;
            }

            const qtyX = descX + remCols[2];
            pdf.drawText(String(Number(item.cantidad) || 0), qtyX + 8, pdf.y + 14, 8, 'F1');

            pdf.y += rowH;
        }

        pdf.ensureSpace(90);
        pdf.y += 24;
        pdf.drawText('Cajas: _______________', MARGIN_L, pdf.y, 9, 'F2');
        pdf.y += 18;
        pdf.drawText('Cambros: ____________', MARGIN_L, pdf.y, 9, 'F2');
        pdf.y += 28;
        pdf.drawText(
            `Nombre y Firma #${noCotizacion}`,
            MARGIN_L + CONTENT_W,
            pdf.y,
            11,
            'F2',
            [0, 0, 0],
            'right'
        );

        return pdf.toBuffer();
    }

    // MODE 3: COTIZACIÓN CON IVA / SIN IVA (cotizacion.blade.php / cotizacion_sin_iva.blade.php)
    drawCotizacionHeader();

    const isDescuento = products.some(p => Number(p.descuento) !== 0);
    const colWidths = isDescuento
        ? [38, 78, 162, 44, 58, 34, 52, CONTENT_W - 466]
        : [42, 82, 194, 48, 62, 38, CONTENT_W - 466];
    const colHeaders = isDescuento
        ? ['Número', 'Imagen', 'Descripción', 'Cantidad', 'Precio', 'Días', 'Descuento', 'Subtotal']
        : ['Número', 'Imagen', 'Descripción', 'Cantidad', 'Precio', 'Días', 'Subtotal'];

    const drawProductsTableHeader = () => {
        let cx = MARGIN_L;
        for (let i = 0; i < colWidths.length; i++) {
            pdf.fillRect(cx, pdf.y, colWidths[i], 20, [211, 211, 211]);
            pdf.strokeRect(cx, pdf.y, colWidths[i], 20, [221, 221, 221]);
            pdf.drawText(colHeaders[i], cx + 5, pdf.y + 13, 8, 'F2');
            cx += colWidths[i];
        }
        pdf.y += 20;
    };

    drawProductsTableHeader();

    let subtotal = 0;
    let subtotalSnDesc = 0;
    let costoServicios = 0;
    let prodCounter = 0;

    for (const item of unifiedItems) {
        if (item._kind === 'content') {
            const isNote = Number(item.type) === QuoteRowType.Note;
            const fontKey: FontKey = isNote ? 'F2' : 'F4';
            const fSize = isNote ? 8.5 : 9.5;
            const textStr = isNote
                ? String(item.content_seccion || '')
                : String(item.content_seccion || '').toUpperCase();
            const lines = wrapTextLines(textStr, CONTENT_W - 24, fSize, fontKey);
            const rowH = Math.max(20, lines.length * 12 + 8);

            if (pdf.y + rowH > PAGE_H - MARGIN_B) {
                pdf.addPage();
                drawProductsTableHeader();
            }

            if (isNote) {
                pdf.fillRect(MARGIN_L, pdf.y, CONTENT_W, rowH, [255, 255, 255]);
                pdf.strokeRect(MARGIN_L, pdf.y, CONTENT_W, rowH, [0, 0, 0], 0.9);
            } else {
                pdf.fillRect(MARGIN_L, pdf.y, CONTENT_W, rowH, [211, 211, 211]);
                pdf.strokeRect(MARGIN_L, pdf.y, CONTENT_W, rowH, [221, 221, 221], 0.75);
            }

            let ty = pdf.y + 13;
            for (const ln of lines) {
                pdf.drawText(
                    ln,
                    MARGIN_L + CONTENT_W / 2,
                    ty,
                    fSize,
                    fontKey,
                    isNote ? [63, 63, 63] : [0, 0, 0],
                    'center'
                );
                ty += 12;
            }
            pdf.y += rowH;
            continue;
        }

        prodCounter++;
        const cantidad = Number(item.cantidad) || 0;
        const precioRenta = Number(item.precio_producto ?? item.precio_renta) || 0;
        const dias = Number(item.dias) || 1;
        const descuento = Number(item.descuento) || 0;
        const precioRepo = Number(item.precio_reposicion) || 0;

        const catUpper = String(item.categoria || '').trim().toUpperCase();
        const isService =
            catUpper === CATEGORY_SECTION_LABELS[ProductCategoryId.Servicios] ||
            Number(item.categoria_producto_id) === ProductCategoryId.Servicios;
        if (isService) {
            if (!descuento) {
                costoServicios += cantidad * precioRenta;
            } else {
                const porcentaje = descuento / 100;
                const resta = cantidad * precioRenta * porcentaje;
                costoServicios += cantidad * precioRenta - resta;
            }
        }

        const multi = cantidad * precioRenta * dias;
        subtotalSnDesc += multi;

        let lineSubtotal = multi;
        if (!descuento) {
            subtotal += multi;
        } else {
            const porcentaje = descuento / 100;
            const resta = multi * porcentaje;
            lineSubtotal = multi - resta;
            subtotal += lineSubtotal;
        }

        const prodLines = wrapTextLines(item.producto || '', colWidths[2] - 12, 8, 'F1');
        const medLines = wrapTextLines(item.medidas || 'No disponible', colWidths[2] - 12, 7.5, 'F1');
        const descHeight = (prodLines.length + medLines.length + 2) * 9.5 + 14;
        const imgHeight = precioRepo !== 0 ? 78 : 60;
        const rowH = Math.max(imgHeight, descHeight);

        if (pdf.y + rowH > PAGE_H - MARGIN_B) {
            pdf.addPage();
            drawProductsTableHeader();
        }

        const rowBg: [number, number, number] = prodCounter % 2 === 1 ? [249, 249, 249] : [255, 255, 255];
        pdf.fillRect(MARGIN_L, pdf.y, CONTENT_W, rowH, rowBg);
        // Highlight first column (#f8f9fa)
        pdf.fillRect(MARGIN_L, pdf.y, colWidths[0], rowH, [248, 249, 250]);

        let cx = MARGIN_L;
        for (let i = 0; i < colWidths.length; i++) {
            pdf.strokeRect(cx, pdf.y, colWidths[i], rowH, [221, 221, 221], 0.75);
            cx += colWidths[i];
        }

        // Col 0: Número
        pdf.drawText(String(prodCounter), MARGIN_L + 6, pdf.y + 14, 8, 'F2');

        // Col 1: Imagen + Reposición c/u
        const col1X = MARGIN_L + colWidths[0];
        const faded = isFadedServiceProduct(item.categoria, item.producto, item.categoria_producto_id);
        const pImg = (item.imagen && prodImgMap.get(item.imagen)) || defaultProdImg;
        if (pImg) {
            pdf.drawImage(
                item.imagen || 'default',
                pImg,
                col1X + (colWidths[1] - 50) / 2,
                pdf.y + 4,
                50,
                50,
                faded
            );
        }
        if (precioRepo !== 0) {
            pdf.drawText('Reposición c/u:', col1X + 5, pdf.y + 62, 7, 'F1');
            pdf.drawText(`$${formatMoney(precioRepo)}`, col1X + 5, pdf.y + 71, 7, 'F1');
        }

        // Col 2: Descripción + Medidas
        const col2X = col1X + colWidths[1];
        let dy = pdf.y + 13;
        for (const ln of prodLines) {
            pdf.drawText(ln, col2X + 6, dy, 8, 'F1');
            dy += 9.5;
        }
        dy += 6;
        pdf.drawText('Medidas:', col2X + 6, dy, 8, 'F2');
        dy += 9.5;
        for (const ln of medLines) {
            pdf.drawText(ln, col2X + 6, dy, 7.5, 'F1');
            dy += 9;
        }

        // Col 3: Cantidad
        const col3X = col2X + colWidths[2];
        pdf.drawText(String(cantidad), col3X + 6, pdf.y + 14, 8, 'F1');

        // Col 4: Precio
        const col4X = col3X + colWidths[3];
        if (descuento > 0) {
            const origStr = `$${formatMoney(precioRenta)}`;
            const newPrice = precioRenta * (100 - descuento) * 0.01;
            pdf.drawText(origStr, col4X + 5, pdf.y + 14, 7.5, 'F1');
            const strikeW = measureTextWidth(origStr, 7.5, 'F1');
            pdf.drawLine(col4X + 5, pdf.y + 11.5, col4X + 5 + strikeW, pdf.y + 11.5, [0, 0, 0], 0.6);
            pdf.drawText(`$${formatMoney(newPrice)}`, col4X + 5, pdf.y + 24, 8, 'F1');
        } else {
            pdf.drawText(`$${formatMoney(precioRenta)}`, col4X + 5, pdf.y + 14, 8, 'F1');
        }

        // Col 5: Días
        const col5X = col4X + colWidths[4];
        pdf.drawText(String(dias), col5X + 6, pdf.y + 14, 8, 'F1');

        // Col 6/7: Descuento (if any) & Subtotal
        if (isDescuento) {
            const col6X = col5X + colWidths[5];
            pdf.drawText(`${descuento}%`, col6X + 6, pdf.y + 14, 8, 'F1');
            const col7X = col6X + colWidths[6];
            pdf.drawText(`$${formatMoney(lineSubtotal)}`, col7X + 5, pdf.y + 14, 8, 'F1');
        } else {
            const col6X = col5X + colWidths[5];
            pdf.drawText(`$${formatMoney(lineSubtotal)}`, col6X + 5, pdf.y + 14, 8, 'F1');
        }

        pdf.y += rowH;
    }

    // Totals Table
    pdf.y += 10;
    const precioSinIva = subtotal / 1.16;
    const iva = precioSinIva * 0.16;
    const descuentoEvento = Number(ev.descuento) || 0;
    const totalDescuento = descuentoEvento !== 0 ? subtotal * (descuentoEvento / 100) : 0;

    let deposito = subtotalSnDesc * 0.35;
    if (costoServicios !== 0) {
        const depo = subtotalSnDesc - costoServicios;
        deposito = depo * 0.35;
    }

    const total =
        descuentoEvento === 0 ? subtotal + deposito : subtotal - totalDescuento + deposito;

    const totalsRows: Array<[string, string]> = [];
    if (mode === 'sin-iva') {
        totalsRows.push(['Total sin IVA:', `$${formatMoney(subtotal - iva)}`]);
        totalsRows.push(['Iva desglosado', `$${formatMoney(iva)}`]);
        totalsRows.push(['Total con IVA:', `$${formatMoney(subtotal)}`]);
    } else {
        totalsRows.push(['Total con IVA:', `$${formatMoney(subtotal)}`]);
        totalsRows.push(['Iva desglosado', `$${formatMoney(iva)}`]);
    }
    if (descuentoEvento !== 0) {
        totalsRows.push(['Descuento:', `-$${formatMoney(totalDescuento)}`]);
    }
    totalsRows.push(['Depósito en garantía:', `$${formatMoney(deposito)}`]);
    totalsRows.push(['Total', `$${formatMoney(total)}`]);

    const totRowH = 18;
    pdf.ensureSpace(totalsRows.length * totRowH + 16);
    const halfW = CONTENT_W / 2;

    totalsRows.forEach(([label, val], idx) => {
        const rowBg: [number, number, number] = idx % 2 === 0 ? [249, 249, 249] : [255, 255, 255];
        pdf.fillRect(MARGIN_L, pdf.y, CONTENT_W, totRowH, rowBg);
        pdf.fillRect(MARGIN_L, pdf.y, halfW, totRowH, [242, 242, 242]);
        pdf.strokeRect(MARGIN_L, pdf.y, halfW, totRowH, [221, 221, 221]);
        pdf.strokeRect(MARGIN_L + halfW, pdf.y, halfW, totRowH, [221, 221, 221]);
        pdf.drawText(label, MARGIN_L + 6, pdf.y + 12, 8, 'F2');
        pdf.drawText(val, MARGIN_L + CONTENT_W - 6, pdf.y + 12, 8, 'F1', [0, 0, 0], 'right');
        pdf.y += totRowH;
    });

    // Policies Section
    pdf.y += 16;
    pdf.ensureSpace(60);
    pdf.drawText(
        'Políticas Sobre la Mesa',
        MARGIN_L + CONTENT_W / 2,
        pdf.y + 10,
        10,
        'F2',
        [0, 0, 0],
        'center'
    );
    pdf.y += 18;

    const policySections: Array<{ title?: string; lines: string[] }> = [
        {
            title: 'CONFIRMACIÓN',
            lines: [
                '*Cuando el cliente autorice la cotización deberá aceptarla y firmarla desde el link enviado por su Table Solver, de lo contrario se considerará como no aceptada y no podrá salir el equipo de bodega.',
                '*Para reservar el equipo se requiere pagar un 50% de anticipo y liquidar la totalidad por lo menos 5 días antes del evento; de lo contrario, no se podrá entregar el equipo.',
                '*Sin anticipo no se puede asegurar la disponibilidad del equipo y/o mobiliario.',
                '*No existen reembolsos ni devoluciones. En cancelaciones o casos en los que no se realice el evento y ya esté pagado un anticipo o haya sido liquidado en su totalidad, el monto se tomará como saldo a favor con vigencia de un año (desde la fecha del evento) para eventos próximos.',
                '*Cualquier cancelación debe realizarse 72 horas antes del evento; de lo contrario, el importe liquidado no se tomará a cuenta como saldo a favor.',
                '*Los cambios en la cotización deben hacerse dos días antes del evento; de lo contrario, será imposible modificar la cotización.'
            ]
        },
        {
            title: 'FORMAS DE PAGO:',
            lines: [
                'Efectivo o transferencia.',
                'Los datos para facturar son los siguientes:',
                'Bienvenido a Nuestra Mesa SAS de CV',
                'RFC: BNM191003N42',
                'Banco: BBVA',
                'Número de cuenta: 0114119266',
                'CLABE INTERBANCARIA: 012180001141192661',
                '*Por favor, envía el comprobante de pago con tu número de cotización al correo: contabilidad@sobrelamesa.mx y al correo de tu Table Solver para que este confirme de recibido; de lo contrario, se tomará como evento no liquidado.',
                '*En caso de pago con cheque es indispensable hacerlo 5 días hábiles antes del evento; de lo contrario, se tomará como evento no liquidado.'
            ]
        },
        {
            lines: [
                'Para realizar tu factura, por favor envía los siguientes datos:',
                'Nombre RFC',
                'Dirección con colonia',
                'Código postal',
                'Correo',
                'Gastos generales o por definir',
                'N° DE REFERENCIA BANCARIA PARA REALIZAR SU PAGO:'
            ]
        },
        {
            title: 'NOTAS IMPORTANTES:',
            lines: [
                '*Nuestros choferes y Table Solvers no están autorizados para recibir dinero. Los pagos en efectivo deben realizarse en nuestra oficina con el área de contabilidad ubicadas en Zempoala 388 Col. Narvarte, de Lunes a Viernes de 10:00-14:00 y de 15:00-18:00.',
                '*El depósito en garantía se reembolsa a más tardar una semana después de la devolución del equipo (es importante contar con los datos bancarios para la devolución), una vez que el responsable de bodega haya revisado y confirmado el buen estado del mismo.',
                '*Debido a la medición manual, puede llegar a haber una ligera diferencia entre el tamaño del artículo anterior y el real.',
                '*Debido a la visualización y los efectos de iluminación, la configuración del monitor, etc., puede llegar a haber una pequeña diferencia de color aceptable; por favor, téngalo en cuenta.'
            ]
        },
        {
            title: 'ENTREGA Y RECOLECCIÓN',
            lines: [
                '*El cliente es el único responsable de la renta del equipo; en caso de que al momento de entregar este no se encuentre presente, puede asignar a una persona encargada para recibirlo sin perder la responsabilidad del mismo.',
                '*Al momento de entrega del equipo, el cliente o un encargado designado por el mismo deberá encontrarse en el lugar del evento para recibir el equipo, contarlo, revisarlo y firmar la orden de trabajo, escribiendo abajo de la firma la siguiente frase: "Recibo equipo limpio, completo y en buen estado"; de lo contrario, no se podrá dejar el equipo.',
                '*El personal no está autorizado a mover, limpiar o cargar cosas ajenas al equipo de Sobre la Mesa; si el cliente requiere algún movimiento será bajo su responsabilidad.',
                '*Montajes y desmontajes en días festivos causan un incremento del 20% en el costo de flete.',
                '*Horarios de entrega y recolección deberán coordinarse directamente con su Table Solver, nunca con los choferes.',
                '*Es responsabilidad del cliente revisar que el equipo se encuentre completo, limpio y en buen estado al recibirlo; en caso de existir alguna discrepancia debe notificarlo a su Table Solver. Después de la entrega, NO NOS HACEMOS RESPONSABLES por faltantes o roturas y el equipo deberá ser cubierto en su costo de reposición marcado en esta cotización.',
                '*El horario de entrega y recolección de equipo en nuestra bodega es de Lunes a Viernes de 10:00 a 14:00 y de 15:00 a 17:30 hrs., y el horario sabatino es de 10:00 a 13:00 hrs.',
                '*Se considera como HORARIO EXTRAORDINARIO: Antes de las 9:00 am o después de las 18:00 hrs. O si se requiere un rango específico, la entrega o recolección del equipo tendrá un costo adicional. Para poder recoger el equipo en bodega es necesario enviar comprobante de domicilio no mayor a tres meses y su identificación oficial a su Table Solver; de lo contrario, no se podrá rentar el equipo.',
                '*En caso de requerir la entrega del equipo un día antes del evento, será en horario abierto.',
                '*En caso de que el cliente no reciba o devuelva el equipo en horarios pactados, se deberá pagar flete y renta adicional.',
                '*Por higiene, se deberá devolver el equipo limpio para desinfección; en caso de no devolver el equipo limpio, se deberá pagar lavado.',
                '*El cliente se hace responsable al 100% de los daños causados al equipo alquilado, así como pérdidas causadas al equipo de Sobre la Mesa.',
                '*En caso de manchar o dañar la mantelería con cera, quemaduras, papel china, etc., esta se tomará como pérdida y deberá pagarse al precio mencionado en la cotización como Reposición.',
                '*En cuanto a la renta de mobiliario, es responsabilidad del cliente resguardar el equipo en caso de lluvia.',
                '*En caso de que el lugar de entrega no tenga accesos amplios, haya más de 20 metros del lugar de descarga al lugar de entrega, no cuente con elevador o se tengan que subir o bajar pisos por escaleras, se tomará como maniobra y tendrá un costo adicional.',
                '*Nuestro personal no está autorizado para esperar más de 15 minutos para proceder a la entrega o recolección del equipo; la fracción u hora adicional de espera tendrá un costo adicional de $250 pesos.',
                '*Serán causantes de penalización los montajes y desmontajes que no se realicen en los términos acordados con el cliente o en los que no se dé acceso para la entrega o recolección del mobiliario en horario y día pactado.'
            ]
        },
        {
            title: 'Plazo de pago:',
            lines: ['50% al inicio y 5 días antes del evento.']
        }
    ];

    for (const sec of policySections) {
        if (sec.title) {
            pdf.ensureSpace(14);
            pdf.drawText(sec.title, MARGIN_L, pdf.y + 8, 7.5, 'F2');
            pdf.y += 10;
        }
        for (const pLine of sec.lines) {
            const wrapped = wrapTextLines(pLine, CONTENT_W, 7, 'F1');
            for (const wl of wrapped) {
                pdf.ensureSpace(10);
                pdf.drawText(wl, MARGIN_L, pdf.y + 7.5, 7, 'F1');
                pdf.y += 9;
            }
        }
        pdf.y += 8;
    }

    // Signature Footer
    pdf.ensureSpace(45);
    pdf.y += 14;
    const signerTitle = `${empresa} ${fullName}`.trim();
    pdf.drawText(signerTitle, MARGIN_L + CONTENT_W / 2, pdf.y + 10, 10.5, 'F2', [0, 0, 0], 'center');
    pdf.y += 16;
    pdf.drawText(
        `Acepto la cotización #${noCotizacion}`,
        MARGIN_L + CONTENT_W / 2,
        pdf.y + 10,
        10.5,
        'F2',
        [0, 0, 0],
        'center'
    );

    return pdf.toBuffer();
}
