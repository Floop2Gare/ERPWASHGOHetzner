export const SERVICE_COLUMN_CONFIG = {
  document: {
    // Affichage "Type" (Service / Devis / Facture)
    label: 'Type',
    defaultWidth: 160,
    minWidth: 140,
    maxWidth: 280,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  client: {
    // Organisation / contact (côté desktop on priorise le client, puis un contact principal)
    label: 'Organisation / contact',
    defaultWidth: 160,
    minWidth: 140,
    maxWidth: 240,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  support: {
    label: 'Support',
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 200,
    align: 'left' as const,
    resizable: true,
    // Trop technique au premier regard: masqué par défaut
    defaultVisible: false,
  },
  prestations: {
    label: 'Prestation réalisée',
    defaultWidth: 180,
    minWidth: 150,
    maxWidth: 300,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  duration: {
    label: 'Durée',
    defaultWidth: 100,
    minWidth: 80,
    maxWidth: 160,
    align: 'center' as const,
    resizable: true,
    // La durée est affichée dans "Chiffre d'affaires" pour éviter une colonne en plus
    defaultVisible: false,
  },
  amountHt: {
    label: 'Montant HT',
    defaultWidth: 110,
    minWidth: 95,
    maxWidth: 180,
    align: 'right' as const,
    resizable: true,
    // Le HT est affiché dans "Chiffre d'affaires" (avec TTC) pour éviter une colonne en plus
    defaultVisible: false,
  },
  vat: {
    label: 'TVA',
    defaultWidth: 90,
    minWidth: 80,
    maxWidth: 150,
    align: 'right' as const,
    resizable: true,
    defaultVisible: false,
  },
  total: {
    label: "Chiffre d'affaires",
    defaultWidth: 170,
    minWidth: 95,
    maxWidth: 240,
    align: 'right' as const,
    resizable: true,
    defaultVisible: true,
  },
  status: {
    label: 'Statut',
    defaultWidth: 110,
    minWidth: 95,
    maxWidth: 180,
    align: 'center' as const,
    resizable: true,
    // Le statut est visible dans "Type" au premier regard
    defaultVisible: false,
  },
  actions: {
    label: 'Actions',
    defaultWidth: 180,
    minWidth: 150,
    maxWidth: 280,
    align: 'right' as const,
    resizable: false,
    defaultVisible: true,
  },
} as const;

export type ServiceColumnId = keyof typeof SERVICE_COLUMN_CONFIG;

export const SERVICE_COLUMN_ORDER: ServiceColumnId[] = [
  'document',
  'client',
  'prestations',
  'total',
  'actions',
];

export const getDefaultColumnVisibility = (): Record<ServiceColumnId, boolean> =>
  SERVICE_COLUMN_ORDER.reduce((acc, columnId) => {
    acc[columnId] = SERVICE_COLUMN_CONFIG[columnId].defaultVisible;
    return acc;
  }, {} as Record<ServiceColumnId, boolean>);

export const getDefaultColumnWidths = (): Record<ServiceColumnId, number> =>
  SERVICE_COLUMN_ORDER.reduce((acc, columnId) => {
    acc[columnId] = SERVICE_COLUMN_CONFIG[columnId].defaultWidth;
    return acc;
  }, {} as Record<ServiceColumnId, number>);

