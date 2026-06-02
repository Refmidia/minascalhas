import { useEffect, useState } from "react";

import { HOME_SITE } from "@/data/home-config";
import { adminLogin } from "@/lib/admin-api";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AcLoginModal({ open, onClose }: Props) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.classList.add("ac-login-open");
    const t = setTimeout(() => document.getElementById("ac-login-usuario")?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("ac-login-open");
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert("");
    if (!usuario.trim() || !senha) {
      setAlert("Informe usuário e senha.");
      return;
    }
    setLoading(true);
    try {
      const { redirect } = await adminLogin(usuario.trim(), senha);
      window.location.assign(redirect);
    } catch (err) {
      setAlert(err instanceof Error ? err.message : "Login ou senha incorretos.");
      setLoading(false);
    }
  }

  return (
    <div
      className="ac-login-modal is-open"
      id="ac-login-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ac-login-title"
      aria-hidden="false"
    >
      <div className="ac-login-modal__backdrop" data-ac-login-close tabIndex={-1} onClick={() => !loading && onClose()} />
      <div className="ac-login-modal__dialog">
        <button type="button" className="ac-login-modal__close" data-ac-login-close aria-label="Fechar" onClick={() => !loading && onClose()}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <div className="ac-login-modal__brand">
          <img src={HOME_SITE.img.logoHeader} width={96} height={40} alt="Alex Calhas" />
        </div>
        <h2 className="ac-login-modal__title" id="ac-login-title">
          Acesso ao painel
        </h2>
        <p className="ac-login-modal__subtitle">Entre com seu usuário e senha</p>

        <div className="ac-login-modal__alert" id="ac-login-alert" role="alert" hidden={!alert}>
          {alert}
        </div>

        <form id="ac-login-form" className="ac-login-modal__form" noValidate onSubmit={(e) => void onSubmit(e)}>
          <div className="ac-form-group">
            <label htmlFor="ac-login-usuario">Usuário</label>
            <input
              type="text"
              id="ac-login-usuario"
              name="usuario"
              autoComplete="username"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </div>
          <div className="ac-form-group">
            <label htmlFor="ac-login-senha">Senha</label>
            <input
              type="password"
              id="ac-login-senha"
              name="senha"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={`ac-btn ac-btn--primary ac-btn--block ac-login-modal__submit${loading ? " is-loading" : ""}`}
            id="ac-login-submit"
            disabled={loading}
          >
            <span className="ac-login-modal__submit-text">Entrar</span>
            <span className="ac-login-modal__spinner" hidden={!loading} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
