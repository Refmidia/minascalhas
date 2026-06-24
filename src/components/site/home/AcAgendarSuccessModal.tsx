import { useEffect } from "react";

type Props = {
  open: boolean;
  nome: string;
  dataVisita: string;
  onClose: () => void;
};

function primeiroNome(nome: string): string {
  const part = nome.trim().split(/\s+/)[0];
  return part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : "Cliente";
}

function formatDataBr(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso || "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function AcAgendarSuccessModal({ open, nome, dataVisita, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("ac-agendar-success-open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("ac-agendar-success-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const nomeCurto = primeiroNome(nome);
  const dataFmt = formatDataBr(dataVisita);

  return (
    <div
      className="ac-agendar-success is-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ac-agendar-success-title"
    >
      <button
        type="button"
        className="ac-agendar-success__backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="ac-agendar-success__dialog">
        <div className="ac-agendar-success__hero">
          <button type="button" className="ac-agendar-success__close" aria-label="Fechar" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
          <span className="ac-agendar-success__hero-icon" aria-hidden="true">
            <i className="bi bi-calendar-check" />
          </span>
        </div>

        <div className="ac-agendar-success__body">
          <p className="ac-agendar-success__badge">Tudo certo!</p>
          <h2 className="ac-agendar-success__title" id="ac-agendar-success-title">
            {nomeCurto}, sua visita foi agendada
          </h2>
          <p className="ac-agendar-success__text">
            Recebemos sua solicitação com sucesso. Em breve um profissional da{" "}
            <strong>Minas Calhas</strong> entrará em contato para confirmar os detalhes da visita em{" "}
            <strong>{dataFmt}</strong>.
          </p>

          <ol className="ac-agendar-success__steps">
            <li>Pedido registrado no sistema</li>
            <li>Nossa equipe analisa sua solicitação</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
