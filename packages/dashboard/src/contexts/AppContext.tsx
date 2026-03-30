import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface AppContextState {
  selectedAppId: string | null;
  setSelectedAppId: (appId: string) => void;
  availableApps: Array<{ app_id: string; name: string; org_id: string; is_active: boolean }>;
}

const AppContext = createContext<AppContextState | undefined>(undefined);

const STORAGE_KEY = 'wm_selected_app';

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [selectedAppId, setSelectedAppIdState] = useState<string | null>(null);

  const availableApps = profile?.apps ?? [];

  useEffect(() => {
    if (availableApps.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && availableApps.some(a => a.app_id === stored)) {
      setSelectedAppIdState(stored);
    } else {
      setSelectedAppIdState(availableApps[0].app_id);
    }
  }, [availableApps]);

  const setSelectedAppId = (appId: string) => {
    setSelectedAppIdState(appId);
    localStorage.setItem(STORAGE_KEY, appId);
  };

  return (
    <AppContext.Provider value={{ selectedAppId, setSelectedAppId, availableApps }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
