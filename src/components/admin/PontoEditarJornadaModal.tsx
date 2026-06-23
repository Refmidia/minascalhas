import { useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/modals/AdminModal";
import { pontoLabelTipo, pontoNormalizarTipo } from "@/lib/ponto-display";
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
  entrada_id?: number | null;
  almoco_id?: number | null;
  retorno_id?: number | null;
  saida_id?: number | null;
};

type BatidaForm = {
  id: number | null;
  tipo: string;
  label: string;
  hora: string;
};

const TIPOS_JORNADA = ["entrada", "almoco", "retorno_almoco", "saida"] as const;

const ID_POR_TIPO: Record<(typeof TIPOS_JORNADA)[number], keyof JornadaRef> = {
  entrada: "entrada_id",
  almoco: "almoco_id",
  retorno_almoco: "retorno_id",
  saida: "saida_id",
};

type Props = {
  open: boolean;
  onClose: () => void;
  jornada: JornadaRef | null;
  registros: Registro[];
  /** Destaca o campo da batida clicada no detalhe. */
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

    const doDia = registros
      .filter(
        (r) => r.usuario_id === jornada.usuario_id && pontoDiaChave(r.registrado_em) === jornada.data,
      )
      .sort((a, b) => a.registrado_em.localeCompare(b.registrado_em));

    setBatidas(
      TIPOS_JORNADA.map((tipo) => {
        const idKey = ID_POR_TIPO[tipo];
        const idFromJornada = jornada[idKey];
        const idNum = typeof idFromJornada === "number" && idFromJornada > 0 ? idFromJornada : null;

        let reg = idNum ? doDia.find((r) => r.id === idNum) : undefined;
        if (!reg) {
          reg = doDia.find((r) => pontoNormalizarTipo(r.tipo) === tipo);
        }

        return {
          id: reg?.id ?? null,
          tipo,
          label: pontoLabelTipo(tipo),
          hora: reg ? horaInputFromPontoSql(reg.registrado_em) : "",
        };
      }),
    );
  }, [open, jornada, registros]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!jornada) return;

    const temAlgumHorario = batidas.some((b) => b.hora.trim());
    if (!temAlgumHorario) {
      dashToast("Informe ao menos um horário.", "danger");
      return;
    }

    setSaving(true);
    try {
      for (const b of batidas) {
        const h = b.hora.trim();

        if (!h) {
          if (b.id) {
            const res = await fetch(`/api/admin/ponto-controle?id=${b.id}`, {
              method: "DELETE",
              credentials: "include",
            });
            const json = (await res.json()) as { ok?: boolean; message?: string };
            if (!res.ok) throw new Error(json.message ?? "Não foi possível remover a batida.");
          }
          continue;
        }

        const registrado_em = montarDatetimePonto(jornada.data, h);
        if (!registrado_em) {
          throw new Error(`Horário inválido em ${b.label}.`);
        }

        if (b.id) {
          const res = await fetch("/api/admin/ponto-controle", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: b.id, registrado_em }),
          });
          const json = (await res.json()) as { ok?: boolean; message?: string };
          if (!res.ok) throw new Error(json.message ?? "Não foi possível salvar.");
        } else {
          const res = await fetch("/api/admin/ponto-controle", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usuario_id: jornada.usuario_id,
              tipo: b.tipo,
              registrado_em,
            }),
          });
          const json = (await res.json()) as { ok?: boolean; message?: string };
          if (!res.ok) throw new Error(json.message ?? "Não foi possível criar a batida.");
        }
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
            Somente administradores podem alterar horários. Preencha ou corrija cada batida do dia;
            campos vazios sem registro anterior são ignorados.
          </p>
          <div className="row g-3">
            {batidas.map((b, idx) => {
              const destacado = registroId != null && registroId > 0 && b.id === registroId;
              return (
                <div key={b.tipo} className="col-12 col-sm-6">
                  <label className="dash-edit-modal__label" htmlFor={`ponto-edit-${b.tipo}`}>
                    {b.label}
                  </label>
                  <input
                    id={`ponto-edit-${b.tipo}`}
                    type="time"
                    step={1}
                    className={`form-control dash-edit-modal__input dash-ponto-edit-time${destacado ? " dash-ponto-edit-time--focus" : ""}`}
                    value={b.hora}
                    placeholder="—"
                    onChange={(e) => {
                      const v = e.target.value;
                      setBatidas((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, hora: v } : x)),
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer visitas-orc-modal__footer flex-shrink-0">
          <button type="button" className="btn dash-edit-modal__btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn dash-edit-modal__btn-save" disabled={saving}>
            {saving ? "Salvando…" : "Salvar horários"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
