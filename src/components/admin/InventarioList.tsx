import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  EnderecoCell,
  TelefoneCell,
  VisitaDataCell,
  VisitaDataHoraCell,
  VisitaHoraCell,
} from "@/components/admin/inventario-ui";
import { horaParaExibicaoVisita } from "@/lib/inventario-format";
import {
  INVENTARIO_STATUS,
  type InventarioStatus,
} from "@/lib/agendamento-constants";
import {
  fetchAgendamentos,
  updateAgendamentoStatus,
  type AgendamentoItem,
} from "@/lib/admin-api";
import { INVENTARIO_LISTING_META } from "@/lib/inventario-listing-meta";

const STATUS_LABEL: Record<InventarioStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  orcamentado: "Orçamentado",
  finalizado: "Finalizado",
};

export function InventarioList({ statusFilter }: { statusFilter: InventarioStatus }) {
  const meta = INVENTARIO_LISTING_META[statusFilter];
  const [items, setItems] = useState<AgendamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const showValor = statusFilter !== "agendado";
  const showVisita = statusFilter === "agendado";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchAgendamentos(statusFilter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(id: number, status: InventarioStatus) {
    setUpdatingId(id);
    try {
      const updated = await updateAgendamentoStatus(id, status);
      setItems((prev) =>
        updated.status === statusFilter
          ? prev.map((r) => (r.id === id ? updated : r))
          : prev.filter((r) => r.id !== id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className={`dashboard-listing inv-listing inv-listing--${meta.slug}`}>
      <div className="inv-list-toolbar">
        <div className="inv-list-toolbar__stats">
          <span className="inv-list-stat">
            Total: <strong>{loading ? "…" : items.length}</strong>
          </span>
        </div>
        <span className={`inv-list-toolbar__badge inv-list-toolbar__badge--${meta.slug}`}>
          {meta.title}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="inv-empty-state d-flex justify-content-center py-5">
          <Loader2 className="spin text-primary" size={32} aria-label="Carregando" />
        </div>
      ) : items.length === 0 ? (
        <div className="inv-empty-state">
          <div className={`inv-empty-state__icon inv-empty-state__icon--${meta.slug}`}>
            <i className={`bi ${meta.icon}`} aria-hidden="true" />
          </div>
          <h3 className="inv-empty-state__title">{meta.emptyTitle}</h3>
          <p className="inv-empty-state__text">{meta.emptyText}</p>
          {statusFilter === "agendado" && (
            <Link to="/painel/agendar" className="analytics-btn analytics-btn--primary analytics-btn--sm">
              <i className="bi bi-calendar4-range" aria-hidden="true" /> Agendar visita
            </Link>
          )}
        </div>
      ) : (
        <div className="dashboard-data-desktop inv-table-shell">
          <div className="table-responsive inv-table-scroll">
            <table
              className={`table inv-data-table inv-data-table--balanced align-middle mb-0${showVisita ? " inv-data-table--visitas" : ""}`}
            >
              <thead>
                <tr>
                  <th className="inv-col-id">ID</th>
                  <th className="inv-col-cliente">Cliente</th>
                  <th className="inv-col-telefone">Telefone</th>
                  <th className="inv-col-endereco">Endereço</th>
                  {showVisita ? <th className="inv-col-datetime">Data / Hora</th> : null}
                  {showValor && <th className="inv-col-valor">Valor</th>}
                  <th className="inv-col-actions">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="inv-data-row">
                    <th scope="row" className="inv-col-id">
                      <span className="inv-id-badge">#{item.id}</span>
                    </th>
                    <td className="inv-col-cliente">
                      <span className="inv-cliente-nome">{item.nome}</span>
                    </td>
                    <td className="inv-col-telefone">
                      <TelefoneCell telefone={item.telefone} />
                    </td>
                    <td className="inv-col-endereco inv-col-endereco--compact">
                      <EnderecoCell item={item} />
                    </td>
                    {showVisita ? (
                      <td className="inv-col-datetime">
                        <VisitaDataHoraCell
                          data={item.dataVisita}
                          hora={horaParaExibicaoVisita(item)}
                        />
                      </td>
                    ) : null}
                    {showValor && (
                      <td className="inv-col-valor">
                        <span className="inv-valor-tag">
                          {item.valor.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </td>
                    )}
                    <td className="inv-col-actions">
                      <select
                        value={
                          INVENTARIO_STATUS.includes(item.status as InventarioStatus)
                            ? item.status
                            : statusFilter
                        }
                        disabled={updatingId === item.id}
                        onChange={(e) =>
                          void handleStatusChange(item.id, e.target.value as InventarioStatus)
                        }
                        className="form-select form-select-sm inv-status-select"
                        aria-label={`Status do registro ${item.id}`}
                      >
                        {INVENTARIO_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
