import { ChangeEvent, FormEvent, useCallback, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { Tag } from '../components/Tag';
import { useAppData, DocumentRecord } from '../store/useAppData';
import { formatCurrency } from '../lib/format';

const inputClassName =
  'w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const labelClassName = 'text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400';

const fileInputClassName =
  'block w-full text-sm text-slate-700 file:mr-3 file:rounded-soft file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.18em] file:text-slate-600 hover:file:bg-slate-200 focus:outline-none';

const formatDate = (isoDate: string) => format(new Date(isoDate), 'd MMM yyyy', { locale: fr });

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

type ActivePanel = 'create' | { type: 'edit'; id: string } | null;

const DocumentsPage = () => {
  const { documents, addDocument, updateDocument, removeDocument, hasPermission } = useAppData();

  const [searchTerm, setSearchTerm] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [createFileInputKey, setCreateFileInputKey] = useState(0);
  const [editFileInputKey, setEditFileInputKey] = useState(0);
  const listSectionRef = useRef<HTMLDivElement | null>(null);

  const canEditDocuments = hasPermission('documents.edit');
  const canViewDocuments = hasPermission('documents.view');

  if (!canViewDocuments) {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">Accès restreint</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Permissions requises</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vous n’avez pas l’autorisation de consulter les documents internes.
          </p>
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

  const scrollToList = useCallback(() => {
    requestAnimationFrame(() => {
      listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

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

  const handleOpenCreate = () => {
    if (!canEditDocuments) {
      return;
    }
    setActivePanel('create');
    setCreateForm(EMPTY_FORM);
    setEditForm(null);
    setCreateFileInputKey((value) => value + 1);
  };

  const handleOpenEdit = (document: DocumentRecord) => {
    if (!canEditDocuments) {
      return;
    }
    setActivePanel({ type: 'edit', id: document.id });
    setEditForm(buildFormState(document));
    setEditFileInputKey((value) => value + 1);
  };

  const handleClosePanel = () => {
    if (activePanel === 'create') {
      setCreateForm(EMPTY_FORM);
      setCreateFileInputKey((value) => value + 1);
    }
    if (activePanel && activePanel !== 'create') {
      setEditFileInputKey((value) => value + 1);
    }
    setActivePanel(null);
    setEditForm(null);
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditDocuments) {
      return;
    }
    if (!createForm.title.trim()) {
      return;
    }

    addDocument({
      title: createForm.title,
      category: createForm.category,
      description: createForm.description,
      owner: createForm.owner.trim() || 'Équipe',
      companyId: null,
      tags: parseTags(createForm.tags),
      source: 'Archive interne',
      url: createForm.link.trim() || undefined,
      fileName: createForm.fileName || undefined,
      fileType: createForm.fileType || undefined,
      size: createForm.size || undefined,
      fileData: createForm.fileData || undefined,
    });

    setCreateForm(EMPTY_FORM);
    setCreateFileInputKey((value) => value + 1);
    setActivePanel(null);
    scrollToList();
  };

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditDocuments) {
      return;
    }
    if (!editForm) {
      return;
    }

    const editingId = activePanel && activePanel !== 'create' ? activePanel.id : null;
    if (!editingId) {
      return;
    }

    updateDocument(editingId, {
      title: editForm.title,
      category: editForm.category,
      description: editForm.description,
      owner: editForm.owner.trim() || 'Équipe',
      tags: parseTags(editForm.tags),
      source: 'Archive interne',
      url: editForm.link.trim() || undefined,
      fileName: editForm.fileName || undefined,
      fileType: editForm.fileType || undefined,
      size: editForm.size || undefined,
      fileData: editForm.fileData || undefined,
    });

    setActivePanel(null);
    setEditForm(null);
    setEditFileInputKey((value) => value + 1);
  };

  const handleDelete = (documentId: string) => {
    if (!canEditDocuments) {
      return;
    }
    if (activePanel && activePanel !== 'create' && activePanel.id === documentId) {
      handleClosePanel();
    }
    removeDocument(documentId);
  };

  const rows = filteredDocuments.map((document) => {
    const hasTotalHt = typeof document.totalHt === 'number' && !Number.isNaN(document.totalHt);
    const hasTotalTtc = typeof document.totalTtc === 'number' && !Number.isNaN(document.totalTtc);

    return [
      <div key="title" className="min-w-[200px]">
        <p className="text-sm font-semibold text-slate-900">{document.title}</p>
        <p className="mt-1 text-[12px] text-slate-500">
          {document.category || 'Archives internes'} · {document.owner || 'Équipe'}
        </p>
        {document.description && (
          <p className="mt-1 line-clamp-2 text-[12px] text-slate-500">{document.description}</p>
        )}
      </div>,
      <div key="type" className="text-sm text-slate-700">
        <p className="font-medium text-slate-800">
          {document.kind ? document.kind.toUpperCase() : document.category || 'Document'}
        </p>
        <p className="text-[12px] text-slate-500">{document.number ?? '—'}</p>
      </div>,
      <span key="status" className="text-sm text-slate-700">
        {document.status ?? '—'}
      </span>,
      <div key="totals" className="text-sm text-slate-700">
        {hasTotalHt ? (
          <p className="font-medium text-slate-800">{formatCurrency(document.totalHt ?? 0)} HT</p>
        ) : (
          <p className="text-[12px] text-slate-500">Total indisponible</p>
        )}
        {hasTotalTtc && (!hasTotalHt || document.totalTtc !== document.totalHt) && (
          <p className="text-[12px] text-slate-500">{formatCurrency(document.totalTtc ?? 0)} TTC</p>
        )}
      </div>,
      <span key="date" className="text-sm text-slate-700">{formatDate(document.updatedAt)}</span>,
      <div key="actions" className="flex justify-end gap-2">
        {canViewDocuments && (document.fileData || document.url) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleDownload(document);
            }}
          >
            {document.fileData ? 'Télécharger' : 'Ouvrir'}
          </Button>
        )}
        {canEditDocuments && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenEdit(document);
            }}
          >
            Modifier
          </Button>
        )}
        {canEditDocuments && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(document.id);
            }}
          >
            Supprimer
          </Button>
        )}
      </div>,
    ];
  });

  return (
    <div className="space-y-6">
      <Card
        title="Documents internes"
        description="Déposez et classez les pièces essentielles de votre activité."
        action={
          <div className="flex flex-wrap gap-2">
            {canEditDocuments && (
              <Button variant="secondary" size="sm" onClick={handleOpenCreate}>
                Ajouter un document
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://drive.google.com/', '_blank', 'noopener')}
            >
              Ouvrir Google Drive
            </Button>
          </div>
        }
      >
        <div className="mt-4 flex flex-col gap-2 sm:w-80">
          <label htmlFor="document-search" className={labelClassName}>
            Recherche
          </label>
          <input
            id="document-search"
            type="search"
            placeholder="Rechercher un document"
            className={inputClassName}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </Card>

      <div ref={listSectionRef}>
        <Card>
          <Table
          columns={[
            'Document',
            'Type / Numéro',
            'Statut',
            'Montants',
            'Mise à jour',
            'Actions',
          ]}
          rows={rows}
          tone="plain"
          density="compact"
          striped={false}
          onRowClick={
            canEditDocuments ? (index) => handleOpenEdit(filteredDocuments[index]) : undefined
          }
          rowClassName={(index) => {
            const document = filteredDocuments[index];
            if (activePanel && activePanel !== 'create' && activePanel.id === document.id) {
              return 'bg-primary/5';
            }
            return undefined;
          }}
          />
        </Card>
      </div>

      {canEditDocuments && activePanel === 'create' && (
        <Card title="Nouveau document" description="Ajoutez un élément à l’archive interne." padding="lg">
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="create-title" className={labelClassName}>
                  Titre
                </label>
                <input
                  id="create-title"
                  required
                  className={inputClassName}
                  value={createForm.title}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="create-category" className={labelClassName}>
                  Catégorie
                </label>
                <input
                  id="create-category"
                  className={inputClassName}
                  value={createForm.category}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="create-owner" className={labelClassName}>
                  Référent
                </label>
                <input
                  id="create-owner"
                  className={inputClassName}
                  value={createForm.owner}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, owner: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="create-tags" className={labelClassName}>
                  Tags (séparés par des virgules)
                </label>
                <input
                  id="create-tags"
                  className={inputClassName}
                  value={createForm.tags}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, tags: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="create-file" className={labelClassName}>
                Fichier
              </label>
              <input
                key={createFileInputKey}
                id="create-file"
                type="file"
                className={fileInputClassName}
                onChange={handleCreateFileChange}
              />
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>
                  {createForm.fileName
                    ? `Fichier sélectionné : ${createForm.fileName}${createForm.size ? ` • ${createForm.size}` : ''}`
                    : 'Formats recommandés : PDF, DOCX, XLSX.'}
                </span>
                {createForm.fileName && (
                  <Button type="button" variant="ghost" size="xs" onClick={clearCreateFile}>
                    Retirer
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="create-link" className={labelClassName}>
                Lien ou référence interne
              </label>
              <input
                id="create-link"
                className={inputClassName}
                value={createForm.link}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, link: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="create-description" className={labelClassName}>
                Description
              </label>
              <textarea
                id="create-description"
                rows={4}
                className={inputClassName}
                value={createForm.description}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleClosePanel}>
                Fermer
              </Button>
              <Button type="submit" size="sm">
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>
      )}

      {canEditDocuments && activePanel && activePanel !== 'create' && editForm && (
        <Card title="Modifier le document" description="Mettez à jour les informations visibles." padding="lg">
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-title" className={labelClassName}>
                  Titre
                </label>
                <input
                  id="edit-title"
                  required
                  className={inputClassName}
                  value={editForm.title}
                  onChange={(event) => setEditForm((previous) => previous && ({ ...previous, title: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-category" className={labelClassName}>
                  Catégorie
                </label>
                <input
                  id="edit-category"
                  className={inputClassName}
                  value={editForm.category}
                  onChange={(event) => setEditForm((previous) => previous && ({ ...previous, category: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-owner" className={labelClassName}>
                  Référent
                </label>
                <input
                  id="edit-owner"
                  className={inputClassName}
                  value={editForm.owner}
                  onChange={(event) => setEditForm((previous) => previous && ({ ...previous, owner: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-tags" className={labelClassName}>
                  Tags (séparés par des virgules)
                </label>
                <input
                  id="edit-tags"
                  className={inputClassName}
                  value={editForm.tags}
                  onChange={(event) => setEditForm((previous) => previous && ({ ...previous, tags: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-file" className={labelClassName}>
                Remplacer le fichier
              </label>
              <input
                key={editFileInputKey}
                id="edit-file"
                type="file"
                className={fileInputClassName}
                onChange={handleEditFileChange}
              />
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>
                  {editForm.fileName
                    ? `Fichier actuel : ${editForm.fileName}${editForm.size ? ` • ${editForm.size}` : ''}`
                    : 'Aucun fichier n’est associé à ce document.'}
                </span>
                {editForm.fileName && (
                  <Button type="button" variant="ghost" size="xs" onClick={clearEditFile}>
                    Retirer
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-link" className={labelClassName}>
                Lien ou référence interne
              </label>
              <input
                id="edit-link"
                className={inputClassName}
                value={editForm.link}
                onChange={(event) => setEditForm((previous) => previous && ({ ...previous, link: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-description" className={labelClassName}>
                Description
              </label>
              <textarea
                id="edit-description"
                rows={4}
                className={inputClassName}
                value={editForm.description}
                onChange={(event) => setEditForm((previous) => previous && ({ ...previous, description: event.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleClosePanel}>
                Fermer
              </Button>
              <Button type="submit" size="sm">
                Mettre à jour
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default DocumentsPage;
