import { useCallback, useEffect, useState } from "react";

import { InvActionBtn } from "@/components/admin/admin-row-actions";
import { DashConfirmModal, type DashConfirmOptions } from "@/components/admin/DashConfirmModal";
import { DashPageHero } from "@/components/admin/DashPageHero";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import {
  apagarAdminLog,
  fetchAdminLogs,
  limparAdminLogs,
  type AdminLogsData,
} from "@/lib/admin-logs-client";
import { formatContextoJson, formatLogData, resolverPassos, rotuloNivel } from "@/lib/admin-logs-display";
import type { AdminLogFiltroNivel, AdminLogRow } from "@/lib/admin-logs-client";
import { dashToast } from "@/lib/dash-ui";

const NIVEL_OPCOES: { value: AdminLogFiltroNivel; label: string }[] = [
  { value: "problemas", label: "Problemas (erro + aviso + segurança)" },
  { value: "error", label: "Só erros" },
  { value: "warning", label: "Só avisos" },
  { value: "security", label: "Só segurança" },
  { value: "info", label: "Informações" },
  { value: "todos", label: "Todos" },
];

type DetalheModal = {
  mensagem: string;
  resolver: string;
  contexto: string;
};

type ConfirmKind =
  | { type: "delete"; id: string }
  | { type: "clearAll" }
  | { type: "clearTipo"; nivel: AdminLogFiltroNivel | "todos" };

