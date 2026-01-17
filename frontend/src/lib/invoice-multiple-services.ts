import jsPDF from 'jspdf';
import { format, addDays } from 'date-fns';

/**
 * Nettoie une chaîne pour l'utiliser dans un nom de fichier
 * - Remplace les espaces par des tirets
 * - Supprime les caractères spéciaux (é, è, &, /, etc.)
 * - Garde uniquement les caractères alphanumériques, tirets et underscores
 */
const sanitizeFileName = (str: string): string => {
  return str
    .trim()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^a-zA-Z0-9_-]/g, '') // Garde uniquement alphanumériques, tirets et underscores
    .replace(/-+/g, '-') // Remplace les tirets multiples par un seul
    .replace(/^-|-$/g, ''); // Supprime les tirets en début/fin
};

/**
 * Génère un nom de fichier PDF professionnel pour un devis
 * Format : Devis_[NUMERO_DEVIS]_[NOM_CLIENT]_[DATE_EMISSION].pdf
 * 
 * @param documentNumber - Numéro du devis (ex: "DEV-202512-0002")
 * @param clientName - Nom du client (ex: "Leny Derrien")
 * @param issueDate - Date d'émission du devis
 * @returns Nom de fichier formaté (ex: "Devis_DEV-202512-0002_Leny-Derrien_2025-12-31.pdf")
 */
export const generateQuoteFileName = (
  documentNumber: string,
  clientName: string,
  issueDate: Date
): string => {
  return generateDocumentFileName('Devis', documentNumber, clientName, issueDate);
};

/**
 * Génère un nom de fichier PDF professionnel pour une facture
 * Format : Facture_[NUMERO_FACTURE]_[NOM_CLIENT]_[DATE_EMISSION].pdf
 * 
 * @param documentNumber - Numéro de la facture (ex: "FAC-202512-0002")
 * @param clientName - Nom du client (ex: "Leny Derrien")
 * @param issueDate - Date d'émission de la facture
 * @returns Nom de fichier formaté (ex: "Facture_FAC-202512-0002_Leny-Derrien_2025-12-31.pdf")
 */
export const generateInvoiceFileName = (
  documentNumber: string,
  clientName: string,
  issueDate: Date
): string => {
  return generateDocumentFileName('Facture', documentNumber, clientName, issueDate);
};

/**
 * Fonction générique pour générer un nom de fichier PDF professionnel
 * Format : [TYPE]_[NUMERO]_[NOM_CLIENT]_[DATE_EMISSION].pdf
 * 
 * @param documentType - Type de document ("Devis" ou "Facture")
 * @param documentNumber - Numéro du document (ex: "DEV-202512-0002")
 * @param clientName - Nom du client (ex: "Leny Derrien")
 * @param issueDate - Date d'émission du document
 * @returns Nom de fichier formaté
 */
const generateDocumentFileName = (
  documentType: string,
  documentNumber: string,
  clientName: string,
  issueDate: Date
): string => {
  // Nettoyer le numéro de document (garder les tirets et caractères alphanumériques)
  const cleanDocumentNumber = documentNumber
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Nettoyer le nom du client
  const cleanClientName = sanitizeFileName(clientName);

  // Formater la date en YYYY-MM-DD
  const formattedDate = format(issueDate, 'yyyy-MM-dd');

  // Construire le nom de fichier
  return `${documentType}_${cleanDocumentNumber}_${cleanClientName}_${formattedDate}.pdf`;
};
import {
  Company,
  Client,
  ClientContact,
  Service,
  ServiceOption,
  EngagementOptionOverride,
  SupportType,
  EngagementStatus,
} from '../store/useAppData';
import { formatCurrency, formatDuration } from './format';

// ========================= CONSTANTES DESIGN =========================
const COLORS = {
  primary: { r: 0, g: 73, b: 172 },
  primaryDark: { r: 0, g: 45, b: 130 },
  primaryLight: { r: 230, g: 240, b: 252 },
  text: { r: 15, g: 23, b: 42 },
  textMedium: { r: 71, g: 85, b: 105 },
  textLight: { r: 100, g: 116, b: 139 },
  bgPaper: { r: 255, g: 255, b: 255 },
  bgSubtle: { r: 249, g: 250, b: 251 },
  border: { r: 226, g: 232, b: 240 },
  borderLight: { r: 241, g: 245, b: 249 },
  error: { r: 239, g: 68, b: 68 },
};

const FONTS = {
  title: 18,
  h2: 12,
  h3: 10,
  body: 9,
  small: 8,
  tiny: 7,
};

// Line heights selon règles UI : fontSize * 1.35 à 1.45 (normal) ou * 1.25 (petit)
// Norme d'espacement lisible : corps ~ 9-10pt, interligne/leading stable : 1.35 à 1.45
const LINE_HEIGHTS = {
  tiny: Math.round(FONTS.tiny * 1.25),      // 7 * 1.25 = 8.75 ≈ 9
  small: Math.round(FONTS.small * 1.4),     // 8 * 1.4 = 11.2 ≈ 11
  body: Math.round(FONTS.body * 1.4),       // 9 * 1.4 = 12.6 ≈ 13 (corps ~ 9pt, leading 1.35-1.45)
  h3: Math.round(FONTS.h3 * 1.4),           // 10 * 1.4 = 14
  h2: Math.round(FONTS.h2 * 1.4),           // 12 * 1.4 = 16.8 ≈ 17
  title: Math.round(FONTS.title * 1.4),    // 18 * 1.4 = 25.2 ≈ 25
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// ========================= HELPERS GÉNÉRAUX =========================
const snapToGrid = (y: number): number => Math.ceil(y / 4) * 4;

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
  if (!text) return snapToGrid(y);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let currentY = snapToGrid(y);
  lines.forEach((line) => {
    doc.text(line, x, currentY);
    currentY += lineHeight;
  });
  return snapToGrid(currentY);
};

/**
 * Ajoute du texte justifié (alignement gauche + droite)
 * La dernière ligne reste alignée à gauche (comportement normal du justifié)
 */
const addJustifiedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  if (!text) return snapToGrid(y);
  
  // Découper le texte en lignes selon maxWidth
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let currentY = snapToGrid(y);
  
  lines.forEach((line, lineIndex) => {
    const isLastLine = lineIndex === lines.length - 1;
    
    if (isLastLine) {
      // Dernière ligne : alignement à gauche (comportement normal du justifié)
      doc.text(line, x, currentY);
    } else {
      // Lignes intermédiaires : justification
      const words = line.trim().split(/\s+/);
      
      if (words.length <= 1) {
        // Une seule ligne ou un seul mot : pas de justification possible
        doc.text(line, x, currentY);
      } else {
        // Calculer la largeur totale des mots sans espaces
        const fontSize = doc.getFontSize();
        let totalWordsWidth = 0;
        words.forEach((word) => {
          totalWordsWidth += doc.getTextWidth(word);
        });
        
        // Calculer l'espace disponible à répartir
        const availableSpace = maxWidth - totalWordsWidth;
        const spaceBetweenWords = availableSpace / (words.length - 1);
        
        // Placer chaque mot avec l'espacement calculé
        let currentX = x;
        words.forEach((word, wordIndex) => {
          doc.text(word, currentX, currentY);
          if (wordIndex < words.length - 1) {
            // Ajouter l'espace justifié (sauf après le dernier mot)
            currentX += doc.getTextWidth(word) + spaceBetweenWords;
          }
        });
      }
    }
    
    currentY += lineHeight;
  });
  
  return snapToGrid(currentY);
};

