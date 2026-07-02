import { useEffect, useState } from "react";

import { DashAlertModal } from "@/components/admin/DashAlertModal";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import { CalculadoraBobinaWidget } from "@/components/admin/CalculadoraBobinaWidget";
import type { OrcamentoLinha } from "@/lib/orcamento.server";

type Props = {
  open: boolean;
  onClose: () => void;
  onImportar: (linhas: OrcamentoLinha[]) => void;
};

export function PopupCalculadoraOrcamento({ open, onClose, onImportar }: Props) {
  const [itensAdicionados, setItensAdicionados] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setItensAdicionados(null);
  }, [open]);

  function handleImportar(linhas: OrcamentoLinha[]) {
    onImportar(linhas);
    setItensAdicionados(linhas.length);
  }

  return (
    <>
    <AdminModal
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      layerClass="visitas-orc-calculadora-layer"
      dialogClass="visitas-orc-calculadora-modal__dialog modal-xl"
    >
      <div className="modal-content visitas-orc-calculadora-modal">
        <div className="modal-header visitas-orc-calculadora-modal__header flex-shrink-0">
          <div className="visitas-orc-calculadora-modal__head">
            <span className="visitas-orc-calculadora-modal__icon" aria-hidden="true">
              <i className="bi bi-calculator" />
            </span>
            <div>
              <h5 className="modal-title mb-0">Calculadora de bobina</h5>
              <p className="visitas-orc-calculadora-modal__subtitle mb-0">
                Calcule os cortes e importe os itens para o orçamento.
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
        </div>
        <div className="modal-body visitas-orc-calculadora-modal__body p-0">
          <CalculadoraBobinaWidget
            variant="modal"
            idPrefix="orc-bobina"
            onImportarOrcamento={handleImportar}
          />
        </div>
      </div>
    </AdminModal>

    <DashAlertModal
      open={itensAdicionados !== null}
      options={
        itensAdicionados !== null
          ? {
              title: "Adicionado ao orçamento",
              message: `${itensAdicionados} item(ns) adicionado(s) com sucesso. Você pode continuar calculando.`,
              variant: "success",
              okText: "OK",
            }
          : null
      }
      onClose={() => setItensAdicionados(null)}
    />
    </>
  );
}
