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
  openCommandPalette: () => void;
  pageMeta: AdminPageMeta | null;
  setPageMeta: (meta: AdminPageMeta | null) => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [pageMeta, setPageMeta] = useState<AdminPageMeta | null>(null);

  const openCommandPalette = useCallback(() => {
    setCommandOpen(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      openCommandPalette,
      pageMeta,
      setPageMeta,
    }),
    [openCommandPalette, pageMeta]
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
  }, [meta?.breadcrumbTail, meta?.title, setPageMeta]);
}
