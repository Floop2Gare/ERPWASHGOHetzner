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
