import { useEffect, useState } from "react";

import { PontoAssinaturaPad } from "@/components/admin/PontoAssinaturaPad";
import { dashToast } from "@/lib/dash-ui";
import {
  fetchAssinaturaUsuario,
  removerAssinaturaUsuario,
  salvarAssinaturaUsuario,
} from "@/lib/usuarios-client";

type Props = {
  usuarioId: number;
  nome: string;
  onChanged?: () => void;
  /** Some o quadro depois da primeira assinatura (tela do funcionário). */
  ocultarDepoisDeSalvar?: boolean;
  /** Admin pode remover para o funcionário assinar de novo, se precisar. */
  podeRemover?: boolean;
};

export function UsuarioAssinaturaEditor({
  usuarioId,
  nome,
  onChanged,
  ocultarDepoisDeSalvar = false,
  podeRemover = false,
}: Props) {
  const [ready, setReady] = useState(false);
  const [seed, setSeed] = useState(0);
  const [gravada, setGravada] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetchAssinaturaUsuario(usuarioId)
      .then((src) => {
        if (cancelled) return;
        setGravada(src);
        setRascunho(src);
        setSeed((s) => s + 1);
        setReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        dashToast(e instanceof Error ? e.message : "Erro ao carregar assinatura.", "danger");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [usuarioId]);

  const dirty = rascunho !== gravada;
  const podeSalvar = Boolean(rascunho) && dirty && !busy && !gravada;

  async function salvar() {
    if (!rascunho || busy || gravada) return;
    setBusy(true);
    try {
      const saved = await salvarAssinaturaUsuario(usuarioId, rascunho);
      setGravada(saved);
      setRascunho(saved);
      dashToast("Assinatura gravada. O PDF de ponto já sai com ela.", "success");
      onChanged?.();
    } catch (e) {
      dashToast(e instanceof Error ? e.message : "Não foi possível salvar.", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function remover() {
    if (!gravada || busy || !podeRemover) return;
    setBusy(true);
    try {
      await removerAssinaturaUsuario(usuarioId);
      setGravada(null);
      setRascunho(null);
      setSeed((s) => s + 1);
      dashToast("Assinatura removida. O funcionário pode assinar de novo.", "success");
      onChanged?.();
    } catch (e) {
      dashToast(e instanceof Error ? e.message : "Não foi possível remover.", "danger");
    } finally {
      setBusy(false);
    }
  }

  if (ocultarDepoisDeSalvar && (!ready || gravada)) {
    return null;
  }

  if (!ocultarDepoisDeSalvar && ready && gravada) {
    return (
      <section className="dash-edit-modal__panel dash-user-ass">
        <h3 className="dash-edit-modal__panel-title">
          <i className="bi bi-pen" aria-hidden="true" />
          Assinatura do ponto
        </h3>
        <p className="dash-user-ass__intro">Assinatura gravada. O funcionário não pode alterar.</p>
        <div className="dash-ponto-ass-preview">
          <img src={gravada} alt={`Assinatura de ${nome}`} />
        </div>
        {podeRemover ? (
          <div className="dash-user-ass__acoes">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={busy}
              onClick={() => void remover()}
            >
              Remover e liberar nova assinatura
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="dash-edit-modal__panel dash-user-ass">
      <h3 className="dash-edit-modal__panel-title">
        <i className="bi bi-pen" aria-hidden="true" />
        Assinatura do ponto
      </h3>
      <p className="dash-user-ass__intro">
        {nome} assina aqui uma vez. Depois de salvar, este quadro some e não dá para assinar de
        novo.
      </p>
      {!ready ? <p className="text-muted mb-0">Carregando assinatura…</p> : null}
      {ready ? (
        <>
          <PontoAssinaturaPad
            key={`ass-${usuarioId}-${seed}`}
            initial={rascunho}
            onChange={setRascunho}
            label={`Assinatura — ${nome}`}
            disabled={busy}
          />
          <div className="dash-user-ass__acoes">
            <button
              type="button"
              className="btn visitas-orc-add-btn btn-sm"
              disabled={!podeSalvar}
              onClick={() => void salvar()}
            >
              <i className="bi bi-check-lg" aria-hidden="true" />
              {busy ? " Salvando…" : " Salvar assinatura"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
