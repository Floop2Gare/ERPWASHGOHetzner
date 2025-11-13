import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, DownloadCloud, FileSpreadsheet, Info, AlertCircle } from 'lucide-react';
import { AccountingPageLayout } from './AccountingPageLayout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { useAppData, type Engagement, type Purchase, type Client } from '../../store/useAppData';
import { formatCurrency, type ClientInvoice, type VendorInvoice } from './mockData';
import {
  generateAccountingEntries,
  checkBalance,
  calculateCollectedVAT,
  calculateDeductibleVAT,
} from './accountingCalculations';

type ExportFormat = 'csv' | 'xls';

// Convertir les engagements en factures clients
const convertEngagementsToClientInvoices = (
  engagements: Engagement[],
  clients: Client[],
  computeEngagementTotals: (engagement: Engagement) => { price: number; duration: number; surcharge: number },
  vatEnabled: boolean,
  vatRate: number
): ClientInvoice[] => {
  const clientInvoices: ClientInvoice[] = [];
  
  // Filtrer uniquement les engagements de type facture
  const invoiceEngagements = engagements.filter((engagement) => engagement.kind === 'facture');
  
  invoiceEngagements.forEach((engagement) => {
    const client = clients.find((c) => c.id === engagement.clientId);
    if (!client) return;
    
    const totals = computeEngagementTotals(engagement);
    const priceHT = totals.price + totals.surcharge;
    
    // Calculer le TTC
    const vatMultiplier = (engagement.invoiceVatEnabled ?? vatEnabled) ? 1 + vatRate : 1;
    const amountTtc = Math.round(priceHT * vatMultiplier * 100) / 100;
    
    // Déterminer le statut
    let status: 'Payée' | 'En attente' | 'Brouillon';
    if (engagement.status === 'annulé') {
      return; // Ne pas inclure les factures annulées
    } else if (engagement.status === 'réalisé') {
      status = 'Payée';
    } else if (engagement.status === 'envoyé' || engagement.status === 'planifié') {
      status = 'En attente';
    } else {
      status = 'Brouillon';
    }
    
    // Date d'émission = date de création de la facture (scheduledAt)
    const issueDate = engagement.scheduledAt.split('T')[0];
    // Date d'échéance = 30 jours après l'émission
    const dueDateObj = new Date(engagement.scheduledAt);
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const dueDate = dueDateObj.toISOString().split('T')[0];
    
    clientInvoices.push({
      id: engagement.id,
      number: engagement.invoiceNumber || `FAC-${engagement.id.slice(-6)}`,
      client: client.name,
      issueDate,
      dueDate,
      amountTtc,
      status,
    });
  });
  
  return clientInvoices;
};

// Convertir les purchases en factures fournisseurs
const convertPurchasesToVendorInvoices = (
  purchases: Purchase[]
): VendorInvoice[] => {
  const vendorInvoices: VendorInvoice[] = [];
  
  purchases.forEach((purchase) => {
    // Ne pas inclure les achats annulés
    if (purchase.status === 'Annulé') {
      return;
    }
    
    // Déterminer le statut
    let status: 'Payée' | 'À payer' | 'Brouillon';
    if (purchase.status === 'Payé') {
      status = 'Payée';
    } else if (purchase.status === 'Validé') {
      status = 'À payer';
    } else {
      status = 'Brouillon';
    }
    
    // Date d'émission = date de l'achat
    const issueDate = purchase.date.split('T')[0];
    // Date d'échéance = 30 jours après l'émission
    const dueDateObj = new Date(purchase.date);
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const dueDate = dueDateObj.toISOString().split('T')[0];
    
    vendorInvoices.push({
      id: purchase.id,
      number: purchase.reference || `FF-${purchase.id.slice(-6)}`,
      vendor: purchase.vendor,
      issueDate,
      dueDate,
      amountTtc: purchase.amountTtc,
      status,
    });
  });
  
  return vendorInvoices;
};

