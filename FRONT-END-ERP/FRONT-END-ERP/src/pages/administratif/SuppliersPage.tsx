import { useMemo } from 'react';

import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Tag } from '../../components/Tag';
import { useAppData } from '../../store/useAppData';
import { formatCurrency } from '../../lib/format';

type SupplierAggregate = {
  vendor: string;
  totalHt: number;
  totalTtc: number;
  purchaseCount: number;
  categories: Set<string>;
  lastStatus: string;
};

const AdministratifSuppliersPage = () => {
  const purchases = useAppData((state) => state.purchases);
  const documents = useAppData((state) => state.documents);

  const aggregates = useMemo(() => {
    const map = new Map<string, SupplierAggregate>();
    purchases.forEach((purchase) => {
      const current = map.get(purchase.vendor) ?? {
        vendor: purchase.vendor,
        totalHt: 0,
        totalTtc: 0,
        purchaseCount: 0,
        categories: new Set<string>(),
        lastStatus: purchase.status,
      };
      current.totalHt += purchase.amountHt;
      current.totalTtc += purchase.amountTtc;
      current.purchaseCount += 1;
      current.categories.add(purchase.category);
      current.lastStatus = purchase.status;
      map.set(purchase.vendor, current);
    });
    return Array.from(map.values()).sort((a, b) => b.totalTtc - a.totalTtc);
  }, [purchases]);

  const supplierDocuments = useMemo(() => {
    return documents.filter((document) => document.tags.some((tag) => ['Contrat', 'Renouvellement'].includes(tag)));
  }, [documents]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    purchases.forEach((purchase) => {
      map.set(purchase.category, (map.get(purchase.category) ?? 0) + purchase.amountTtc);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [purchases]);

  const totalVendors = aggregates.length;
  const totalSpend = aggregates.reduce((acc, supplier) => acc + supplier.totalTtc, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fournisseurs</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Gérez vos partenaires et suivez vos dépenses fournisseurs
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="md" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Fournisseurs actifs</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white">{totalVendors}</p>
          <p className="text-xs text-slate-500">Basés sur les achats suivis cette année</p>
        </Card>
        <Card padding="md" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Dépenses cumulées</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-slate-500">Montant TTC sur l’ensemble des fournisseurs</p>
        </Card>
        <Card padding="md" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Contrats référencés</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white">{supplierDocuments.length}</p>
          <p className="text-xs text-slate-500">Documents tagués "Contrat" ou "Renouvellement"</p>
        </Card>
      </div>

      <Card
        title="Panorama fournisseurs"
        description="Identifiez les partenaires clés et leur portefeuille de prestations."
        padding="lg"
      >
        {aggregates.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun achat enregistré pour le moment.</p>
        ) : (
          <Table
            tone="plain"
            density="comfortable"
            striped
            columns={['Fournisseur', 'Dépenses', 'Commandes', 'Catégories', 'Statut']}
            rows={aggregates.map((supplier) => [
              <span key="vendor" className="text-sm font-semibold text-slate-900 dark:text-white">
                {supplier.vendor}
              </span>,
              <div key="totals" className="flex flex-col text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(supplier.totalTtc)}</span>
                <span className="text-xs text-slate-500">{formatCurrency(supplier.totalHt)} HT</span>
              </div>,
              <span key="count" className="text-sm text-slate-700 dark:text-slate-300">
                {supplier.purchaseCount}
              </span>,
              <div key="categories" className="flex flex-wrap gap-1">
                {Array.from(supplier.categories).map((category) => (
                  <Tag key={category} tone="neutral">
                    {category}
                  </Tag>
                ))}
              </div>,
              <Tag
                key="status"
                tone={
                  supplier.lastStatus === 'Payé'
                    ? 'success'
                    : supplier.lastStatus === 'Annulé'
                      ? 'danger'
                      : 'warning'
                }
              >
                {supplier.lastStatus}
              </Tag>,
            ])}
          />
        )}
      </Card>

      <Card
        title="Répartition par catégorie"
        description="Visualisez vos postes de dépense principaux."
        padding="lg"
      >
        {topCategories.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune catégorie disponible.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {topCategories.map(([category, amount]) => (
              <li
                key={category}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <span className="font-medium text-slate-900 dark:text-white">{category}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AdministratifSuppliersPage;