const calculateLogoDimensions = (maxWidth: number, maxHeight: number, aspectRatio?: number) => {
  if (!aspectRatio) return { width: maxWidth, height: maxHeight };
  
  let width = maxWidth;
  let height = maxHeight;
  
  if (aspectRatio > maxWidth / maxHeight) {
    height = maxWidth / aspectRatio;
  } else {
    width = maxHeight * aspectRatio;
  }
  
  return { width, height };
};

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

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const safeVatRate = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

const measureTextHeight = (
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
) => {
  if (!text) return 0;
  const prevSize = doc.getFontSize();
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.setFontSize(prevSize);
  return lines.length * lineHeight;
};

// ========================= INTERFACES =========================
export interface QuoteServiceItem {
  serviceId: string;
  serviceName: string;
  serviceDescription?: string; // Description de la prestation depuis le catalogue
  supportType: SupportType;
  supportDetail: string;
  options: ServiceOption[];
  optionOverrides?: Record<string, EngagementOptionOverride>;
  additionalCharge?: number;
  mainCategoryId?: string;
  subCategoryId?: string;
  base_price?: number; // Prix de base du service (si pas d'options)
  base_duration?: number; // Durée de base du service (si pas d'options)
  quantity?: number; // Quantité pour la prestation entière
}

export interface GenerateQuoteWithMultipleServicesPayload {
  documentNumber: string;
  issueDate: Date;
  serviceDate: Date;
  company: Company & { 
    vatNumber?: string; 
    iban?: string; 
    bic?: string;
    legalForm?: string;
    insuranceCompany?: string;
    invoiceLogoUrl?: string;
  };
  client: Client;
  contact?: ClientContact | null; // Contact sélectionné pour le devis (pour les clients professionnels)
  services: QuoteServiceItem[];
  vatRate: number;
  vatEnabled: boolean;
  validityNote?: string | null;
  paymentMethod?: string;
  paymentTerms?: string;
  deposit?: number;
  categories?: Array<{ id: string; name: string; priceHT?: number; defaultDurationMin?: number }>; // Catégories pour récupérer les prix et durées des sous-catégories
}

// ========================= FONCTIONS HELPER DE DESSIN =========================

/**
 * Dessine le header de la page 1 : Logo + infos entreprise à gauche, OFFRE DE PRIX à droite
 */