const AccountingExportPage = () => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Récupérer les données réelles depuis le store
  const { engagements, purchases, clients, computeEngagementTotals, vatEnabled, vatRate } = useAppData();

  // Convertir les données réelles en factures pour l'export
  const clientInvoices = useMemo(() => {
    return convertEngagementsToClientInvoices(engagements, clients, computeEngagementTotals, vatEnabled, vatRate);
  }, [engagements, clients, computeEngagementTotals, vatEnabled, vatRate]);

  const vendorInvoices = useMemo(() => {
    return convertPurchasesToVendorInvoices(purchases);
  }, [purchases]);

  // Calculer les écritures comptables à partir des factures réelles
  const exportPreviewRows = useMemo(() => {
    return generateAccountingEntries(clientInvoices, vendorInvoices);
  }, [clientInvoices, vendorInvoices]);

  // Vérifier l'équilibre débit/crédit
  const balanceCheck = useMemo(() => {
    return checkBalance(exportPreviewRows);
  }, [exportPreviewRows]);

  // Calculer les totaux
  const totalDebit = useMemo(() => {
    return exportPreviewRows.reduce((acc, row) => acc + row.debit, 0);
  }, [exportPreviewRows]);

  const totalCredit = useMemo(() => {
    return exportPreviewRows.reduce((acc, row) => acc + row.credit, 0);
  }, [exportPreviewRows]);

  // Calculer la TVA pour vérification
  const calculatedCollectedVAT = useMemo(() => {
    return calculateCollectedVAT(clientInvoices);
  }, [clientInvoices]);

  const calculatedDeductibleVAT = useMemo(() => {
    return calculateDeductibleVAT(vendorInvoices);
  }, [vendorInvoices]);

  const exportContents = [
    {
      icon: FileSpreadsheet,
      title: 'Journal des ventes (VT)',
      description: 'Factures clients, montants HT/TTC et TVA collectée regroupés par compte.',
    },
    {
      icon: ClipboardList,
      title: 'Journal des achats (AC)',
      description: 'Factures fournisseurs avec TVA déductible et ventilation par nature de charge.',
    },
    {
      icon: CheckCircle2,
      title: 'Identifiants & libellés',
      description: 'Références clients/fournisseurs, libellés d’écriture, dates d’échéance.',
    },
  ];

  const checklistItems = [
    'Rapprochement bancaire du mois terminé.',
    'Factures brouillons validées ou écartées.',
    'Balance âgée clients / fournisseurs exportée.',
    'Journal des opérations diverses mis à jour.',
  ];

  const lastExportLabel = lastExportAt
    ? lastExportAt.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Jamais';

  const handleExport = () => {
    if (isExporting || exportPreviewRows.length === 0) {
      if (exportPreviewRows.length === 0) {
        setMessage('Aucune écriture à exporter. Ajoutez des factures clients ou fournisseurs.');
      }
      return;
    }

    if (!balanceCheck.balanced) {
      const confirmExport = window.confirm(
        `Attention : Les écritures ne sont pas équilibrées (différence de ${formatCurrency(balanceCheck.difference)}).\n\nVoulez-vous quand même exporter ?`
      );
      if (!confirmExport) {
        return;
      }
    }

    setIsExporting(true);
    setMessage(null);

    setTimeout(() => {
      if (typeof window === 'undefined') {
        setIsExporting(false);
        return;
      }

      try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        
        // En-tête avec BOM pour Excel (UTF-8)
        const BOM = '\uFEFF';
        const rows: string[] = [
          'Compte;Libellé;Débit;Crédit',
          ...exportPreviewRows.map((row) => {
            const debit = row.debit > 0 ? row.debit.toFixed(2).replace('.', ',') : '';
            const credit = row.credit > 0 ? row.credit.toFixed(2).replace('.', ',') : '';
            return `${row.account};${row.label};${debit};${credit}`;
          }),
        ];

        // Ligne de total
        rows.push(`TOTAL;;${totalDebit.toFixed(2).replace('.', ',')};${totalCredit.toFixed(2).replace('.', ',')}`);

        const csvContent = BOM + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-comptable-${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setLastExportAt(now);
        setMessage(
          balanceCheck.balanced
            ? 'Export réussi ! Le fichier CSV a été téléchargé.'
            : `Export réussi avec avertissement (déséquilibre de ${formatCurrency(balanceCheck.difference)}).`
        );
      } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        setMessage('Erreur lors de l\'export. Veuillez réessayer.');
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  const columns = ['Compte', 'Libellé', 'Débit', 'Crédit'];
  const rows = exportPreviewRows.map((row) => [
    <span key="account" className="text-sm font-semibold text-slate-900 dark:text-white">
      {row.account}
    </span>,
    <span key="label" className="text-sm text-slate-600 dark:text-slate-300">
      {row.label}
    </span>,
    <span key="debit" className="text-sm text-slate-600 dark:text-slate-300">
      {row.debit ? formatCurrency(row.debit) : '—'}
    </span>,
    <span key="credit" className="text-sm text-slate-600 dark:text-slate-300">
      {row.credit ? formatCurrency(row.credit) : '—'}
    </span>,
  ]);

  return (
    <AccountingPageLayout
      title="Export comptable"
      description="Préparez les écritures pour votre cabinet, contrôlez les montants avant envoi et conservez un historique des exports."
      heroChips={[
        {
          id: 'entries',
          label: 'Écritures générées',
          value: `${exportPreviewRows.length}`,
        },
        {
          id: 'total-debit',
          label: 'Total débit',
          value: formatCurrency(totalDebit),
        },
        {
          id: 'total-credit',
          label: 'Total crédit',
          value: formatCurrency(totalCredit),
        },
        {
          id: 'balance',
          label: balanceCheck.balanced ? 'Équilibre OK' : 'Déséquilibre',
          value: balanceCheck.balanced ? '✓' : formatCurrency(balanceCheck.difference),
        },
      ]}
    >
      <section className="grid gap-6 lg:grid-cols-5">
        <Card
          padding="lg"
          className="lg:col-span-3"
          title={
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Préparer l’export
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">
                Choisissez le format et téléchargez le fichier
              </span>
            </div>
          }
        >
          <div className="mt-6 space-y-6 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Format d’export</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">CSV compatible Sage, Cegid et Quickbooks</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={format === 'csv' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFormat('csv')}
                >
                  CSV
                </Button>
                <Button
                  type="button"
                  variant={format === 'xls' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFormat('xls')}
                >
                  XLS (bientôt)
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md ring-1 ring-slate-100/60 dark:border-slate-700 dark:bg-slate-800/70 dark:ring-0">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/12 p-2 text-primary dark:bg-primary/20">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Ce que contient le fichier</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Export prêt à l’emploi (CSV) pour votre cabinet comptable ou votre solution Sage / Cegid.
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {exportContents.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.title}
                      className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60"
                    >
                      <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary shadow-inner dark:bg-primary/20">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>
                        <strong className="block font-semibold text-slate-900 dark:text-white">{item.title}</strong>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{item.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                onClick={handleExport}
                disabled={isExporting || exportPreviewRows.length === 0}
                className="inline-flex items-center gap-2"
              >
                <DownloadCloud className="h-4 w-4" />
                {isExporting
                  ? 'Préparation...'
                  : exportPreviewRows.length === 0
                  ? 'Aucune écriture à exporter'
                  : 'Exporter les données comptables'}
              </Button>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <p>Dernier export</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {lastExportLabel}
                </p>
              </div>
            </div>
            {!balanceCheck.balanced && (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-4 py-3 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-200" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                      Déséquilibre détecté
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      La différence entre débit et crédit est de {formatCurrency(balanceCheck.difference)}.
                      Vérifiez vos factures avant l'export.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {message ? (
              <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-600 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
                {message}
              </p>
            ) : null}
          </div>
        </Card>
        <Card
          padding="lg"
          className="lg:col-span-2"
          title={
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Checklist de contrôle
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">Avant envoi au cabinet</span>
            </div>
          }
        >
          <div className="mt-6 space-y-3 text-sm leading-5 text-slate-700 dark:text-slate-300">
            {checklistItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60"
              >
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner dark:bg-emerald-500/20 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card tone="surface" padding="lg" title="Aperçu des écritures générées">
        <div className="space-y-4">
          {exportPreviewRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune écriture à exporter. Ajoutez des factures clients ou fournisseurs.
              </p>
            </div>
          ) : (
            <>
              <Table columns={columns} rows={rows} density="regular" dividers={false} />
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total débit: </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalDebit)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total crédit: </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalCredit)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Différence: </span>
                    <span
                      className={`font-semibold ${
                        balanceCheck.balanced
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {balanceCheck.balanced ? '0,00 €' : formatCurrency(balanceCheck.difference)}
                    </span>
                  </div>
                </div>
                {balanceCheck.balanced && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-semibold">Équilibre vérifié</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Card>
    </AccountingPageLayout>
  );
};

export default AccountingExportPage;



