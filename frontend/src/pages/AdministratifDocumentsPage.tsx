import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Plus, Search, Download, Edit2, Trash2, X, FolderOpen } from 'lucide-react';
import clsx from 'clsx';

import { useAppData } from '../store/useAppData';
import { DocumentService, type DocumentRecord } from '../api';
import { formatCurrency, formatDate } from '../lib/format';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormTextarea,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
} from '../components/crm';

const parseTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  const kiloBytes = bytes / 1024;
  if (kiloBytes < 1024) {
    return `${kiloBytes < 10 ? kiloBytes.toFixed(1) : Math.round(kiloBytes)} Ko`;
  }
  const megaBytes = kiloBytes / 1024;
  if (megaBytes < 1024) {
    return `${megaBytes < 10 ? megaBytes.toFixed(1) : Math.round(megaBytes)} Mo`;
  }
  const gigaBytes = megaBytes / 1024;
  return `${gigaBytes < 10 ? gigaBytes.toFixed(1) : Math.round(gigaBytes)} Go`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Impossible de lire le fichier.'));
    };
    reader.readAsDataURL(file);
  });

const deriveFileType = (file: File) => {
  const name = file.name.trim();
  const extension = name.includes('.') ? name.split('.').pop() : '';
  if (extension) {
    return extension.toUpperCase();
  }
  if (file.type) {
    const [, subtype] = file.type.split('/');
    return (subtype ?? file.type).toUpperCase();
  }
  return 'FICHIER';
};

const buildFormState = (document: DocumentRecord) => ({
  title: document.title,
  category: document.category,
  owner: document.owner,
  description: document.description,
  tags: document.tags.join(', '),
  link: document.url ?? '',
  fileName: document.fileName ?? '',
  fileType: document.fileType ?? '',
  size: document.size ?? '',
  fileData: document.fileData ?? '',
});

const EMPTY_FORM = {
  title: '',
  category: '',
  owner: '',
  description: '',
  tags: '',
  link: '',
  fileName: '',
  fileType: '',
  size: '',
  fileData: '',
};

type FormState = typeof EMPTY_FORM;