const drawHeader = (
  doc: jsPDF,
  company: GenerateQuoteWithMultipleServicesPayload['company'],
  headingTitle: string,
  documentNumber: string,
  formattedIssueDate: string,
  formattedServiceDate: string,
  formattedValidityDate: string,
  vatEnabled: boolean,
  margin: number,
  rightX: number
): number => {
  let y = margin;
  
  // === COLONNE GAUCHE : Logo + Infos entreprise ===
  const logoMaxW = 120;
  const logoMaxH = 50;
  let logoBottomY = y;
  
  // Logo
  if (company.invoiceLogoUrl) {
    try {
      const defaultAspectRatio = 2.5;
      const logoDims = calculateLogoDimensions(logoMaxW, logoMaxH, defaultAspectRatio);
      doc.addImage(
        company.invoiceLogoUrl,
        detectImageFormat(company.invoiceLogoUrl),
        margin,
        y,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM'
      );
      logoBottomY = y + logoDims.height;
    } catch (error) {
      console.warn('⚠️ Impossible d\'afficher le logo:', error);
    }
  }
  
  // Infos entreprise SOUS le logo
  let infoY = snapToGrid(logoBottomY + SPACING.sm);
  
  // Nom entreprise
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(company.name || '-', margin, infoY);
  infoY = snapToGrid(infoY + LINE_HEIGHTS.body);
  
  // Adresse
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  
  if (company.address) {
    doc.text(company.address, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  if (company.postalCode && company.city) {
    doc.text(`${company.postalCode} ${company.city}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  
  // SIRET
  if (company.siret) {
    doc.text(`SIRET : ${company.siret}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  
  // Téléphone / Email
  if (company.phone) {
    doc.text(`Téléphone : ${company.phone}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  if (company.email) {
    doc.text(`Email : ${company.email}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  
  // TVA non applicable (visible si auto-entreprise) - taille petite/medium, pas énorme
  if (!vatEnabled) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.small); // Taille petite/medium (8pt)
    setColor(doc, COLORS.error); // Rouge pour visibilité
    doc.text('TVA non applicable — article 293 B du Code général des impôts', margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.small);
  }
  
  const leftColumnHeight = infoY - margin;
  
  // === COLONNE DROITE : OFFRE DE PRIX (compact, premium, hiérarchie nette) ===
  const rightPadding = SPACING.md; // marge visuelle droite
  const xRight = rightX - rightPadding;
  let rightY = margin;

  // 1) TITRE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setColor(doc, COLORS.text); // plus premium que le bleu pour le titre
  doc.text(headingTitle, xRight, rightY, { align: 'right' });

  // 2) BARRE HORIZONTALE sous le titre (séparateur)
  const titleW = doc.getTextWidth(headingTitle);
  const infoBlockWidth = 180; // compact (au lieu de 220)
  const barW = Math.max(infoBlockWidth, titleW + 10); // barre = max(titre, bloc infos)
  const barX1 = xRight - barW;
  rightY = snapToGrid(rightY + 16); // espacement court sous le titre

  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(0.7);
  doc.line(barX1, rightY, xRight, rightY);

  rightY = snapToGrid(rightY + 12); // espace après barre

  // 3) INFOS (4 lignes) : labels courts + valeurs alignées
  const infoLeftX = xRight - infoBlockWidth;
  const labelX = infoLeftX;
  const valueX = xRight;

  const infoFont = 9;
  const infoLineH = 12; // norme lisible/compacte (≈ 1.3× 9pt)
  doc.setFontSize(infoFont);

  // helper local : 1 ligne label/value
  const drawInfoLine = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    setColor(doc, COLORS.textLight);
    doc.text(label, labelX, rightY);

    doc.setFont('helvetica', 'bold');
    setColor(doc, COLORS.text);
    doc.text(value, valueX, rightY, { align: 'right' });

    rightY = snapToGrid(rightY + infoLineH);
  };

  // Labels courts demandés
  drawInfoLine('Devis n°', documentNumber);
  drawInfoLine('Émis le', formattedIssueDate);
  drawInfoLine('Interv. le', formattedServiceDate);
  drawInfoLine('Valide jusqu\'au', formattedValidityDate);

  // Hauteur colonne droite si tu en as besoin plus bas
  const rightColumnHeight = rightY - margin;
  
  // Retourner la hauteur maximale des deux colonnes
  return Math.max(leftColumnHeight, rightColumnHeight);
};

/**
 * Dessine le bloc CONTACT à gauche (pour les clients professionnels)
 */
const drawContactBlock = (
  doc: jsPDF,
  contact: ClientContact,
  margin: number,
  y: number
): number => {
  let contactY = y;
  
  // Titre CONTACT DE L'OFFRE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.primary);
  doc.text('CONTACT DE L\'OFFRE', margin, contactY);
  contactY = snapToGrid(contactY + LINE_HEIGHTS.small);
  
  // Nom du contact
  const contactName = `${contact.firstName} ${contact.lastName}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(contactName, margin, contactY);
  contactY = snapToGrid(contactY + LINE_HEIGHTS.body);
  
  // Détails du contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  
  if (contact.email) {
    doc.text(`Email : ${contact.email}`, margin, contactY);
    contactY = snapToGrid(contactY + LINE_HEIGHTS.tiny);
  }
  if (contact.mobile) {
    doc.text(`Téléphone : ${contact.mobile}`, margin, contactY);
    contactY = snapToGrid(contactY + LINE_HEIGHTS.tiny);
  }
  
  return contactY;
};

/**
 * Dessine le bloc CLIENT à droite (sans cadre)
 */
const drawClientBlock = (
  doc: jsPDF,
  client: Client,
  rightX: number,
  y: number
): number => {
  let clientY = y;
  
  // Titre CLIENT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.primary);
  doc.text('CLIENT', rightX, clientY, { align: 'right' });
  clientY = snapToGrid(clientY + LINE_HEIGHTS.small);
  
  // Nom client
  const clientName = client.type === 'individual'
    ? ([client.firstName, client.lastName].filter(Boolean).join(' ') || client.name || '-')
    : (client.name || '-');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(clientName, rightX, clientY, { align: 'right' });
  clientY = snapToGrid(clientY + LINE_HEIGHTS.body);
  
  // Détails client
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  
  if (client.type === 'individual' && client.address) {
    doc.text(`Adresse d'intervention : ${client.address}`, rightX, clientY, { align: 'right' });
    clientY = snapToGrid(clientY + LINE_HEIGHTS.tiny);
  } else if (client.address) {
    doc.text(client.address, rightX, clientY, { align: 'right' });
    clientY = snapToGrid(clientY + LINE_HEIGHTS.tiny);
  }
  if (client.city) {
    doc.text(client.city, rightX, clientY, { align: 'right' });
    clientY = snapToGrid(clientY + LINE_HEIGHTS.tiny);
  }
  if (client.phone) {
    doc.text(`Téléphone : ${client.phone}`, rightX, clientY, { align: 'right' });
    clientY = snapToGrid(clientY + LINE_HEIGHTS.tiny);
  }
  if (client.email) {
    doc.text(`Email : ${client.email}`, rightX, clientY, { align: 'right' });
    clientY = snapToGrid(clientY + LINE_HEIGHTS.tiny);
  }
  if (client.type === 'company' && client.siret) {
    doc.text(`SIRET : ${client.siret}`, rightX, clientY, { align: 'right' });
    clientY = snapToGrid(clientY + LINE_HEIGHTS.tiny);
  }
  
  return clientY;
};

/**
 * Dessine le tableau des prestations avec alignements stricts
 */
const drawServicesTable = (
  doc: jsPDF,
  allDocumentLines: Array<{
    label: string;
    description: string;
    typeDuration: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>,
  margin: number,
  rightX: number,
  contentWidth: number,
  y: number,
  checkPageBreak: (requiredHeight: number) => boolean,
  contact?: ClientContact | null
): number => {
  // Titre section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.h3);
  setColor(doc, COLORS.text);
  doc.text('DESCRIPTION DES PRESTATIONS', margin, y);
  y = snapToGrid(y + LINE_HEIGHTS.h3 + SPACING.md);
  
  // Colonnes du tableau - grille unique partagée par en-tête et lignes
  const colWidths = [
    contentWidth * 0.25, // PRESTATION
    contentWidth * 0.25, // DESCRIPTION
    contentWidth * 0.20, // TYPE/DURÉE
    contentWidth * 0.08, // QTÉ
    contentWidth * 0.11, // P.U. HT
    contentWidth * 0.11, // TOTAL HT
  ];
  const colX = colWidths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? margin : acc[i - 1] + colWidths[i - 1]);
    return acc;
  }, []);
  
  // Padding unique pour toutes les cellules (en-tête et lignes)
  const cellPad = SPACING.sm; // 8pt
  const headerH = 28;
  
  // En-tête du tableau - utilise la même grille colX avec cellPad
  checkPageBreak(headerH + 40);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, rightX, y);
  doc.line(margin, y + headerH, rightX, y + headerH);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  const headerY = snapToGrid(y + headerH / 2);
  
  // En-têtes alignés avec padding gauche identique (sauf pour centré/droite)
  doc.text('PRESTATION', colX[0] + cellPad, headerY);
  doc.text('DESCRIPTION', colX[1] + cellPad, headerY);
  doc.text('TYPE/DURÉE', colX[2] + cellPad, headerY);
  doc.text('QTÉ', colX[3] + colWidths[3] / 2, headerY, { align: 'center' });
  doc.text('P.U. HT', colX[4] + colWidths[4] - cellPad, headerY, { align: 'right' });
  doc.text('TOTAL HT', colX[5] + colWidths[5] - cellPad, headerY, { align: 'right' });
  
  y = snapToGrid(y + headerH);
  
  // Lignes du tableau - utilise la même grille colX/colW que l'en-tête
  allDocumentLines.forEach((line) => {
    // Taille police tableau
    const labelFontSize = FONTS.body; // 9pt
    const descFontSize = FONTS.tiny; // 7pt
    const labelLineH = LINE_HEIGHTS.body; // ~13pt
    const descLineH = LINE_HEIGHTS.tiny; // ~9pt
    
    // MaxWidth pour PRESTATION, DESCRIPTION et TYPE/DURÉE (même padding que l'en-tête)
    const labelMaxW = colWidths[0] - cellPad * 2;
    const descMaxW = colWidths[1] - cellPad * 2;
    const typeDurationMaxW = colWidths[2] - cellPad * 2;
    
    // Mesurer hauteur du label (peut être multi-lignes)
    const labelH = measureTextHeight(doc, line.label || '-', labelMaxW, labelFontSize, labelLineH);
    // Mesurer hauteur de la description
    const descH = line.description 
      ? measureTextHeight(doc, line.description, descMaxW, descFontSize, descLineH)
      : 0;
    // Mesurer hauteur de type/durée
    const typeDurationH = line.typeDuration
      ? measureTextHeight(doc, line.typeDuration, typeDurationMaxW, descFontSize, descLineH)
      : 0;
    
    // Padding cellule identique partout
    const paddingTop = cellPad; // 8pt
    const paddingBottom = cellPad; // 8pt
    
    // Hauteur de ligne : padding + contenu + padding
    const labelSectionH = labelH;
    const descSectionH = descH > 0 ? descH : 0;
    const typeDurationSectionH = typeDurationH > 0 ? typeDurationH : 0;
    // Prendre la hauteur maximale entre les colonnes
    const maxContentH = Math.max(labelSectionH, descSectionH, typeDurationSectionH);
    const minRowH = 28; // Minimum 28pt
    const rowH = Math.max(minRowH, paddingTop + maxContentH + paddingBottom);
    
    if (checkPageBreak(rowH + 40)) {
      // Réafficher en-tête sur nouvelle page (même grille)
      setDrawColor(doc, COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(margin, y, rightX, y);
      doc.line(margin, y + headerH, rightX, y + headerH);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.tiny);
      setColor(doc, COLORS.textMedium);
      const hy = y + headerH / 2;
      doc.text('PRESTATION', colX[0] + cellPad, hy);
      doc.text('DESCRIPTION', colX[1] + cellPad, hy);
      doc.text('TYPE/DURÉE', colX[2] + cellPad, hy);
      doc.text('QTÉ', colX[3] + colWidths[3] / 2, hy, { align: 'center' });
      doc.text('P.U. HT', colX[4] + colWidths[4] - cellPad, hy, { align: 'right' });
      doc.text('TOTAL HT', colX[5] + colWidths[5] - cellPad, hy, { align: 'right' });
      y += headerH;
    }
    
    // Bordure bas
    setDrawColor(doc, COLORS.borderLight);
    doc.setLineWidth(0.5);
    doc.line(margin, y + rowH, rightX, y + rowH);
    
    // Y de départ pour toutes les colonnes (même padding top que l'en-tête)
    const rowTopY = y + paddingTop;
    
    // PRESTATION (colonne 1) - align-left, commence exactement sous son header avec même padding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(labelFontSize);
    setColor(doc, COLORS.text);
    const labelY = rowTopY + labelFontSize * 0.8; // Baseline standard
    addText(doc, line.label || '-', colX[0] + cellPad, labelY, labelMaxW, labelLineH);
    
    // DESCRIPTION (colonne 2) - align-left, commence exactement sous son header avec même padding
    if (line.description && line.description.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(descFontSize);
      setColor(doc, COLORS.textMedium);
      // Aligné top avec le label (même Y de départ)
      const descY = rowTopY + descFontSize * 0.8;
      addText(doc, line.description, colX[1] + cellPad, descY, descMaxW, descLineH);
    } else {
      // Description vide : afficher "—" aligné top
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(descFontSize);
      setColor(doc, COLORS.textLight);
      doc.text('—', colX[1] + cellPad, rowTopY + descFontSize * 0.8);
    }
    
    // TYPE/DURÉE (colonne 3) - align-left, commence exactement sous son header avec même padding
    if (line.typeDuration && line.typeDuration.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(descFontSize);
      setColor(doc, COLORS.textMedium);
      // Aligné top avec le label (même Y de départ)
      const typeDurationY = rowTopY + descFontSize * 0.8;
      addText(doc, line.typeDuration, colX[2] + cellPad, typeDurationY, typeDurationMaxW, descLineH);
    } else {
      // Type/Durée vide : afficher "—" aligné top
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(descFontSize);
      setColor(doc, COLORS.textLight);
      doc.text('—', colX[2] + cellPad, rowTopY + descFontSize * 0.8);
    }
    
    // QTÉ, P.U. HT, TOTAL HT - alignés verticalement au centre (baseline: 'middle')
    const midY = y + rowH / 2;
    
    // QTÉ (colonne 4) - center, aligné verticalement au centre
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(labelFontSize);
    setColor(doc, COLORS.text);
    doc.text(String(line.quantity ?? 1), colX[3] + colWidths[3] / 2, midY, { align: 'center' });
    
    // P.U. HT (colonne 5) - right, aligné verticalement au centre
    doc.text(formatCurrency(line.unitPrice ?? 0), colX[4] + colWidths[4] - cellPad, midY, { align: 'right' });
    
    // TOTAL HT (colonne 6) - right, bold, aligné verticalement au centre
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(line.total ?? 0), colX[5] + colWidths[5] - cellPad, midY, { align: 'right' });
    
    y += rowH;
  });
  
  return snapToGrid(y + SPACING.md);
};

