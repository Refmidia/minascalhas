import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { DashPageHero } from "@/components/admin/DashPageHero";
import {
  EnderecoCell,
  INVENTARIO_PER_PAGE,
  InvActionBtn,
  InvPagination,
  InvRowActions,
  ListingHeaderMeta,
  paginateItems,
  TelefoneCell,
  VisitaDatetime,
} from "@/components/admin/inventario-ui";
import { ModalConfirmarMontagem } from "@/components/admin/modals/ModalConfirmarMontagem";
import { ModalEditarCliente } from "@/components/admin/modals/ModalEditarCliente";
import { ModalOrcamento } from "@/components/admin/modals/ModalOrcamento";
import { dashConfirm } from "@/lib/dash-ui";
import {
  deleteAgendamento,
  fetchAgendamentos,
  finalizarServico,
  type AgendamentoItem,
} from "@/lib/admin-api";
import { INVENTARIO_LISTING_META } from "@/lib/inventario-listing-meta";
import { abrirWhatsappOrcamento, gerarOS } from "@/lib/whatsapp-orcamento";

export type InventarioVariant = "visitas" | "orcamentado" | "confirmado" | "finalizado";

const STATUS_FILTER: Record<InventarioVariant, string> = {
  visitas: "agendado",
  orcamentado: "orcamentado",
  confirmado: "confirmado",
  finalizado: "finalizado",
};

function MateriaisDetalhes({ item }: { item: AgendamentoItem }) {
  const n = item.materiaisCount ?? item.orcamentoItens?.length ?? 0;
  if (n === 0) return <span className="inv-detail-empty">Sem itens</span>;
  return (
    <span className="inv-detail-chip">
      <i className="bi bi-box-seam" aria-hidden="true" />
      <span>Material ({n})</span>
    </span>
  );
}

