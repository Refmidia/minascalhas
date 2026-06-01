import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import { DashPageHero } from "@/components/admin/DashPageHero";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import {
  criarProduto,
  excluirProduto,
  fetchProdutos,
  salvarProduto,
  type ProdutoItem,
} from "@/lib/produtos-client";
import { Route as ProdutosRoute } from "@/routes/painel/produtos";

function ProdutoCardMedia({ produto }: { produto: ProdutoItem }) {
  const [src, setSrc] = useState(produto.imagem_url);
  const fotosLabel = `${produto.total_fotos} foto${produto.total_fotos === 1 ? "" : "s"}`;

  return (
    <Link
      to="/painel/produtos-galeria"
      search={{ produto: produto.id }}
      className="dash-produto-card__media"
      title="Abrir galeria"
    >
      {src ? (
        <img
          src={src}
          alt=""
          onError={() => setSrc("")}
        />
      ) : (
        <span className="dash-produto-card__media-placeholder" aria-hidden="true">
          <i className="bi bi-image" />
        </span>
      )}
      <span className="dash-produto-card__badge">
        <i className="bi bi-images" aria-hidden="true" />
        {fotosLabel}
      </span>
    </Link>
  );
}

export function ProdutosPage() {
  const navigate = useNavigate();
  const { editar: editarSearch } = ProdutosRoute.useSearch();
  const [itens, setItens] = useState<ProdutoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  const [nomeNovo, setNomeNovo] = useState("");
  const [descNovo, setDescNovo] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProdutoItem | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const [excluirAlvo, setExcluirAlvo] = useState<ProdutoItem | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      setItens(await fetchProdutos());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editarSearch || loading) return;
    const p = itens.find((i) => i.id === editarSearch);
    if (p) abrirEditar(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarSearch, loading, itens]);

  function abrirEditar(p: ProdutoItem) {
    setEditItem(p);
    setEditNome(p.nome);
    setEditDesc(p.descricao ?? "");
    setEditAtivo(p.ativo);
    setEditOpen(true);
  }

  function fecharEditar() {
    setEditOpen(false);
    setEditItem(null);
    if (editarSearch) {
      void navigate({ to: "/painel/produtos", search: {}, replace: true });
    }
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeNovo.trim()) return;
    setSalvandoNovo(true);
    setMsg("");
    setErro("");
    try {
      const { id } = await criarProduto({
        nome: nomeNovo.trim(),
        descricao: descNovo.trim() || undefined,
      });
      setNomeNovo("");
      setDescNovo("");
      setMsg("Produto cadastrado.");
      await navigate({
        to: "/painel/produtos-galeria",
        search: { produto: id },
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSalvandoNovo(false);
    }
  }

  async function salvarEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem || !editNome.trim()) return;
    setSalvandoEdit(true);
    setErro("");
    try {
      await salvarProduto(editItem.id, {
        nome: editNome.trim(),
        descricao: editDesc.trim(),
        ativo: editAtivo,
      });
      setMsg("Produto atualizado.");
      fecharEditar();
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvandoEdit(false);
    }
  }

  async function confirmarExcluir() {
    if (!excluirAlvo) return;
    setExcluindo(true);
    setErro("");
    try {
      await excluirProduto(excluirAlvo.id);
      setMsg("Produto excluído.");
      setExcluirAlvo(null);
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="dash-produtos-page">
      <DashPageHero
        title="Produtos"
        subtitle="Cadastre os produtos do site e gerencie a galeria de fotos de cada um."
        iconClass="bi-images"
        accent="produtos"
        showNovaVisita={false}
        headerMeta={
          <span className="dash-page-header__meta">
            <i className="bi bi-box-seam" aria-hidden="true" /> Site
          </span>
        }
      />

      {msg ? (
        <div className="alert alert-success py-2 small" role="status">
          {msg}
        </div>
      ) : null}
      {erro ? (
        <div className="alert alert-danger py-2 small" role="alert">
          {erro}
        </div>
      ) : null}

      <form className="dash-form" onSubmit={cadastrar} noValidate>
        <section className="dash-edit-modal__panel dash-produtos-form">
          <h2 className="dash-edit-modal__panel-title">
            <i className="bi bi-plus-circle" aria-hidden="true" /> Novo produto
          </h2>
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-5">
              <label className="dash-edit-modal__label" htmlFor="prod-nome">
                Nome do produto
              </label>
              <input
                id="prod-nome"
                type="text"
                className="form-control dash-edit-modal__input"
                placeholder="Ex.: Calhas"
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-lg-5">
              <label className="dash-edit-modal__label" htmlFor="prod-desc">
                Descrição curta
              </label>
              <input
                id="prod-desc"
                type="text"
                className="form-control dash-edit-modal__input"
                placeholder="Texto exibido no card do site"
                value={descNovo}
                onChange={(e) => setDescNovo(e.target.value)}
              />
            </div>
            <div className="col-12 col-lg-2 d-grid">
              <label className="dash-edit-modal__label d-none d-lg-block">
                &nbsp;
              </label>
              <button
                type="submit"
                className="btn dash-edit-modal__btn-save w-100"
                disabled={salvandoNovo}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
                {salvandoNovo ? "Cadastrando…" : "Cadastrar"}
              </button>
            </div>
          </div>
        </section>
      </form>

      <section className="dash-edit-modal__panel dash-produtos-grid-wrap">
        <h2 className="dash-edit-modal__panel-title">
          <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Catálogo
        </h2>
        {loading ? (
          <p className="text-secondary mb-0">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="text-secondary mb-0">Nenhum produto cadastrado ainda.</p>
        ) : (
          <div className="dash-produtos-grid">
            {itens.map((produto) => (
              <article key={produto.id} className="dash-produto-card">
                <ProdutoCardMedia produto={produto} />
                <div className="dash-produto-card__body">
                  <h3 className="dash-produto-card__title">{produto.nome}</h3>
                  {produto.descricao ? (
                    <p className="dash-produto-card__desc">{produto.descricao}</p>
                  ) : null}
                  <div className="dash-produto-card__meta">
                    <span
                      className={`dash-produto-card__status dash-produto-card__status--${produto.ativo ? "on" : "off"}`}
                    >
                      {produto.ativo ? "Ativo no site" : "Oculto"}
                    </span>
                  </div>
                  <div className="dash-produto-card__actions">
                    <Link
                      to="/painel/produtos-galeria"
                      search={{ produto: produto.id }}
                      className="btn btn-sm dash-edit-modal__btn-save"
                    >
                      <i className="bi bi-images" aria-hidden="true" /> Galeria
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => abrirEditar(produto)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger dash-produto-card__btn-delete"
                      title="Excluir produto"
                      aria-label="Excluir produto"
                      onClick={() => setExcluirAlvo(produto)}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <AdminModal open={editOpen} onClose={fecharEditar}>
        <form
          className="modal-content dash-edit-modal__content"
          onSubmit={salvarEdit}
        >
          <div className="modal-header dash-edit-modal__header">
            <div>
              <h4 className="modal-title dash-edit-modal__title mb-0">Editar produto</h4>
              <p className="dash-edit-modal__subtitle mb-0">Nome e descrição exibidos no site</p>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={fecharEditar}
            />
          </div>
          <div className="modal-body dash-edit-modal__body">
            <section className="dash-edit-modal__panel">
              <div className="row g-2">
                <div className="col-12">
                  <label className="dash-edit-modal__label" htmlFor="edit-prod-nome">
                    Nome
                  </label>
                  <input
                    id="edit-prod-nome"
                    type="text"
                    className="form-control dash-edit-modal__input"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="dash-edit-modal__label" htmlFor="edit-prod-desc">
                    Descrição
                  </label>
                  <input
                    id="edit-prod-desc"
                    type="text"
                    className="form-control dash-edit-modal__input"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="edit-prod-ativo"
                      checked={editAtivo}
                      onChange={(e) => setEditAtivo(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="edit-prod-ativo">
                      Exibir no site
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="modal-footer dash-edit-modal__footer">
            <button
              type="button"
              className="btn dash-edit-modal__btn-cancel"
              onClick={fecharEditar}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn dash-edit-modal__btn-save"
              disabled={salvandoEdit}
            >
              {salvandoEdit ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </AdminModal>

      <DashConfirmModal
        open={Boolean(excluirAlvo)}
        loading={excluindo}
        options={
          excluirAlvo
            ? {
                title: "Excluir produto?",
                message: `O produto "${excluirAlvo.nome}" e todas as fotos da galeria serão removidos.`,
                confirmText: "Excluir",
                cancelText: "Cancelar",
                variant: "danger",
                icon: "bi-trash",
              }
            : null
        }
        onConfirm={() => void confirmarExcluir()}
        onCancel={() => {
          if (!excluindo) setExcluirAlvo(null);
        }}
      />
    </div>
  );
}
