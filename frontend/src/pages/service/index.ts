// Types
export type {
  EngagementDraft,
  QuickClientDraft,
  ServiceEmailPrompt,
  InvoiceEmailContext,
  OptionOverrideResolved,
} from './types';

// Constants
export {
  SERVICE_COLUMN_CONFIG,
  SERVICE_COLUMN_ORDER,
  getDefaultColumnVisibility,
  getDefaultColumnWidths,
  type ServiceColumnId,
} from './constants';

// Utils
export {
  createCalendarEvent,
  sanitizeDraftOverrides,
  resolveOptionOverride,
  toLocalInputValue,
  fromLocalInputValue,
  buildInitialDraft,
  buildDraftFromEngagement,
  buildPreviewEngagement,
  documentLabels,
  serviceKindStyles,
  serviceStatusStyles,
  documentTypeFromKind,
  buildLegacyDocumentNumber,
  getEngagementDocumentNumber,
  getNextInvoiceNumber,
  getNextQuoteNumber,
  sanitizeVatRate,
  computeVatMultiplier,
  formatVatRateLabel,
  formatFileSize,
} from './utils';

// Hooks
export {
  useServicePageState,
  useEngagementSelection,
  useDraftOptions,
} from './hooks';

