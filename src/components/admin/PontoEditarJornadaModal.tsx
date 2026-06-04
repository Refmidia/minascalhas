import { useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/modals/AdminModal";
import { pontoLabelTipo } from "@/lib/ponto-display";
import { horaInputFromPontoSql, montarDatetimePonto, pontoDiaChave } from "@/lib/ponto-timezone";
import { dashToast } from "@/lib/dash-ui";

type Registro = {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  tipo: string;
  registrado_em: string;
};

type JornadaRef = {
  usuario_id: number;
  usuario_nome: string;
  data: string;
  data_fmt: string;
};

type BatidaForm = {
  id: number;
  tipo: string;
  label: string;
  hora: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  jornada: JornadaRef | null;
  registros: Registro[];
  /** Se informado, edita só esta batida (detalhe). */
  registroId?: number | null;
  onSaved: () => void;
};

export function PontoEditarJornadaModal({
  open,
  onClose,
  jornada,
  registros,
  registroId = null,
  onSaved,
}: Props) {
  const [batidas, setBatidas] = useState<BatidaForm[]>([]);
  const [saving, setSaving] = useState(false);

  const titulo = useMemo(() => {
    if (!jornada) return "Corrigir horários";
    return `Corrigir horários — ${jornada.usuario_nome} (${jornada.data_fmt})`;
  }, [jornada]);

  useEffect(() => {
    if (!open || !jornada) {
      setBatidas([]);
      return;
    }
    let lista = registros.filter(
      (r) => r.usuario_id === jornada.usuario_id && pontoDiaChave(r.registrado_em) === jornada.data,
    );
    if (registroId != null && registroId > 0) {
      lista = lista.filter((r) => r.id === registroId);
    }
    lista = lista
      .sort((a, b) => a.registrado_em.localeCompare(b.registrado_em))
      .map((r) => ({
        id: r.id,
        tipo: r.tipo,
        label: pontoLabelTipo(r.tipo),
        hora: horaInputFromPontoSql(r.registrado_em),
      }));
    setBatidas(lista);
  }, [open, jornada, registros, registroId]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!jornada || batidas.length === 0) return;

    setSaving(true);
    try {
      for (const b of batidas) {
        const h = b.hora.trim();
        if (!h) {
          throw new Error(`Informe o horário de ${b.label}.`);
        }
        const registrado_em = montarDatetimePonto(jornada.data, h);
        if (!registrado_em) {
          throw new Error(`Horário inválido em ${b.label}.`);
        }

        const res = await fetch("/api/admin/ponto-controle", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id, registrado_em }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok) throw new Error(json.message ?? "Não foi possível salvar.");
      }

      dashToast("Horários do ponto atualizados.", "success");
      onSaved();
      onClose();
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Erro ao salvar.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal open={open} onClose={onClose} dialogClass="modal-md">
      <form className="modal-content visitas-orc-modal__content" onSubmit={(e) => void salvar(e)}>
        <div className="modal-header visitas-orc-modal__header flex-shrink-0">
          <div className="visitas-orc-modal__head">
            <span className="visitas-orc-modal__head-icon" aria-hidden="true">
              <i className="bi bi-pencil-square" />
            </span>
            <div>
              <h4 className="modal-title visitas-orc-modal__title mb-0">Corrigir batidas</h4>
              <p className="visitas-orc-modal__subtitle mb-0">{titulo}</p>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
        </div>

        <div className="modal-body dash-edit-modal__body">
          <p className="text-muted small mb-3">
            Somente administradores podem alterar horários. O funcionário não consegue editar as
            batidas depois de registradas.
          </p>
          {batidas.length === 0 ? (
            <p className="mb-0">Nenhuma batida encontrada nesta jornada.</p>
          ) : (
            <div className="row g-3">
              {batidas.map((b, idx) => (
                <div key={b.id} className="col-12 col-sm-6">
                  <label className="dash-edit-modal__label" htmlFor={`ponto-edit-${b.id}`}>
                    {b.label}
                  </label>
                  <input
                    id={`ponto-edit-${b.id}`}
                    type="time"
                    step={1}
                    required
                    className="form-control dash-edit-modal__input dash-ponto-edit-time"
                    value={b.hora}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBatidas((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, hora: v } : x)),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer visitas-orc-modal__footer flex-shrink-0">
          <button type="button" className="btn dash-edit-modal__btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn dash-edit-modal__btn-save"
            disabled={saving || batidas.length === 0}
          >
            {saving ? "Salvando…" : "Salvar horários"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
