/**
 * Calculs comptables automatiques
 * Génère les écritures comptables à partir des factures clients et fournisseurs
 */

import { ClientInvoice, VendorInvoice, ExportPreviewRow } from './mockData';

// Taux de TVA standard en France
const VAT_RATE = 0.20;

/**
 * Calcule le montant HT à partir du montant TTC
 */
export const calculateHT = (ttc: number): number => {
  return Math.round((ttc / (1 + VAT_RATE)) * 100) / 100;
};

/**
 * Calcule le montant de TVA à partir du montant TTC
 */
export const calculateVAT = (ttc: number): number => {
  const ht = calculateHT(ttc);
  return Math.round((ttc - ht) * 100) / 100;
};

/**
 * Génère les écritures comptables pour les factures clients
 * Structure : Client (DÉBIT) = Prestations (CRÉDIT) + TVA (CRÉDIT)
 */
export const generateClientInvoiceEntries = (invoices: ClientInvoice[]): ExportPreviewRow[] => {
  const entries: ExportPreviewRow[] = [];

  // Filtrer uniquement les factures payées ou en attente (pas les brouillons)
  const validInvoices = invoices.filter((inv) => inv.status !== 'Brouillon');

  if (validInvoices.length === 0) {
    return entries;
  }

  // Calculer les totaux
  let totalHT = 0;
  let totalVAT = 0;
  let totalTTC = 0;

  validInvoices.forEach((invoice) => {
    const ht = calculateHT(invoice.amountTtc);
    const vat = calculateVAT(invoice.amountTtc);
    totalHT += ht;
    totalVAT += vat;
    totalTTC += invoice.amountTtc;
  });

  // Arrondir les totaux
  totalHT = Math.round(totalHT * 100) / 100;
  totalVAT = Math.round(totalVAT * 100) / 100;
  totalTTC = Math.round(totalTTC * 100) / 100;

  // Écriture 1: Clients (411000) - DÉBIT (ce qu'on doit recevoir)
  if (totalTTC > 0) {
    entries.push({
      account: '411000',
      label: 'Clients',
      debit: totalTTC,
      credit: 0,
    });
  }

  // Écriture 2: Prestations de services (706000) - CRÉDIT
  if (totalHT > 0) {
    entries.push({
      account: '706000',
      label: 'Prestations de services',
      debit: 0,
      credit: totalHT,
    });
  }

  // Écriture 3: TVA collectée (445710) - CRÉDIT
  if (totalVAT > 0) {
    entries.push({
      account: '445710',
      label: 'TVA collectée',
      debit: 0,
      credit: totalVAT,
    });
  }

  return entries;
};

/**
 * Génère les écritures comptables pour les factures fournisseurs
 * Structure : Achats (DÉBIT) + TVA (DÉBIT) = Fournisseurs (CRÉDIT)
 */
export const generateVendorInvoiceEntries = (invoices: VendorInvoice[]): ExportPreviewRow[] => {
  const entries: ExportPreviewRow[] = [];

  // Filtrer uniquement les factures payées ou à payer (pas les brouillons)
  const validInvoices = invoices.filter((inv) => inv.status !== 'Brouillon');

  if (validInvoices.length === 0) {
    return entries;
  }

  // Calculer les totaux
  let totalHT = 0;
  let totalVAT = 0;
  let totalTTC = 0;

  validInvoices.forEach((invoice) => {
    const ht = calculateHT(invoice.amountTtc);
    const vat = calculateVAT(invoice.amountTtc);
    totalHT += ht;
    totalVAT += vat;
    totalTTC += invoice.amountTtc;
  });

  // Arrondir les totaux
  totalHT = Math.round(totalHT * 100) / 100;
  totalVAT = Math.round(totalVAT * 100) / 100;
  totalTTC = Math.round(totalTTC * 100) / 100;

  // Écriture 1: Achats non stockés (604000) - DÉBIT
  if (totalHT > 0) {
    entries.push({
      account: '604000',
      label: 'Achats non stockés',
      debit: totalHT,
      credit: 0,
    });
  }

  // Écriture 2: TVA déductible (445660) - DÉBIT
  if (totalVAT > 0) {
    entries.push({
      account: '445660',
      label: 'TVA déductible',
      debit: totalVAT,
      credit: 0,
    });
  }

  // Écriture 3: Fournisseurs (401000) - CRÉDIT (ce qu'on doit payer)
  if (totalTTC > 0) {
    entries.push({
      account: '401000',
      label: 'Fournisseurs',
      debit: 0,
      credit: totalTTC,
    });
  }

  return entries;
};

/**
 * Génère toutes les écritures comptables à partir des factures
 */
export const generateAccountingEntries = (
  clientInvoices: ClientInvoice[],
  vendorInvoices: VendorInvoice[]
): ExportPreviewRow[] => {
  const clientEntries = generateClientInvoiceEntries(clientInvoices);
  const vendorEntries = generateVendorInvoiceEntries(vendorInvoices);

  // Fusionner et regrouper par compte
  const accountMap = new Map<string, ExportPreviewRow>();

  [...clientEntries, ...vendorEntries].forEach((entry) => {
    const existing = accountMap.get(entry.account);
    if (existing) {
      existing.debit += entry.debit;
      existing.credit += entry.credit;
      // Arrondir pour éviter les erreurs de précision
      existing.debit = Math.round(existing.debit * 100) / 100;
      existing.credit = Math.round(existing.credit * 100) / 100;
    } else {
      accountMap.set(entry.account, { ...entry });
    }
  });

  // Trier par numéro de compte
  return Array.from(accountMap.values()).sort((a, b) => a.account.localeCompare(b.account));
};

/**
 * Vérifie l'équilibre débit/crédit
 */
export const checkBalance = (entries: ExportPreviewRow[]): { balanced: boolean; difference: number } => {
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const difference = Math.abs(totalDebit - totalCredit);
  // Tolérance de 0.01€ pour les arrondis
  const balanced = difference < 0.01;

  return { balanced, difference };
};

/**
 * Calcule la TVA collectée totale à partir des factures clients
 */
export const calculateCollectedVAT = (invoices: ClientInvoice[]): number => {
  const validInvoices = invoices.filter((inv) => inv.status !== 'Brouillon');
  return validInvoices.reduce((sum, invoice) => sum + calculateVAT(invoice.amountTtc), 0);
};

/**
 * Calcule la TVA déductible totale à partir des factures fournisseurs
 */
export const calculateDeductibleVAT = (invoices: VendorInvoice[]): number => {
  const validInvoices = invoices.filter((inv) => inv.status !== 'Brouillon');
  return validInvoices.reduce((sum, invoice) => sum + calculateVAT(invoice.amountTtc), 0);
};

/**
 * Calcule le chiffre d'affaires HT à partir des factures clients
 */
export const calculateRevenueHT = (invoices: ClientInvoice[]): number => {
  const validInvoices = invoices.filter((inv) => inv.status !== 'Brouillon');
  return validInvoices.reduce((sum, invoice) => sum + calculateHT(invoice.amountTtc), 0);
};

/**
 * Calcule les dépenses HT à partir des factures fournisseurs
 */
export const calculateExpensesHT = (invoices: VendorInvoice[]): number => {
  const validInvoices = invoices.filter((inv) => inv.status !== 'Brouillon');
  return validInvoices.reduce((sum, invoice) => sum + calculateHT(invoice.amountTtc), 0);
};

