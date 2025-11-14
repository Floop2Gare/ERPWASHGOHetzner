import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SIDEBAR_NAVIGATION_LINKS } from '../layout/navigationLinks';

type SidebarNavigationState = {
  order: string[];
  setOrder: (next: string[]) => void;
  resetOrder: () => void;
  ensureLatest: () => void;
};

const STORAGE_KEY = 'washandgo:sidebar-order';
const LEGACY_STORAGE_KEYS = ['washingo:sidebar-order', 'washango:sidebar-order'];

const defaultOrder = () => SIDEBAR_NAVIGATION_LINKS.map((link) => link.to);

const sanitizeOrder = (order: string[]): string[] => {
  const base = defaultOrder();
  const baseSet = new Set(base);
  const unique: string[] = [];

  for (const path of order) {
    if (!baseSet.has(path)) continue;
    if (unique.includes(path)) continue;
    unique.push(path);
  }

  for (const path of base) {
    if (!unique.includes(path)) {
      unique.push(path);
    }
  }

  return unique;
};

const storage = typeof window !== 'undefined'
  ? createJSONStorage<SidebarNavigationState>(() => ({
      getItem: (key) => {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          return value;
        }
        for (const legacy of LEGACY_STORAGE_KEYS) {
          const legacyValue = window.localStorage.getItem(legacy);
          if (legacyValue !== null) {
            return legacyValue;
          }
        }
        return null;
      },
      setItem: (key, value) => {
        window.localStorage.setItem(key, value);
        LEGACY_STORAGE_KEYS.forEach((legacy) => window.localStorage.removeItem(legacy));
      },
      removeItem: (key) => {
        window.localStorage.removeItem(key);
      },
    }))
  : undefined;

export const useSidebarNavigationStore = create(
  persist<SidebarNavigationState>(
    (set, get) => ({
      order: defaultOrder(),
      setOrder: (next) => set({ order: sanitizeOrder(next) }),
      resetOrder: () => set({ order: defaultOrder() }),
      ensureLatest: () => set({ order: sanitizeOrder(get().order) }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage,
      merge: (persistedState, currentState) => {
        const mergedOrder = sanitizeOrder(
          (persistedState as SidebarNavigationState | undefined)?.order ?? currentState.order ?? defaultOrder()
        );
        return {
          ...currentState,
          order: mergedOrder,
        } as SidebarNavigationState;
      },
    }
  )
);
