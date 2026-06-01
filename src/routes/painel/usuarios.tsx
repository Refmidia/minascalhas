import { createFileRoute } from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { UsuariosPage } from "@/components/admin/UsuariosPage";

class UsuariosErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Usuários]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="dash-page-body dash-page-body--with-header p-4">
          <div className="alert alert-danger" role="alert">
            <strong>Não foi possível abrir Usuários.</strong>
            <p className="mb-2 mt-1 small">{this.state.error.message}</p>
            <button
              type="button"
              className="btn btn-sm dash-edit-modal__btn-save"
              onClick={() => this.setState({ error: null })}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function UsuariosRoute() {
  return (
    <UsuariosErrorBoundary>
      <UsuariosPage />
    </UsuariosErrorBoundary>
  );
}

export const Route = createFileRoute("/painel/usuarios")({
  component: UsuariosRoute,
});
