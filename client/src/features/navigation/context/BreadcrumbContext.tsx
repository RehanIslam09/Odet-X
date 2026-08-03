import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

export interface BreadcrumbSegment {
  label: string;
  url?: string;
  iconKey?: string;
}

interface BreadcrumbContextValue {
  breadcrumbs: BreadcrumbSegment[];
  setCustomBreadcrumbs: (crumbs: BreadcrumbSegment[]) => void;
  resetCustomBreadcrumbs: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [customCrumbs, setCustomCrumbs] = useState<BreadcrumbSegment[] | null>(null);

  const setCustomBreadcrumbs = useCallback((crumbs: BreadcrumbSegment[]) => {
    setCustomCrumbs(crumbs);
  }, []);

  const resetCustomBreadcrumbs = useCallback(() => {
    setCustomCrumbs(null);
  }, []);

  const value = useMemo(
    () => ({
      breadcrumbs: customCrumbs || [],
      setCustomBreadcrumbs,
      resetCustomBreadcrumbs,
    }),
    [customCrumbs, setCustomBreadcrumbs, resetCustomBreadcrumbs],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumbs must be used within a BreadcrumbProvider");
  }
  return context;
}