export function InventarioPage({ variant }: { variant: InventarioVariant }) {
  const meta = INVENTARIO_LISTING_META[
    variant === "visitas" ? "agendado" : variant
  ];
  const listingSlug = variant;
  const { user } = useAdminAuth();
  const isAdmin = user?.visao === "admin";

  const [items, setItems] = useState<AgendamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [orcamentoOpen, setOrcamentoOpen] = useState(false);
  const [orcamentoMode, setOrcamentoMode] = useState<"novo" | "editar">("novo");
  const [activeItem, setActiveItem] = useState<AgendamentoItem | null>(null);

  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [editClienteId, setEditClienteId] = useState<number | null>(null);

  const [montagemOpen, setMontagemOpen] = useState(false);
  const [montagemId, setMontagemId] = useState<number | null>(null);

  const statusFilter = STATUS_FILTER[variant];

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

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / INVENTARIO_PER_PAGE));
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => paginateItems(items, pageSafe, INVENTARIO_PER_PAGE),
    [items, pageSafe],
  );

  function openOrcamentoNovo(item: AgendamentoItem) {
    setActiveItem(item);
    setOrcamentoMode("novo");
    setOrcamentoOpen(true);
  }

  function openOrcamentoEditar(item: AgendamentoItem) {
    setActiveItem(item);
    setOrcamentoMode("editar");
    setOrcamentoOpen(true);
  }

  function openEditarCliente(id: number) {
    setEditClienteId(id);
    setEditClienteOpen(true);
  }

  async function handleCancelar(id: number) {
    if (!isAdmin) {
      setError("Somente admin pode excluir.");
      return;
    }
    if (
      !(await dashConfirm({
        title: "Excluir registro?",
        message: "Excluir este registro?",
        confirmText: "Excluir",
        variant: "danger",
      }))
    ) {
      return;
    }
    try {
      await deleteAgendamento(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleFinalizar(id: number) {
    if (
      !(await dashConfirm({
        title: "Finalizar serviço?",
        message: "Finalizar este serviço?",
        confirmText: "Finalizar",
        variant: "success",
      }))
    ) {
      return;
    }
    try {
      await finalizarServico(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar.");
    }
  }

  async function onOrcamentoSaved(item: AgendamentoItem) {
    if (variant === "visitas") {
      setItems((prev) => prev.filter((r) => r.id !== item.id));
    } else if (variant === "orcamentado" && orcamentoMode === "editar") {
      setItems((prev) => prev.map((r) => (r.id === item.id ? item : r)));
    } else {
      void load();
    }
    if (
      orcamentoMode === "novo" &&
      (await dashConfirm({
        title: "Enviar no WhatsApp?",
        message: "Orçamento salvo. Deseja enviar o link no WhatsApp?",
        confirmText: "Enviar",
        variant: "success",
        icon: "bi-whatsapp",
      }))
    ) {
      abrirWhatsappOrcamento({
        id: item.id,
        nome: item.nome,
        telefone: item.telefone,
        valor: Number(item.valor),
      });
    }
  }

  function renderActions(item: AgendamentoItem) {
    if (variant === "visitas") {
      return (
        <InvRowActions
          ariaLabel={`Mais ações #${item.id}`}
          primary={
            <InvActionBtn
              icon="bi-check-lg"
              title="Preencher orçamento e enviar"
              onClick={() => openOrcamentoNovo(item)}
            />
          }
          menu={[
            {
              label: "Editar",
              icon: "bi-pencil-square",
              className: "inv-dropdown-item--edit",
              onClick: () => openEditarCliente(item.id),
            },
            ...(isAdmin
              ? [{ label: "Cancelar", icon: "bi-trash", onClick: () => void handleCancelar(item.id) }]
              : []),
          ]}
        />
      );
    }

    if (variant === "orcamentado") {
      const primary = (
        <>
          <InvActionBtn
            icon="bi-check-lg"
            title="Confirmar montagem"
            onClick={() => {
              setMontagemId(item.id);
              setMontagemOpen(true);
            }}
          />
          <InvActionBtn icon="bi-file-text" title="Gerar OS" variant="secondary" onClick={() => gerarOS(item.id)} />
          <InvActionBtn
            icon="bi-whatsapp"
            title="Enviar orçamento no WhatsApp"
            variant="whatsapp"
            onClick={() =>
              abrirWhatsappOrcamento({
                id: item.id,
                nome: item.nome,
                telefone: item.telefone,
                valor: Number(item.valor),
              })
            }
          />
        </>
      );
      const menu = [
        {
          label: "Editar",
          icon: "bi-pencil-square",
          className: "inv-dropdown-item--edit",
          onClick: () => openEditarCliente(item.id),
        },
        ...(isAdmin
          ? [
              {
                label: "Editar orçamento",
                icon: "bi-receipt",
                onClick: () => openOrcamentoEditar(item),
              },
              { label: "Excluir", icon: "bi-trash", onClick: () => void handleCancelar(item.id) },
            ]
          : []),
      ];
      return <InvRowActions ariaLabel={`Mais ações #${item.id}`} primary={primary} menu={menu} />;
    }

    if (variant === "confirmado") {
      const primary = (
        <>
          <InvActionBtn
            icon="bi-check-lg"
            title="Finalizar"
            onClick={() => void handleFinalizar(item.id)}
          />
          <InvActionBtn icon="bi-file-text" title="Gerar OS" variant="secondary" onClick={() => gerarOS(item.id)} />
          <InvActionBtn
            icon="bi-whatsapp"
            title="WhatsApp"
            variant="whatsapp"
            onClick={() =>
              abrirWhatsappOrcamento({
                id: item.id,
                nome: item.nome,
                telefone: item.telefone,
                valor: Number(item.valor),
              })
            }
          />
        </>
      );
      return (
        <InvRowActions
          ariaLabel={`Mais ações #${item.id}`}
          primary={primary}
          menu={[
            {
              label: "Editar",
              icon: "bi-pencil-square",
              className: "inv-dropdown-item--edit",
              onClick: () => openEditarCliente(item.id),
            },
            ...(isAdmin
              ? [{ label: "Excluir", icon: "bi-trash", onClick: () => void handleCancelar(item.id) }]
              : []),
          ]}
        />
      );
    }

    const primary = (
      <>
        <InvActionBtn icon="bi-file-text" title="Gerar OS" variant="secondary" onClick={() => gerarOS(item.id)} />
        <InvActionBtn
          icon="bi-whatsapp"
          title="WhatsApp"
          variant="whatsapp"
          onClick={() =>
            abrirWhatsappOrcamento({
              id: item.id,
              nome: item.nome,
              telefone: item.telefone,
              valor: Number(item.valor),
            })
          }
        />
      </>
    );
    return (
      <InvRowActions
        ariaLabel={`Mais ações #${item.id}`}
        primary={primary}
        menu={[
          {
            label: "Editar",
            icon: "bi-pencil-square",
            className: "inv-dropdown-item--edit",
            onClick: () => openEditarCliente(item.id),
          },
          ...(isAdmin
            ? [{ label: "Excluir", icon: "bi-trash", onClick: () => void handleCancelar(item.id) }]
            : []),
        ]}
      />
    );
  }

  const showVisita = variant === "visitas";
  const showValor = variant !== "visitas";
  const showMontagem = variant === "confirmado";
  const showDetalhes = variant === "orcamentado";

  const pageCta =
    variant === "visitas" ? (
      <Link to="/painel/agendar" className="analytics-btn analytics-btn--primary analytics-btn--sm">
        <i className="bi bi-calendar4-range" aria-hidden="true" /> Agendar visita
      </Link>
    ) : variant === "orcamentado" ? (
      <Link to="/painel/visitas" className="analytics-btn analytics-btn--primary analytics-btn--sm">
        <i className="bi bi-person-plus" aria-hidden="true" /> Novo orçamento
      </Link>
    ) : null;

  return (
    <div className={`analytics-page dash-form-page--pro dashboard-page--${listingSlug}`}>
      <DashPageHero
        title={meta.title}
        subtitle={meta.subtitle}
        iconClass={meta.icon}
        accent={listingSlug}
        headerMeta={
          loading ? null : (
            <ListingHeaderMeta total={total} page={pageSafe} totalPages={totalPages} />
          )
        }
        cta={pageCta}
      />
      <div className="dash-page-body dash-page-body--with-header dash-page-body--solo">
        <div className={`dashboard-listing inv-listing inv-listing--${listingSlug}`}>
          {error ? (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="inv-empty-state d-flex justify-content-center py-5">
              <Loader2 className="spin text-primary" size={32} aria-label="Carregando" />
            </div>
          ) : items.length === 0 ? (
            <div className="inv-empty-state" role="status">
              <div className={`inv-empty-state__icon inv-empty-state__icon--${listingSlug}`}>
                <i className={`bi ${meta.icon}`} aria-hidden="true" />
              </div>
              <h2 className="inv-empty-state__title">{meta.emptyTitle}</h2>
              <p className="inv-empty-state__text">{meta.emptyText}</p>
            </div>
          ) : (
            <>
              <div className="dashboard-data-desktop inv-table-shell">
                <div className="table-responsive inv-table-scroll">
                  <table className="table inv-data-table inv-data-table--balanced align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="inv-col-id">ID</th>
                        <th className="inv-col-cliente">Cliente</th>
                        <th className="inv-col-telefone">Telefone</th>
                        <th className="inv-col-endereco">Endereço</th>
                        {showVisita ? <th className="inv-col-visita">Visita</th> : null}
                        {showMontagem ? <th className="inv-col-montagem">Montagem</th> : null}
                        {showValor ? <th className="inv-col-valor">Valor</th> : null}
                        {showDetalhes ? <th className="inv-col-detalhes">Detalhes</th> : null}
                        <th className="inv-col-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item) => (
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
                            <td className="inv-col-visita">
                              <VisitaDatetime data={item.dataVisita} hora={item.horaVisita} />
                            </td>
                          ) : null}
                          {showMontagem ? (
                            <td className="inv-col-montagem">{item.dataMontagem || "—"}</td>
                          ) : null}
                          {showValor ? (
                            <td className="inv-col-valor">
                              <span className="inv-valor-tag">
                                {Number(item.valor).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </span>
                            </td>
                          ) : null}
                          {showDetalhes ? (
                            <td className="inv-col-detalhes">
                              <MateriaisDetalhes item={item} />
                            </td>
                          ) : null}
                          <td className="inv-col-actions">{renderActions(item)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <InvPagination
                page={pageSafe}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </div>

      <ModalOrcamento
        open={orcamentoOpen}
        onClose={() => setOrcamentoOpen(false)}
        inventarioId={activeItem?.id ?? null}
        clienteNome={activeItem?.nome}
        cpfInicial={activeItem?.cpfCnpj ?? ""}
        mode={orcamentoMode}
        onSaved={onOrcamentoSaved}
      />
      <ModalEditarCliente
        open={editClienteOpen}
        onClose={() => setEditClienteOpen(false)}
        inventarioId={editClienteId}
        onSaved={(item) => {
          setItems((prev) => prev.map((r) => (r.id === item.id ? item : r)));
        }}
      />
      <ModalConfirmarMontagem
        open={montagemOpen}
        onClose={() => setMontagemOpen(false)}
        inventarioId={montagemId}
        onSaved={() => {
          setItems((prev) => prev.filter((r) => r.id !== montagemId));
        }}
      />
    </div>
  );
}
