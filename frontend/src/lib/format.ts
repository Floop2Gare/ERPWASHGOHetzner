export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
};

export const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(isoDate)
  );

export const formatDateTime = (isoDate: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const applySignatureVariables = (value: string, replacements: Record<string, string>) =>
  value.replace(/\{([^}]+)\}/g, (match, key) => {
    const trimmed = key.trim();
    return replacements[trimmed] !== undefined ? replacements[trimmed] : '';
  });

export const signatureToPlainText = (
  signatureHtml: string | undefined,
  replacements: Record<string, string>
): string => {
  if (!signatureHtml) {
    return '';
  }
  const withVariables = applySignatureVariables(signatureHtml, replacements);
  const withBreaks = withVariables
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, (match) => (match.startsWith('</') ? '\n' : ''))
    .replace(/<\/?div[^>]*>/gi, (match) => (match.startsWith('</') ? '\n' : ''))
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n');
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '');
  const decoded = decodeHtmlEntities(withoutTags);
  return decoded
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

export const mergeBodyWithSignature = (
  body: string,
  signatureHtml: string | undefined,
  replacements: Record<string, string>
) => {
  const trimmedBody = body.trim();
  const signature = signatureToPlainText(signatureHtml, replacements);
  if (!signature) {
    return trimmedBody;
  }
  return `${trimmedBody}\n\n${signature}`.trim();
};

/**
 * Extrait la date au format YYYY-MM-DD d'un objet Date ou string ISO
 */
export const toISODateString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

/**
 * Parse une heure au format "HH:MM" en objet { hours, minutes }
 */
export const parseTime = (timeString: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { 
    hours: Number.isFinite(hours) ? hours : 0, 
    minutes: Number.isFinite(minutes) ? minutes : 0 
  };
};

/**
 * Split un nom de contact en firstName et lastName
 * Gère les cas : nom vide, un seul mot, plusieurs mots
 */
export const splitContactName = (
  contact: string | null | undefined
): { firstName: string; lastName: string } => {
  if (!contact) {
    return { firstName: '', lastName: '' };
  }
  const parts = contact.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};
