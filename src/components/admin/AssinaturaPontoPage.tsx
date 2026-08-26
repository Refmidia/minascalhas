import { useCallback, useEffect, useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { AssinaturaPreviewImg } from "@/components/admin/AssinaturaPreviewImg";
import { DashPageHero } from "@/components/admin/DashPageHero";
import { UserThumb } from "@/components/admin/UserThumb";
import { UsuarioAssinaturaEditor } from "@/components/admin/UsuarioAssinaturaEditor";
import { dashConfirm, dashToast } from "@/lib/dash-ui";
import { removerAssinaturaUsuario } from "@/lib/usuarios-client";

type FuncAssinatura = {
  id: number;
  nome: string;
  thumb: string;
  thumb_url: string | null;
  dataUrl: string | null;
};

export function AssinaturaPontoPage() {
  const { user } = useAdminAuth();
  const [lista, setLista] = useState<FuncAssinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [liberandoId, setLiberandoId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ponto-assinaturas", { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        itens?: FuncAssinatura[];
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Não foi possível carregar as assinaturas.");
      }
      setLista(json.itens ?? []);
    } catch (e) {
      dashToast(e instanceof Error ? e.message : "Erro ao carregar.", "danger");
      setLista([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function liberarNova(item: FuncAssinatura) {
    if (!item.dataUrl || liberandoId != null) return;
    const ok = await dashConfirm({
      title: "Liberar nova assinatura?",
      message: `A assinatura atual de ${item.nome} será apagada. O quadro volta a aparecer na tela de Ponto para ele assinar de novo.`,
      confirmText: "Liberar",
      cancelText: "Cancelar",
      variant: "warning",
      icon: "bi-pen",
    });
    if (!ok) return;
    setLiberandoId(item.id);
    try {
      await removerAssinaturaUsuario(item.id);
      dashToast(`${item.nome} já pode assinar de novo no bate-ponto.`, "success");
      await load();
    } catch (e) {
      dashToast(e instanceof Error ? e.message : "Não foi possível liberar.", "danger");
    } finally {
      setLiberandoId(null);
    }
  }

  return (
    <div className="dash-form-page dash-form-page--pro">
      <DashPageHero
        title="Assinatura"
        subtitle="Assinatura da empresa e dos funcionários na folha de ponto"
        iconClass="bi-pen"
        layout="form"
        showNovaVisita={false}
        cta={null}
      />
      <div className="dash-page-body dash-page-body--solo">
        {user?.id ? (
          <UsuarioAssinaturaEditor
            usuarioId={user.id}
            nome={user.nome}
            titulo="Assinatura da empresa"
            intro={`${user.nome} assina aqui uma vez. Na hora de baixar o PDF, é só marcar a caixinha da empresa.`}
            introGravada="Assinatura da empresa gravada. No PDF você escolhe se ela entra ou não."
            podeRemover
          />
        ) : (
          <p className="text-muted">Faça login para gravar a assinatura.</p>
        )}

        <section className="dash-edit-modal__panel dash-user-ass-lista">
          <h3 className="dash-edit-modal__panel-title">
            <i className="bi bi-people" aria-hidden="true" />
            Assinaturas dos funcionários
          </h3>
          <p className="dash-user-ass__intro">
            Quando alguém assinar no ponto, a assinatura aparece aqui. Se ficar feia, marque a
            caixinha para apagar a antiga e liberar uma nova.
          </p>
          {loading ? <p className="text-muted mb-0">Carregando…</p> : null}
          {!loading && lista.length === 0 ? (
            <p className="text-muted mb-0">Nenhum funcionário cadastrado.</p>
          ) : null}
          {!loading ? (
            <ul className="dash-user-ass-lista__grid">
              {lista.map((item) => (
                <li key={item.id} className="dash-user-ass-card">
                  <div className="dash-user-ass-card__head">
                    <UserThumb
                      nome={item.nome}
                      thumb={item.thumb}
                      thumbUrl={item.thumb_url}
                      size="sm"
                    />
                    <strong>{item.nome}</strong>
                  </div>
                  {item.dataUrl ? (
                    <div className="dash-ponto-ass-preview">
                      <AssinaturaPreviewImg src={item.dataUrl} alt={`Assinatura de ${item.nome}`} />
                    </div>
                  ) : (
                    <p className="dash-user-ass-card__vazio">Ainda não assinou. O quadro está no ponto dele.</p>
                  )}
                  <label className={`dash-ponto-ass-modal__check${item.dataUrl ? "" : " is-off"}`}>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={!item.dataUrl || liberandoId != null}
                      onChange={() => {
                        if (item.dataUrl) void liberarNova(item);
                      }}
                    />
                    <span>
                      {liberandoId === item.id
                        ? "Liberando…"
                        : item.dataUrl
                          ? "Liberar nova assinatura"
                          : "Aguardando a primeira assinatura"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}
