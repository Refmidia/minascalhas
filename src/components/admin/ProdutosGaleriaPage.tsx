import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import { DashPageHero } from "@/components/admin/DashPageHero";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import {
  definirCapaFoto,
  excluirFotoProduto,
  excluirImagemPadraoProduto,
  fetchFotosProduto,
  fetchProdutoDetalhe,
  salvarLegendaFoto,
  uploadFotosProduto,
  type ImagemPadraoProduto,
  type ProdutoDetalhe,
  type ProdutoFoto,
} from "@/lib/produtos-client";
import { Route as GaleriaRoute } from "@/routes/painel/produtos-galeria";

export function ProdutosGaleriaPage() {
  const navigate = useNavigate();
  const { produto: produtoId } = GaleriaRoute.useSearch();

  const [produto, setProduto] = useState<ProdutoDetalhe | null>(null);
  const [fotos, setFotos] = useState<ProdutoFoto[]>([]);
  const [imagemPadrao, setImagemPadrao] = useState<ImagemPadraoProduto | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  const [legendaPadrao, setLegendaPadrao] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [verUrl, setVerUrl] = useState<string | null>(null);
  const [verAlt, setVerAlt] = useState("");

  const [editFoto, setEditFoto] = useState<ProdutoFoto | null>(null);
  const [editLegenda, setEditLegenda] = useState("");
  const [salvandoLegenda, setSalvandoLegenda] = useState(false);

  const [excluirFoto, setExcluirFoto] = useState<ProdutoFoto | null>(null);
  const [excluirPadrao, setExcluirPadrao] = useState(false);
  const [removerPadraoDeTodos, setRemoverPadraoDeTodos] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const load = useCallback(async () => {
    if (!produtoId || produtoId <= 0) return;
    setLoading(true);
    setErro("");
    try {
      const [p, payload] = await Promise.all([
        fetchProdutoDetalhe(produtoId),
        fetchFotosProduto(produtoId),
      ]);
      setProduto(p);
      setFotos(payload.fotos);
      setImagemPadrao(payload.imagemPadrao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      setProduto(null);
      setFotos([]);
      setImagemPadrao(null);
    } finally {
      setLoading(false);
    }
  }, [produtoId]);

  useEffect(() => {
    if (!produtoId || produtoId <= 0) {
      void navigate({ to: "/painel/produtos", replace: true });
      return;
    }
    void load();
  }, [produtoId, load, navigate]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  function limparSelecao() {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls([]);
    setArquivos([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function aplicarArquivos(files: FileList | File[]) {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setArquivos(imgs);
    setPreviewUrls(imgs.map((f) => URL.createObjectURL(f)));
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) aplicarArquivos(e.target.files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) aplicarArquivos(e.dataTransfer.files);
  }

  async function enviarFotos(e: React.FormEvent) {
    e.preventDefault();
    if (!produtoId || !arquivos.length) return;
    setEnviando(true);
    setErro("");
    try {
      await uploadFotosProduto(produtoId, arquivos, legendaPadrao);
      setMsg(
        arquivos.length === 1 ? "1 foto adicionada." : `${arquivos.length} fotos adicionadas.`,
      );
      limparSelecao();
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  async function definirCapa(foto: ProdutoFoto) {
    if (!produtoId || foto.eh_capa) return;
    setErro("");
    try {
      await definirCapaFoto(produtoId, foto.id);
      setMsg("Capa definida.");
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao definir capa.");
    }
  }

  function abrirEditarLegenda(foto: ProdutoFoto) {
    setEditFoto(foto);
    setEditLegenda(foto.legenda ?? "");
  }

  async function salvarLegenda(e: React.FormEvent) {
    e.preventDefault();
    if (!produtoId || !editFoto) return;
    setSalvandoLegenda(true);
    setErro("");
    try {
      await salvarLegendaFoto(produtoId, editFoto.id, editLegenda);
      setMsg("Legenda atualizada.");
      setEditFoto(null);
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvandoLegenda(false);
    }
  }

  async function confirmarExcluirFoto() {
    if (!produtoId || !excluirFoto) return;
    setExcluindo(true);
    setErro("");
    try {
      await excluirFotoProduto(produtoId, excluirFoto.id);
      setMsg("Foto removida.");
      setExcluirFoto(null);
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  async function confirmarExcluirPadrao() {
    if (!produtoId) return;
    setExcluindo(true);
    setErro("");
    try {
      await excluirImagemPadraoProduto(produtoId, removerPadraoDeTodos);
      setMsg(
        removerPadraoDeTodos
          ? "Imagens padrão removidas de todos os produtos."
          : "Imagem padrão removida.",
      );
      setExcluirPadrao(false);
      setRemoverPadraoDeTodos(false);
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  const capaAtual = fotos.find((f) => f.eh_capa) ?? null;
  const imgCapa = capaAtual?.url ?? imagemPadrao?.url ?? produto?.imagem_url ?? "";
  const totalFotos = fotos.length + (imagemPadrao ? 1 : 0);
  const temItensGaleria = totalFotos > 0;

  if (!produtoId || produtoId <= 0) return null;

  return (
    <div className="dash-prod-galeria">
      <DashPageHero
        title={produto ? `Galeria — ${produto.nome}` : "Galeria"}
        subtitle="Envie fotos, edite legendas e defina a capa do card no site."
        iconClass="bi-images"
        accent="produtos"
        showNovaVisita={false}
        cta={
          <Link to="/painel/produtos" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar ao catálogo
          </Link>
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

      {loading ? (
        <p className="text-secondary">Carregando…</p>
      ) : !produto ? (
        <p className="text-secondary">Produto não encontrado.</p>
      ) : (
        <>
          <section className="dash-edit-modal__panel dash-prod-galeria__preview-panel">
            <div className="dash-prod-galeria__preview-bar">
              <div className="dash-prod-galeria__mock-wrap">
                <span className="dash-prod-galeria__mock-label">
                  <i className="bi bi-eye" aria-hidden="true" /> Prévia no site
                </span>
                <article className="dash-prod-galeria__mock-card">
                  <div className="dash-prod-galeria__mock-media">
                    {imgCapa ? (
                      <img
                        id="prod-capa-preview"
                        src={imgCapa}
                        alt={`Capa de ${produto.nome}`}
                      />
                    ) : (
                      <span className="dash-produto-card__media-placeholder">
                        <i className="bi bi-image" />
                      </span>
                    )}
                    <div className="dash-prod-galeria__mock-overlay">
                      <h3>{produto.nome}</h3>
                      {produto.descricao ? <p>{produto.descricao}</p> : null}
                    </div>
                    {capaAtual ? (
                      <span className="dash-prod-galeria__mock-capa-tag">
                        <i className="bi bi-star-fill" aria-hidden="true" /> Capa
                      </span>
                    ) : null}
                  </div>
                </article>
              </div>
              <div className="dash-prod-galeria__preview-info">
                <p className="dash-prod-galeria__preview-lead">
                  A foto <strong>capa</strong> aparece no card deste produto na home (Nossos
                  serviços). Todas as fotos enviadas aqui entram na <strong>galeria do site</strong> e
                  no <strong>carrossel do hero</strong> da página inicial.
                </p>
                <div className="dash-prod-galeria__preview-chips">
                  <span className="dash-prod-galeria__chip">
                    <i className="bi bi-images" aria-hidden="true" />
                    {totalFotos} foto{totalFotos === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`dash-prod-galeria__chip${capaAtual ? " is-active" : ""}`}
                  >
                    <i
                      className={`bi bi-star${capaAtual ? "-fill" : ""}`}
                      aria-hidden="true"
                    />
                    {capaAtual ? "Capa definida" : "Sem capa"}
                  </span>
                  {capaAtual ? (
                    <span className="dash-prod-galeria__chip dash-prod-galeria__chip--muted">
                      {capaAtual.legenda?.trim() || "Sem legenda"}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="dash-edit-modal__panel dash-prod-galeria__upload-panel">
            <h2 className="dash-edit-modal__panel-title">
              <i className="bi bi-cloud-upload" aria-hidden="true" /> Adicionar novas fotos
            </h2>
            <form className="dash-form" onSubmit={enviarFotos} id="prod-upload-form">
              <div
                ref={dropzoneRef}
                className={`dash-prod-dropzone${dragOver ? " is-dragover" : ""}`}
                tabIndex={0}
                role="button"
                aria-label="Arraste imagens ou clique para selecionar"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={onDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  name="fotos"
                  id="galeria-fotos"
                  className="dash-prod-dropzone__input"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={onInputChange}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="dash-prod-dropzone__content">
                  <span className="dash-prod-dropzone__icon" aria-hidden="true">
                    <i className="bi bi-cloud-arrow-up" />
                  </span>
                  <p className="dash-prod-dropzone__title">Arraste as imagens aqui</p>
                  <p className="dash-prod-dropzone__hint">
                    ou clique para selecionar · JPG, PNG, WEBP · até 8 MB cada
                  </p>
                  <button type="button" className="btn btn-sm btn-outline-secondary dash-prod-dropzone__btn" tabIndex={-1}>
                    Escolher arquivos
                  </button>
                </div>
              </div>

              {previewUrls.length > 0 ? (
                <div className="dash-prod-upload-preview" id="prod-upload-preview">
                  <p className="dash-prod-upload-preview__label">Arquivos selecionados</p>
                  <div className="dash-prod-upload-preview__grid" id="prod-upload-preview-grid">
                    {arquivos.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="dash-prod-upload-preview__item">
                        <img src={previewUrls[i]} alt="" />
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="dash-prod-galeria__upload-footer">
                <div className="dash-prod-galeria__upload-legenda">
                  <label className="dash-edit-modal__label" htmlFor="galeria-legenda">
                    Legenda padrão (opcional)
                  </label>
                  <input
                    type="text"
                    name="legenda"
                    id="galeria-legenda"
                    className="form-control dash-edit-modal__input"
                    placeholder="Ex.: Instalação residencial — vale para todas as fotos deste envio"
                    value={legendaPadrao}
                    onChange={(e) => setLegendaPadrao(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn dash-edit-modal__btn-save dash-prod-galeria__upload-submit"
                  id="prod-upload-submit"
                  disabled={!arquivos.length || enviando}
                >
                  <i className="bi bi-upload" aria-hidden="true" />{" "}
                  {enviando ? "Enviando…" : "Enviar fotos"}
                </button>
              </div>
            </form>
          </section>

          <section className="dash-edit-modal__panel dash-prod-galeria__lista-panel">
            <div className="dash-prod-galeria__lista-head">
              <h2 className="dash-edit-modal__panel-title mb-0">
                <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Galeria do produto{" "}
                <span className="text-secondary fw-normal fs-6">({totalFotos})</span>
              </h2>
              {temItensGaleria ? (
                <p className="dash-prod-galeria__lista-hint mb-0">
                  Clique na estrela para definir a capa do site · lápis para editar legenda
                </p>
              ) : null}
            </div>

            {!temItensGaleria ? (
              <div className="dash-prod-galeria__empty">
                <div className="dash-prod-galeria__empty-icon" aria-hidden="true">
                  <i className="bi bi-images" />
                </div>
                <h3>Nenhuma foto ainda</h3>
                <p className="mb-0">Use a área de upload acima para adicionar imagens deste produto.</p>
              </div>
            ) : (
              <div className="dash-prod-galeria__grid">
                {imagemPadrao ? (
                  <article className="dash-prod-galeria__card dash-prod-galeria__card--padrao is-capa">
                    <div className="dash-prod-galeria__card-media">
                      <img
                        src={imagemPadrao.url}
                        alt={imagemPadrao.legenda}
                        loading="lazy"
                      />
                      <span className="dash-prod-galeria__padrao-tag">
                        <i className="bi bi-image" aria-hidden="true" /> Imagem padrão
                      </span>
                      <div className="dash-prod-galeria__card-overlay">
                        <button
                          type="button"
                          className="dash-prod-galeria__overlay-btn prod-btn-ver"
                          title="Ver em tamanho grande"
                          aria-label="Ver foto"
                          onClick={() => {
                            setVerUrl(imagemPadrao.url);
                            setVerAlt(imagemPadrao.legenda);
                          }}
                        >
                          <i className="bi bi-zoom-in" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="dash-prod-galeria__overlay-btn dash-prod-galeria__overlay-btn--danger"
                          title="Remover imagem padrão"
                          aria-label="Remover imagem padrão"
                          onClick={() => setExcluirPadrao(true)}
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="dash-prod-galeria__card-footer">
                      <p className="dash-prod-galeria__card-legenda">{imagemPadrao.legenda}</p>
                      <span className="dash-prod-galeria__capa-ativa">
                        <i className="bi bi-info-circle" aria-hidden="true" /> Exibida no site até você
                        enviar fotos
                      </span>
                    </div>
                  </article>
                ) : null}
                {fotos.map((foto) => {
                  const legenda = foto.legenda?.trim() ?? "";
                  return (
                    <article
                      key={foto.id}
                      className={`dash-prod-galeria__card${foto.eh_capa ? " is-capa" : ""}`}
                      data-foto-id={foto.id}
                    >
                      <div className="dash-prod-galeria__card-media">
                        <img
                          src={foto.url}
                          alt={legenda || produto.nome}
                          loading="lazy"
                        />
                        {foto.eh_capa ? (
                          <span className="dash-prod-galeria__capa-tag">
                            <i className="bi bi-star-fill" aria-hidden="true" /> Capa do site
                          </span>
                        ) : null}
                        <div className="dash-prod-galeria__card-overlay">
                          <button
                            type="button"
                            className="dash-prod-galeria__overlay-btn prod-btn-ver"
                            title="Ver em tamanho grande"
                            aria-label="Ver foto"
                            onClick={() => {
                              setVerUrl(foto.url);
                              setVerAlt(legenda || produto.nome);
                            }}
                          >
                            <i className="bi bi-zoom-in" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="dash-prod-galeria__overlay-btn"
                            title="Editar legenda"
                            aria-label="Editar legenda"
                            onClick={() => abrirEditarLegenda(foto)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                          </button>
                          {!foto.eh_capa ? (
                            <button
                              type="button"
                              className="dash-prod-galeria__overlay-btn dash-prod-galeria__overlay-btn--capa"
                              title="Definir como capa do site"
                              aria-label="Definir como capa"
                              onClick={() => void definirCapa(foto)}
                            >
                              <i className="bi bi-star" aria-hidden="true" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="dash-prod-galeria__overlay-btn dash-prod-galeria__overlay-btn--danger"
                            title="Excluir foto"
                            aria-label="Excluir foto"
                            onClick={() => setExcluirFoto(foto)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="dash-prod-galeria__card-footer">
                        <p className="dash-prod-galeria__card-legenda">
                          {legenda || "Sem legenda"}
                        </p>
                        {!foto.eh_capa ? (
                          <button
                            type="button"
                            className="dash-prod-galeria__capa-link border-0 bg-transparent p-0"
                            onClick={() => void definirCapa(foto)}
                          >
                            <i className="bi bi-star" aria-hidden="true" /> Definir capa
                          </button>
                        ) : (
                          <span className="dash-prod-galeria__capa-ativa">
                            <i className="bi bi-check-circle-fill" aria-hidden="true" /> Capa ativa
                            no site
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <AdminModal open={Boolean(verUrl)} onClose={() => setVerUrl(null)} dialogClass="modal-lg">
        <div className="modal-content dash-edit-modal__content">
          <div className="modal-header dash-edit-modal__header">
            <h4 className="modal-title dash-edit-modal__title mb-0">Visualizar foto</h4>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={() => setVerUrl(null)}
            />
          </div>
          <div className="modal-body p-0">
            {verUrl ? (
              <img src={verUrl} alt={verAlt} className="dash-prod-galeria__modal-img w-100" />
            ) : null}
          </div>
        </div>
      </AdminModal>

      <AdminModal open={Boolean(editFoto)} onClose={() => setEditFoto(null)}>
        <form className="modal-content dash-edit-modal__content" onSubmit={salvarLegenda}>
          <div className="modal-header dash-edit-modal__header">
            <div>
              <h4 className="modal-title dash-edit-modal__title mb-0">Editar legenda</h4>
              <p className="dash-edit-modal__subtitle mb-0">Texto exibido na galeria do site</p>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={() => setEditFoto(null)}
            />
          </div>
          <div className="modal-body dash-edit-modal__body">
            <section className="dash-edit-modal__panel">
              {editFoto ? (
                <div className="dash-prod-galeria__edit-preview">
                  <img src={editFoto.url} alt="" />
                </div>
              ) : null}
              <label className="dash-edit-modal__label" htmlFor="edit-legenda">
                Legenda
              </label>
              <input
                id="edit-legenda"
                type="text"
                className="form-control dash-edit-modal__input"
                placeholder="Ex.: Instalação em telhado residencial"
                value={editLegenda}
                onChange={(e) => setEditLegenda(e.target.value)}
              />
            </section>
          </div>
          <div className="modal-footer dash-edit-modal__footer">
            <button
              type="button"
              className="btn dash-edit-modal__btn-cancel"
              onClick={() => setEditFoto(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn dash-edit-modal__btn-save"
              disabled={salvandoLegenda}
            >
              {salvandoLegenda ? "Salvando…" : "Salvar legenda"}
            </button>
          </div>
        </form>
      </AdminModal>

      <DashConfirmModal
        open={Boolean(excluirFoto)}
        loading={excluindo}
        options={
          excluirFoto
            ? {
                title: "Excluir foto?",
                message: "Remover esta foto permanentemente?",
                confirmText: "Excluir",
                cancelText: "Cancelar",
                variant: "danger",
                icon: "bi-trash",
              }
            : null
        }
        onConfirm={() => void confirmarExcluirFoto()}
        onCancel={() => {
          if (!excluindo) setExcluirFoto(null);
        }}
      />

      <AdminModal
        open={excluirPadrao}
        onClose={() => {
          if (!excluindo) {
            setExcluirPadrao(false);
            setRemoverPadraoDeTodos(false);
          }
        }}
      >
        <div className="modal-content dash-edit-modal__content">
          <div className="modal-header dash-edit-modal__header">
            <div>
              <h4 className="modal-title dash-edit-modal__title mb-0">Remover imagem padrão?</h4>
              <p className="dash-edit-modal__subtitle mb-0">
                Ela some do hero, da galeria do site e do card na home.
              </p>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              disabled={excluindo}
              onClick={() => {
                if (!excluindo) {
                  setExcluirPadrao(false);
                  setRemoverPadraoDeTodos(false);
                }
              }}
            />
          </div>
          <div className="modal-body dash-edit-modal__body">
            {imagemPadrao ? (
              <div className="dash-prod-galeria__edit-preview mb-3">
                <img src={imagemPadrao.url} alt="" />
              </div>
            ) : null}
            <label className="dash-prod-galeria__check-todos">
              <input
                type="checkbox"
                checked={removerPadraoDeTodos}
                onChange={(e) => setRemoverPadraoDeTodos(e.target.checked)}
                disabled={excluindo}
              />
              <span>Remover imagem padrão de <strong>todos</strong> os produtos</span>
            </label>
          </div>
          <div className="modal-footer dash-edit-modal__footer">
            <button
              type="button"
              className="btn dash-edit-modal__btn-cancel"
              disabled={excluindo}
              onClick={() => {
                setExcluirPadrao(false);
                setRemoverPadraoDeTodos(false);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={excluindo}
              onClick={() => void confirmarExcluirPadrao()}
            >
              {excluindo ? "Removendo…" : "Remover"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