export function LogsPage() {
  const [nivel, setNivel] = useState<AdminLogFiltroNivel>("problemas");
  const [nivelDraft, setNivelDraft] = useState<AdminLogFiltroNivel>("problemas");
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [limparNivel, setLimparNivel] = useState<AdminLogFiltroNivel | "todos">("todos");
  const [detalhe, setDetalhe] = useState<DetalheModal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const json = await fetchAdminLogs({ nivel, q: busca, page });
      setData(json);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar log.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [nivel, busca, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const aplicarFiltro = (e: React.FormEvent) => {
    e.preventDefault();
    setNivel(nivelDraft);
    setBusca(buscaInput);
    setPage(1);
  };

  const resetarFiltro = () => {
    setNivel("problemas");
    setNivelDraft("problemas");
    setBuscaInput("");
    setBusca("");
    setPage(1);
  };

  const confirmOptions: DashConfirmOptions | null = confirm
    ? confirm.type === "delete"
      ? {
          title: "Apagar registro",
          message: "Deseja apagar este registro do log?",
          confirmText: "Apagar",
          variant: "danger",
          icon: "bi-trash",
        }
      : confirm.type === "clearAll"
        ? {
            title: "Apagar TODOS os registros do log?",
            message: "Esta ação não pode ser desfeita.",
            confirmText: "Apagar tudo",
            variant: "danger",
            icon: "bi-trash",
          }
        : {
            title: "Remover os registros deste tipo?",
            message: "Esta ação não pode ser desfeita.",
            confirmText: "Remover",
            variant: "danger",
            icon: "bi-trash",
          }
    : null;

  const onConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.type === "delete") {
        await apagarAdminLog(confirm.id);
        dashToast("Registro removido do log.", "success");
      } else {
        const n = confirm.type === "clearAll" ? "todos" : confirm.nivel;
        const msg = await limparAdminLogs(n);
        dashToast(msg, msg.includes("Nenhum") ? "warning" : "success");
        if (confirm.type === "clearAll" || confirm.nivel === "todos") setPage(1);
      }
      setConfirm(null);
      await load();
    } catch (e) {
      dashToast(e instanceof Error ? e.message : "Erro.", "danger");
    } finally {
      setConfirmLoading(false);
    }
  };

  const abrirDetalhe = (log: AdminLogRow) => {
    setDetalhe({
      mensagem: log.mensagem,
      resolver: log.como_resolver,
      contexto: formatContextoJson(log.contexto),
    });
  };

  const itens = data?.itens ?? [];
  const total = data?.total ?? 0;
  const totalGeral = data?.totalGeral ?? 0;
  const erros24h = data?.erros24h ?? 0;
  const totalPaginas = data?.totalPaginas ?? 1;

  return (
    <>
      <DashPageHero
        title="Log do sistema"
        subtitle="Erros, avisos e eventos de segurança — com passo a passo de como resolver."
        iconClass="bi-journal-text"
        accent="log-sistema"
        showNovaVisita={false}
        cta={
          totalGeral > 0 ? (
            <button
              type="button"
              className="analytics-btn analytics-btn--outline analytics-btn--sm"
              onClick={() => setConfirm({ type: "clearAll" })}
            >
              <i className="bi bi-trash" aria-hidden="true" /> Limpar log inteiro
            </button>
          ) : null
        }
      />

      <div className="dash-admin-log">
        {erros24h > 0 ? (
          <div className="dash-entregas-alerta dash-entregas-alerta--destaque mb-3" role="status">
            <div className="dash-entregas-alerta__text">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <strong>{erros24h}</strong> ocorrência(s) nas últimas 24 horas — veja abaixo como resolver
              cada uma.
            </div>
          </div>
        ) : null}

        <div className="dash-form-card mb-3">
          <form className="row g-2 align-items-end" onSubmit={aplicarFiltro}>
            <div className="col-12 col-md-3">
              <label className="form-label small mb-1" htmlFor="filtro-nivel">
                Tipo
              </label>
              <select
                id="filtro-nivel"
                className="form-select form-select-sm"
                value={nivelDraft}
                onChange={(e) => setNivelDraft(e.target.value as AdminLogFiltroNivel)}
              >
                {NIVEL_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-5">
              <label className="form-label small mb-1" htmlFor="filtro-busca">
                Buscar
              </label>
              <input
                id="filtro-busca"
                type="search"
                className="form-control form-control-sm"
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                placeholder="Mensagem, solução, página, usuário…"
              />
            </div>
            <div className="col-6 col-md-2">
              <button type="submit" className="analytics-btn analytics-btn--primary analytics-btn--sm w-100">
                <i className="bi bi-search" aria-hidden="true" /> Filtrar
              </button>
            </div>
            <div className="col-6 col-md-2">
              <button
                type="button"
                className="analytics-btn analytics-btn--outline analytics-btn--sm w-100"
                onClick={resetarFiltro}
              >
                Resetar filtro
              </button>
            </div>
          </form>
          <p className="small text-muted mb-0 mt-2">
            <i className="bi bi-info-circle" aria-hidden="true" /> {total} registro(s) no filtro ·{" "}
            {totalGeral} no total
          </p>
        </div>

        {erro ? (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <p className="text-muted small">Carregando log…</p>
        ) : itens.length === 0 ? (
          <div className="dash-form-card dash-admin-log-empty text-center py-5">
            <i className="bi bi-check2-circle dash-admin-log-empty__icon" aria-hidden="true" />
            <p className="mb-1 fw-semibold">Nenhum problema registrado</p>
            <p className="text-muted small mb-0">
              Quando houver bug, falha ou alerta de segurança, aparecerá aqui com o passo a passo de como
              resolver.
            </p>
          </div>
        ) : (
          <div className="dash-admin-log-list">
            {itens.map((log) => (
              <LogItem
                key={log.id}
                log={log}
                onDetalhe={() => abrirDetalhe(log)}
                onApagar={() => setConfirm({ type: "delete", id: log.id })}
              />
            ))}
          </div>
        )}

        {!loading && totalPaginas > 1 ? (
          <nav className="mb-3 mt-3" aria-label="Paginação do log">
            <ul className="pagination pagination-sm justify-content-center mb-0">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`page-item${p === page ? " active" : ""}`}>
                  <button type="button" className="page-link" onClick={() => setPage(p)}>
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {totalGeral > 0 ? (
          <details className="dash-form-card dash-forn-collapse mt-3">
            <summary className="dash-forn-collapse__summary">
              <i className="bi bi-trash" aria-hidden="true" /> Limpar por tipo
              <span className="dash-forn-collapse__hint">ou apague só erros, avisos, etc.</span>
            </summary>
            <div className="dash-forn-collapse__body pt-2">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="form-label small mb-1" htmlFor="limpar-nivel">
                    Remover registros
                  </label>
                  <select
                    id="limpar-nivel"
                    className="form-select form-select-sm"
                    value={limparNivel}
                    onChange={(e) => setLimparNivel(e.target.value as AdminLogFiltroNivel | "todos")}
                  >
                    <option value="todos">Todos os registros</option>
                    <option value="info">Só informações</option>
                    <option value="warning">Só avisos</option>
                    <option value="error">Só erros</option>
                    <option value="security">Só segurança</option>
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <button
                    type="button"
                    className="analytics-btn analytics-btn--outline analytics-btn--sm"
                    onClick={() => setConfirm({ type: "clearTipo", nivel: limparNivel })}
                  >
                    <i className="bi bi-trash" aria-hidden="true" /> Limpar selecionados
                  </button>
                </div>
              </div>
            </div>
          </details>
        ) : null}
      </div>

      <AdminModal open={!!detalhe} onClose={() => setDetalhe(null)} dialogClass="modal-lg">
        <div className="modal-content dash-modal-scroll">
          <div className="modal-header">
            <h5 className="modal-title h6">Detalhes técnicos</h5>
            <button type="button" className="btn-close" aria-label="Fechar" onClick={() => setDetalhe(null)} />
          </div>
          <div className="modal-body">
            <p className="fw-semibold mb-1">Problema</p>
            <p className="small mb-3">{detalhe?.mensagem}</p>
            <p className="fw-semibold mb-1">Como resolver</p>
            <pre className="dash-admin-log-resolver-pre mb-3">{detalhe?.resolver}</pre>
            <p className="fw-semibold mb-1">Dados técnicos</p>
            <pre className="dash-admin-log-pre mb-0">{detalhe?.contexto}</pre>
          </div>
        </div>
      </AdminModal>

      <DashConfirmModal
        open={!!confirm}
        options={confirmOptions}
        loading={confirmLoading}
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function LogItem({
  log,
  onDetalhe,
  onApagar,
}: {
  log: AdminLogRow;
  onDetalhe: () => void;
  onApagar: () => void;
}) {
  const passos = resolverPassos(log.como_resolver);
  const temCtx = Boolean(log.contexto?.trim());

  return (
    <article className={`dash-admin-log-item dash-admin-log-item--${log.nivel}`}>
      <header className="dash-admin-log-item__head">
        <div className="dash-admin-log-item__meta">
          <span className={`dash-admin-log-badge dash-admin-log-badge--${log.nivel}`}>
            {rotuloNivel(log.nivel)}
          </span>
          <time className="small text-muted">{formatLogData(log.criado_em)}</time>
        </div>
        <div className="dash-admin-log-item__actions">
          {temCtx ? (
            <InvActionBtn
              icon="bi-code-slash"
              title="Detalhes técnicos"
              variant="secondary"
              onClick={onDetalhe}
            />
          ) : null}
          <InvActionBtn icon="bi-trash" title="Apagar registro" variant="muted" onClick={onApagar} />
        </div>
      </header>

      <p className="dash-admin-log-item__msg mb-2">
        <strong>Problema:</strong> {log.mensagem}
      </p>

      {passos.length > 0 ? (
        <div className="dash-admin-log-resolver">
          <p className="dash-admin-log-resolver__title mb-2">
            <i className="bi bi-tools" aria-hidden="true" /> Como resolver
          </p>
          <ol className="dash-admin-log-resolver__steps mb-0">
            {passos.map((linha, i) => (
              <li key={i}>{linha}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <footer className="dash-admin-log-item__foot small text-muted">
        <span>
          <i className="bi bi-person" aria-hidden="true" /> {log.usuario_nome?.trim() || "Sistema"}
        </span>
        {log.pagina?.trim() ? (
          <span className="dash-admin-log-item__pagina" title={log.pagina}>
            <i className="bi bi-link-45deg" aria-hidden="true" /> {log.pagina}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
