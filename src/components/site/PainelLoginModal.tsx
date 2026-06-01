import { AlertCircle, Loader2, Lock, User, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { adminLogin } from "@/lib/admin-api";

const LOGO_BRANCO = "/images/logo/logo-branco.png";

type PainelLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PainelLoginModal({ open, onClose }: PainelLoginModalProps) {
  const titleId = useId();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = requestAnimationFrame(() => setVisible(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      setVisible(false);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(usuario.trim(), password);
      window.location.assign("/painel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl bg-[#0c1018]/80 border border-white/[0.08] pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-brand-green/70 focus:ring-2 focus:ring-brand-green/20";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-brand-navy/60 backdrop-blur-xl transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Fechar login"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <div
        className={`relative z-10 w-full max-w-[420px] transition-all duration-300 ease-out ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.97] translate-y-2"
        }`}
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#151c27] shadow-[0_28px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/5">
          <div className="relative px-8 pt-9 pb-7 text-center border-b border-white/[0.06]">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_50%_-20%,rgba(7,148,90,0.35),transparent)]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-green/60 to-transparent"
              aria-hidden="true"
            />

            <button
              type="button"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
              disabled={loading}
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>

            <img
              src={LOGO_BRANCO}
              alt="Alex Calhas"
              className="relative mx-auto h-[52px] w-auto max-w-[220px] object-contain drop-shadow-[0_4px_24px_rgba(7,148,90,0.25)]"
              width={220}
              height={52}
              decoding="async"
            />
          </div>

          <div className="px-8 py-8">
            <h2 id={titleId} className="text-center text-xl font-bold text-white font-display tracking-tight">
              Entrar no painel
            </h2>
            <p className="mt-1.5 text-center text-sm text-slate-400">
              Acesse com seu usuário e senha do sistema.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="painel-modal-usuario" className="sr-only">
                  Usuário
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id="painel-modal-usuario"
                    autoComplete="username"
                    autoFocus
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className={inputCls}
                    placeholder="Usuário"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="painel-modal-senha" className="sr-only">
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id="painel-modal-senha"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="Senha"
                    required
                  />
                </div>
              </div>

              {error ? (
                <div
                  className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-300"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-xl bg-brand-green font-semibold text-white px-6 py-3.5 shadow-[0_8px_24px_rgba(7,148,90,0.35)] transition hover:bg-brand-green-dark hover:shadow-[0_10px_28px_rgba(7,148,90,0.4)] disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                    Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
