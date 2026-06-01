import { Loader2 } from "lucide-react";
import { useState } from "react";

import { AdminModal } from "@/components/admin/modals/AdminModal";
import { confirmarMontagem, type AgendamentoItem } from "@/lib/admin-api";

type Props = {
  open: boolean;
  onClose: () => void;
  inventarioId: number | null;
  onSaved: (item: AgendamentoItem) => void;
};

export function ModalConfirmarMontagem({ open, onClose, inventarioId, onSaved }: Props) {
  const [dataMontagem, setDataMontagem] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inventarioId || !dataMontagem) {
      setError("Informe a data de montagem.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const item = await confirmarMontagem(inventarioId, dataMontagem);
      onSaved(item);
      onClose();
      setDataMontagem("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal open={open} onClose={onClose}>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Confirmar montagem</h5>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}
            <p className="small text-muted mb-2">Registro #{inventarioId}</p>
            <label className="form-label">Data da montagem</label>
            <input
              type="date"
              className="form-control"
              required
              value={dataMontagem}
              onChange={(e) => setDataMontagem(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn visitas-orc-save-btn" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : null}
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </AdminModal>
  );
}
