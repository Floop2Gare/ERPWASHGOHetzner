import { X } from 'lucide-react';
import clsx from 'clsx';
import { ReactNode } from 'react';

export type TabType = 'client' | 'lead' | 'service';

export interface Tab {
  id: string;
  type: TabType;
  label: string;
  content: ReactNode;
}

interface TabsContainerProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export const TabsContainer = ({ tabs, activeTabId, onTabChange, onTabClose }: TabsContainerProps) => {
  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'group relative flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTabId === tab.id
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            )}
          >
            <span>{tab.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={clsx(
                'ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
                activeTabId === tab.id ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              aria-label="Fermer l'onglet"
            >
              <X className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>
      {activeTab && (
        <div className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {activeTab.content}
        </div>
      )}
    </div>
  );
};

