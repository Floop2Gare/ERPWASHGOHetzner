import { useMemo } from 'react';
import { addMonths, differenceInDays, format, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Tag } from '../../components/Tag';
import { useAppData } from '../../store/useAppData';
import { formatCurrency } from '../../lib/format';

const formatDate = (iso: string | null | undefined) => {
  if (!iso) {
    return '—';
  }
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return '—';
  }
};

const computeNextReviewDate = (updatedAt: string | null | undefined) => {
  if (!updatedAt) {
    return null;
  }
  try {
    const lastUpdate = parseISO(updatedAt);
    return addMonths(lastUpdate, 6);
  } catch {
    return null;
  }
};

const AdministratifOverviewPage = () => {
  const documents = useAppData((state) => state.documents);
  const purchases = useAppData((state) => state.purchases);
  const companies = useAppData((state) => state.companies);
  const authUsers = useAppData((state) => state.authUsers);

  const stats = useMemo(() => {
    const activeCollaborators = authUsers.filter((user) => user.active).length;
    const uniqueRoles = new Set(authUsers.map((user) => user.role)).size;
    const totalDocuments = documents.length;
    const uniqueVendors = new Set(purchases.map((purchase) => purchase.vendor)).size;

    const documentsToReview = documents.reduce((count, document) => {
      const nextReview = computeNextReviewDate(document.updatedAt);
      if (!nextReview) {
        return count;
      }
      const now = new Date();
      const diff = differenceInDays(nextReview, now);
      if (diff >= 0 && diff <= 45) {
        return count + 1;
      }
      return count;
    }, 0);

    return [
      {
        label: 'Collaborateurs actifs',
        value: activeCollaborators.toString(),
        hint: `${uniqueRoles} rôle(s) représenté(s)`,
      },
      {
        label: 'Documents',
        value: totalDocuments.toString(),
        hint: `${documentsToReview} révision(s) à planifier`,
      },
      {
        label: 'Fournisseurs référencés',
        value: uniqueVendors.toString(),
        hint: `${purchases.length} achats suivis`,
      },
      {
        label: 'Sites / Structures',
        value: companies.length.toString(),
        hint: 'Actifs dans la base légale',
      },
    ];
  }, [authUsers, documents, purchases, companies.length]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return documents
      .map((document) => {
        const nextReview = computeNextReviewDate(document.updatedAt) ?? null;
        const daysRemaining = nextReview ? differenceInDays(nextReview, now) : null;
        return {
          id: document.id,
          title: document.title,
          category: document.category || 'Document',
          owner: document.owner,
          tags: document.tags,
          nextReview,
          daysRemaining,
        };
      })
      .filter((item) => item.nextReview && item.daysRemaining !== null && item.daysRemaining <= 90)
      .sort((a, b) => {
        if (!a.nextReview || !b.nextReview) {
          return 0;
        }
        return a.nextReview.getTime() - b.nextReview.getTime();
      })
      .slice(0, 6);
  }, [documents]);

  const hrFocus = useMemo(() => {
    return authUsers
      .filter((user) => user.active)
      .map((user) => ({
        id: user.id,
        name: user.fullName,
        role: user.role,
        email: user.profile.email,
        phone: user.profile.phone,
        lastPasswordUpdate: user.profile.emailSignatureUpdatedAt ?? null,
      }));
  }, [authUsers]);

  const supplierHighlights = useMemo(() => {
    const vendorMap = new Map<
      string,
      {
        vendor: string;
        purchaseCount: number;
        totalTtc: number;
        lastPurchase: string | null;
        categories: Set<string>;
      }
    >();

    purchases.forEach((purchase) => {
      const record = vendorMap.get(purchase.vendor) ?? {
        vendor: purchase.vendor,
        purchaseCount: 0,
        totalTtc: 0,
        lastPurchase: null,
        categories: new Set<string>(),
      };
      record.purchaseCount += 1;
      record.totalTtc += purchase.amountTtc;
      record.lastPurchase =
        !record.lastPurchase || isBefore(parseISO(record.lastPurchase), parseISO(purchase.date))
          ? purchase.date
          : record.lastPurchase;
      record.categories.add(purchase.category);
      vendorMap.set(purchase.vendor, record);
    });

    return Array.from(vendorMap.values())
      .sort((a, b) => b.totalTtc - a.totalTtc)
      .slice(0, 5);
  }, [purchases]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vue d'ensemble</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Supervisez vos opérations internes et vos indicateurs clés
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md" className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{stat.label}</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Échéances prioritaires" description="Anticipez les révisions contractuelles et réglementaires." padding="lg">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune révision détectée sur les 90 prochains jours.</p>
          ) : (
            <Table
              tone="plain"
              density="compact"
              striped
              columns={['Document', 'Référent', 'Tags', 'Revue']}
              rows={upcomingDeadlines.map((deadline) => [
                <div key="title" className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{deadline.title}</span>
                  <span className="text-xs text-slate-500">{deadline.category}</span>
                </div>,
                <span key="owner" className="text-sm text-slate-700 dark:text-slate-300">
                  {deadline.owner}
                </span>,
                <div key="tags" className="flex flex-wrap gap-1">
                  {deadline.tags.map((tag) => (
                    <Tag key={tag} tone="neutral">
                      {tag}
                    </Tag>
                  ))}
                </div>,
                <div key="review" className="text-sm text-slate-700 dark:text-slate-300">
                  <p className="font-medium text-slate-900 dark:text-white">{formatDate(deadline.nextReview?.toISOString() ?? null)}</p>
                  <p className="text-xs text-slate-500">
                    {deadline.daysRemaining !== null ? `${deadline.daysRemaining} jour(s) restants` : 'À planifier'}
                  </p>
                </div>,
              ])}
            />
          )}
        </Card>

        <Card title="Flux fournisseurs" description="Principaux partenaires et concentration des achats." padding="lg">
          {supplierHighlights.length === 0 ? (
            <p className="text-sm text-slate-500">Ajoutez vos achats pour suivre la dépendance fournisseurs.</p>
          ) : (
            <ul className="space-y-4">
              {supplierHighlights.map((supplier) => (
                <li
                  key={supplier.vendor}
                  className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{supplier.vendor}</p>
                      <p className="text-xs text-slate-500">
                        {supplier.purchaseCount} commande(s) · {Array.from(supplier.categories).join(', ')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(supplier.totalTtc)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Dernier achat le {formatDate(supplier.lastPurchase)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Focus Ressources humaines" description="Suivi des comptes actifs et des actions de sécurité." padding="lg">
        {hrFocus.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun collaborateur actif pour le moment.</p>
        ) : (
          <Table
            tone="plain"
            density="comfortable"
            striped
            columns={['Collaborateur', 'Coordonnées', 'Rôle', 'Dernière mise à jour']}
            rows={hrFocus.map((employee) => [
              <div key="name" className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{employee.name}</span>
                <span className="text-xs uppercase tracking-[0.32em] text-slate-400">{employee.id}</span>
              </div>,
              <div key="contact" className="text-sm text-slate-700 dark:text-slate-300">
                <p>{employee.email}</p>
                {employee.phone ? <p className="text-xs text-slate-500">{employee.phone}</p> : null}
              </div>,
              <Tag key="role" tone="neutral">
                {employee.role}
              </Tag>,
              <span key="last" className="text-sm text-slate-700 dark:text-slate-300">
                {employee.lastPasswordUpdate ? formatDate(employee.lastPasswordUpdate) : 'Signature à valider'}
              </span>,
            ])}
          />
        )}
      </Card>
    </div>
  );
};

export default AdministratifOverviewPage;




