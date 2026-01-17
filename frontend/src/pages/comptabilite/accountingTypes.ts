export type AccountingKpi = {
  id: 'revenue' | 'expenses' | 'profit' | 'vat';
  label: string;
  value: number;
  trend: number;
  trendLabel: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type InvoiceStatus = 'Payée' | 'En attente' | 'Brouillon';

export type ClientInvoice = {
  id: string;
  number: string;
  client: string;
  issueDate: string;
  dueDate: string;
  amountTtc: number;
  status: InvoiceStatus;
};

export type VendorInvoiceStatus = 'Payée' | 'À payer' | 'Brouillon';

export type VendorInvoice = {
  id: string;
  number: string;
  vendor: string;
  issueDate: string;
  dueDate: string;
  amountTtc: number;
  status: VendorInvoiceStatus;
};

export type VatSnapshot = {
  periodLabel: string;
  collected: number;
  deductible: number;
  declarationFrequency: 'Mensuelle' | 'Trimestrielle';
  nextDeclarationDate: string;
  lastDeclarationDate: string;
  paymentDeadline: string;
};

export type VatHistoryPoint = {
  period: string;
  collected: number;
  deductible: number;
};

export type ExportPreviewRow = {
  account: string;
  label: string;
  debit: number;
  credit: number;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

