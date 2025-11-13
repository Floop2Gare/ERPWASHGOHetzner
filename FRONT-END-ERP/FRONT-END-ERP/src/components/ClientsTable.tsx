import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Tag } from './Tag';
import { RowActionButton } from './RowActionButton';
import { IconArchive, IconDocument, IconEdit, IconPaperPlane, IconPlus, IconReceipt } from './icons';
import { Client } from '../store/useAppData';
import { formatCurrency, formatDate } from '../lib/format';
import clsx from 'clsx';
import './ClientsTable.css';

interface ClientsTableProps {
  clients: Client[];
  revenueByClient: Map<string, number>;
  selectedClientIds: string[];
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
  onClientClick: (client: Client) => void;
  onToggleSelection: (clientId: string) => void;
  onToggleSelectAll?: () => void;
  onEdit?: (client: Client) => void;
  onAddContact?: (client: Client) => void;
  onCreate?: (client: Client, kind: 'service' | 'devis' | 'facture') => void;
  onEmail?: (client: Client) => void;
  onArchive?: (client: Client) => void;
  hasPermission: (permission: string) => boolean;
}

export const ClientsTable = ({
  clients,
  revenueByClient,
  selectedClientIds,
  selectedClientId,
  onClientClick,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onAddContact,
  onCreate,
  onEmail,
  onArchive,
  hasPermission,
}: ClientsTableProps) => {
  const allSelected = clients.length > 0 && clients.every((c) => selectedClientIds.includes(c.id));
  const columns = useMemo<ColumnDef<Client, any>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
            checked={allSelected}
            onChange={onToggleSelectAll}
            onClick={(e) => e.stopPropagation()}
            aria-label="Sélectionner tous les clients"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
            checked={selectedClientIds.includes(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(row.original.id);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Sélectionner ${row.original.name}`}
          />
        ),
        size: 42,
        enableSorting: false,
      },
      {
        id: 'organisation',
        accessorFn: (row) => row.name,
        header: 'Organisation',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-slate-900 truncate" title={row.original.name}>
              {row.original.name}
            </p>
            <span className="text-[11px] text-slate-500">
              SIRET {row.original.siret || '—'}
            </span>
            {row.original.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {row.original.tags.slice(0, 2).map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                {row.original.tags.length > 2 && (
                  <span className="text-[10px] text-slate-400">
                    +{row.original.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        ),
        size: 280,
      },
      {
        id: 'coordinates',
        header: 'Coordonnées',
        cell: ({ row }) => {
          const activeContacts = row.original.contacts.filter((c) => c.active);
          const billing = activeContacts.find((c) => c.isBillingDefault);
          const fallbackContact = billing ?? activeContacts[0];
          const contactEmail = fallbackContact?.email || row.original.email || '—';
          const contactPhone = fallbackContact?.mobile || row.original.phone || '—';

          return (
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                <span className="truncate" title={row.original.city || '—'}>
                  {row.original.city || '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span className="truncate" title={contactEmail}>
                  {contactEmail}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span className="truncate" title={contactPhone}>
                  {contactPhone}
                </span>
              </div>
            </div>
          );
        },
        size: 220,
      },
      {
        id: 'contacts',
        header: 'Contacts',
        cell: ({ row }) => {
          const activeContacts = row.original.contacts.filter((c) => c.active);
          const billing = activeContacts.find((c) => c.isBillingDefault);

          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center min-w-[1.6rem] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  {activeContacts.length}
                </span>
                <span className="text-[11px] text-slate-500">contact(s)</span>
              </div>
              {billing && (
                <Tag>
                  {billing.firstName} {billing.lastName}
                </Tag>
              )}
            </div>
          );
        },
        size: 180,
      },
      {
        id: 'lastService',
        header: 'Dernière prestation',
        accessorFn: (row) => row.lastService,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-300">
              {row.original.lastService ? formatDate(row.original.lastService) : '—'}
            </span>
            <span className="text-[10px] text-slate-500">Dernier dossier</span>
          </div>
        ),
        size: 160,
      },
      {
        id: 'revenue',
        header: 'CA',
        accessorFn: (row) => revenueByClient.get(row.id) ?? 0,
        cell: ({ row }) => {
          const revenue = revenueByClient.get(row.original.id) ?? 0;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/30">
                {formatCurrency(revenue)}
              </span>
              <span className="text-[10px] text-slate-500">HT cumulé</span>
            </div>
          );
        },
        size: 140,
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            {hasPermission('client.edit') && onEdit && (
              <RowActionButton
                label="Modifier"
                onClick={() => onEdit(row.original)}
              >
                <IconEdit />
              </RowActionButton>
            )}
            {hasPermission('client.contact.add') && onAddContact && (
              <RowActionButton
                label="Ajouter contact"
                onClick={() => onAddContact(row.original)}
              >
                <IconPlus />
              </RowActionButton>
            )}
            {hasPermission('client.invoice') && onCreate && (
              <RowActionButton
                label="Créer facture"
                onClick={() => onCreate(row.original, 'facture')}
              >
                <IconReceipt />
              </RowActionButton>
            )}
            {hasPermission('client.quote') && onCreate && (
              <RowActionButton
                label="Créer devis"
                onClick={() => onCreate(row.original, 'devis')}
              >
                <IconDocument />
              </RowActionButton>
            )}
            {hasPermission('client.email') && onEmail && (
              <RowActionButton
                label="Envoyer"
                onClick={() => onEmail(row.original)}
              >
                <IconPaperPlane />
              </RowActionButton>
            )}
            {hasPermission('client.archive') && onArchive && (
              <RowActionButton
                label="Archiver"
                tone="danger"
                onClick={() => onArchive(row.original)}
              >
                <IconArchive />
              </RowActionButton>
            )}
          </div>
        ),
        size: 200,
        enableSorting: false,
      },
    ],
    [selectedClientIds, revenueByClient, allSelected, onToggleSelection, onToggleSelectAll, onEdit, onAddContact, onCreate, onEmail, onArchive, hasPermission]
  );

  return (
    <div className="data-table__outer">
      <DataTable
        data={clients}
        columns={columns}
        emptyState="Aucun client ne correspond aux filtres sélectionnés."
        onRowClick={onClientClick}
        rowClassName={(row) =>
          clsx({
            'data-table__row--selected': selectedClientIds.includes(row.id),
            'data-table__row--active': selectedClientId === row.id,
          })
        }
        getRowId={(row) => row.id}
      />
    </div>
  );
};

