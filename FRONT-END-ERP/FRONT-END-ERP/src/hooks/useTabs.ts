import { useState, useCallback, useMemo } from 'react';
import { Tab, TabType } from '../components/TabsContainer';

export interface TabData {
  id: string;
  type: TabType;
  entityId: string;
  label: string;
}

export const useTabs = () => {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((type: TabType, entityId: string, label: string) => {
    const tabId = `${type}-${entityId}`;
    setTabs((current) => {
      // Si l'onglet existe déjà, on l'active
      if (current.some((tab) => tab.id === tabId)) {
        setActiveTabId(tabId);
        return current;
      }
      // Sinon, on l'ajoute
      return [...current, { id: tabId, type, entityId, label }];
    });
    setActiveTabId(tabId);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((current) => {
      const filtered = current.filter((tab) => tab.id !== tabId);
      // Si on ferme l'onglet actif, on active le dernier onglet restant
      if (activeTabId === tabId) {
        setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  }, [activeTabId]);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [tabs, activeTabId]);

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    closeAllTabs,
    setActiveTab,
  };
};