/**
 * Dessine le bloc total à payer
 */
const drawTotal = (
  doc: jsPDF,
  totalValue: number,
  vatEnabled: boolean,
  rightX: number,
  y: number
): number => {
  const totalsW = 240;
  const totalsX = rightX - totalsW;
  const totalH = 44;
  
  y = snapToGrid(y);
  setFillColor(doc, COLORS.primaryLight);
  setDrawColor(doc, COLORS.primary);
  doc.setLineWidth(1.2);
  doc.roundedRect(totalsX, y, totalsW, totalH, 8, 8, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.h3);
  setColor(doc, COLORS.text);
  const totalLabel = vatEnabled ? 'TOTAL À PAYER (TTC)' : 'TOTAL À PAYER (HT)';
  const textY = snapToGrid(y + totalH / 2);
  doc.text(totalLabel, totalsX + SPACING.md, textY);
  doc.setFontSize(FONTS.h2);
  setColor(doc, COLORS.primary);
  doc.text(formatCurrency(totalValue), totalsX + totalsW - SPACING.md, textY, { align: 'right' });
  
  return snapToGrid(y + totalH + SPACING.md);
};

/**
 * Dessine les zones de signature (hauteur 130-160pt)
 */
const drawSignatures = (
  doc: jsPDF,
  company: GenerateQuoteWithMultipleServicesPayload['company'],
  contentWidth: number,
  margin: number,
  y: number
): number => {
  const sigBoxH = 150; // Hauteur augmentée (130-160pt)
  const sigBoxW = (contentWidth - SPACING.sm) / 2;
  const sig1X = margin;
  const sig2X = margin + sigBoxW + SPACING.sm;
  const sigY = y;
  
  // Zone CLIENT
  setFillColor(doc, COLORS.bgPaper);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.8);
  doc.roundedRect(sig1X, sigY, sigBoxW, sigBoxH, 6, 6, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.text);
  doc.text('CLIENT', sig1X + sigBoxW / 2, sigY + SPACING.md, { align: 'center' });
  
  let clientSigY = sigY + SPACING.md + LINE_HEIGHTS.small + SPACING.sm;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  doc.text('Bon pour accord, lu et approuvé', sig1X + SPACING.sm, clientSigY);
  clientSigY += LINE_HEIGHTS.tiny + SPACING.xs;
  doc.text('Nom : _________________________', sig1X + SPACING.sm, clientSigY);
  clientSigY += LINE_HEIGHTS.tiny + SPACING.xs;
  doc.text('Date : _________________________', sig1X + SPACING.sm, clientSigY);
  clientSigY += LINE_HEIGHTS.tiny + SPACING.md;
  doc.text('Signature :', sig1X + SPACING.sm, clientSigY);
  // Zone blanche pour signature/tampon
  clientSigY += LINE_HEIGHTS.tiny + SPACING.lg;
  
  // Zone PRESTATAIRE
  setFillColor(doc, COLORS.bgPaper);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.8);
  doc.roundedRect(sig2X, sigY, sigBoxW, sigBoxH, 6, 6, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small);
  setColor(doc, COLORS.text);
  doc.text('PRESTATAIRE', sig2X + sigBoxW / 2, sigY + SPACING.md, { align: 'center' });
  
  let prestaY = sigY + SPACING.md + LINE_HEIGHTS.small + SPACING.sm;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  doc.text(company.name, sig2X + SPACING.sm, prestaY);
  prestaY += LINE_HEIGHTS.tiny + SPACING.xs;
  doc.text('Date : _________________________', sig2X + SPACING.sm, prestaY);
  prestaY += LINE_HEIGHTS.tiny + SPACING.md;
  doc.text('Signature :', sig2X + SPACING.sm, prestaY);
  // Zone blanche pour signature/tampon
  prestaY += LINE_HEIGHTS.tiny + SPACING.lg;
  
  return sigY + sigBoxH + SPACING.md;
};

/**
 * Dessine la page 2 : Conditions de vente (fluide, simple, protecteur, non agressif)
 * Nécessite addDays (date-fns).
 */
