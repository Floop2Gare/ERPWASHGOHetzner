import React, { useState, useMemo, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronRight, ChevronDown } from 'lucide-react';

import { IconEdit, IconPlus, IconTrash } from './icons';
import { useAppData } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';
import { CategoryService, ServiceService } from '../api';
import {
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMFormTextarea,
  CRMEmptyState,
} from './crm';
import { CatalogModalLayout } from '../pages/settings/CatalogModalLayout';
import type { Category, Service } from '../store/useAppData';

type ExtendedCategory = Category & {
  priceHT?: number;
};

type ExtendedService = Service & {
  categoryId?: string;
  duration?: number;
  priceHT?: number;
};

type ActiveTab = 'categories' | 'services';

interface ServiceCatalogManagerProps {
  onServiceCreated?: (service: Service) => void;
  onCategoryCreated?: (category: Category) => void;
  compact?: boolean; // Mode compact pour intégration dans DevisPage
}

export const ServiceCatalogManager = ({
  onServiceCreated,
  onCategoryCreated,
  compact = false,
}: ServiceCatalogManagerProps) => {
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
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('services');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  
  // Chargement des données depuis le backend
  useEffect(() => {
    const loadData = async () => {
      if (!activeCompanyId) {
        return;
      }
      
      try {
        const categoriesResult = await CategoryService.getAll();
        if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
          (useAppData as any).setState({ categories: categoriesResult.data });
        }
        
        const servicesResult = await ServiceService.getAll();
        if (servicesResult.success && Array.isArray(servicesResult.data)) {
          (useAppData as any).setState({ services: servicesResult.data });
        }
      } catch (error) {
        console.error('[ServiceCatalogManager] Erreur lors du chargement des données:', error);
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
  
  // États pour les services
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ExtendedService | null>(null);
  const [serviceForm, setServiceForm] = useState<{
    name: string;
    description: string;
    categoryId: string;
    active: boolean;
    duration?: number;
    priceHT?: number;
  }>({
    name: '',
    description: '',
    categoryId: '',
    active: true,
    duration: undefined,
    priceHT: undefined,
  });
  
  // Fonctions helper
  const getMainCategories = useCallback(() => {
    return categories.filter((cat) => !cat.parentId);
  }, [categories]);
  
  const getSubCategories = useCallback((parentId: string) => {
    return categories.filter((cat) => cat.parentId === parentId);
  }, [categories]);

  // Services filtrés (hook au niveau du composant)
  const filteredServices = useMemo(() => {
    return services.filter((service) => service.active !== false);
  }, [services]);
  
  // Fonctions pour calculer le prix et la durée d'un service
  const getServicePrice = useCallback((service: Service): number => {
    // Priorité au base_price si disponible (même si 0)
    if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
      return (service as any).base_price;
    }
    // Sinon, calculer depuis les options
    if (service.options && service.options.length > 0) {
      return service.options.reduce((sum, opt) => sum + opt.unitPriceHT, 0);
    }
    return 0;
  }, []);
  
  const getServiceDuration = useCallback((service: Service): number => {
    // Priorité au base_duration si disponible (même si 0)
    if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
      return (service as any).base_duration;
    }
    // Sinon, calculer depuis les options
    if (service.options && service.options.length > 0) {
      return service.options.reduce((sum, opt) => sum + (opt.defaultDurationMin || 0), 0);
    }
    return 0;
  }, []);
  
  // Gestion des catégories
  const openCategoryModal = (category?: ExtendedCategory, parentId?: string | null) => {
    // Si on passe un parentId explicite, c'est pour créer une sous-catégorie
    if (parentId !== undefined) {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        active: true,
        parentId: parentId,
        duration: undefined,
        priceHT: undefined,
      });
    } else if (category) {
      // Si la catégorie a un parentId mais qu'on veut créer une sous-catégorie (pas éditer)
      // On vérifie si c'est un objet créé juste pour passer le parentId
      if (category.parentId && category.id && category.id === category.parentId) {
        // C'est un objet artificiel pour créer une sous-catégorie
        setEditingCategory(null);
        setCategoryForm({
          name: '',
          description: '',
          active: true,
          parentId: category.parentId,
          duration: undefined,
          priceHT: undefined,
        });
      } else {
        // C'est une vraie édition
        setEditingCategory(category);
        setCategoryForm({
          name: category.name,
          description: category.description || '',
          active: category.active ?? true,
          parentId: category.parentId || null,
          duration: (category as any).defaultDurationMin ?? (category as any).duration,
          priceHT: category.priceHT || (category as any).priceHT,
        });
      }
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        active: true,
        parentId: null,
        duration: undefined,
        priceHT: undefined,
      });
    }
    setShowCategoryModal(true);
  };
  
  const handleCategorySubmit = async () => {
    if (!categoryForm.name.trim()) {
      return;
    }
    
    try {
      if (editingCategory) {
        // Mise à jour d'une catégorie existante
        const updatePayload: any = {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          active: categoryForm.active,
          parentId: categoryForm.parentId || undefined,
        };
        
        // Ajouter priceHT et defaultDurationMin si c'est une sous-catégorie
        if (categoryForm.parentId) {
          if (categoryForm.priceHT !== undefined) {
            updatePayload.priceHT = categoryForm.priceHT;
          }
          if (categoryForm.duration !== undefined && categoryForm.duration !== null) {
            updatePayload.defaultDurationMin = categoryForm.duration;
          }
        }
        
        // Mettre à jour dans le backend
        const result = await CategoryService.update(editingCategory.id, updatePayload);
        
        if (result.success && result.data) {
          // Fermer rapidement la modal pour éviter le blocage visuel
          setShowCategoryModal(false);
          setEditingCategory(null);
          
          // Mettre à jour le state local
          const updated = updateCategory(editingCategory.id, {
            name: result.data.name,
            description: result.data.description,
            active: result.data.active,
            parentId: result.data.parentId || undefined,
          });
          
          // Recharger les catégories depuis le backend pour avoir les données à jour
          const categoriesResult = await CategoryService.getAll();
          if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
            (useAppData as any).setState({ categories: categoriesResult.data });
          }
          
          if (onCategoryCreated && updated) {
            onCategoryCreated(updated);
          }
        } else {
          console.error('[ServiceCatalogManager] Erreur lors de la mise à jour de la catégorie:', result.error);
          return;
        }
      } else {
        // Création d'une nouvelle catégorie
        const createPayload: any = {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          active: categoryForm.active,
          parentId: categoryForm.parentId || undefined,
        };
        
        // Ajouter priceHT et defaultDurationMin si c'est une sous-catégorie
        if (categoryForm.parentId) {
          if (categoryForm.priceHT !== undefined) {
            createPayload.priceHT = categoryForm.priceHT;
          }
          if (categoryForm.duration !== undefined && categoryForm.duration !== null) {
            createPayload.defaultDurationMin = categoryForm.duration;
          }
        }
        
        // Créer dans le backend
        const result = await CategoryService.create(createPayload);
        
        if (result.success && result.data) {
          // Fermer rapidement la modal pour éviter le blocage visuel
          setShowCategoryModal(false);
          setEditingCategory(null);
          
          // Ajouter au state local
          const created = addCategory({
            name: result.data.name,
            description: result.data.description,
            active: result.data.active,
            parentId: result.data.parentId || undefined,
          });
          
          // Recharger les catégories depuis le backend pour avoir les données à jour
          const categoriesResult = await CategoryService.getAll();
          if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
            (useAppData as any).setState({ categories: categoriesResult.data });
          }
          
          if (onCategoryCreated && created) {
            onCategoryCreated(created);
          }
        } else {
          console.error('[ServiceCatalogManager] Erreur lors de la création de la catégorie:', result.error);
          return;
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
    } catch (error) {
      console.error('[ServiceCatalogManager] Erreur lors de la sauvegarde de la catégorie:', error);
    }
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }
    
    try {
      removeCategory(categoryId);
    } catch (error) {
      console.error('[ServiceCatalogManager] Erreur lors de la suppression de la catégorie:', error);
    }
  };
  
  // Gestion des services
  const openServiceModal = (service?: ExtendedService) => {
    if (service) {
      setEditingService(service);
      // Trouver l'ID de la catégorie depuis le nom
      const category = categories.find((cat) => cat.name === service.category || cat.id === (service as any).categoryId);
      setServiceForm({
        name: service.name,
        description: service.description || '',
        categoryId: category?.id || (service as any).categoryId || service.category || '',
        active: service.active ?? true,
        duration: (service as any).base_duration || (service as any).duration || undefined,
        priceHT: (service as any).base_price || (service as any).priceHT || undefined,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        categoryId: '',
        active: true,
        duration: undefined,
        priceHT: undefined,
      });
    }
    setShowServiceModal(true);
  };
  
  const handleServiceSubmit = async () => {
    if (!serviceForm.name.trim() || !serviceForm.categoryId) {
      return;
    }
    
    try {
      // Trouver le nom de la catégorie depuis l'ID
      const category = categories.find((cat) => cat.id === serviceForm.categoryId);
      const categoryName = category?.name || serviceForm.categoryId;
      
      const servicePayload: any = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        category: categoryName,
        active: serviceForm.active,
        options: [], // Les options seront gérées séparément
      };
      
      // Ajouter base_price et base_duration si fournis (même si 0)
      // Convertir explicitement en nombre et vérifier que ce n'est pas NaN
      // Accepter 0 comme valeur valide
      // Ne pas vérifier !== '' car les nombres ne sont jamais des chaînes vides dans le state
      if (serviceForm.priceHT !== undefined && serviceForm.priceHT !== null) {
        const priceValue = typeof serviceForm.priceHT === 'string' ? parseFloat(serviceForm.priceHT) : Number(serviceForm.priceHT);
        if (!isNaN(priceValue) && isFinite(priceValue)) {
          servicePayload.base_price = priceValue;
          console.log('[ServiceCatalogManager] ✅ base_price ajouté au payload:', priceValue);
        } else {
          console.warn('[ServiceCatalogManager] ⚠️ base_price invalide:', serviceForm.priceHT);
        }
      } else {
        console.log('[ServiceCatalogManager] ℹ️ base_price non fourni (undefined/null):', serviceForm.priceHT);
      }
      if (serviceForm.duration !== undefined && serviceForm.duration !== null) {
        const durationValue = typeof serviceForm.duration === 'string' ? parseInt(serviceForm.duration, 10) : Number(serviceForm.duration);
        if (!isNaN(durationValue) && isFinite(durationValue)) {
          servicePayload.base_duration = durationValue;
          console.log('[ServiceCatalogManager] ✅ base_duration ajouté au payload:', durationValue);
        } else {
          console.warn('[ServiceCatalogManager] ⚠️ base_duration invalide:', serviceForm.duration);
        }
      } else {
        console.log('[ServiceCatalogManager] ℹ️ base_duration non fourni (undefined/null):', serviceForm.duration);
      }
      
      // Debug: afficher le payload avant envoi
      console.log('[ServiceCatalogManager] Payload de service:', JSON.stringify(servicePayload, null, 2));
      console.log('[ServiceCatalogManager] Valeurs du formulaire:', {
        priceHT: serviceForm.priceHT,
        duration: serviceForm.duration,
        priceHTType: typeof serviceForm.priceHT,
        durationType: typeof serviceForm.duration,
        priceHTInPayload: 'base_price' in servicePayload,
        durationInPayload: 'base_duration' in servicePayload
      });
      
      if (editingService) {
        // Mise à jour via l'API
        const result = await ServiceService.update(editingService.id, servicePayload);
        
        if (result.success && result.data) {
          // Debug: vérifier ce que le backend a retourné
          console.log('[ServiceCatalogManager] Service mis à jour, réponse backend:', JSON.stringify(result.data, null, 2));
          console.log('[ServiceCatalogManager] base_price dans la réponse:', result.data.base_price);
          console.log('[ServiceCatalogManager] base_duration dans la réponse:', result.data.base_duration);
          
          // Recharger les services depuis le backend pour avoir les données complètes
          // Ne pas utiliser updateService() pour éviter les incohérences avec les données du backend
          const servicesResult = await ServiceService.getAll();
          if (servicesResult.success && Array.isArray(servicesResult.data)) {
            (useAppData as any).setState({ services: servicesResult.data });
            
            // Debug: vérifier que les valeurs sont bien dans les services rechargés
            const updatedService = servicesResult.data.find((s: any) => s.id === editingService.id);
            if (updatedService) {
              console.log('[ServiceCatalogManager] ✅ Service rechargé après mise à jour:', {
                id: updatedService.id,
                name: updatedService.name,
                base_price: updatedService.base_price,
                base_duration: updatedService.base_duration
              });
              
              // Appeler le callback avec le service complet du backend
              if (onServiceCreated) {
                onServiceCreated(updatedService);
              }
            } else {
              console.warn('[ServiceCatalogManager] ⚠️ Service mis à jour non trouvé après rechargement');
            }
          }
        } else {
          console.error('[ServiceCatalogManager] Erreur lors de la mise à jour du service:', result.error);
          return;
        }
      } else {
        // Création via l'API
        const result = await ServiceService.create(servicePayload);
        
        if (result.success && result.data) {
          // Debug: vérifier ce que le backend a retourné
          console.log('[ServiceCatalogManager] Service créé, réponse backend:', JSON.stringify(result.data, null, 2));
          console.log('[ServiceCatalogManager] base_price dans la réponse:', result.data.base_price);
          console.log('[ServiceCatalogManager] base_duration dans la réponse:', result.data.base_duration);
          
          // Recharger les services depuis le backend pour avoir les données complètes
          // Ne pas utiliser addService() car cela créerait un doublon avec un ID différent
          const servicesResult = await ServiceService.getAll();
          if (servicesResult.success && Array.isArray(servicesResult.data)) {
            (useAppData as any).setState({ services: servicesResult.data });
            
            // Debug: vérifier que les valeurs sont bien dans les services rechargés
            const createdService = servicesResult.data.find((s: any) => s.id === result.data.id);
            if (createdService) {
              console.log('[ServiceCatalogManager] ✅ Service rechargé avec toutes les données:', {
                id: createdService.id,
                name: createdService.name,
                base_price: createdService.base_price,
                base_duration: createdService.base_duration
              });
              
              // Appeler le callback avec le service complet du backend
              if (onServiceCreated) {
                onServiceCreated(createdService);
              }
            } else {
              console.warn('[ServiceCatalogManager] ⚠️ Service créé non trouvé après rechargement');
            }
          }
        } else {
          console.error('[ServiceCatalogManager] Erreur lors de la création du service:', result.error);
          return;
        }
      }
      
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        categoryId: '',
        active: true,
        duration: undefined,
        priceHT: undefined,
      });
    } catch (error) {
      console.error('[ServiceCatalogManager] Erreur lors de la sauvegarde du service:', error);
    }
  };
  
  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette prestation ?')) {
      return;
    }
    
    try {
      removeService(serviceId);
    } catch (error) {
      console.error('[ServiceCatalogManager] Erreur lors de la suppression du service:', error);
    }
  };
  
  // Rendu du tableau des catégories
  const renderCategoryTable = () => {
    const mainCategories = getMainCategories();
    
    if (mainCategories.length === 0) {
      return (
        <CRMEmptyState
          title="Aucune catégorie"
          description="Créez votre première catégorie pour organiser vos prestations."
          actionLabel="Créer une catégorie"
          onAction={() => openCategoryModal()}
        />
      );
    }
    
    return (
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Sous-catégories
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {mainCategories.map((category) => {
                const subCategories = getSubCategories(category.id);
                const isExpanded = expandedCategoryId === category.id;
                
                return (
                  <React.Fragment key={category.id}>
                    <tr
                      className="group hover:bg-slate-100/50 dark:hover:bg-white/5 cursor-pointer transition border-b border-slate-100 dark:border-slate-800/30"
                      onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)}
                    >
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCategoryId(isExpanded ? null : category.id);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {category.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {category.description || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle text-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {subCategories.length}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle text-center">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                            category.active
                              ? 'bg-emerald-200 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          )}
                        >
                          {category.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCategoryModal(category as ExtendedCategory);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Modifier"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCategoryModal(undefined, category.id);
                            }}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            title="Ajouter une sous-catégorie"
                          >
                            <IconPlus />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category.id);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                            title="Supprimer"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-white dark:bg-white border-b border-slate-100 dark:border-slate-800/30">
                          {subCategories.length === 0 ? (
                            <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Aucune sous-catégorie
                              </p>
                              <button
                                type="button"
                                onClick={() => openCategoryModal(undefined, category.id)}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                              >
                                <IconPlus />
                                Ajouter une sous-catégorie
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {subCategories.map((subCat) => (
                                <div
                                  key={subCat.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {subCat.name}
                                      </span>
                                      {((subCat as any).priceHT || (subCat as any).defaultDurationMin) && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                          {(subCat as any).priceHT && (
                                            <span>{formatCurrency((subCat as any).priceHT)}</span>
                                          )}
                                          {(subCat as any).defaultDurationMin && (
                                            <span>• {formatDuration((subCat as any).defaultDurationMin)}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {subCat.description && (
                                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                        {subCat.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openCategoryModal(subCat as ExtendedCategory)}
                                      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                      title="Modifier"
                                    >
                                      <IconEdit />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(subCat.id)}
                                      className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                                      title="Supprimer"
                                    >
                                      <IconTrash />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => openCategoryModal(undefined, category.id)}
                                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <IconPlus />
                                Ajouter une sous-catégorie
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Rendu du tableau des services
  const renderServiceTable = () => {
    if (filteredServices.length === 0) {
      return (
        <CRMEmptyState
          title="Aucune prestation"
          description="Créez votre première prestation pour commencer."
          actionLabel="Créer une prestation"
          onAction={() => openServiceModal()}
        />
      );
    }
    
    return (
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Catégorie
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Durée
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tarif
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {filteredServices.map((service) => {
                const category = categories.find((cat) => cat.id === service.category || cat.name === service.category);
                const duration = getServiceDuration(service);
                const price = getServicePrice(service);
                
                return (
                  <tr key={service.id} className="group hover:bg-slate-100/50 dark:hover:bg-white/5 transition border-b border-slate-100 dark:border-slate-800/30">
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
                        {category?.name || service.category || '—'}
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
                    <td className="px-6 py-5 align-middle text-center">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                          service.active
                            ? 'bg-emerald-200 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        )}
                      >
                        {service.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center justify-center gap-2">
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
    );
  };
  
  return (
    <div 
      className={clsx('space-y-6', compact && 'space-y-4')}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* Sélecteur d'onglets */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab('categories');
            }}
            className={clsx(
              'px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 min-w-[120px]',
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            Catégories
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab('services');
            }}
            className={clsx(
              'px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 min-w-[120px]',
              activeTab === 'services'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
          >
            Prestations
          </button>
        </div>
      </div>
      
      {/* Bouton de création en haut */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {activeTab === 'categories' ? 'Catégories' : 'Prestations'}
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activeTab === 'categories') {
              openCategoryModal();
            } else {
              openServiceModal();
            }
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <IconPlus />
          {activeTab === 'categories' ? 'Créer une catégorie' : 'Créer une prestation'}
        </button>
      </div>
      
      {/* Rendu conditionnel des tableaux */}
      {activeTab === 'categories' && renderCategoryTable()}
      {activeTab === 'services' && renderServiceTable()}
      
      {/* Modal Catégorie */}
      {showCategoryModal && (
        <CatalogModalLayout
          isOpen={showCategoryModal}
          onClose={() => {
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
          }}
          eyebrow="CATÉGORIE"
          title={editingCategory ? 'Modifier la catégorie' : categoryForm.parentId ? 'Créer une sous-catégorie' : 'Créer une catégorie'}
          description={editingCategory ? 'Modifiez les informations de la catégorie' : categoryForm.parentId ? 'Créez une nouvelle sous-catégorie' : 'Créez une nouvelle catégorie principale'}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
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
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCategorySubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Enregistrer
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {!editingCategory && !categoryForm.parentId && (
              <div>
                <CRMFormLabel htmlFor="category-parent">
                  Catégorie parente (optionnel)
                </CRMFormLabel>
                <CRMFormSelect
                  id="category-parent"
                  value={categoryForm.parentId || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value || null })}
                  className="mt-1"
                >
                  <option value="">Aucune (catégorie principale)</option>
                  {getMainCategories().map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </CRMFormSelect>
              </div>
            )}
            
            {categoryForm.parentId && !editingCategory && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-white">
                <p className="text-sm text-slate-900 dark:text-slate-900">
                  Vous créez une sous-catégorie de "{categories.find(c => c.id === categoryForm.parentId)?.name || 'Catégorie'}"
                </p>
              </div>
            )}
            
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
                  <CRMFormLabel htmlFor="category-price">
                    Tarif HT (€)
                  </CRMFormLabel>
                  <CRMFormInput
                    id="category-price"
                    type="number"
                    step="0.01"
                    value={categoryForm.priceHT || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategoryForm({ 
                        ...categoryForm, 
                        priceHT: value === '' ? undefined : (parseFloat(value) || undefined)
                      });
                    }}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <CRMFormLabel htmlFor="category-duration">
                    Durée (minutes)
                  </CRMFormLabel>
                  <CRMFormInput
                    id="category-duration"
                    type="number"
                    value={categoryForm.duration !== undefined && categoryForm.duration !== null ? categoryForm.duration : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setCategoryForm({ ...categoryForm, duration: undefined });
                      } else {
                        const numValue = parseInt(value, 10);
                        setCategoryForm({ 
                          ...categoryForm, 
                          duration: isNaN(numValue) ? undefined : numValue
                        });
                      }
                    }}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                id="category-active"
                checked={categoryForm.active}
                onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <CRMFormLabel htmlFor="category-active" className="mb-0">
                Catégorie active
              </CRMFormLabel>
            </div>
          </div>
        </CatalogModalLayout>
      )}
      
      {/* Modal Service */}
      {showServiceModal && (
        <CatalogModalLayout
          isOpen={showServiceModal}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
            setServiceForm({
              name: '',
              description: '',
              categoryId: '',
              active: true,
              duration: undefined,
              priceHT: undefined,
            });
          }}
          eyebrow="PRESTATION"
          title={editingService ? 'Modifier la prestation' : 'Créer une prestation'}
          description={editingService ? 'Modifiez les informations de la prestation' : 'Créez une nouvelle prestation'}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowServiceModal(false);
                  setEditingService(null);
                  setServiceForm({
                    name: '',
                    description: '',
                    categoryId: '',
                    active: true,
                    duration: undefined,
                    priceHT: undefined,
                  });
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleServiceSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Enregistrer
              </button>
            </>
          }
        >
          <div className="space-y-4">
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
                <CRMFormLabel htmlFor="service-duration">
                  Durée (minutes)
                </CRMFormLabel>
                  <CRMFormInput
                    id="service-duration"
                    type="number"
                    value={serviceForm.duration !== undefined && serviceForm.duration !== null ? serviceForm.duration : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setServiceForm({ ...serviceForm, duration: undefined });
                      } else {
                        const numValue = parseInt(value, 10);
                        setServiceForm({ 
                          ...serviceForm, 
                          duration: isNaN(numValue) ? undefined : numValue
                        });
                      }
                    }}
                    placeholder="0"
                    className="mt-1"
                  />
              </div>
              <div>
                <CRMFormLabel htmlFor="service-price">
                  Tarif HT (€)
                </CRMFormLabel>
                  <CRMFormInput
                    id="service-price"
                    type="number"
                    step="0.01"
                    value={serviceForm.priceHT !== undefined && serviceForm.priceHT !== null ? serviceForm.priceHT : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setServiceForm({ ...serviceForm, priceHT: undefined });
                      } else {
                        const numValue = parseFloat(value);
                        setServiceForm({ 
                          ...serviceForm, 
                          priceHT: isNaN(numValue) ? undefined : numValue
                        });
                      }
                    }}
                    placeholder="0.00"
                    className="mt-1"
                  />
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                id="service-active"
                checked={serviceForm.active}
                onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <CRMFormLabel htmlFor="service-active" className="mb-0">
                Prestation active
              </CRMFormLabel>
            </div>
          </div>
        </CatalogModalLayout>
      )}
    </div>
  );
};
