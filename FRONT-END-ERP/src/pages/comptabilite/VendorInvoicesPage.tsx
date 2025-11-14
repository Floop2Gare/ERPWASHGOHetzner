import { FormEvent, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Plus, X } from 'lucide-react';
import { AccountingPageLayout } from './AccountingPageLayout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import {
  vendorInvoices,
  VendorInvoiceStatus,
  formatCurrency,
} from './mockData';

type VendorFormState = {
  vendor: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  status: VendorInvoiceStatus;
};

const STATUS_BADGE_CLASSES: Record<VendorInvoiceStatus, string> = {
  Payée: 'border-emerald-300 text-emerald-600 bg-emerald-50/50',
  'À payer': 'border-amber-300 text-amber-600 bg-amber-50/50',
  Brouillon: 'border-slate-300 text-slate-500 bg-white',
};

const formatInvoiceNumber = (sequence: number) => `FF2025-${sequence.toString().padStart(3, '0')}`;

const extractInvoiceSequence = (invoiceNumber: string) => {
  const match = invoiceNumber.match(/(\d+)$/);
  if (!match) {
    return 0;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const computeNextInvoiceNumber = (currentRows: typeof vendorInvoices) => {
  const maxSequence = currentRows.reduce((max, invoice) => {
    const sequence = extractInvoiceSequence(invoice.number);
    return sequence > max ? sequence : max;
  }, 0);
  return formatInvoiceNumber(maxSequence + 1);
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const VendorInvoicesPage = () => {
  const [rows, setRows] = useState(vendorInvoices);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VendorFormState>(() => {
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    const defaultDue = new Date(today);
    defaultDue.setDate(defaultDue.getDate() + 30);
    return {
      vendor: '',
      issueDate: isoToday,
      dueDate: defaultDue.toISOString().slice(0, 10),
      amount: '',
      status: 'À payer',
    };
  });

  const totals = useMemo(() => {
    const aggregated = rows.reduce(
      (acc, invoice) => {
        acc.total += invoice.amountTtc;
        if (invoice.status === 'À payer') {
          acc.toPay += invoice.amountTtc;
        }
        if (invoice.status === 'Payée') {
          acc.paid += invoice.amountTtc;
        }
        return acc;
      },
      { total: 0, toPay: 0, paid: 0 }
    );
    return {
      total: formatCurrency(aggregated.total),
      toPay: formatCurrency(aggregated.toPay),
      paid: formatCurrency(aggregated.paid),
      count: rows.length,
    };
  }, [rows]);

  const toggleForm = () => {
    setIsFormOpen((value) => !value);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedAmount = Number.parseFloat(form.amount.replace(',', '.'));
    if (!form.vendor.trim()) {
      setError('Le nom du fournisseur est requis.');
      return;
    }
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setError('Le montant TTC doit être un nombre positif.');
      return;
    }
    const issue = new Date(form.issueDate);
    const due = new Date(form.dueDate);
    if (due < issue) {
      setError('La date d’échéance doit être postérieure à la date de facture.');
      return;
    }

    const nextNumber = computeNextInvoiceNumber(rows);
    const newInvoice = {
      id: `vi-${Date.now()}`,
      number: nextNumber,
      vendor: form.vendor.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      amountTtc: Math.round(normalizedAmount * 100) / 100,
      status: form.status,
    };

    setRows((previous) => [newInvoice, ...previous]);
    toggleForm();
    setForm((previous) => ({
      ...previous,
      vendor: '',
      amount: '',
    }));
  };

  const columns = ['N°', 'Fournisseur', 'Date', 'Échéance', 'Montant TTC', 'Statut'];
  const tableRows = rows.map((invoice) => [
    <span
      key="number"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white px-3 py-1 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/0 transition dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">#</span>
      {invoice.number}
    </span>,
    <div key="vendor" className="space-y-1">
      <p className="text-sm font-medium text-slate-900 dark:text-white">{invoice.vendor}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Conditions 30 jours</p>
    </div>,
    <span key="issue" className="text-sm text-slate-600 dark:text-slate-300">
      {formatDate(invoice.issueDate)}
    </span>,
    <span key="due" className="text-sm text-slate-600 dark:text-slate-300">{formatDate(invoice.dueDate)}</span>,
    <span key="amount" className="text-sm font-semibold text-slate-900 dark:text-white">
      {formatCurrency(invoice.amountTtc)}
    </span>,
    <span
      key="status"
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em]',
        STATUS_BADGE_CLASSES[invoice.status]
      )}
    >
      {invoice.status}
    </span>,
  ]);

  return (
    <AccountingPageLayout
      title="Factures fournisseurs"
      description="Suivez vos dépenses, gardez de la visibilité sur vos paiements à venir et sécurisez vos marges."
      actions={
        <Button
          variant={isFormOpen ? 'secondary' : 'primary'}
          size="sm"
          onClick={toggleForm}
          className="uppercase tracking-[0.18em]"
        >
          {isFormOpen ? (
            <>
              <X className="h-4 w-4" />
              Fermer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Nouvelle facture fournisseur
            </>
          )}
        </Button>
      }
      heroChips={[
        {
          id: 'total',
          label: 'Total engagé TTC',
          value: totals.total,
        },
        {
          id: 'paid',
          label: 'Factures payées',
          value: totals.paid,
        },
        {
          id: 'to-pay',
          label: 'À payer',
          value: totals.toPay,
        },
        {
          id: 'count',
          label: 'Factures suivies',
          value: `${totals.count}`,
        },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Total engagé (TTC)" description="Depuis le 01/01/2025">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totals.total}</p>
        </Card>
        <Card title="Factures payées">
          <p className="text-2xl font-semibold text-emerald-500 dark:text-emerald-300">{totals.paid}</p>
        </Card>
        <Card title="À payer">
          <p className="text-2xl font-semibold text-amber-500 dark:text-amber-300">{totals.toPay}</p>
        </Card>
        <Card title="Délai moyen de paiement" description="Objectif : < 35 jours">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">32 jours</p>
        </Card>
      </section>

      {isFormOpen ? (
        <Card tone="surface" padding="lg" title="Enregistrer une facture fournisseur">
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Fournisseur
              <input
                type="text"
                value={form.vendor}
                onChange={(event) => setForm((prev) => ({ ...prev, vendor: event.target.value }))}
                className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Ex. LogiTrans Marseille"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Montant TTC (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="0,00"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Date de facture
              <input
                type="date"
                value={form.issueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Date d’échéance
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Statut
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as VendorInvoiceStatus }))
                }
                className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="À payer">À payer</option>
                <option value="Payée">Payée</option>
                <option value="Brouillon">Brouillon</option>
              </select>
            </label>
            <div className="md:col-span-2 flex items-center justify-between">
              {error ? <p className="text-sm font-semibold text-rose-500 dark:text-rose-300">{error}</p> : <span />}
              <Button type="submit" variant="primary">
                Ajouter la facture
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Table columns={columns} rows={tableRows} density="regular" />
    </AccountingPageLayout>
  );
};

export default VendorInvoicesPage;



