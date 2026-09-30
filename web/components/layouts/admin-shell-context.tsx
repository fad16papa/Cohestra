"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AdminCommandPalette } from "@/components/layouts/admin-command-palette";

export type AdminPageMeta = {
  title?: string;
  breadcrumbTail?: string;
};

type AdminShellContextValue = {
  commandOpen: boolean;
  navSheetOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setNavSheetOpen: (open: boolean) => void;
  pageMeta: AdminPageMeta | null;
  setPageMeta: (meta: AdminPageMeta | null) => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

function hasBlockingPageModal(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return Boolean(
    document.querySelector(
      "[data-slot='dialog-content'], [data-slot='alert-dialog-content']"
    )
  );
}

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [navSheetOpen, setNavSheetOpenState] = useState(false);
  const [pageMeta, setPageMeta] = useState<AdminPageMeta | null>(null);

  const openCommandPalette = useCallback(() => {
    if (hasBlockingPageModal()) {
      return;
    }
    setNavSheetOpenState(false);
    setCommandOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandOpen(false);
  }, []);

  const setNavSheetOpen = useCallback((open: boolean) => {
    if (open) {
      setCommandOpen(false);
    }
    setNavSheetOpenState(open);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => {
          if (current) {
            return false;
          }
          if (hasBlockingPageModal()) {
            return false;
          }
          setNavSheetOpenState(false);
          return true;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      commandOpen,
      navSheetOpen,
      openCommandPalette,
      closeCommandPalette,
      setNavSheetOpen,
      pageMeta,
      setPageMeta,
    }),
    [
      closeCommandPalette,
      commandOpen,
      navSheetOpen,
      openCommandPalette,
      pageMeta,
      setNavSheetOpen,
    ]
  );

  return (
    <AdminShellContext.Provider value={value}>
      {children}
      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (!context) {
    throw new Error("useAdminShell must be used within AdminShellProvider");
  }

  return context;
}

export function useAdminPageMeta(meta: AdminPageMeta | null) {
  const { setPageMeta } = useAdminShell();

  useEffect(() => {
    setPageMeta(meta);
    return () => setPageMeta(null);
    // Primitive fields only: callers pass a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid identity churn on meta
  }, [meta?.breadcrumbTail, meta?.title, setPageMeta]);
}
