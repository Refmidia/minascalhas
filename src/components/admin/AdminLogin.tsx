import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";

export function AdminLogin() {
  const { login } = useAdminAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(usuario, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1419] grid place-items-center px-6">
      <div className="max-w-md w-full bg-[#1a222d] rounded-2xl border border-white/10 p-10 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-emerald-400">ALEX CALHAS</p>
        <h1 className="mt-3 text-2xl font-bold text-white">Entrar no painel</h1>
        <p className="mt-2 text-slate-400 text-sm">Mesmo usuário e senha do sistema PHP.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-usuario" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuário
            </label>
            <input
              id="admin-usuario"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full rounded-lg bg-[#0f1419] border border-white/10 px-4 py-3 text-sm text-white"
              placeholder="Ex.: Alex"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-[#0f1419] border border-white/10 px-4 py-3 text-sm text-white"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle size={16} aria-hidden="true" /> {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white font-semibold px-6 py-3 transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-slate-300">
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}
