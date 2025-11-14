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

export const accountingKpis: AccountingKpi[] = [
  {
    id: 'revenue',
    label: "Chiffre d'affaires",
    value: 76540,
    trend: 12.4,
    trendLabel: 'vs T-1',
  },
  {
    id: 'expenses',
    label: 'Dépenses',
    value: 38210,
    trend: -4.2,
    trendLabel: 'vs T-1',
  },
  {
    id: 'profit',
    label: 'Bénéfice net',
    value: 22870,
    trend: 8.1,
    trendLabel: 'vs T-1',
  },
  {
    id: 'vat',
    label: 'TVA estimée',
    value: 7450,
    trend: 5.6,
    trendLabel: 'à déclarer',
  },
];

export const revenueTrend: ChartPoint[] = [
  { label: 'Jan', value: 18200 },
  { label: 'Fév', value: 19350 },
  { label: 'Mar', value: 21400 },
  { label: 'Avr', value: 20850 },
  { label: 'Mai', value: 22160 },
  { label: 'Juin', value: 23520 },
];

export const cashFlowProjection: ChartPoint[] = [
  { label: 'Semaine 1', value: 26800 },
  { label: 'Semaine 2', value: 25200 },
  { label: 'Semaine 3', value: 28750 },
  { label: 'Semaine 4', value: 30120 },
  { label: 'Semaine 5', value: 29480 },
];

export const expenseCategories: ChartPoint[] = [
  { label: 'Fournitures', value: 8200 },
  { label: 'Logistique', value: 5600 },
  { label: 'Personnel', value: 18600 },
  { label: 'Marketing', value: 4100 },
  { label: 'Autres', value: 2210 },
];

export const topClients: { name: string; amount: number; share: number }[] = [
  { name: 'Groupe Riviera Hôtels', amount: 18230, share: 0.24 },
  { name: 'Clinique Saint Jean', amount: 14560, share: 0.19 },
  { name: 'Mairie de Fuveau', amount: 12680, share: 0.16 },
  { name: 'Résidence Les Pins', amount: 9680, share: 0.12 },
];

export const upcomingDeadlines: { label: string; date: string; description: string }[] = [
  {
    label: 'TVA - Avril 2025',
    date: '05/05/2025',
    description: 'Déclaration CA3 et paiement estimé 4 120 €',
  },
  {
    label: 'Charges sociales',
    date: '15/05/2025',
    description: 'URSSAF et retraite complémentaire',
  },
  {
    label: 'Liasse fiscale',
    date: '30/06/2025',
    description: 'Préparation clôture fiscale exercice 2024',
  },
];

export const clientInvoices: ClientInvoice[] = [
  {
    id: 'ci-001',
    number: 'F2025-001',
    client: 'Groupe Riviera Hôtels',
    issueDate: '2025-04-04',
    dueDate: '2025-04-30',
    amountTtc: 4860,
    status: 'Payée',
  },
  {
    id: 'ci-002',
    number: 'F2025-002',
    client: 'Clinique Saint Jean',
    issueDate: '2025-04-08',
    dueDate: '2025-05-08',
    amountTtc: 3520,
    status: 'En attente',
  },
  {
    id: 'ci-003',
    number: 'F2025-003',
    client: 'Mairie de Fuveau',
    issueDate: '2025-04-11',
    dueDate: '2025-05-11',
    amountTtc: 2860,
    status: 'En attente',
  },
  {
    id: 'ci-004',
    number: 'F2025-004',
    client: 'Résidence Les Pins',
    issueDate: '2025-04-15',
    dueDate: '2025-05-15',
    amountTtc: 1980,
    status: 'Brouillon',
  },
  {
    id: 'ci-005',
    number: 'F2025-005',
    client: 'Société Aérosud',
    issueDate: '2025-04-18',
    dueDate: '2025-05-18',
    amountTtc: 4210,
    status: 'Payée',
  },
];

export const vendorInvoices: VendorInvoice[] = [
  {
    id: 'vi-001',
    number: 'FF2025-001',
    vendor: 'ÉcoFournitures Pro',
    issueDate: '2025-04-02',
    dueDate: '2025-05-02',
    amountTtc: 1680,
    status: 'À payer',
  },
  {
    id: 'vi-002',
    number: 'FF2025-002',
    vendor: 'LogiTrans Marseille',
    issueDate: '2025-04-06',
    dueDate: '2025-04-21',
    amountTtc: 940,
    status: 'Payée',
  },
  {
    id: 'vi-003',
    number: 'FF2025-003',
    vendor: 'NettoyageAzur',
    issueDate: '2025-04-12',
    dueDate: '2025-05-12',
    amountTtc: 2160,
    status: 'À payer',
  },
  {
    id: 'vi-004',
    number: 'FF2025-004',
    vendor: 'Medisupply',
    issueDate: '2025-04-20',
    dueDate: '2025-05-20',
    amountTtc: 3120,
    status: 'Brouillon',
  },
  {
    id: 'vi-005',
    number: 'FF2025-005',
    vendor: 'Agence ComProvence',
    issueDate: '2025-04-22',
    dueDate: '2025-05-22',
    amountTtc: 870,
    status: 'Payée',
  },
];

export const vatSnapshot: VatSnapshot = {
  periodLabel: 'Avril 2025',
  collected: 14280,
  deductible: 6830,
  declarationFrequency: 'Mensuelle',
  nextDeclarationDate: '2025-05-05',
  lastDeclarationDate: '2025-04-05',
  paymentDeadline: '2025-05-07',
};

export const vatHistory: VatHistoryPoint[] = [
  { period: 'Jan 2025', collected: 15680, deductible: 7120 },
  { period: 'Fév 2025', collected: 16210, deductible: 7350 },
  { period: 'Mar 2025', collected: 17040, deductible: 8010 },
  { period: 'Avr 2025', collected: 14280, deductible: 6830 },
];

export const exportPreviewRows: ExportPreviewRow[] = [
  {
    account: '706000',
    label: "Prestations de services",
    debit: 0,
    credit: 64200,
  },
  {
    account: '445710',
    label: 'TVA collectée',
    debit: 0,
    credit: 14280,
  },
  {
    account: '604000',
    label: 'Achats non stockés',
    debit: 11240,
    credit: 0,
  },
  {
    account: '607000',
    label: 'Achats de marchandises',
    debit: 9360,
    credit: 0,
  },
  {
    account: '445660',
    label: 'TVA déductible',
    debit: 6830,
    credit: 0,
  },
];




