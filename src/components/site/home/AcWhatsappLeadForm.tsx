import { useState, type FormEvent } from "react";

import { HOME_SITE, waUrl } from "@/data/home-config";

const SERVICE_OPTIONS = [
  "Calhas",
  "Rufos",
  "Pingadeiras",
  "Coifas e chaminés",
  "Condutores",
  "Outro / não sei ainda",
];

export function AcWhatsappLeadForm() {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [tipo, setTipo] = useState(SERVICE_OPTIONS[0]);

  function maskTelefone(value: string) {
    const v = value.replace(/\D/g, "").slice(0, 11);
    if (v.length <= 10) {
      return v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const msg = [
      "Olá! Gostaria de um orçamento.",
      "",
      `Nome: ${nome.trim()}`,
      `WhatsApp: ${whatsapp.trim()}`,
      `Cidade/Bairro: ${cidade.trim()}`,
      `Tipo de serviço: ${tipo}`,
    ].join("\n");
    window.open(waUrl(HOME_SITE.whatsapp, msg), "_blank", "noopener,noreferrer");
  }

  return (
    <form className="mc-lead-form" onSubmit={onSubmit} noValidate>
      <div className="mc-lead-form__group">
        <label htmlFor="mc-lead-nome">Nome</label>
        <input
          id="mc-lead-nome"
          type="text"
          name="nome"
          autoComplete="name"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
        />
      </div>
      <div className="mc-lead-form__group">
        <label htmlFor="mc-lead-wa">WhatsApp</label>
        <input
          id="mc-lead-wa"
          type="tel"
          name="whatsapp"
          autoComplete="tel"
          inputMode="tel"
          required
          value={whatsapp}
          onChange={(e) => setWhatsapp(maskTelefone(e.target.value))}
          placeholder="(00) 00000-0000"
        />
      </div>
      <div className="mc-lead-form__group">
        <label htmlFor="mc-lead-cidade">Cidade / Bairro</label>
        <input
          id="mc-lead-cidade"
          type="text"
          name="cidade"
          required
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Ex.: Florínea — Centro"
        />
      </div>
      <div className="mc-lead-form__group">
        <label htmlFor="mc-lead-tipo">Tipo de serviço</label>
        <select id="mc-lead-tipo" name="tipo" required value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {SERVICE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="mc-btn mc-btn--primary mc-btn--block">
        <i className="bi bi-whatsapp" aria-hidden="true" /> Enviar no WhatsApp
      </button>
    </form>
  );
}