const drawConditionsPage = (
  doc: jsPDF,
  company: GenerateQuoteWithMultipleServicesPayload['company'],
  isIndividual: boolean,
  isProfessional: boolean,
  vatEnabled: boolean,
  issueDate: Date,
  paymentMethod: string,
  margin: number,
  rightX: number,
  contentWidth: number,
  pageHeight: number
): void => {
  // Logo en haut à droite
  const logoMaxW = 100;
  const logoMaxH = 40;
  if (company.invoiceLogoUrl) {
    try {
      const defaultAspectRatio = 2.5;
      const logoDims = calculateLogoDimensions(logoMaxW, logoMaxH, defaultAspectRatio);
      doc.addImage(
        company.invoiceLogoUrl,
        detectImageFormat(company.invoiceLogoUrl),
        rightX - logoDims.width,
        margin,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM'
      );
    } catch (error) {
      console.warn("⚠️ Impossible d'afficher le logo:", error);
    }
  }

  let y = margin + SPACING.xl;

  // Titre + séparateur discret
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setColor(doc, COLORS.text);
  doc.text('CONDITIONS DE VENTE', margin, y);

  y = snapToGrid(y + 14);
  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(0.7);
  doc.line(margin, y, margin + 210, y); // ligne courte sous le titre
  y = snapToGrid(y + SPACING.lg);

  // Style paragraphe (uniforme)
  const bodySize = 9.5;
  const bodyLineH = 13; // lisible, pro, pas trop haut
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  setColor(doc, COLORS.textMedium);

  // ---- Calcul échéance : 30 jours fin de mois ----
  const endOfMonth = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 0);
  const dueDate = addDays(endOfMonth, 30);
  const formattedDueDate = format(dueDate, 'dd/MM/yyyy');
  const formattedDueDatePlusOne = format(addDays(dueDate, 1), 'dd/MM/yyyy');

  // ---- Texte fluide (pas de plan 1/2/3) ----
  const p1 =
    "Wash&Go réalise la prestation à domicile, à l'adresse indiquée sur le devis. " +
    "Le client s'assure qu'un accès est possible à la date prévue (présence sur place ou consignes d'accès). " +
    "Si l'accès est impossible ou si les conditions minimales d'intervention ne sont pas réunies, une replanification pourra être nécessaire.";

  const p2 =
    "Le présent devis devient définitif après signature précédée de la mention « Bon pour accord, lu et approuvé ». " +
    "Toute modification (ajout, retrait ou adaptation de prestations) doit être validée par écrit.";

  const p3 =
    `Paiement exigible au plus tard le ${formattedDueDate} (30 jours fin de mois).`;

  const p3penalites =
    `À compter du ${formattedDueDatePlusOne} (lendemain de la date d'échéance), des pénalités de retard sont applicables.`;

  const p3pro =
    "Pour les clients professionnels, une indemnité forfaitaire pour frais de recouvrement de 40 € est due en cas de retard de paiement (Code de commerce, art. L441-10).";

  const p4 =
    `Moyens de paiement acceptés : ${paymentMethod || 'chèque, virement bancaire, espèces'}. ` +
    "Le règlement est attendu au plus tard à la date d'échéance indiquée ci-dessus.";

  let p5 =
    "Assurance : Wash&Go est couvert par une assurance Responsabilité Civile Professionnelle (RC Pro).";
  if (company.insuranceCompany) {
    p5 += ` Assureur : ${company.insuranceCompany}.`;
  }

  // Ajout paragraphes (justifiés)
  y = addJustifiedText(doc, p1, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);

  y = addJustifiedText(doc, p2, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);

  y = addJustifiedText(doc, p3, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.xs);
  y = addJustifiedText(doc, p3penalites, margin, y, contentWidth, bodyLineH);
  if (isProfessional) {
    y = snapToGrid(y + SPACING.xs);
    y = addJustifiedText(doc, p3pro, margin, y, contentWidth, bodyLineH);
  }
  y = snapToGrid(y + SPACING.md);

  // Rétractation (particulier uniquement)
  if (isIndividual) {
    const retract =
      "Droit de rétractation : 14 jours (art. L.221-18 du Code de la consommation). " +
      "Le client peut demander l'exécution immédiate de la prestation et, le cas échéant, renoncer à son droit de rétractation selon les règles applicables.";
    y = addJustifiedText(doc, retract, margin, y, contentWidth, bodyLineH);
    y = snapToGrid(y + SPACING.md);
  }

  y = addJustifiedText(doc, p4, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);

  y = addJustifiedText(doc, p5, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.lg);

  // TVA (visible)
  if (!vatEnabled) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    setColor(doc, COLORS.error); // rouge visible
    const tvaLine = "TVA non applicable — article 293 B du Code général des impôts.";
    y = addJustifiedText(doc, tvaLine, margin, y, contentWidth, 13);
  } else if (vatEnabled && company.vatNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    setColor(doc, COLORS.textMedium);
    const tvaLine = `TVA applicable. N° TVA : ${company.vatNumber}.`;
    y = addJustifiedText(doc, tvaLine, margin, y, contentWidth, bodyLineH);
  }
};

/**
 * Ajoute le footer sur toutes les pages
 */
const addFooterToAllPages = (
  doc: jsPDF,
  company: GenerateQuoteWithMultipleServicesPayload['company'],
  vatEnabled: boolean,
  margin: number,
  rightX: number,
  pageHeight: number
): void => {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    
    const footerY = pageHeight - 36;
    
    setDrawColor(doc, COLORS.borderLight);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, rightX, footerY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONTS.tiny);
    setColor(doc, COLORS.textLight);
    
    const footerText =
      `${company.name} • ${company.address}, ${company.postalCode} ${company.city} • SIRET ${company.siret}` +
      (vatEnabled && company.vatNumber ? ` • TVA ${company.vatNumber}` : '');
    
    doc.text(footerText, margin, footerY + SPACING.sm + 2);
    doc.text(`Page ${p} / ${total}`, rightX, footerY + SPACING.sm + 2, { align: 'right' });
  }
};

