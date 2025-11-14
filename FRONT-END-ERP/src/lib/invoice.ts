import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Company,
  Client,
  Service,
  ServiceOption,
  EngagementStatus,
  SupportType,
  EngagementOptionOverride,
} from '../store/useAppData';
import { formatCurrency, formatDuration } from './format';

/**
 * ========================= ULTRA-PREMIUM SINGLE-PAGE DESIGN V3 =========================
 * Design Philosophy:
 * • Perfect balance between density and elegance
 * • Clean, modern layout with proper visual hierarchy
 * • Professional spacing that breathes naturally
 * • Strategic use of color and typography
 * • Guaranteed single-page output
 * =======================================================================================
 */

interface GenerateCommercialDocumentPayloadBase {
  documentNumber: string;
  issueDate: Date;
  serviceDate: Date;
  company: Company & { vatNumber?: string; iban?: string; bic?: string };
  client: Client;
  service: Service;
  options: ServiceOption[];
  optionOverrides?: Record<string, EngagementOptionOverride>;
  additionalCharge: number;
  vatRate: number;
  vatEnabled: boolean;
  status: EngagementStatus;
  supportType: SupportType;
  supportDetail: string;
}

export interface GenerateInvoicePayload extends GenerateCommercialDocumentPayloadBase {
  paymentMethod?: string | null;
}

export interface GenerateQuotePayload extends GenerateCommercialDocumentPayloadBase {
  validityNote?: string | null;
}

// ========================= REFINED COLOR SYSTEM =========================
const COLORS = {
  primary: { r: 0, g: 73, b: 172 },
  primaryDark: { r: 0, g: 45, b: 130 },
  primaryLight: { r: 230, g: 240, b: 252 },
  text: { r: 15, g: 23, b: 42 },
  textMedium: { r: 71, g: 85, b: 105 },
  textLight: { r: 100, g: 116, b: 139 },
  bgPaper: { r: 255, g: 255, b: 255 },
  bgSubtle: { r: 249, g: 250, b: 251 },
  bgCard: { r: 250, g: 251, b: 252 },
  border: { r: 226, g: 232, b: 240 },
  borderLight: { r: 241, g: 245, b: 249 },
  success: { r: 16, g: 185, b: 129 },
  warning: { r: 245, g: 158, b: 11 },
  error: { r: 239, g: 68, b: 68 },
};

// ========================= OPTIMIZED TYPOGRAPHY =========================
const FONTS = {
  title: 18,
  h2: 12,
  h3: 10,
  body: 9,
  small: 8,
  tiny: 7,
};

const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

// ========================= BALANCED SPACING =========================
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// ========================= UTILITIES =========================
const detectImageFormat = (source: string): 'PNG' | 'JPEG' | 'WEBP' => {
  if (source?.startsWith('data:image/')) {
    const mime = source.slice('data:image/'.length, source.indexOf(';')).toLowerCase();
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('webp')) return 'WEBP';
    return 'JPEG';
  }
  const ext = source?.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'JPEG';
  if (ext === 'webp') return 'WEBP';
  return 'PNG';
};

type CommercialDocumentMode = 'invoice' | 'quote';


const formatSupportDetails = (supportType: SupportType, supportDetail: string) => {
  const detail = supportDetail?.trim();
  return detail ? `${supportType} – ${detail}` : supportType;
};

interface InvoiceLine {
  label: string;
  detail?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

const safeVatRate = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const formatVatRateLabel = (value: number) => {
  const v = safeVatRate(value);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.00$/, '');
};
const roundCurrency = (value: number) => Math.round(value * 100) / 100;

// ========================= DRAWING HELPERS =========================
const setColor = (doc: jsPDF, color: typeof COLORS.text) => {
  doc.setTextColor(color.r, color.g, color.b);
};

const setFillColor = (doc: jsPDF, color: typeof COLORS.text) => {
  doc.setFillColor(color.r, color.g, color.b);
};

const setDrawColor = (doc: jsPDF, color: typeof COLORS.text) => {
  doc.setDrawColor(color.r, color.g, color.b);
};

const addText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  if (!text) return y;
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
};