const AdministratifDocumentsPage = () => {
  const { hasPermission } = useAppData();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [createFileInputKey, setCreateFileInputKey] = useState(0);
  const [editFileInputKey, setEditFileInputKey] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const canEditDocuments = hasPermission('documents.edit');
  const canViewDocuments = hasPermission('documents.view');

  // Charger les documents depuis le backend
  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await DocumentService.getAll();
        if (result.success && result.data) {
          setDocuments(result.data);
        } else {
          setError(result.error || 'Erreur lors du chargement des documents');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  if (!canViewDocuments) {
    return (
      <div className="dashboard-page space-y-10">
        <header className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__intro">
              <p className="dashboard-hero__eyebrow">Accès restreint</p>
              <h1 className="dashboard-hero__title">Permissions requises</h1>
              <p className="dashboard-hero__subtitle">
                Vous n'avez pas l'autorisation de consulter les documents internes.
              </p>
            </div>
          </div>
          <div className="dashboard-hero__glow" aria-hidden />
        </header>
      </div>
    );
  }

  const handleDownload = (record: DocumentRecord) => {
    if (!canViewDocuments) {
      return;
    }
    if (record.fileData) {
      const fallbackName = record.title.replace(/\s+/g, '-').toLowerCase();
      const extension = record.fileType ? record.fileType.toLowerCase() : '';
      const safeName = record.fileName || (extension ? `${fallbackName}.${extension}` : fallbackName);
      const anchor = window.document.createElement('a');
      anchor.href = record.fileData;
      anchor.download = safeName;
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
      return;
    }
    if (record.url) {
      window.open(record.url, '_blank', 'noopener');
    }
  };

  const updateCreateFile = (file: File) => {
    readFileAsDataUrl(file)
      .then((dataUrl) => {
        setCreateForm((previous) => ({
          ...previous,
          fileName: file.name,
          fileType: deriveFileType(file),
          size: formatFileSize(file.size),
          fileData: dataUrl,
        }));
      })
      .catch(() => {
        setCreateForm((previous) => ({
          ...previous,
          fileName: '',
          fileType: '',
          size: '',
          fileData: '',
        }));
      });
  };

  const updateEditFile = (file: File) => {
    readFileAsDataUrl(file)
      .then((dataUrl) => {
        setEditForm((previous) =>
          previous
            ? {
                ...previous,
                fileName: file.name,
                fileType: deriveFileType(file),
                size: formatFileSize(file.size),
                fileData: dataUrl,
              }
            : previous
        );
      })
      .catch(() => {
        setEditForm((previous) =>
          previous
            ? {
                ...previous,
                fileName: '',
                fileType: '',
                size: '',
                fileData: '',
              }
            : previous
        );
      });
  };

  const handleCreateFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    updateCreateFile(file);
  };

  const handleEditFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    updateEditFile(file);
  };

  const clearCreateFile = () => {
    setCreateForm((previous) => ({
      ...previous,
      fileName: '',
      fileType: '',
      size: '',
      fileData: '',
    }));
    setCreateFileInputKey((value) => value + 1);
  };

  const clearEditFile = () => {
    setEditForm((previous) =>
      previous
        ? {
            ...previous,
            fileName: '',
            fileType: '',
            size: '',
            fileData: '',
          }
        : previous
    );
    setEditFileInputKey((value) => value + 1);
  };

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return documents;
    }

    return documents.filter((document) => {
      const haystack = [
        document.title,
        document.category,
        document.owner,
        document.description,
        document.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [documents, searchTerm]);

  const formatInteger = useMemo(() => new Intl.NumberFormat('fr-FR'), []);

  const documentKpis = useMemo(() => {
    const totalDocuments = documents.length;
    const documentsWithAttachment = documents.filter(
      (document) => Boolean(document.fileData) || Boolean(document.url)
    ).length;
    const latestUpdate = documents.reduce<string | null>((latest, document) => {
      if (!document.updatedAt) {
        return latest;
      }
      if (!latest) {
        return document.updatedAt;
      }
      return new Date(document.updatedAt) > new Date(latest) ? document.updatedAt : latest;
    }, null);

    return [
      {
        id: 'total',
        label: 'Documents actifs',
        value: totalDocuments.toLocaleString('fr-FR'),
        helper: `${documentsWithAttachment.toLocaleString('fr-FR')} avec pièces jointes`,
      },
      {
        id: 'attachments',
        label: 'Pièces disponibles',
        value: documentsWithAttachment.toLocaleString('fr-FR'),
        helper: `${totalDocuments - documentsWithAttachment} sans pièce`,
      },
      {
        id: 'last-update',
        label: 'Dernière mise à jour',
        value: latestUpdate ? formatDate(latestUpdate) : '—',
        helper: 'Document le plus récent',
      },
    ];
  }, [documents, formatInteger]);

  const handleOpenCreate = () => {
    if (!canEditDocuments) {
      return;
    }
    setShowCreateModal(true);
    setCreateForm(EMPTY_FORM);
    setCreateError(null);
    setCreateFileInputKey((value) => value + 1);
  };

  const handleOpenEdit = (document: DocumentRecord) => {
    if (!canEditDocuments) {
      return;
    }
    setEditingDocumentId(document.id);
    setEditForm(buildFormState(document));
    setEditError(null);
    setEditFileInputKey((value) => value + 1);
    setShowEditModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(EMPTY_FORM);
    setCreateError(null);
    setCreateFileInputKey((value) => value + 1);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDocumentId(null);
    setEditForm(null);
    setEditError(null);
    setEditFileInputKey((value) => value + 1);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditDocuments || isSubmitting) {
      return;
    }
    if (!createForm.title.trim()) {
      setCreateError('Le titre est requis.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const result = await DocumentService.create({
        title: createForm.title,
        category: createForm.category,
        description: createForm.description,
        owner: createForm.owner.trim() || 'Équipe',
        companyId: null,
        tags: parseTags(createForm.tags),
        source: 'manual',
        updatedAt: new Date().toISOString(),
        url: createForm.link.trim() || undefined,
        fileName: createForm.fileName || undefined,
        fileType: createForm.fileType || undefined,
        size: createForm.size || undefined,
        fileData: createForm.fileData || undefined,
      });

      if (result.success && result.data) {
        setDocuments((prev) => [result.data!, ...prev]);
        handleCloseCreateModal();
        setFeedback('Document créé avec succès.');
      } else {
        setCreateError(result.error || 'Erreur lors de la création du document');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditDocuments || isSubmitting || !editingDocumentId || !editForm) {
      return;
    }

    setIsSubmitting(true);
    setEditError(null);
    try {
      const result = await DocumentService.update(editingDocumentId, {
        title: editForm.title,
        category: editForm.category,
        description: editForm.description,
        owner: editForm.owner.trim() || 'Équipe',
        tags: parseTags(editForm.tags),
        source: 'manual',
        url: editForm.link.trim() || undefined,
        fileName: editForm.fileName || undefined,
        fileType: editForm.fileType || undefined,
        size: editForm.size || undefined,
        fileData: editForm.fileData || undefined,
      });

      if (result.success && result.data) {
        setDocuments((prev) => prev.map((doc) => (doc.id === editingDocumentId ? result.data! : doc)));
        handleCloseEditModal();
        setFeedback('Document modifié avec succès.');
      } else {
        setEditError(result.error || 'Erreur lors de la mise à jour du document');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!canEditDocuments || isSubmitting) {
      return;
    }
    const document = documents.find((d) => d.id === documentId);
    if (!document) {
      return;
    }
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le document "${document.title}" ? Cette action est irréversible.`)) {
      return;
    }

    if (editingDocumentId === documentId) {
      handleCloseEditModal();
    }

    setIsSubmitting(true);
    try {
      const result = await DocumentService.delete(documentId);
      if (result.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        setFeedback('Document supprimé avec succès.');
      } else {
        setError(result.error || 'Erreur lors de la suppression du document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tableData = filteredDocuments.map((document) => {
    const hasTotalHt = 'totalHt' in document && typeof (document as any).totalHt === 'number' && !Number.isNaN((document as any).totalHt);
    const hasTotalTtc = 'totalTtc' in document && typeof (document as any).totalTtc === 'number' && !Number.isNaN((document as any).totalTtc);

    return {
      id: document.id,
      document,
      hasTotalHt,
      hasTotalTtc,
    };
  });

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Comptabilité</p>
            <h1 className="dashboard-hero__title">Documents</h1>
            <p className="dashboard-hero__subtitle">
              Centralisez vos documents clés, contrats, attestations et rapports réglementaires.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <CRMBackendStatus
          loading={loading}
          error={error}
          loadingMessage="Synchronisation des documents avec le serveur…"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {documentKpis.map((kpi, index) => {
            const Icon = [FileText, FolderOpen, Download][index] ?? FileText;
            return (
              <div key={kpi.label} className="dashboard-kpi group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="dashboard-kpi__eyebrow">{kpi.label}</p>
                    <p className="dashboard-kpi__value">{kpi.value}</p>
                    <p className="dashboard-kpi__description">{kpi.helper}</p>
                  </div>
                  <div className="dashboard-kpi__icon">
                    <Icon />
                  </div>
                </div>
                <div className="dashboard-kpi__glow" aria-hidden />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <button
              type="button"
              onClick={() => window.open('https://drive.google.com/', '_blank', 'noopener')}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Google Drive</span>
            </button>
            {canEditDocuments && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                Nouveau document
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Document
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Type / Numéro
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Montants
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Mise à jour
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    {loading ? 'Chargement...' : 'Aucun document trouvé.'}
                  </td>
                </tr>
              ) : (
                tableData.map((row) => {
                  const { document } = row;
                  return (
                    <tr
                      key={document.id}
                      className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer"
                      onClick={() => canEditDocuments && handleOpenEdit(document)}
                    >
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{document.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {document.category || 'Archives internes'} · {document.owner || 'Équipe'}
                          </p>
                          {document.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{document.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {document.kind ? document.kind.toUpperCase() : document.category || 'Document'}
                        </p>
                        {document.number && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{document.number}</p>
                        )}
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{document.status ?? '—'}</span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        {row.hasTotalHt ? (
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {formatCurrency((document as any).totalHt ?? 0)} HT
                            </p>
                            {row.hasTotalTtc && (document as any).totalTtc !== (document as any).totalHt && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatCurrency((document as any).totalTtc ?? 0)} TTC
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Total indisponible</span>
                        )}
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(document.updatedAt)}</span>
                      </td>
                      <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {canViewDocuments && (document.fileData || document.url) && (
                            <button
                              type="button"
                              onClick={() => handleDownload(document)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                              title={document.fileData ? 'Télécharger' : 'Ouvrir'}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {canEditDocuments && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(document)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canEditDocuments && (
                            <button
                              type="button"
                              onClick={() => handleDelete(document.id)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {tableData.map((row) => {
          const { document } = row;
          return (
            <div
              key={document.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]"
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{document.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {document.category || 'Archives internes'} · {document.owner || 'Équipe'}
                </p>
                {document.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{document.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                {canViewDocuments && (document.fileData || document.url) && (
                  <button
                    type="button"
                    onClick={() => handleDownload(document)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Download className="h-4 w-4" />
                    {document.fileData ? 'Télécharger' : 'Ouvrir'}
                  </button>
                )}
                {canEditDocuments && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(document)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(document.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && !loading && (
        <CRMEmptyState message="Ajustez votre recherche pour retrouver vos documents." />
      )}

      {/* Modal de création */}
      {showCreateModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <CRMModal isOpen={showCreateModal} onClose={handleCloseCreateModal}>
            <div className="p-6">
              <CRMModalHeader title="Nouveau document" onClose={handleCloseCreateModal} />
              <form onSubmit={handleCreate} className="space-y-6 mt-6">
                {createError && <CRMErrorAlert message={createError} />}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <CRMFormLabel htmlFor="create-title" required>
                      Titre
                    </CRMFormLabel>
                    <CRMFormInput
                      id="create-title"
                      value={createForm.title}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="create-category">Catégorie</CRMFormLabel>
                    <CRMFormInput
                      id="create-category"
                      value={createForm.category}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="create-owner">Référent</CRMFormLabel>
                    <CRMFormInput
                      id="create-owner"
                      value={createForm.owner}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, owner: e.target.value }))}
                      placeholder="Équipe"
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="create-tags">Tags (séparés par des virgules)</CRMFormLabel>
                    <CRMFormInput
                      id="create-tags"
                      value={createForm.tags}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, tags: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <CRMFormLabel htmlFor="create-file">Fichier</CRMFormLabel>
                  <input
                    key={createFileInputKey}
                    id="create-file"
                    type="file"
                    onChange={handleCreateFileChange}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-200 focus:outline-none"
                  />
                  {createForm.fileName && (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {createForm.fileName}
                        {createForm.size && ` • ${createForm.size}`}
                      </span>
                      <button
                        type="button"
                        onClick={clearCreateFile}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <CRMFormLabel htmlFor="create-link">Lien ou référence interne</CRMFormLabel>
                  <CRMFormInput
                    id="create-link"
                    type="url"
                    value={createForm.link}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, link: e.target.value }))}
                  />
                </div>
                <div>
                  <CRMFormLabel htmlFor="create-description">Description</CRMFormLabel>
                  <CRMFormTextarea
                    id="create-description"
                    rows={4}
                    value={createForm.description}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <CRMCancelButton type="button" onClick={handleCloseCreateModal} disabled={isSubmitting}>
                    Annuler
                  </CRMCancelButton>
                  <CRMSubmitButton type="submit" disabled={isSubmitting}>
                    Créer
                  </CRMSubmitButton>
                </div>
              </form>
            </div>
          </CRMModal>,
          document.body
        )}

      {/* Modal d'édition */}
      {showEditModal &&
        editForm &&
        typeof document !== 'undefined' &&
        createPortal(
          <CRMModal isOpen={showEditModal} onClose={handleCloseEditModal}>
            <div className="p-6">
              <CRMModalHeader title="Modifier le document" onClose={handleCloseEditModal} />
              <form onSubmit={handleEdit} className="space-y-6 mt-6">
                {editError && <CRMErrorAlert message={editError} />}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <CRMFormLabel htmlFor="edit-title" required>
                      Titre
                    </CRMFormLabel>
                    <CRMFormInput
                      id="edit-title"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => prev && { ...prev, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="edit-category">Catégorie</CRMFormLabel>
                    <CRMFormInput
                      id="edit-category"
                      value={editForm.category}
                      onChange={(e) => setEditForm((prev) => prev && { ...prev, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="edit-owner">Référent</CRMFormLabel>
                    <CRMFormInput
                      id="edit-owner"
                      value={editForm.owner}
                      onChange={(e) => setEditForm((prev) => prev && { ...prev, owner: e.target.value })}
                      placeholder="Équipe"
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="edit-tags">Tags (séparés par des virgules)</CRMFormLabel>
                    <CRMFormInput
                      id="edit-tags"
                      value={editForm.tags}
                      onChange={(e) => setEditForm((prev) => prev && { ...prev, tags: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <CRMFormLabel htmlFor="edit-file">Remplacer le fichier</CRMFormLabel>
                  <input
                    key={editFileInputKey}
                    id="edit-file"
                    type="file"
                    onChange={handleEditFileChange}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-200 focus:outline-none"
                  />
                  {editForm.fileName && (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {editForm.fileName}
                        {editForm.size && ` • ${editForm.size}`}
                      </span>
                      <button
                        type="button"
                        onClick={clearEditFile}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <CRMFormLabel htmlFor="edit-link">Lien ou référence interne</CRMFormLabel>
                  <CRMFormInput
                    id="edit-link"
                    type="url"
                    value={editForm.link}
                    onChange={(e) => setEditForm((prev) => prev && { ...prev, link: e.target.value })}
                  />
                </div>
                <div>
                  <CRMFormLabel htmlFor="edit-description">Description</CRMFormLabel>
                  <CRMFormTextarea
                    id="edit-description"
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => prev && { ...prev, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <CRMCancelButton type="button" onClick={handleCloseEditModal} disabled={isSubmitting}>
                    Annuler
                  </CRMCancelButton>
                  <CRMSubmitButton type="submit" disabled={isSubmitting}>
                    Enregistrer
                  </CRMSubmitButton>
                </div>
              </form>
            </div>
          </CRMModal>,
          document.body
        )}
    </div>
  );
};

export default AdministratifDocumentsPage;