// ========================= FONCTION PRINCIPALE =========================
export const generateQuotePdfWithMultipleServices = ({
  documentNumber,
  issueDate,
  serviceDate,
  company,
  client,
  contact,
  services,
  vatRate,
  vatEnabled,
  validityNote = '30 jours',
  paymentMethod = 'Chèque, virement bancaire, espèces',
  paymentTerms = 'À réception de facture',
  deposit = 0,
  categories = [],
}: GenerateQuoteWithMultipleServicesPayload) => {
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
  const headingTitle = vatEnabled ? 'DEVIS' : 'OFFRE DE PRIX';

  // Déterminer si c'est un particulier ou un professionnel
  const isIndividual = client.type === 'individual';
  const isProfessional = client.type === 'company';

  const rightX = pageWidth - margin;
  let currentPage = 1;
  const maxY = pageHeight - 90;
  let y = margin;

  // Fonction pour ajouter une nouvelle page si nécessaire
  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > maxY) {
      doc.addPage();
      currentPage++;
      y = margin;
      return true;
    }
    return false;
  };

  // ========================= PAGE 1 =========================
  
  // Header : Logo + infos entreprise + OFFRE DE PRIX
  const validityDays = validityNote ? validityNote.replace(/[^0-9]/g, '') || '30' : '30';
  const validityDate = addDays(issueDate, parseInt(validityDays));
  const formattedValidityDate = format(validityDate, 'dd/MM/yyyy');
  
  const headerHeight = drawHeader(
    doc,
    company,
    headingTitle,
    documentNumber,
    formattedIssueDate,
    formattedServiceDate,
    formattedValidityDate,
    vatEnabled,
    margin,
    rightX
  );
  
  y = snapToGrid(margin + headerHeight + SPACING.lg);
  
  // Bloc CONTACT (à gauche) et CLIENT (à droite) - côte à côte
  checkPageBreak(100);
  const startY = y;
  let contactY = startY;
  let clientY = startY;
  
  // Dessiner le contact à gauche si présent (pour les clients professionnels)
  if (contact && client.type === 'company') {
    contactY = drawContactBlock(doc, contact, margin, startY);
  }
  
  // Dessiner le client à droite
  clientY = drawClientBlock(doc, client, rightX, startY);
  
  // Prendre la hauteur maximale des deux blocs
  y = Math.max(contactY, clientY);
  y = snapToGrid(y + SPACING.lg);
  
  // Tableau des prestations
  // Construire les lignes du document
  interface ExtendedInvoiceLine {
    label: string;
    description: string; // Description de la prestation (depuis le catalogue)
    typeDuration: string; // Type et Durée (ex: "Type : X • Durée : Y")
    quantity: number;
    unitPrice: number;
    total: number;
  }
  
  const allDocumentLines: ExtendedInvoiceLine[] = [];
  
  services.forEach((serviceItem) => {
    // Récupérer la sous-catégorie si elle existe (pour l'afficher dans TYPE/DURÉE)
    const subCategory = serviceItem.subCategoryId 
      ? categories.find((cat) => cat.id === serviceItem.subCategoryId)
      : null;
    
    const serviceOptions = serviceItem.options || [];
    const basePrice = serviceItem.base_price ?? (serviceItem as any).base_price;
    const baseDuration = serviceItem.base_duration ?? (serviceItem as any).base_duration;
    
    // Si le service a base_price/base_duration et pas d'options, créer une ligne avec ces valeurs
    if (serviceOptions.length === 0) {
      const serviceDescription = serviceItem.serviceDescription || '';
      
      // TYPE/DURÉE : sous-catégorie + descriptif du support + durée
      const typeDurationParts = [];
      if (subCategory?.name) {
        typeDurationParts.push(subCategory.name);
      }
      if (serviceItem.supportDetail && serviceItem.supportDetail.trim()) {
        typeDurationParts.push(serviceItem.supportDetail.trim());
      }
      // Utiliser baseDuration si disponible, sinon la durée de la sous-catégorie
      const duration = baseDuration !== undefined && baseDuration !== null && baseDuration > 0
        ? baseDuration
        : (subCategory?.defaultDurationMin || 0);
      if (duration > 0) {
        typeDurationParts.push(formatDuration(duration));
      }
      const typeDuration = typeDurationParts.join(' • ') || '';
      
      // Utiliser la quantité du service si disponible
      const serviceQuantity = serviceItem.quantity ?? 1;
      
      // Prix unitaire : basePrice + prix de la sous-catégorie (si elle existe)
      const subCategoryPrice = subCategory?.priceHT || 0;
      const unitPrice = (basePrice ?? 0) + subCategoryPrice;
      
      allDocumentLines.push({
        label: serviceItem.serviceName || 'Prestation',
        description: serviceDescription,
        typeDuration,
        quantity: serviceQuantity,
        unitPrice: unitPrice,
        total: roundCurrency(unitPrice * serviceQuantity),
      });
    } else if (serviceOptions.length > 0) {
      // Utiliser la quantité du service si disponible
      const serviceQuantity = serviceItem.quantity ?? 1;
      
      // Prix de la sous-catégorie (à ajouter au prix unitaire de chaque option)
      const subCategoryPrice = subCategory?.priceHT || 0;
      
      serviceOptions.forEach((option) => {
        const override = serviceItem.optionOverrides?.[option.id];
        const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
        // Multiplier la quantité de l'option par la quantité du service
        const quantity = optionQuantity * serviceQuantity;
        const durationMin =
          override?.durationMin !== undefined && override.durationMin >= 0
            ? override.durationMin
            : option.defaultDurationMin;
        // Prix unitaire : prix de l'option + prix de la sous-catégorie
        const optionUnitPrice =
          override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
            ? override.unitPriceHT
            : option.unitPriceHT;
        const unitPrice = optionUnitPrice + subCategoryPrice;
        
        // Description de la prestation : priorité à l'option.description, sinon serviceDescription
        const serviceDescription = option.description || serviceItem.serviceDescription || '';
        
        // TYPE/DURÉE : sous-catégorie + descriptif du support + durée
        const typeDurationParts = [];
        if (subCategory?.name) {
          typeDurationParts.push(subCategory.name);
        }
        if (serviceItem.supportDetail && serviceItem.supportDetail.trim()) {
          typeDurationParts.push(serviceItem.supportDetail.trim());
        }
        if (durationMin && durationMin > 0) {
          typeDurationParts.push(formatDuration(durationMin));
        }
        const typeDuration = typeDurationParts.join(' • ') || '';
        
        // Intitulé = exactement le nom du produit (option.label en priorité, sinon serviceName)
        const productLabel = option.label || serviceItem.serviceName || 'Prestation';
        
        allDocumentLines.push({
          label: productLabel,
          description: serviceDescription, // Description de la prestation (option ou service)
          typeDuration, // Sous-catégorie + détail + durée
          quantity,
          unitPrice,
          total: roundCurrency(unitPrice * quantity),
        });
      });
    }

    // Frais complémentaires
    if (serviceItem.additionalCharge && serviceItem.additionalCharge > 0) {
      allDocumentLines.push({
        label: 'Frais complémentaires',
        description: 'Frais supplémentaires',
        typeDuration: '',
        quantity: 1,
        unitPrice: serviceItem.additionalCharge,
        total: serviceItem.additionalCharge,
      });
    }
  });

  // Calculer les totaux
  const subtotal = roundCurrency(allDocumentLines.reduce((sum, l) => sum + l.total, 0));
  const vatRateSafe = safeVatRate(vatRate);
  const vatAmount = vatEnabled ? roundCurrency(subtotal * (vatRateSafe / 100)) : 0;
  const grandTotal = vatEnabled ? roundCurrency(subtotal + vatAmount) : subtotal;
  
  // Dessiner le tableau
  checkPageBreak(80);
  y = drawServicesTable(doc, allDocumentLines, margin, rightX, contentWidth, y, checkPageBreak, contact);
  
  // Total à payer
  checkPageBreak(50);
  y = drawTotal(doc, vatEnabled ? grandTotal : subtotal, vatEnabled, rightX, y);
  
  // Signatures
  checkPageBreak(160);
  y = drawSignatures(doc, company, contentWidth, margin, y);
  
  // ========================= PAGE 2 : CONDITIONS DE VENTE =========================
  
  // Créer explicitement la page 2
  doc.addPage();
  currentPage++;
  
  drawConditionsPage(
    doc,
    company,
    isIndividual,
    isProfessional,
    vatEnabled,
    issueDate,
    paymentMethod,
    margin,
    rightX,
    contentWidth,
    pageHeight
  );
  
  // ========================= FOOTER SUR TOUTES LES PAGES =========================
  
  addFooterToAllPages(doc, company, vatEnabled, margin, rightX, pageHeight);

  return doc;
};

// ========================= INTERFACE POUR FACTURE MULTIPLE SERVICES =========================
export interface GenerateInvoiceWithMultipleServicesPayload {
  documentNumber: string;
  issueDate: Date;
  serviceDate: Date;
  dueDate: Date; // Date d'échéance obligatoire pour les factures
  company: Company & { 
    vatNumber?: string; 
    iban?: string; 
    bic?: string;
    legalForm?: string;
    insuranceCompany?: string;
    invoiceLogoUrl?: string;
  };
  client: Client;
  contact?: ClientContact | null;
  services: QuoteServiceItem[];
  vatRate: number;
  vatEnabled: boolean;
  paymentMethod?: string;
  paymentTerms?: string;
  categories?: Array<{ id: string; name: string; priceHT?: number; defaultDurationMin?: number }>;
}

/**
 * Dessine le header de facture : "FACTURE" avec date d'émission, date de réalisation et date d'échéance
 */
