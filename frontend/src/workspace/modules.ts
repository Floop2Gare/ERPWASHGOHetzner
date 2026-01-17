import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  ClipboardList,
  Download,
  FileStack,
  FileText,
  FolderKanban,
  Layers3,
  LineChart,
  Percent,
  Settings2,
  UsersRound,
} from 'lucide-react';
import type { AppPageKey } from '../lib/rbac';

export type WorkspaceModuleId = 'crm' | 'comptabilite' | 'parametres';

export type WorkspaceNavItem = {
  id: string;
  label: string;
  to: string;
  page: AppPageKey;
  description?: string;
  icon?: LucideIcon;
};

export type WorkspaceNavSection = {
  id: string;
  label: string;
  items: WorkspaceNavItem[];
};

export type WorkspaceModuleConfig = {
  id: WorkspaceModuleId;
  name: string;
  strapline: string;
  description: string;
  basePath: string;
  accentColor: string;
  icon: LucideIcon;
  accessPages: AppPageKey[];
  nav: WorkspaceNavSection[];
};

export const WORKSPACE_MODULES: WorkspaceModuleConfig[] = [
  {
    id: 'crm',
    name: 'Gestion Clients',
    strapline: 'Pilotez la relation client',
    description:
      'Centralisez le suivi des prospects, services et contrats. Les indicateurs commerciaux sont regroupés pour piloter votre activité en temps réel.',
    basePath: '/workspace/crm',
    accentColor: '#2563eb',
    icon: UsersRound,
    accessPages: ['dashboard', 'clients', 'leads', 'devis', 'service', 'abonnement', 'stats', 'administratif.team', 'planning'],
    nav: [
      {
        id: 'pilotage',
        label: 'Pilotage opérationnel',
        items: [
          {
            id: 'dashboard',
            label: 'Tableau de bord',
            to: '/workspace/crm/tableau-de-bord',
            page: 'dashboard',
            description: 'Vue synthétique de la santé commerciale et des priorités du jour',
            icon: FolderKanban,
          },
          {
            id: 'clients',
            label: 'Clients',
            to: '/workspace/crm/clients',
            page: 'clients',
            description: 'Dossiers clients, historique des échanges et documents clés',
            icon: UsersRound,
          },
          {
            id: 'leads',
            label: 'Prospects',
            to: '/workspace/crm/leads',
            page: 'leads',
            description: "Pipeline d'acquisition, scoring et relances prioritaires",
            icon: Layers3,
          },
          {
            id: 'devis',
            label: 'Devis',
            to: '/workspace/crm/devis',
            page: 'devis',
            description: 'Création et suivi des devis pour clients et prospects',
            icon: FileText,
          },
          {
            id: 'services',
            label: 'Prestations',
            to: '/workspace/crm/services',
            page: 'service',
            description: 'Historique des interventions réalisées et facturation associée',
            icon: ClipboardList,
          },
          {
            id: 'team',
            label: 'Équipe',
            to: '/workspace/crm/equipe',
            page: 'administratif.team',
            description: 'Gérez les membres de votre équipe et leurs affectations',
            icon: UsersRound,
          },
          {
            id: 'planning',
            label: 'Planning',
            to: '/workspace/crm/planning',
            page: 'planning',
            description: 'Planification des interventions et disponibilité des équipes',
            icon: FolderKanban,
          },
          {
            id: 'stats',
            label: 'Statistiques',
            to: '/workspace/crm/statistiques',
            page: 'stats',
            description: 'Indicateurs commerciaux, marges et tendances financières',
            icon: LineChart,
          },
        ],
      },
    ],
  },
  {
    id: 'comptabilite',
    name: 'Suivi Financier',
    strapline: 'Maîtrisez vos finances en continu',
    description:
      'Pilotez vos indicateurs financiers, exports comptables, flux de trésorerie et documents au même endroit.',
    basePath: '/workspace/comptabilite',
    accentColor: '#a855f7',
    icon: LineChart,
    accessPages: [
      'comptabilite',
      'comptabilite.achats',
      'comptabilite.facturesClients',
      'comptabilite.tva',
      'comptabilite.export',
      'comptabilite.documents',
    ],
    nav: [
      {
        id: 'finances',
        label: 'Pilotage financier',
        items: [
          {
            id: 'factures-clients',
            label: 'Factures clients',
            to: '/workspace/comptabilite/factures-clients',
            page: 'comptabilite.facturesClients',
            description: 'Suivi des factures clients et encaissements',
            icon: FileText,
          },
          {
            id: 'achats',
            label: 'Achats',
            to: '/workspace/comptabilite/achats',
            page: 'comptabilite.achats',
            description: 'Portefeuille fournisseurs, achats en cours et engagements',
            icon: FileStack,
          },
          // Entrée factures fournisseurs retirée
          {
            id: 'tva',
            label: 'TVA',
            to: '/workspace/comptabilite/tva',
            page: 'comptabilite.tva',
            description: 'TVA collectée, déductible et échéances déclaratives',
            icon: Percent,
          },
          {
            id: 'export',
            label: 'Export comptable',
            to: '/workspace/comptabilite/export',
            page: 'comptabilite.export',
            description: 'Préparation des exports pour votre cabinet comptable',
            icon: Download,
          },
          {
            id: 'documents',
            label: 'Documents',
            to: '/workspace/comptabilite/documents',
            page: 'comptabilite.documents',
            description: 'Contrats, attestations et rapports réglementaires',
            icon: FileStack,
          },
        ],
      },
    ],
  },
  {
    id: 'parametres',
    name: 'Réglages Système',
    strapline: 'Façonnez votre plateforme',
    description:
      'Configurez les espaces, attribuez les rôles, connectez vos intégrations et personnalisez votre expérience.',
    basePath: '/workspace/parametres',
    accentColor: '#10b981',
    icon: Settings2,
    accessPages: ['parametres', 'parametres.utilisateurs'],
    nav: [
      {
        id: 'config',
        label: 'Configuration',
        items: [
          {
            id: 'profil',
            label: 'Profil',
            to: '/workspace/parametres/profile',
            page: 'parametres',
            description: 'Coordonnées personnelles, rôle et préférences de contact',
            icon: UsersRound,
          },
          {
            id: 'entreprises',
            label: 'Entreprises',
            to: '/workspace/parametres/companies',
            page: 'parametres',
            description: 'Identité légale, TVA et informations bancaires des entités',
            icon: Layers3,
          },
          {
            id: 'catalogue',
            label: 'Catalogue de prestations',
            to: '/workspace/parametres/catalog',
            page: 'parametres',
            description: 'Catalogue des offres, prestations et options tarifaires',
            icon: ClipboardList,
          },
          {
            id: 'utilisateurs',
            label: 'Utilisateurs',
            to: '/workspace/parametres/utilisateurs',
            page: 'parametres.utilisateurs',
            description: 'Gestion des accès, rôles et équipes',
            icon: UsersRound,
          },
        ],
      },
    ],
  },
];

export const getWorkspaceModule = (id: WorkspaceModuleId) =>
  WORKSPACE_MODULES.find((module) => module.id === id);

