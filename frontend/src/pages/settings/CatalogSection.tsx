import { useState, useMemo, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronRight, ChevronDown } from 'lucide-react';

import { IconEdit, IconPlus, IconTrash } from '../../components/icons';
import { useAppData } from '../../store/useAppData';
import { formatCurrency, formatDuration } from '../../lib/format';
import { CategoryService, ServiceService } from '../../api';
import {
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMFormTextarea,
  CRMEmptyState,
} from '../../components/crm';
import { CatalogModalLayout } from './CatalogModalLayout';
import type { Category, Service } from '../../store/useAppData';

// Extensions de types pour compatibilité avec les règles métier
type ExtendedCategory = Category & {
  priceHT?: number; // Tarif HT pour les sous-catégories (déjà dans l'API Category)
};

type ExtendedService = Service & {
  categoryId?: string; // ID de la grande catégorie
  duration?: number; // Durée en minutes
  priceHT?: number; // Prix HT
};

type ActiveTab = 'categories' | 'services';

export const CatalogSection = () => {
  const {
    categories,
    services,
    addCategory,
    updateCategory,
    removeCategory,
    addService,
    updateService,
    removeService,
    activeCompanyId,
  } = useAppData();
  
  // État pour l'onglet actif (par défaut: Catégories)
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  
  // État pour la catégorie dépliée (accordion)
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  
  // Chargement des données depuis le backend
  useEffect(() => {
    const loadData = async () => {
      if (!activeCompanyId) {
        return;
      }
      
      try {
        // Charger les catégories
        const categoriesResult = await CategoryService.getAll();
        if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
          (useAppData as any).setState({ categories: categoriesResult.data });
        }
        
        // Charger les services
        const servicesResult = await ServiceService.getAll();
        if (servicesResult.success && Array.isArray(servicesResult.data)) {
          (useAppData as any).setState({ services: servicesResult.data });
        }
      } catch (error) {
        console.error('[CatalogSection] Erreur lors du chargement des données:', error);
      }
    };
    
    loadData();
  }, [activeCompanyId]);
  
  // États pour les catégories
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExtendedCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    description: string;
    active: boolean;
    parentId: string | null;
    duration?: number;
    priceHT?: number;
  }>({
    name: '',
    description: '',
    active: true,
    parentId: null,
    duration: undefined,
    priceHT: undefined,
  });
  const [subCategories, setSubCategories] = useState<Array<{
    id?: string;
    name: string;
    description: string;
    active: boolean;
    priceHT?: number;
  }>>([]);

  // États pour les prestations
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ExtendedService | null>(null);
  const [serviceForm, setServiceForm] = useState<{
    name: string;
    description: string;
    categoryId: string;
    duration: number;
    priceHT: number;
    active: boolean;
  }>({
    name: '',
    description: '',
    categoryId: '',
    duration: 0,
    priceHT: 0,
    active: true,
  });

  
  // Fonctions utilitaires
  const getMainCategories = useCallback(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  const getSubCategories = useCallback((parentId: string) => {
    return categories.filter((c) => c.parentId === parentId);
  }, [categories]);

  const getCategoryName = useCallback((categoryNameOrId: string | undefined) => {
    if (!categoryNameOrId) return 'Non défini';
    // Chercher d'abord par ID
    let category = categories.find((c) => c.id === categoryNameOrId);
    // Si pas trouvé, chercher par nom (pour compatibilité avec l'ancien système)
    if (!category) {
      category = categories.find((c) => c.name === categoryNameOrId);
    }
    return category?.name || categoryNameOrId || 'Non défini';
  }, [categories]);

  const getCategoryIdFromName = useCallback((categoryName: string): string | null => {
    const category = categories.find((c) => c.name === categoryName);
    return category?.id || null;
  }, [categories]);

  const getServiceName = useCallback((serviceId: string | undefined) => {
    if (!serviceId) return 'Non défini';
    const service = services.find((s) => s.id === serviceId);
    return service?.name || 'Non défini';
  }, [services]);

  // Calcul de la durée d'un service (depuis les options ou directement)
  const getServiceDuration = useCallback((service: Service): number => {
    if (service.options && service.options.length > 0) {
      return service.options.reduce((sum, opt) => sum + opt.defaultDurationMin, 0);
    }
    return 0;
  }, []);

  // Calcul du prix HT d'un service (depuis les options ou directement)
  const getServicePrice = useCallback((service: Service): number => {
    if (service.options && service.options.length > 0) {
      return service.options.reduce((sum, opt) => sum + opt.unitPriceHT, 0);
    }
    return 0;
  }, []);

  // Filtrage et tri des catégories
  const filteredAndSortedCategories = useMemo(() => {
    const mainCats = categories.filter((c) => !c.parentId);
    return mainCats.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Filtrage et tri des prestations
  const filteredAndSortedServices = useMemo(() => {
    return services.sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);


  // Gestion des catégories
  const openCategoryModal = (category?: ExtendedCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        active: category.active,
        parentId: category.parentId || null,
      });
      if (!category.parentId) {
        const subCats = getSubCategories(category.id);
        setSubCategories(subCats.map((sc) => ({
          id: sc.id,
          name: sc.name,
          description: sc.description || '',
          active: sc.active,
          priceHT: (sc as any).priceHT,
        })));
      } else {
        setSubCategories([]);
      }
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        active: true,
        parentId: null,
      });
      setSubCategories([]);
    }
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = () => {
    if (!categoryForm.name.trim()) {
      return;
    }

    if (editingCategory) {
        // Mise à jour
      if (categoryForm.parentId) {
        // C'est une sous-catégorie
        updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          active: categoryForm.active,
          parentId: categoryForm.parentId,
          ...(categoryForm.duration !== undefined && { duration: categoryForm.duration } as any),
          ...(categoryForm.priceHT !== undefined && { priceHT: categoryForm.priceHT } as any),
        });
      } else {
        // C'est une grande catégorie
        updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
            active: categoryForm.active,
            parentId: categoryForm.parentId,
          });

        // Mise à jour des sous-catégories
        subCategories.forEach((subCat) => {
          if (subCat.id) {
            // Mise à jour existante
            updateCategory(subCat.id, {
              name: subCat.name.trim(),
              description: subCat.description.trim() || undefined,
              active: subCat.active,
              parentId: editingCategory.id,
              // Utiliser priceHT de l'API Category pour les sous-catégories
              ...(subCat.priceHT !== undefined && { priceHT: subCat.priceHT } as any),
            });
          } else if (subCat.name.trim()) {
            // Nouvelle sous-catégorie
            addCategory({
              name: subCat.name.trim(),
              description: subCat.description.trim() || undefined,
              active: subCat.active,
              parentId: editingCategory.id,
              // Utiliser priceHT de l'API Category pour les sous-catégories
              ...(subCat.priceHT !== undefined && { priceHT: subCat.priceHT } as any),
            });
          }
        });
      }
      } else {
      // Création
      if (categoryForm.parentId) {
        // Création d'une sous-catégorie
        addCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          active: categoryForm.active,
          parentId: categoryForm.parentId,
        });
        } else {
        // Création d'une grande catégorie
          const newCategory = addCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
            active: categoryForm.active,
            parentId: categoryForm.parentId,
          });

        // Création des sous-catégories
        subCategories.forEach((subCat) => {
          if (subCat.name.trim()) {
            addCategory({
              name: subCat.name.trim(),
              description: subCat.description.trim() || undefined,
              active: subCat.active,
              parentId: newCategory.id,
              // Utiliser priceHT de l'API Category pour les sous-catégories
              ...(subCat.priceHT !== undefined && { priceHT: subCat.priceHT } as any),
            });
          }
        });
      }
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      active: true,
      parentId: null,
      duration: undefined,
      priceHT: undefined,
    });
    setSubCategories([]);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      removeCategory(categoryId);
      if (expandedCategoryId === categoryId) {
        setExpandedCategoryId(null);
      }
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
  };

  const openSubCategoryModal = (category: ExtendedCategory, subCategory?: ExtendedCategory) => {
    if (subCategory) {
      // Édition d'une sous-catégorie - on doit recharger depuis les catégories pour avoir les champs complets
      const fullSubCategory = categories.find((c) => c.id === subCategory.id);
      if (fullSubCategory) {
        setEditingCategory(fullSubCategory as ExtendedCategory);
        setCategoryForm({
          name: fullSubCategory.name,
          description: fullSubCategory.description || '',
          active: fullSubCategory.active,
          parentId: category.id, // Toujours la catégorie parente
          duration: (fullSubCategory as any).duration,
          priceHT: (fullSubCategory as any).priceHT,
        });
      }
      setSubCategories([]);
            } else {
      // Création d'une nouvelle sous-catégorie
      setEditingCategory(null);
      setCategoryForm({
        name: '',
                description: '',
        active: true,
        parentId: category.id, // La catégorie parente
        duration: undefined,
        priceHT: undefined,
      });
      setSubCategories([]);
    }
    setShowCategoryModal(true);
  };

  const handleDeleteSubCategory = (subCategoryId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?')) {
      removeCategory(subCategoryId);
    }
  };

  // Gestion des prestations
  const openServiceModal = (service?: ExtendedService) => {
    if (service) {
      setEditingService(service);
      // Mapper le nom de catégorie vers l'ID
      const categoryId = getCategoryIdFromName(service.category as string) || '';
      setServiceForm({
        name: service.name,
        description: service.description || '',
        categoryId,
        duration: getServiceDuration(service),
        priceHT: getServicePrice(service),
        active: service.active,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        categoryId: '',
        duration: 0,
        priceHT: 0,
        active: true,
      });
    }
    setShowServiceModal(true);
  };

  const handleServiceSubmit = () => {
    if (!serviceForm.name.trim() || !serviceForm.categoryId) {
      return;
    }

    const category = categories.find((c) => c.id === serviceForm.categoryId);
    if (!category) {
          return;
        }

    const payload: Omit<Service, 'id'> = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || undefined,
      category: category.name, // Utiliser le nom de la catégorie pour compatibilité
      active: serviceForm.active,
      options: [
        {
          id: editingService?.options?.[0]?.id || `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label: serviceForm.name.trim(),
          description: serviceForm.description.trim() || undefined,
          defaultDurationMin: serviceForm.duration,
          unitPriceHT: serviceForm.priceHT,
          tvaPct: null,
          active: true,
        },
      ],
    };

    if (editingService) {
      updateService(editingService.id, payload);
    } else {
      addService(payload);
    }

    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      categoryId: '',
      duration: 0,
      priceHT: 0,
      active: true,
    });
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette prestation ?')) {
      removeService(serviceId);
    }
  };


  // Rendu des tableaux
  const renderCategoryTable = () => {
    // Debug: vérifier les données
    console.log('[CatalogSection] Categories:', categories.length, 'Main categories:', filteredAndSortedCategories.length);
    console.log('[CatalogSection] Categories raw:', categories);
    
    if (filteredAndSortedCategories.length === 0) {
  return (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Catégories</h2>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <button
              type="button"
                onClick={() => openCategoryModal()}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              >
                <IconPlus />
                Nouvelle catégorie
            </button>
            </div>
          </div>
          <CRMEmptyState
            title="Aucune catégorie"
            description="Créez votre première catégorie de prestations"
            action={
            <button
                onClick={() => openCategoryModal()}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <IconPlus />
                Créer une catégorie
            </button>
            }
          />
        </section>
      );
    }

    return (
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Catégories</h2>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <button
                  type="button"
              onClick={() => openCategoryModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                >
              <IconPlus />
                  Nouvelle catégorie
                </button>
              </div>
            </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="overflow-x-auto rounded-2xl">
                <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-12">
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Nom
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Nb sous-catégories
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                {filteredAndSortedCategories.map((category) => {
                  const subCats = getSubCategories(category.id);
                  const isExpanded = expandedCategoryId === category.id;
                    return (
                    <>
                    <tr 
                      key={category.id} 
                        className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                          if (target.closest('button')) {
                          return;
                        }
                          toggleCategoryExpansion(category.id);
                        }}
                      >
                        <td className="px-6 py-5 align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategoryExpansion(category.id);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-5 align-middle">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {category.name}
                          </p>
                      </td>
                        <td className="px-6 py-5 align-middle">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {category.description || '—'}
                          </p>
                      </td>
                        <td className="px-6 py-5 align-middle">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {subCats.length}
                          </p>
                        </td>
                        <td className="px-6 py-5 align-middle">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                            category.active
                                ? 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]'
                                : 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]'
                          )}
                        >
                          {category.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                        <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                          <button
                            type="button"
                              onClick={() => openCategoryModal(category as ExtendedCategory)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Modifier"
                          >
                              <IconEdit />
                          </button>
                          <button
                            type="button"
                              onClick={() => handleDeleteCategory(category.id)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                            title="Supprimer"
                          >
                              <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                      {isExpanded && (
                        <tr key={`${category.id}-sub`}>
                          <td colSpan={6} className="px-0 py-0 bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="px-6 py-4">
                              {subCats.length > 0 ? (
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                                  <table className="w-full">
                                    <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                          Nom
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                          Durée
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                          Tarif
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                          Statut
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {subCats.map((sub) => (
                                        <tr
                                          key={sub.id}
                                          className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                                        >
                                          <td className="px-4 py-3 align-middle">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                              {sub.name}
                                            </p>
                                          </td>
                                          <td className="px-4 py-3 align-middle">
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                              {(sub as any).duration ? formatDuration((sub as any).duration) : '—'}
                                            </p>
                                          </td>
                                          <td className="px-4 py-3 align-middle">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                              {(sub as any).priceHT ? formatCurrency((sub as any).priceHT) : '—'}
                                            </p>
                                          </td>
                                          <td className="px-4 py-3 align-middle">
                    <span
                      className={clsx(
                                                'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                                                sub.active
                                                  ? 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]'
                                                  : 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]'
                                              )}
                                            >
                                              {sub.active ? 'Actif' : 'Inactif'}
                    </span>
                                          </td>
                                          <td className="px-4 py-3 align-middle">
                                            <div className="flex items-center justify-start gap-2">
                <button
                  type="button"
                                                onClick={() => openSubCategoryModal(category as ExtendedCategory, sub as ExtendedCategory)}
                                                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                                title="Modifier"
                >
                                                <IconEdit />
                </button>
                <button
                  type="button"
                                                onClick={() => handleDeleteSubCategory(sub.id!)}
                                                className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                                                title="Supprimer"
                                              >
                                                <IconTrash />
                </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Aucune sous-catégorie
                                  </p>
                <button
                  type="button"
                                    onClick={() => openSubCategoryModal(category as ExtendedCategory)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                                    <IconPlus />
                                    Ajouter une sous-catégorie
                </button>
              </div>
                              )}
            </div>
                          </td>
                        </tr>
                      )}
                    </>
              );
            })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };

  const renderServiceTable = () => {
    // Debug: vérifier les données
    console.log('[CatalogSection] Services:', services.length, 'Filtered:', filteredAndSortedServices.length);
    
    if (filteredAndSortedServices.length === 0) {
      return (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prestations</h2>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
              <button
                type="button"
                onClick={() => openServiceModal()}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              >
                <IconPlus />
                Nouvelle prestation
              </button>
            </div>
          </div>
              <CRMEmptyState
            title="Aucune prestation"
            description="Créez votre première prestation"
            action={
              <button
                onClick={() => openServiceModal()}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <IconPlus />
                Créer une prestation
              </button>
            }
          />
          </section>
      );
    }

    return (
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prestations</h2>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <button
                  type="button"
              onClick={() => openServiceModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                >
              <IconPlus />
              Nouvelle prestation
                </button>
              </div>
            </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="overflow-x-auto rounded-2xl">
                <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Nom
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Catégorie
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Durée
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Tarif
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                {filteredAndSortedServices.map((service) => {
                  const duration = getServiceDuration(service);
                  const price = getServicePrice(service);
                    return (
                      <tr 
                        key={service.id} 
                      className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                    >
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {service.name}
                        </p>
                        {service.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {service.description}
                          </p>
                        )}
                        </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {getCategoryName(service.category)}
                        </p>
                        </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm text-slate-900 dark:text-slate-100">
                          {duration > 0 ? formatDuration(duration) : '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {price > 0 ? formatCurrency(price) : '—'}
                          </p>
                        </td>
                      <td className="px-6 py-5 align-middle">
                          <span
                            className={clsx(
                              'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                              service.active
                              ? 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]'
                              : 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]'
                            )}
                          >
                            {service.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                            <button
                              type="button"
                            onClick={() => openServiceModal(service as ExtendedService)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                              title="Modifier"
                            >
                            <IconEdit />
                            </button>
                            <button
                              type="button"
                            onClick={() => handleDeleteService(service.id)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                              title="Supprimer"
                            >
                            <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
      </section>
    );
  };


            return (
    <>
      <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Gestion CRM</p>
            <h1 className="dashboard-hero__title">Catalogue de prestations</h1>
            <p className="dashboard-hero__subtitle">
              Constituez un catalogue unifié pour accélérer la création d'interventions, devis et factures.
            </p>
                    </div>
                      </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

        {/* Sélecteur d'onglets style iPhone */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                  <button
              onClick={() => setActiveTab('categories')}
              className={clsx(
                'px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 min-w-[120px]',
                activeTab === 'categories'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              Catégories
                  </button>
                  <button
              onClick={() => setActiveTab('services')}
              className={clsx(
                'px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 min-w-[120px]',
                activeTab === 'services'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              Prestations
            </button>
            </div>
        </div>

        {/* Rendu conditionnel des tableaux */}
        {activeTab === 'categories' && renderCategoryTable()}
        {activeTab === 'services' && renderServiceTable()}
      </div>

      {/* Modal Catégorie */}
      {showCategoryModal && (
        <CatalogModalLayout
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          eyebrow="CATÉGORIE"
          title={
            categoryForm.parentId
              ? (editingCategory ? 'Modifier la sous-catégorie' : 'Créer une sous-catégorie')
              : (editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie')
          }
          description={
            categoryForm.parentId
              ? (editingCategory ? 'Modifiez les informations de la sous-catégorie' : 'Créez une nouvelle sous-catégorie')
              : (editingCategory ? 'Modifiez les informations de la catégorie' : 'Créez une nouvelle catégorie de prestations')
          }
          footer={
            <>
                  <button
                    type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                Annuler
                  </button>
                <button
                  type="button"
                onClick={handleCategorySubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                {editingCategory ? 'Enregistrer' : 'Créer'}
                </button>
            </>
          }
        >
              <>
                <div>
                  <CRMFormLabel htmlFor="category-name" required>
                    Nom de la catégorie
                  </CRMFormLabel>
                  <CRMFormInput
                    id="category-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Ex: Voiture, Canapé..."
                    className="mt-1"
                  />
              </div>

                <div>
                  <CRMFormLabel htmlFor="category-description">
                    Description
                  </CRMFormLabel>
                  <CRMFormTextarea
                    id="category-description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Description de la catégorie..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                {categoryForm.parentId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <CRMFormLabel htmlFor="category-duration">
                        Durée (minutes)
                      </CRMFormLabel>
                      <CRMFormInput
                        id="category-duration"
                        type="number"
                        value={categoryForm.duration || ''}
                        onChange={(e) => setCategoryForm({ ...categoryForm, duration: parseInt(e.target.value) || undefined })}
                        placeholder="0"
                        className="mt-1"
                      />
                  </div>
                    <div>
                      <CRMFormLabel htmlFor="category-price">
                        Tarif HT (€)
                      </CRMFormLabel>
                      <CRMFormInput
                        id="category-price"
                        type="number"
                        step="0.01"
                        value={categoryForm.priceHT || ''}
                        onChange={(e) => setCategoryForm({ ...categoryForm, priceHT: parseFloat(e.target.value) || undefined })}
                        placeholder="0.00"
                        className="mt-1"
                      />
                  </div>
              </div>
                )}

                {/* Toggle Actif */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <CRMFormLabel htmlFor="category-active" className="mb-0">
                      {categoryForm.parentId ? 'Sous-catégorie active' : 'Catégorie active'}
                    </CRMFormLabel>
                </div>
                <button
                  type="button"
                    role="switch"
                    aria-checked={categoryForm.active}
                    onClick={() => setCategoryForm({ ...categoryForm, active: !categoryForm.active })}
              className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      categoryForm.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                  >
                    <span
              className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        categoryForm.active ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                </button>
              </div>

                {!categoryForm.parentId && (
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <CRMFormLabel>Sous-catégories</CRMFormLabel>
                      <button
                        type="button"
                        onClick={() => setSubCategories([...subCategories, {
                          name: '',
                          description: '',
                          active: true,
                        }])}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <IconPlus />
                        Ajouter
                      </button>
                    </div>
                    {subCategories.map((subCat, index) => (
                      <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Sous-catégorie {index + 1}
                  </span>
                                <button
                            onClick={() => setSubCategories(subCategories.filter((_, i) => i !== index))}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            <IconTrash />
                                </button>
                                  </div>
                        <CRMFormInput
                          value={subCat.name}
                          onChange={(e) => {
                            const updated = [...subCategories];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setSubCategories(updated);
                          }}
                          placeholder="Nom de la sous-catégorie"
                          className="mt-1"
                        />
                        <CRMFormTextarea
                          value={subCat.description}
                          onChange={(e) => {
                            const updated = [...subCategories];
                            updated[index] = { ...updated[index], description: e.target.value };
                            setSubCategories(updated);
                          }}
                          placeholder="Description..."
                          rows={2}
                          className="mt-1"
                        />
                        <div>
                          <CRMFormLabel htmlFor={`sub-price-${index}`}>
                            Tarif HT (€)
                          </CRMFormLabel>
                          <CRMFormInput
                            id={`sub-price-${index}`}
                            type="number"
                            step="0.01"
                            value={subCat.priceHT || ''}
                            onChange={(e) => {
                              const updated = [...subCategories];
                              updated[index] = { ...updated[index], priceHT: parseFloat(e.target.value) || undefined };
                              setSubCategories(updated);
                            }}
                            placeholder="0.00"
                            className="mt-1"
                          />
                                </div>
                                  <div className="flex items-center justify-between py-1">
                                    <CRMFormLabel className="mb-0 text-xs">Active</CRMFormLabel>
                                <button
                                  type="button"
                                      role="switch"
                                      aria-checked={subCat.active}
                                  onClick={() => {
                                        const updated = [...subCategories];
                                        updated[index] = { ...updated[index], active: !subCat.active };
                                        setSubCategories(updated);
                                  }}
                                  className={clsx(
                                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                                        subCat.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                      )}
                                    >
                                      <span
                                        className={clsx(
                                          'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                          subCat.active ? 'translate-x-5' : 'translate-x-0.5'
                                        )}
                                      />
                                </button>
                              </div>
              </div>
                          ))}
                      </div>
                    )}
                      </>
        </CatalogModalLayout>
      )}

      {/* Modal Prestation */}
      {showServiceModal && (
        <CatalogModalLayout
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          eyebrow="PRESTATION"
          title={editingService ? 'Modifier la prestation' : 'Créer une prestation'}
          description={editingService ? 'Modifiez les informations de la prestation' : 'Créez une nouvelle prestation'}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
                              <button
                                type="button"
                onClick={handleServiceSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                {editingService ? 'Enregistrer' : 'Créer'}
                              </button>
            </>
          }
        >
          <>
                <div>
                  <CRMFormLabel htmlFor="service-name" required>
                    Nom de la prestation
                  </CRMFormLabel>
                  <CRMFormInput
                    id="service-name"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Nettoyage complet..."
                    className="mt-1"
                  />
                            </div>

                <div>
                  <CRMFormLabel htmlFor="service-description">
                    Description
                  </CRMFormLabel>
                  <CRMFormTextarea
                    id="service-description"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Description de la prestation..."
                    rows={4}
                    className="mt-1"
                  />
                        </div>

                <div>
                  <CRMFormLabel htmlFor="service-category" required>
                    Grande catégorie
                  </CRMFormLabel>
                  <CRMFormSelect
                    id="service-category"
                    value={serviceForm.categoryId}
                    onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                    className="mt-1"
                  >
                    <option value="">Sélectionner une catégorie...</option>
                    {getMainCategories().map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </CRMFormSelect>
                      </div>

                <div className="grid grid-cols-2 gap-4">
                      <div>
                    <CRMFormLabel htmlFor="service-duration" required>
                      Durée (minutes)
                    </CRMFormLabel>
                    <CRMFormInput
                      id="service-duration"
                      type="number"
                      value={serviceForm.duration || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                      </div>
                  <div>
                    <CRMFormLabel htmlFor="service-price" required>
                      Tarif HT (€)
                    </CRMFormLabel>
                    <CRMFormInput
                      id="service-price"
                      type="number"
                      step="0.01"
                      value={serviceForm.priceHT || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, priceHT: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
          </div>
              </div>

                {/* Toggle Actif */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <CRMFormLabel htmlFor="service-active" className="mb-0">
                      Prestation active
                    </CRMFormLabel>
              </div>
                                <button
                                  type="button"
                    role="switch"
                    aria-checked={serviceForm.active}
                    onClick={() => setServiceForm({ ...serviceForm, active: !serviceForm.active })}
                                  className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      serviceForm.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        serviceForm.active ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                                </button>
          </div>
                      </>
        </CatalogModalLayout>
      )}
    </>
  );
};