const drawInvoiceHeader = (
  doc: jsPDF,
  company: GenerateInvoiceWithMultipleServicesPayload['company'],
  documentNumber: string,
  formattedIssueDate: string,
  formattedServiceDate: string,
  formattedDueDate: string,
  vatEnabled: boolean,
  margin: number,
  rightX: number
): number => {
  let y = margin;
  
  // === COLONNE GAUCHE : Logo + Infos entreprise (identique au devis) ===
  const logoMaxW = 120;
  const logoMaxH = 50;
  let logoBottomY = y;
  
  if (company.invoiceLogoUrl) {
    try {
      const defaultAspectRatio = 2.5;
      const logoDims = calculateLogoDimensions(logoMaxW, logoMaxH, defaultAspectRatio);
      doc.addImage(
        company.invoiceLogoUrl,
        detectImageFormat(company.invoiceLogoUrl),
        margin,
        y,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM'
      );
      logoBottomY = y + logoDims.height;
    } catch (error) {
      console.warn('⚠️ Impossible d\'afficher le logo:', error);
    }
  }
  
  let infoY = snapToGrid(logoBottomY + SPACING.sm);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.body);
  setColor(doc, COLORS.text);
  doc.text(company.name || '-', margin, infoY);
  infoY = snapToGrid(infoY + LINE_HEIGHTS.body);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny);
  setColor(doc, COLORS.textMedium);
  
  if (company.address) {
    doc.text(company.address, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  if (company.postalCode && company.city) {
    doc.text(`${company.postalCode} ${company.city}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  
  if (company.siret) {
    doc.text(`SIRET : ${company.siret}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  
  if (company.phone) {
    doc.text(`Téléphone : ${company.phone}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  if (company.email) {
    doc.text(`Email : ${company.email}`, margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.tiny);
  }
  
  // TVA non applicable
  if (!vatEnabled) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.small);
    setColor(doc, COLORS.error);
    doc.text('TVA non applicable — article 293 B du Code général des impôts', margin, infoY);
    infoY = snapToGrid(infoY + LINE_HEIGHTS.small);
  }
  
  const leftColumnHeight = infoY - margin;
  
  // === COLONNE DROITE : FACTURE (pas "Devis") ===
  const rightPadding = SPACING.md;
  const xRight = rightX - rightPadding;
  let rightY = margin;
  
  // 1) TITRE "FACTURE"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setColor(doc, COLORS.text);
  doc.text('FACTURE', xRight, rightY, { align: 'right' });
  
  // 2) BARRE HORIZONTALE
  const titleW = doc.getTextWidth('FACTURE');
  const infoBlockWidth = 180;
  const barW = Math.max(infoBlockWidth, titleW + 10);
  const barX1 = xRight - barW;
  rightY = snapToGrid(rightY + 16);
  
  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(0.7);
  doc.line(barX1, rightY, xRight, rightY);
  
  rightY = snapToGrid(rightY + 12);
  
  // 3) INFOS (4 lignes) : Facture n°, Émis le, Réalisé le, Échéance le (PAS de validité)
  const infoLeftX = xRight - infoBlockWidth;
  const labelX = infoLeftX;
  const valueX = xRight;
  
  const infoFont = 9;
  const infoLineH = 12;
  doc.setFontSize(infoFont);
  
  const drawInfoLine = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    setColor(doc, COLORS.textLight);
    doc.text(label, labelX, rightY);
    
    doc.setFont('helvetica', 'bold');
    setColor(doc, COLORS.text);
    doc.text(value, valueX, rightY, { align: 'right' });
    
    rightY = snapToGrid(rightY + infoLineH);
  };
  
  drawInfoLine('Facture n°', documentNumber);
  drawInfoLine('Émis le', formattedIssueDate);
  drawInfoLine('Réalisé le', formattedServiceDate);
  drawInfoLine('Échéance le', formattedDueDate);
  
  const rightColumnHeight = rightY - margin;
  
  return Math.max(leftColumnHeight, rightColumnHeight);
};

/**
 * Dessine les conditions légales pour les factures (conforme L441-9, L441-10, 242 nonies A CGI)
 */
const drawInvoiceLegalConditions = (
  doc: jsPDF,
  company: GenerateInvoiceWithMultipleServicesPayload['company'],
  isIndividual: boolean,
  isProfessional: boolean,
  vatEnabled: boolean,
  dueDate: Date,
  paymentMethod: string,
  margin: number,
  rightX: number,
  contentWidth: number
): void => {
  let y = margin + SPACING.xl;
  
  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setColor(doc, COLORS.text);
  doc.text('CONDITIONS DE PAIEMENT ET MENTIONS LÉGALES', margin, y);
  
  y = snapToGrid(y + 14);
  setDrawColor(doc, COLORS.borderLight);
  doc.setLineWidth(0.7);
  doc.line(margin, y, margin + 350, y);
  y = snapToGrid(y + SPACING.lg);
  
  const bodySize = 9.5;
  const bodyLineH = 13;
  const formattedDueDate = format(dueDate, 'dd/MM/yyyy');
  
  // ========== CONDITIONS DE PAIEMENT ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, COLORS.text);
  y = addText(doc, 'Conditions de paiement', margin, y, contentWidth, bodyLineH + 2);
  y = snapToGrid(y + SPACING.xs);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  setColor(doc, COLORS.textMedium);
  
  const cp1 = `Le règlement de la présente facture est exigible à la date d'échéance indiquée, sans escompte pour paiement anticipé.`;
  y = addText(doc, cp1, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.xs);
  
  const cp2 = `Les moyens de paiement acceptés sont : ${paymentMethod || 'virement bancaire, chèque et espèces (dans la limite légale autorisée)'}.`;
  y = addText(doc, cp2, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);
  
  // ========== CLIENT PROFESSIONNEL (B2B) ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, COLORS.text);
  y = addText(doc, 'Client professionnel (B2B)', margin, y, contentWidth, bodyLineH + 2);
  y = snapToGrid(y + SPACING.xs);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  setColor(doc, COLORS.textMedium);
  
  const b2b1 = `Conformément à l'article L441-10 du Code de commerce, tout retard de paiement entraîne, de plein droit et sans qu'un rappel soit nécessaire, l'application de pénalités de retard calculées sur la base du taux d'intérêt légal en vigueur.`;
  y = addText(doc, b2b1, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.xs);
  
  const b2b2 = `Une indemnité forfaitaire de 40 € pour frais de recouvrement est due de plein droit en cas de retard de paiement (article L441-10 II du Code de commerce). Une indemnisation complémentaire pourra être demandée si les frais réellement engagés sont supérieurs.`;
  y = addText(doc, b2b2, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);
  
  // ========== CLIENT PARTICULIER (B2C) ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, COLORS.text);
  y = addText(doc, 'Client particulier (B2C)', margin, y, contentWidth, bodyLineH + 2);
  y = snapToGrid(y + SPACING.xs);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  setColor(doc, COLORS.textMedium);
  
  const b2c1 = `En cas de retard de paiement, le prestataire se réserve le droit de suspendre toute nouvelle prestation jusqu'au règlement complet des sommes dues.`;
  y = addText(doc, b2c1, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);
  
  // ========== DISPOSITIONS GÉNÉRALES ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, COLORS.text);
  y = addText(doc, 'Dispositions générales', margin, y, contentWidth, bodyLineH + 2);
  y = snapToGrid(y + SPACING.xs);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  setColor(doc, COLORS.textMedium);
  
  const gen1 = `Le non-paiement à échéance peut entraîner, après mise en demeure restée sans effet, le recours à toute procédure de recouvrement amiable ou judiciaire, conformément à la législation en vigueur.`;
  y = addText(doc, gen1, margin, y, contentWidth, bodyLineH);
  y = snapToGrid(y + SPACING.md);
  
  // ========== TVA ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, COLORS.text);
  y = addText(doc, 'TVA', margin, y, contentWidth, bodyLineH + 2);
  y = snapToGrid(y + SPACING.xs);
  
  if (!vatEnabled) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    setColor(doc, COLORS.error);
    const tvaLine = "TVA non applicable — article 293 B du Code général des impôts.";
    y = addText(doc, tvaLine, margin, y, contentWidth, 13);
  } else if (vatEnabled && company.vatNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    setColor(doc, COLORS.textMedium);
    const tvaLine = `TVA applicable. N° TVA : ${company.vatNumber}.`;
    y = addText(doc, tvaLine, margin, y, contentWidth, bodyLineH);
  }
};

/**
 * Génère une facture conforme au droit français (L441-9, L441-10, 242 nonies A CGI)
 */
export const generateInvoicePdfWithMultipleServices = ({
  documentNumber,
  issueDate,
  serviceDate,
  dueDate,
  company,
  client,
  contact,
  services,
  vatRate,
  vatEnabled,
  paymentMethod = 'Chèque, virement bancaire, espèces',
  paymentTerms,
  categories = [],
}: GenerateInvoiceWithMultipleServicesPayload) => {
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
  const formattedDueDate = format(dueDate, 'dd/MM/yyyy');

  const isIndividual = client.type === 'individual';
  const isProfessional = client.type === 'company';

  const rightX = pageWidth - margin;
  let currentPage = 1;
  const maxY = pageHeight - 90;
  let y = margin;

  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > maxY) {
      doc.addPage();
      currentPage++;
      y = margin;
      return true;
    }
    return false;
  };

  // ========================= PAGE 1 =========================
  
  // Header : Logo + infos entreprise + FACTURE
  const headerHeight = drawInvoiceHeader(
    doc,
    company,
    documentNumber,
    formattedIssueDate,
    formattedServiceDate,
    formattedDueDate,
    vatEnabled,
    margin,
    rightX
  );
  
  y = snapToGrid(margin + headerHeight + SPACING.lg);
  
  // Bloc CONTACT et CLIENT (identique au devis)
  checkPageBreak(100);
  const startY = y;
  let contactY = startY;
  let clientY = startY;
  
  if (contact && client.type === 'company') {
    contactY = drawContactBlock(doc, contact, margin, startY);
  }
  
  clientY = drawClientBlock(doc, client, rightX, startY);
  
  y = Math.max(contactY, clientY);
  y = snapToGrid(y + SPACING.lg);
  
  // Tableau des prestations (réutiliser la même logique que le devis)
  interface ExtendedInvoiceLine {
    label: string;
    description: string;
    typeDuration: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }
  
  const allDocumentLines: ExtendedInvoiceLine[] = [];
  
  services.forEach((serviceItem) => {
    const subCategory = serviceItem.subCategoryId 
      ? categories.find((cat) => cat.id === serviceItem.subCategoryId)
      : null;
    
    const serviceOptions = serviceItem.options || [];
    const basePrice = serviceItem.base_price ?? (serviceItem as any).base_price;
    const baseDuration = serviceItem.base_duration ?? (serviceItem as any).base_duration;
    
    if (serviceOptions.length === 0) {
      const serviceDescription = serviceItem.serviceDescription || '';
      const typeDurationParts = [];
      if (subCategory?.name) {
        typeDurationParts.push(subCategory.name);
      }
      if (serviceItem.supportDetail && serviceItem.supportDetail.trim()) {
        typeDurationParts.push(serviceItem.supportDetail.trim());
      }
      const duration = baseDuration !== undefined && baseDuration !== null && baseDuration > 0
        ? baseDuration
        : (subCategory?.defaultDurationMin || 0);
      if (duration > 0) {
        typeDurationParts.push(formatDuration(duration));
      }
      const typeDuration = typeDurationParts.join(' • ') || '';
      const serviceQuantity = serviceItem.quantity ?? 1;
      const subCategoryPrice = subCategory?.priceHT || 0;
      const unitPrice = (basePrice ?? 0) + subCategoryPrice;
      
      allDocumentLines.push({
        label: serviceItem.serviceName || 'Prestation',
        description: serviceDescription,
        typeDuration,
        quantity: serviceQuantity,
        unitPrice: unitPrice,
        total: roundCurrency(unitPrice * serviceQuantity),
      });
    } else if (serviceOptions.length > 0) {
      const serviceQuantity = serviceItem.quantity ?? 1;
      const subCategoryPrice = subCategory?.priceHT || 0;
      
      serviceOptions.forEach((option) => {
        const override = serviceItem.optionOverrides?.[option.id];
        const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
        const quantity = optionQuantity * serviceQuantity;
        const durationMin =
          override?.durationMin !== undefined && override.durationMin >= 0
            ? override.durationMin
            : option.defaultDurationMin;
        const optionUnitPrice =
          override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
            ? override.unitPriceHT
            : option.unitPriceHT;
        const unitPrice = optionUnitPrice + subCategoryPrice;
        const serviceDescription = option.description || serviceItem.serviceDescription || '';
        const typeDurationParts = [];
        if (subCategory?.name) {
          typeDurationParts.push(subCategory.name);
        }
        if (serviceItem.supportDetail && serviceItem.supportDetail.trim()) {
          typeDurationParts.push(serviceItem.supportDetail.trim());
        }
        if (durationMin && durationMin > 0) {
          typeDurationParts.push(formatDuration(durationMin));
        }
        const typeDuration = typeDurationParts.join(' • ') || '';
        const productLabel = option.label || serviceItem.serviceName || 'Prestation';
        
        allDocumentLines.push({
          label: productLabel,
          description: serviceDescription,
          typeDuration,
          quantity,
          unitPrice,
          total: roundCurrency(unitPrice * quantity),
        });
      });
    }

    if (serviceItem.additionalCharge && serviceItem.additionalCharge > 0) {
      allDocumentLines.push({
        label: 'Frais complémentaires',
        description: 'Frais supplémentaires',
        typeDuration: '',
        quantity: 1,
        unitPrice: serviceItem.additionalCharge,
        total: serviceItem.additionalCharge,
      });
    }
  });

  const subtotal = roundCurrency(allDocumentLines.reduce((sum, l) => sum + l.total, 0));
  const vatRateSafe = safeVatRate(vatRate);
  const vatAmount = vatEnabled ? roundCurrency(subtotal * (vatRateSafe / 100)) : 0;
  const grandTotal = vatEnabled ? roundCurrency(subtotal + vatAmount) : subtotal;
  
  // Dessiner le tableau (réutiliser la fonction du devis)
  checkPageBreak(80);
  y = drawServicesTable(doc, allDocumentLines, margin, rightX, contentWidth, y, checkPageBreak, contact);
  
  // Total à payer
  checkPageBreak(50);
  y = drawTotal(doc, vatEnabled ? grandTotal : subtotal, vatEnabled, rightX, y);
  
  // PAS de signatures pour les factures (supprimé conformément aux exigences)
  
  // ========================= PAGE 2 : CONDITIONS LÉGALES =========================
  
  doc.addPage();
  currentPage++;
  
  drawInvoiceLegalConditions(
    doc,
    company,
    isIndividual,
    isProfessional,
    vatEnabled,
    dueDate,
    paymentMethod,
    margin,
    rightX,
    contentWidth
  );
  
  // ========================= FOOTER SUR TOUTES LES PAGES =========================
  
  addFooterToAllPages(doc, company, vatEnabled, margin, rightX, pageHeight);

  return doc;
};

// ========================= FONCTION WRAPPER (rétrocompatibilité) =========================
export interface GenerateQuotePayload {
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
  validityNote?: string | null;
}

export const generateQuotePdf = (payload: GenerateQuotePayload) => {
  const quoteService: QuoteServiceItem = {
    serviceId: payload.service.id,
    serviceName: payload.service.name,
    serviceDescription: payload.service.description || '', // Description de la prestation depuis le catalogue
    supportType: payload.supportType,
    supportDetail: payload.supportDetail,
    options: payload.options,
    optionOverrides: payload.optionOverrides,
    additionalCharge: payload.additionalCharge,
  };

  return generateQuotePdfWithMultipleServices({
    documentNumber: payload.documentNumber,
    issueDate: payload.issueDate,
    serviceDate: payload.serviceDate,
    company: {
      ...payload.company,
      legalForm: (payload.company as any).legalForm || undefined,
      insuranceCompany: (payload.company as any).insuranceCompany || undefined,
    },
    client: payload.client,
    services: [quoteService],
    vatRate: payload.vatRate,
    vatEnabled: payload.vatEnabled,
    validityNote: payload.validityNote || '30 jours',
    paymentMethod: 'Chèque, virement bancaire, espèces',
    paymentTerms: 'À réception de facture',
    deposit: 0,
  });
};
