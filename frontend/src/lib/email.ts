export const buildGmailComposeUrl = ({
  to,
  subject,
  body,
}: {
  to: string[];
  subject: string;
  body: string;
}) => {
  const recipients = encodeURIComponent(to.join(','));
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${recipients}&su=${encodedSubject}&body=${encodedBody}`;
};

export const openEmailComposer = ({
  to,
  subject,
  body,
}: {
  to: string[];
  subject: string;
  body: string;
}) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const gmailUrl = buildGmailComposeUrl({ to, subject, body });
  const popup = window.open(gmailUrl, '_blank', 'noopener,noreferrer');

  if (popup) {
    return true;
  }

  const mailtoUrl = `mailto:${encodeURIComponent(to.join(','))}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
  return false;
};

type NormalizedAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

const normalizeAttachment = (
  attachment?: { filename: string; dataUri: string }
): NormalizedAttachment | null => {
  if (!attachment || !attachment.filename || !attachment.dataUri) {
    return null;
  }
  const [metadata, base64] = attachment.dataUri.split(',');
  if (!base64) {
    return null;
  }
  const contentType = metadata?.split(';')?.[0]?.replace(/^data:/, '') || 'application/pdf';
  return {
    filename: attachment.filename,
    content: base64,
    contentType,
  };
};

export type SendDocumentEmailResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'request-error' | 'server-error'; message?: string };

export const sendDocumentEmail = async ({
  to,
  subject,
  body,
  attachment,
}: {
  to: string[];
  subject: string;
  body: string;
  attachment?: { filename: string; dataUri: string };
}): Promise<SendDocumentEmailResult> => {
  // Utiliser le client HTTP centralisé (gère baseUrl/proxy/erreurs)
  const { httpClient } = await import('../api/utils/httpClient');

  try {
    const payload: Record<string, unknown> = { to, subject, body };
    const normalized = normalizeAttachment(attachment);
    if (normalized) {
      payload.attachment = {
        filename: normalized.filename,
        content: normalized.content,
        contentType: normalized.contentType,
      };
    }

    const res = await httpClient.post('/send-document-email', payload);

    if (!res.success) {
      // Convention: 503 côté serveur renvoie success=false + error
      const notConfigured = (res.error || '').toLowerCase().includes('smtp') || (res.error || '').includes('503');
      return { ok: false, reason: notConfigured ? 'not-configured' : 'server-error', message: res.error };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: 'request-error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
