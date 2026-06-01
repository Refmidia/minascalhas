import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  adminLogin,
  adminLogout,
  fetchAdminSession,
  trocarVisao,
  type AdminUser,
} from "@/lib/admin-api";
import type { AdminVisao } from "@/lib/visao.server";

type AdminAuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  user: AdminUser | null;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setVisao: (visao: AdminVisao) => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  const refreshSession = useCallback(async () => {
    const session = await fetchAdminSession();
    setAuthenticated(session.authenticated);
    setUser(session.user);
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setReady(true));
  }, [refreshSession]);

  const login = useCallback(async (usuario: string, password: string) => {
    const u = await adminLogin(usuario, password);
    setAuthenticated(true);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setAuthenticated(false);
    setUser(null);
  }, []);

  const setVisao = useCallback(async (visao: AdminVisao) => {
    const { redirect: destino } = await trocarVisao(visao);
    window.location.assign(destino);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ ready, authenticated, user, login, logout, refreshSession, setVisao }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth deve ser usado dentro de AdminAuthProvider");
  return ctx;
}
