/**
 * Page "Site Web" - Gestion des clients provenant du site web Wash&Go
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  Gift,
  Trophy,
  ShoppingCart,
  CreditCard,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';
import clsx from 'clsx';

import { SiteWebService, type SiteWebUser, type SiteWebOrder } from '../api/services/siteWeb';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
} from '../components/crm';

type FilterState = {
  search: string;
  status: '' | 'active' | 'inactive' | 'suspended' | 'deleted';
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: {
    label: 'Actif',
    color: 'bg-emerald-200 text-emerald-800 border border-emerald-300',
  },
  inactive: {
    label: 'Inactif',
    color: 'bg-slate-200 text-slate-700 border border-slate-300',
  },
  suspended: {
    label: 'Suspendu',
    color: 'bg-amber-200 text-amber-800 border border-amber-300',
  },
  deleted: {
    label: 'Supprimé',
    color: 'bg-rose-200 text-rose-800 border border-rose-300',
  },
};

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const SiteWebPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<SiteWebUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SiteWebUser | null>(null);
  const [activeTab, setActiveTab] = useState<'infos' | 'parrainage' | 'fidelite' | 'commandes' | 'credits' | 'activite'>('infos');
  const [userOrders, setUserOrders] = useState<SiteWebOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Charger les clients depuis le backend
  const loadUsers = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      const result = await SiteWebService.getAll({
        skip: 0,
        limit: 1000,
        search: filters.search || undefined,
      });

      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data);
      } else if (!result.success) {
        setBackendError(result.error || 'Erreur lors du chargement des clients.');
      }
    } catch (error: any) {
      setBackendError(error?.message || 'Erreur lors du chargement des clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters.search]);

  // Charger les commandes d'un utilisateur
  const loadUserOrders = async (userId: string) => {
    try {
      setLoadingOrders(true);
      const result = await SiteWebService.getUserOrders(userId);
      if (result.success && Array.isArray(result.data)) {
        setUserOrders(result.data);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des commandes:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Ouvrir la modal de détails
  const openUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      const result = await SiteWebService.getById(userId);
      if (result.success && result.data) {
        setSelectedUser(result.data);
        setActiveTab('infos');
        // Charger les commandes
        loadUserOrders(userId);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des détails:', error);
    }
  };

  const closeUserDetail = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
    setUserOrders([]);
  };

  // Filtrer les utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filters.status && user.account_status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [users, filters.status]);

  // Export CSV
  const handleExport = () => {
    const headers = ['ID', 'Email', 'Nom', 'Prénom', 'Téléphone', 'Ville', 'Code parrainage', 'Statut', 'Nb commandes', 'Solde crédits'];
    const rows: any[][] = filteredUsers.map((user) => [
      user.user_id || user.id,
      user.email || '',
      user.nom || '',
      user.prenom || '',
      user.phone || '',
      user.address_city || '',
      user.referral_code || '',
      user.account_status || '',
      user.total_orders_count || 0,
      user.total_credit_balance || 0,
    ]);
    downloadCsv('clients-site-web', headers, rows);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <CRMBackendStatus loading={loading} error={backendError} />
      <CRMFeedback message={null} />

      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Site Web</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {filteredUsers.length} client{filteredUsers.length > 1 ? 's' : ''} site web
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par email, nom ou code parrainage..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
              showFilters
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            <Filter className="h-4 w-4" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex items-center gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="suspended">Suspendu</option>
              <option value="deleted">Supprimé</option>
            </select>
          </div>
        )}
      </div>

      {/* Liste des clients */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600 dark:text-slate-400">Chargement...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <CRMEmptyState message="Aucun client trouvé. Ajustez votre recherche ou vos filtres." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Code parrainage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Commandes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Crédits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const name = user.name || `${user.prenom} ${user.nom}`.trim();
                  const initials = getInitials(name);
                  const statusInfo = statusConfig[user.account_status || 'active'];

                  return (
                    <tr
                      key={user.id}
                      onClick={() => openUserDetail(user.id)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {user.profile_photo_url ? (
                              <img src={user.profile_photo_url} alt={name} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="text-sm font-medium">{initials}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900 dark:text-slate-100">
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {user.phone}
                            </div>
                          )}
                          {user.address_city && (
                            <div className="mt-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <MapPin className="h-3 w-3" />
                              {user.address_city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{user.referral_code || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {statusInfo && (
                          <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', statusInfo.color)}>
                            {statusInfo.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                        {user.total_orders_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(user.total_credit_balance || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {selectedUser && (
        <CRMModal isOpen={!!selectedUserId} onClose={closeUserDetail} maxWidth="5xl">
          <div className="flex flex-col bg-white dark:bg-slate-900 max-h-[90vh] overflow-hidden">
            <CRMModalHeader
              eyebrow="FICHE CLIENT SITE WEB"
              title={selectedUser.name || `${selectedUser.prenom} ${selectedUser.nom}`.trim()}
              description={selectedUser.email}
              onClose={closeUserDetail}
            />

            {/* Onglets */}
            <div className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex gap-1 px-6">
                {[
                  { id: 'infos' as const, label: 'Informations', icon: User },
                  { id: 'parrainage' as const, label: 'Parrainage', icon: Gift },
                  { id: 'fidelite' as const, label: 'Fidélité', icon: Trophy },
                  { id: 'commandes' as const, label: 'Commandes', icon: ShoppingCart },
                  { id: 'credits' as const, label: 'Crédits', icon: CreditCard },
                  { id: 'activite' as const, label: 'Activité', icon: Activity },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={clsx(
                      'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition',
                      activeTab === id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des onglets */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'infos' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase text-slate-600 dark:text-slate-400">Informations personnelles</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{selectedUser.email}</span>
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{selectedUser.phone}</span>
                        </div>
                      )}
                      {selectedUser.address_street && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                          <div>
                            <div>{selectedUser.address_street}</div>
                            {selectedUser.address_complement && <div>{selectedUser.address_complement}</div>}
                            <div>
                              {selectedUser.address_postal_code} {selectedUser.address_city}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedUser.linked_crm_client_id && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase text-slate-600 dark:text-slate-400">Liaison CRM</h3>
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <LinkIcon className="h-4 w-4" />
                        <span>Lien avec client CRM : {selectedUser.linked_crm_client_id}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'parrainage' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase text-slate-600 dark:text-slate-400">Code de parrainage</h3>
                    <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                      <span className="font-mono text-lg font-bold">{selectedUser.referral_code}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Parrainages validés</div>
                      <div className="text-2xl font-bold">{selectedUser.referral_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Crédits parrainage</div>
                      <div className="text-2xl font-bold">{formatCurrency(selectedUser.referral_credit_balance || 0)}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fidelite' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Nettoyages éligibles</div>
                    <div className="text-2xl font-bold">{selectedUser.loyalty_eligible_cleanings || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Crédits fidélité</div>
                    <div className="text-2xl font-bold">{formatCurrency(selectedUser.loyalty_credit_balance || 0)}</div>
                  </div>
                </div>
              )}

              {activeTab === 'commandes' && (
                <div className="space-y-3">
                  {loadingOrders ? (
                    <div className="text-center text-slate-600 dark:text-slate-400">Chargement des commandes...</div>
                  ) : userOrders.length === 0 ? (
                    <div className="text-center text-slate-600 dark:text-slate-400">Aucune commande</div>
                  ) : (
                    userOrders.map((order) => (
                      <div key={order.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{order.service_title}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {formatDate(order.order_date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(order.order_price)}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{order.order_status}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'credits' && (
                <div>
                  <div className="mb-4 rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Solde total</div>
                    <div className="text-3xl font-bold">{formatCurrency(selectedUser.total_credit_balance || 0)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Parrainage</div>
                      <div className="text-xl font-bold">{formatCurrency(selectedUser.referral_credit_balance || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Fidélité</div>
                      <div className="text-xl font-bold">{formatCurrency(selectedUser.loyalty_credit_balance || 0)}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activite' && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <div>Date de création : {formatDate(selectedUser.account_created_at)}</div>
                  {selectedUser.last_login_at && <div className="mt-2">Dernière connexion : {formatDate(selectedUser.last_login_at)}</div>}
                  {selectedUser.total_login_count && <div className="mt-2">Nombre de connexions : {selectedUser.total_login_count}</div>}
                </div>
              )}
            </div>
          </div>
        </CRMModal>
      )}
    </div>
  );
};

export default SiteWebPage;