// Fonction pour calculer les dimensions du logo sans écrasement
const calculateLogoDimensions = (maxWidth: number, maxHeight: number, aspectRatio?: number) => {
  if (!aspectRatio) {
    // Si pas de ratio d'aspect, utiliser les dimensions par défaut
    return { width: maxWidth, height: maxHeight };
  }
  
  let width = maxWidth;
  let height = maxHeight;
  
  // Ajuster selon le ratio d'aspect pour éviter l'écrasement
  if (aspectRatio > maxWidth / maxHeight) {
    // Image plus large que haute - limiter par la largeur
    height = maxWidth / aspectRatio;
  } else {
    // Image plus haute que large - limiter par la hauteur
    width = maxHeight * aspectRatio;
  }
  
  return { width, height };
};

// ========================= MAIN GENERATOR =========================
const generateCommercialDocumentPdf = (
  mode: CommercialDocumentMode,
  {
    documentNumber,
    issueDate,
    serviceDate,
    company,
    client,
    service,
    options,
    optionOverrides,
    additionalCharge,
    vatRate,
    vatEnabled,
    status,
    supportType,
    supportDetail,
    paymentMethod,
    validityNote,
  }: GenerateCommercialDocumentPayloadBase & { paymentMethod?: string | null; validityNote?: string | null }
) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  doc.setFont('helvetica', 'normal');
  setColor(doc, COLORS.text);
  doc.setFontSize(FONTS.body);

  const formattedIssueDate = format(issueDate, 'dd/MM/yyyy');
  const formattedServiceDate = format(serviceDate, 'dd/MM/yyyy');
  const paymentLabel = paymentMethod?.trim() ?? '';
  const headingTitle = mode === 'invoice' ? 'FACTURE' : 'DEVIS';
  const serviceDateLabel = mode === 'invoice' ? 'INTERVENTION' : 'INTERVENTION';

  let y = margin + SPACING.md;

  // ========================= HEADER =========================
  
  // Logo de la société pour les factures
  const logoMaxW = 120;
  const logoMaxH = 50;
  if (company.invoiceLogoUrl) {
    try {
      // Calculer les dimensions optimales (ratio 2.5:1 par défaut pour les logos)
      const defaultAspectRatio = 2.5; // Largeur/hauteur typique pour un logo
      const logoDims = calculateLogoDimensions(logoMaxW, logoMaxH, defaultAspectRatio);
      
      // Afficher le logo avec les dimensions calculées
      doc.addImage(
        company.invoiceLogoUrl,
        detectImageFormat(company.invoiceLogoUrl),
        margin,
        y,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM' // Meilleure qualité que 'FAST'
      );
      console.log('✅ Logo de la société affiché:', company.invoiceLogoUrl, 'Dimensions:', logoDims.width, 'x', logoDims.height);
    } catch (error) {
      console.warn('⚠️ Impossible d\'afficher le logo:', error);
      // Fallback: afficher le nom de l'entreprise
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.title);
      setColor(doc, COLORS.primary);
      doc.text(company.name, margin, y + 20);
    }
  } else {
    // Si pas de logo, afficher le nom de l'entreprise en grand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.title);
    setColor(doc, COLORS.primary);
    doc.text(company.name, margin, y + 20);
  }

  // Title and status - right side
  const rightX = pageWidth - margin;
  const titleY = company.invoiceLogoUrl ? y + 15 : y + 8; // Ajuster selon la présence du logo
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.title);
  setColor(doc, COLORS.text);
  doc.text(headingTitle, rightX, titleY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.textMedium);
  doc.text(`N° ${documentNumber}`, rightX, titleY + 18, { align: 'right' });

  y += (company.invoiceLogoUrl ? logoMaxH : 30) + SPACING.xl;

  // ========================= INFO CARDS =========================
  
  const cardGap = SPACING.lg;
  const cardW = (contentWidth - cardGap) / 2;
  const cardPad = SPACING.md;
  const cardH = 100;
  const lineH = FONTS.small * LINE_HEIGHTS.normal;

  // Emetteur card
  const card1X = margin;
  setFillColor(doc, COLORS.bgCard);
  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(1);
  doc.roundedRect(card1X, y, cardW, cardH, 8, 8, 'FD');

  let cardY = y + cardPad + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.h3);
  setColor(doc, COLORS.primary);
  doc.text('ÉMETTEUR', card1X + cardPad, cardY);

  cardY += SPACING.lg;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.text);
  doc.text(company.name, card1X + cardPad, cardY);

  cardY += SPACING.md;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.textMedium);
  
  const companyInfo = [
    company.address,
    `${company.postalCode} ${company.city}`,
    `SIRET: ${company.siret}`,
    company.vatNumber ? `TVA: ${company.vatNumber}` : null,
  ].filter(Boolean);

  companyInfo.forEach(info => {
    cardY = addText(doc, info!, card1X + cardPad, cardY, cardW - cardPad * 2, lineH);
  });

  // Client card
  const card2X = card1X + cardW + cardGap;
  setFillColor(doc, COLORS.bgCard);
  doc.roundedRect(card2X, y, cardW, cardH, 8, 8, 'FD');

  cardY = y + cardPad + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.h3);
  setColor(doc, COLORS.primary);
  doc.text('CLIENT', card2X + cardPad, cardY);

  cardY += SPACING.lg;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.text);
  doc.text(client.name, card2X + cardPad, cardY);

  cardY += SPACING.md;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.textMedium);

  const clientInfo = [
    client.address,
    client.city,
    client.phone ? `Tél: ${client.phone}` : null,
    client.email,
  ].filter(Boolean);

  clientInfo.forEach(info => {
    cardY = addText(doc, info!, card2X + cardPad, cardY, cardW - cardPad * 2, lineH);
  });

  y += cardH + SPACING.xl;

  // ========================= METADATA BAR =========================
  
  const metaY = y;
  
  // Date émission
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textLight);
  doc.text('DATE ÉMISSION', margin, metaY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(formattedIssueDate, margin, metaY + SPACING.md);

  // Date intervention
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textLight);
  doc.text(serviceDateLabel, margin + 160, metaY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(formattedServiceDate, margin + 160, metaY + SPACING.md);

  // Paiement ou Validité
  if (mode === 'invoice' && paymentLabel) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONTS.tiny);
    setColor(doc, COLORS.textLight);
    doc.text('MODE DE PAIEMENT', rightX, metaY, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.body);
    setColor(doc, COLORS.text);
    doc.text(paymentLabel, rightX, metaY + SPACING.md, { align: 'right' });
  } else if (mode === 'quote' && validityNote) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONTS.tiny);
    setColor(doc, COLORS.textLight);
    doc.text('VALIDITÉ', rightX, metaY, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.body);
    setColor(doc, COLORS.text);
    doc.text(validityNote, rightX, metaY + SPACING.md, { align: 'right' });
  }

  y += SPACING.xl + SPACING.lg;

  // Separator
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(1);
  doc.line(margin, y, rightX, y);

  y += SPACING.lg;

  // ========================= SERVICE DETAILS =========================
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.h2);
  setColor(doc, COLORS.text);
  doc.text('DÉTAILS DE LA PRESTATION', margin, y);

  y += SPACING.lg;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(service.name, margin, y);

  y += SPACING.md;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.textMedium);
  const supportText = formatSupportDetails(supportType, supportDetail);
  y = addText(doc, supportText, margin, y, contentWidth, lineH);

  y += SPACING.xl;

  // ========================= TABLE =========================
  
  const documentLines: InvoiceLine[] = (() => {
    const rows = options.map((option) => {
      const override = optionOverrides?.[option.id];
      const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
      const durationMin =
        override?.durationMin !== undefined && override.durationMin >= 0
          ? override.durationMin
          : option.defaultDurationMin;
      const unitPrice =
        override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
          ? override.unitPriceHT
          : option.unitPriceHT;
      return {
        label: option.label,
        detail: durationMin ? formatDuration(durationMin) : null,
        quantity,
        unitPrice,
        total: roundCurrency(unitPrice * quantity),
      };
    });
    if (additionalCharge > 0) {
      rows.push({
        label: 'Frais complémentaires',
        detail: null,
        quantity: 1,
        unitPrice: additionalCharge,
        total: additionalCharge,
      });
    }
    return rows;
  })();

  const subtotal = roundCurrency(documentLines.reduce((sum, l) => sum + l.total, 0));
  const vatRateSafe = safeVatRate(vatRate);
  const vatAmount = vatEnabled ? roundCurrency(subtotal * (vatRateSafe / 100)) : 0;
  const grandTotal = vatEnabled ? roundCurrency(subtotal + vatAmount) : subtotal;

  // Table columns
  const colWidths = [contentWidth * 0.48, contentWidth * 0.13, contentWidth * 0.195, contentWidth * 0.195];
  const colX = colWidths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? margin : acc[i - 1] + colWidths[i - 1]);
    return acc;
  }, []);

  const cellPad = SPACING.sm;
  const headerH = 28;

  // Table header
  setFillColor(doc, COLORS.bgSubtle);
  doc.roundedRect(margin, y, contentWidth, headerH, 6, 6, 'F');

  setDrawColor(doc, COLORS.primary);
  doc.setLineWidth(2);
  doc.line(margin, y + headerH - 1, rightX, y + headerH - 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.text);
  const headerY = y + headerH / 2 + 3;

  doc.text('DÉSIGNATION', colX[0] + cellPad, headerY);
  doc.text('QTÉ', colX[1] + colWidths[1] / 2, headerY, { align: 'center' });
  doc.text('P.U. HT', colX[2] + colWidths[2] - cellPad, headerY, { align: 'right' });
  doc.text('TOTAL HT', colX[3] + colWidths[3] - cellPad, headerY, { align: 'right' });

  y += headerH;

  // Table rows
  let rowIdx = 0;
  documentLines.forEach((line, idx) => {
    const rowH = line.detail ? 34 : 26;
    const isLastRow = idx === documentLines.length - 1;

    if (rowIdx % 2 === 0) {
      setFillColor(doc, COLORS.bgSubtle);
      if (isLastRow) {
        doc.roundedRect(margin, y, contentWidth, rowH, 6, 6, 'F');
      } else {
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
    }

    if (!isLastRow) {
      setDrawColor(doc, COLORS.borderLight);
      doc.setLineWidth(0.5);
      doc.line(margin, y + rowH, rightX, y + rowH);
    }

    let textY = y + cellPad + FONTS.body * 0.75;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.body);
    setColor(doc, COLORS.text);
    doc.text(line.label, colX[0] + cellPad, textY);

    if (line.detail) {
      textY += lineH * 0.9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONTS.tiny);
      setColor(doc, COLORS.textLight);
      doc.text(line.detail, colX[0] + cellPad, textY);
    }

    const valY = y + cellPad + FONTS.body * 0.75;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONTS.body);
    setColor(doc, COLORS.text);
    doc.text(String(line.quantity), colX[1] + colWidths[1] / 2, valY, { align: 'center' });
    doc.text(formatCurrency(line.unitPrice), colX[2] + colWidths[2] - cellPad, valY, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(line.total), colX[3] + colWidths[3] - cellPad, valY, { align: 'right' });

    y += rowH;
    rowIdx++;
  });

  y += SPACING.xl;

  // ========================= TOTALS =========================
  
  const totalsW = 260;
  const totalsX = rightX - totalsW;
  const rowH = 30;

  const totalsData = [
    { label: 'Sous-total HT', value: formatCurrency(subtotal), bold: false, accent: false },
    ...(vatEnabled
      ? [{ label: `TVA (${formatVatRateLabel(vatRateSafe)}%)`, value: formatCurrency(vatAmount), bold: false, accent: false }]
      : []),
    {
      label: vatEnabled ? 'TOTAL TTC' : 'TOTAL HT',
      value: formatCurrency(grandTotal),
      bold: true,
      accent: true,
    },
  ];

  totalsData.forEach((row, idx) => {
    const rowY = y + idx * (rowH + SPACING.xs);

    if (row.accent) {
      setFillColor(doc, COLORS.primary);
      doc.roundedRect(totalsX, rowY, totalsW, rowH, 12, 12, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.h2);
      doc.setTextColor(255, 255, 255);
      const textY = rowY + rowH / 2 + 4;
      doc.text(row.label, totalsX + SPACING.md, textY);
      doc.setFontSize(FONTS.title);
      doc.text(row.value, totalsX + totalsW - SPACING.md, textY, { align: 'right' });
    } else {
      setFillColor(doc, COLORS.bgCard);
      setDrawColor(doc, COLORS.borderLight);
      doc.setLineWidth(0.5);
      doc.roundedRect(totalsX, rowY, totalsW, rowH, 8, 8, 'FD');
      
      doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
      doc.setFontSize(FONTS.body);
      setColor(doc, COLORS.text);
      const textY = rowY + rowH / 2 + 3;
      doc.text(row.label, totalsX + SPACING.md, textY);
      doc.text(row.value, totalsX + totalsW - SPACING.md, textY, { align: 'right' });
    }
  });

  y += totalsData.length * (rowH + SPACING.xs) + SPACING.xl;

  // ========================= BOTTOM SECTION =========================
  
  const bottomH = 90;
  const leftBoxW = contentWidth * 0.53;
  const sigW = (contentWidth - leftBoxW - SPACING.md * 2) / 2;

  // Conditions box
  setFillColor(doc, COLORS.bgCard);
  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, leftBoxW, bottomH, 10, 10, 'FD');

  let infoY = y + SPACING.md;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.h3);
  setColor(doc, COLORS.primary);
  const infoTitle = mode === 'invoice' ? 'Conditions' : 'Conditions';
  doc.text(infoTitle, margin + SPACING.md, infoY);

  infoY += SPACING.md;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);

  const conditions: string[] = [];
  if (mode === 'invoice') {
    if (validityNote) conditions.push(`Validité: ${validityNote}`);
    conditions.push('Paiement à réception.');
    
    // Informations bancaires complètes
    if (company.bankName || company.bankAddress || company.iban || company.bic) {
      conditions.push(''); // Ligne vide pour séparer
      conditions.push('COORDONNÉES BANCAIRES :');
      if (company.bankName) conditions.push(`Banque: ${company.bankName}`);
      if (company.bankAddress) conditions.push(`Adresse: ${company.bankAddress}`);
      if (company.iban) conditions.push(`IBAN: ${company.iban}`);
      if (company.bic) conditions.push(`BIC: ${company.bic}`);
    }
  } else {
    if (validityNote) conditions.push(`Validité: ${validityNote}`);
    conditions.push('Devis à retourner signé pour acceptation.');
    
    // Informations bancaires pour les devis aussi
    if (company.bankName || company.bankAddress || company.iban || company.bic) {
      conditions.push(''); // Ligne vide pour séparer
      conditions.push('COORDONNÉES BANCAIRES :');
      if (company.bankName) conditions.push(`Banque: ${company.bankName}`);
      if (company.bankAddress) conditions.push(`Adresse: ${company.bankAddress}`);
      if (company.iban) conditions.push(`IBAN: ${company.iban}`);
      if (company.bic) conditions.push(`BIC: ${company.bic}`);
    }
  }

  conditions.forEach(cond => {
    infoY = addText(doc, cond, margin + SPACING.md, infoY, leftBoxW - SPACING.md * 2, lineH * 0.95);
  });

  // Signature boxes
  const sig1X = margin + leftBoxW + SPACING.md;
  const sig2X = sig1X + sigW + SPACING.md;

  [
    { x: sig1X, label: 'Signature client' },
    { x: sig2X, label: 'Cachet société' }
  ].forEach(({ x, label }) => {
    setFillColor(doc, COLORS.bgPaper);
    setDrawColor(doc, COLORS.border);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, sigW, bottomH, 10, 10, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.tiny);
    setColor(doc, COLORS.textLight);
    doc.text(label, x + sigW / 2, y + SPACING.md, { align: 'center' });
  });

  // ========================= FOOTER =========================
  
  const footerY = pageHeight - 36;
  
  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, rightX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textLight);

  const footerText = `${company.name} • ${company.address}, ${company.postalCode} ${company.city} • SIRET ${company.siret}${company.vatNumber ? ' • TVA ' + company.vatNumber : ''}`;
  doc.text(footerText, margin, footerY + SPACING.sm + 2);

  doc.text('Page 1 sur 1', rightX, footerY + SPACING.sm + 2, { align: 'right' });

  return doc;
};

export const generateInvoicePdf = (payload: GenerateInvoicePayload) =>
  generateCommercialDocumentPdf('invoice', payload);

export const generateQuotePdf = (payload: GenerateQuotePayload) =>
  generateCommercialDocumentPdf('quote', { ...payload, paymentMethod: null });